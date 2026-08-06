/**
 * Growth Cartography HTTP Service
 *
 * A lightweight Node.js HTTP endpoint that accepts a plain-language
 * growth-modeling question and returns structured output: parsed parameters,
 * a modeled answer text, and an SVG chart of the retention and DAU curves.
 *
 * Designed to run on the VPS alongside the Buzz relay. The gc-agent calls
 * this service to generate charts and answers; the agent posts a link to the
 * chart URL in its Nostr reply so community members can view the image.
 *
 * Endpoints:
 *   POST /model          { question: string } -> { ok, params, answer, chartUrl, error }
 *   GET  /chart/:id.svg  Serve a cached SVG chart
 *   GET  /health         { ok: true, uptime }
 *
 * Environment:
 *   GC_SERVICE_PORT    Port to listen on (default: 4242)
 *   GC_CHART_BASE_URL  Public base URL for chart links (default: http://localhost:PORT)
 *   OPEN_ROUTER        OpenRouter API key (Replit secret name)
 *   OPENROUTER_API_KEY OpenRouter API key (VPS env var name — same key, different name)
 *
 * Run: node community/gc-service.mjs
 */

import http from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { finalizeEvent } from "nostr-tools/pure";
import { parseScenario } from "./gc-parser.mjs";
import { renderCurve } from "./gc-render.mjs";
import {
  buildRetentionProfile,
  projectDAU,
  equilibrium,
  requiredDailyNew,
  cumulativeRevenue,
  cacDefensibility,
  buildSpikeVsDrip,
} from "./gc-engine.mjs";

const PORT = Number(process.env.GC_SERVICE_PORT ?? 4242);
const CHART_BASE = (process.env.GC_CHART_BASE_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");

/* Invite code generation — NIP-98 signed request to the Buzz relay */
const BUZZ_AGENT_KEY_HEX = (process.env.BUZZ_AGENT_PRIVATE_KEY || "").trim();
const BUZZ_RELAY_INTERNAL = (process.env.BUZZ_RELAY_INTERNAL_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const BUZZ_HOST = (process.env.BUZZ_RELAY_HOST || "lab.falsedawn.industries");

/* ─── Per-IP invite rate limiter ──────────────────────────────────── */
// Allow at most INVITE_RATE_MAX requests per INVITE_RATE_WINDOW_MS per IP.
// This bounds anonymous invite minting without breaking the intended
// public-invite flow (one page load = one invite; generous to cover retries).
const INVITE_RATE_MAX = 5;
const INVITE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const _inviteRateBuckets = new Map(); // ip -> { count, resetAt }

function inviteRateLimitExceeded(ip) {
  const now = Date.now();
  let bucket = _inviteRateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + INVITE_RATE_WINDOW_MS };
  }
  bucket.count += 1;
  _inviteRateBuckets.set(ip, bucket);
  // Evict stale entries (simple cleanup to bound memory).
  if (_inviteRateBuckets.size > 5000) {
    for (const [k, v] of _inviteRateBuckets) {
      if (now >= v.resetAt) _inviteRateBuckets.delete(k);
    }
  }
  return bucket.count > INVITE_RATE_MAX;
}

/* ─── In-memory chart cache (bounded) ──────────────────────────────── */

const MAX_CHARTS = 200;
const chartCache = new Map(); // id -> svgString

function storeChart(svg) {
  const id = randomBytes(12).toString("hex");
  if (chartCache.size >= MAX_CHARTS) {
    // Evict oldest entry
    chartCache.delete(chartCache.keys().next().value);
  }
  chartCache.set(id, svg);
  return id;
}

/* ─── Answer composition ─────────────────────────────────────────── */

function composeAnswer(params, chartUrl) {
  const {
    unit = "units",
    periods = 90,
    dailyNew,
    retentionAnchors,
    cac,
    revenuePerUnitPerDay,
    spikeDay,
    spikeSize,
    question,
  } = params;

  const maxDay = periods;
  const profile = buildRetentionProfile(
    retentionAnchors.days,
    retentionAnchors.rates,
    maxDay
  );

  const lines = [];

  lines.push(`Modeling: ${question}`);
  lines.push("");

  const anchorsStr = retentionAnchors.days
    .map((d, i) => `day-${d}: ${retentionAnchors.rates[i].toFixed(1)}%`)
    .join(", ");
  const assumptionParts = [
    `unit: ${unit}`,
    `horizon: ${maxDay} days`,
    `retention anchors: ${anchorsStr}`,
    dailyNew != null ? `daily inflow: ${dailyNew.toLocaleString()}/day` : null,
    cac != null ? `CAC: $${cac}` : null,
    revenuePerUnitPerDay != null
      ? `revenue per unit per day: $${revenuePerUnitPerDay}`
      : null,
  ].filter(Boolean);
  lines.push(`Assumptions: ${assumptionParts.join("; ")}.`);
  lines.push("");

  if (dailyNew != null) {
    const eq = equilibrium(profile, dailyNew);
    lines.push(
      `At ${dailyNew.toLocaleString()} new ${unit}/day with these retention rates, the network stabilizes at approximately ${Math.round(eq).toLocaleString()} active ${unit}.`
    );
  }

  if (cac != null && revenuePerUnitPerDay != null) {
    const ltv = cumulativeRevenue(profile, revenuePerUnitPerDay, maxDay);
    const { ratio, defensible } = cacDefensibility(ltv, cac);
    lines.push(
      `CAC: $${cac}. Projected ${maxDay}-day LTV: $${ltv.toFixed(2)} (LTV/CAC: ${ratio.toFixed(2)}x). ${defensible ? "Defensible at this horizon." : "Below the 3x threshold at this horizon."}`
    );
  }

  if (spikeDay != null && spikeSize != null && dailyNew != null) {
    const { dripCohorts, spikeCohorts } = buildSpikeVsDrip(
      maxDay,
      dailyNew,
      spikeDay,
      spikeSize
    );
    const dripDAU = projectDAU(profile, dripCohorts, maxDay);
    const spikeDAU = projectDAU(profile, spikeCohorts, maxDay);
    const dripFinal = dripDAU[maxDay - 1];
    const spikeFinal = spikeDAU[maxDay - 1];
    lines.push(
      `Drip vs spike at day ${maxDay}: drip holds ${Math.round(dripFinal).toLocaleString()} active ${unit}, spike holds ${Math.round(spikeFinal).toLocaleString()}. ${dripFinal > spikeFinal ? "Steady drip outperforms at this horizon." : "Spike retains the advantage at this horizon."}`
    );
  }

  lines.push("");
  lines.push("Sensitivity:");

  const sensitivityLines = [];

  if (retentionAnchors.rates?.length >= 2) {
    const day30Rate = retentionAnchors.rates[retentionAnchors.rates.length - 1];
    const betterRates = retentionAnchors.rates.map((r, i) =>
      i === retentionAnchors.rates.length - 1 ? r * 1.25 : r
    );
    const betterProfile = buildRetentionProfile(
      retentionAnchors.days,
      betterRates,
      maxDay
    );
    if (dailyNew != null) {
      const baseEq = equilibrium(profile, dailyNew);
      const betterEq = equilibrium(betterProfile, dailyNew);
      const delta = ((betterEq / baseEq - 1) * 100).toFixed(0);
      sensitivityLines.push(
        `1. A 25% improvement in day-30 retention (from ${day30Rate.toFixed(1)}% to ${(day30Rate * 1.25).toFixed(1)}%) lifts equilibrium from ${Math.round(baseEq).toLocaleString()} to ${Math.round(betterEq).toLocaleString()} active ${unit} (+${delta}%).`
      );
    }
  }

  if (cac != null && revenuePerUnitPerDay != null) {
    const breakEvenDays = cac / revenuePerUnitPerDay;
    sensitivityLines.push(
      `2. Gross payback period (ignoring retention): ${Math.ceil(breakEvenDays)} days. With retention applied, effective payback extends beyond this floor.`
    );
  }

  if (dailyNew != null) {
    const req = requiredDailyNew(profile, (dailyNew || 0) * 1.5);
    sensitivityLines.push(
      `3. To reach 1.5x current equilibrium, daily inflow would need to rise to approximately ${Math.round(req).toLocaleString()}/day.`
    );
  }

  // Pad to at least 2 sensitivity notes
  if (sensitivityLines.length === 0) {
    sensitivityLines.push(
      `1. Provide daily inflow, CAC, or revenue per unit to unlock deeper sensitivity analysis.`
    );
  }
  if (sensitivityLines.length === 1 && dailyNew == null) {
    sensitivityLines.push(
      `2. Adding a daily inflow figure will show the equilibrium active-unit count.`
    );
  }

  lines.push(...sensitivityLines);
  lines.push("");

  if (chartUrl) {
    lines.push(`Chart: ${chartUrl}`);
    lines.push("");
  }

  lines.push(
    "Model output only. Assumptions are stated above. This is not investment or business advice."
  );

  return lines.join("\n");
}

/* ─── Request handlers ──────────────────────────────────────────── */

function jsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function sendJSON(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function handleInvite(req, res) {
  // Per-IP rate limit: prevent anonymous callers from bulk-minting invites.
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";
  if (inviteRateLimitExceeded(ip)) {
    return sendJSON(res, 429, { ok: false, error: "Too many invite requests. Try again later." });
  }

  if (!BUZZ_AGENT_KEY_HEX) {
    return sendJSON(res, 503, { ok: false, error: "Agent key not configured." });
  }
  try {
    const privkeyBytes = Uint8Array.from(Buffer.from(BUZZ_AGENT_KEY_HEX, "hex"));

    // NIP-98 u tag must be the public URL the relay sees on the wire.
    // We call the relay via BUZZ_RELAY_INTERNAL with the correct Host header
    // so the relay routes to the right community tenant.
    const pubUrl = `https://${BUZZ_HOST}/api/invites`;

    const bodyStr = JSON.stringify({ ttl_secs: 604800 }); // 7-day invite
    // NIP-98 requires sha256 of the raw request body for POST requests
    const payloadHash = createHash("sha256").update(bodyStr).digest("hex");

    const authEvent = finalizeEvent({
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["u", pubUrl], ["method", "POST"], ["payload", payloadHash]],
      content: "",
    }, privkeyBytes);

    const authHeader = "Nostr " + Buffer.from(JSON.stringify(authEvent)).toString("base64");

    // Use http.request (not fetch) so the Host header is honoured — Node's
    // built-in fetch (undici) treats Host as a forbidden header and strips it.
    // Parse BUZZ_RELAY_INTERNAL to extract hostname and port.
    const relayInternalUrl = new URL(BUZZ_RELAY_INTERNAL);
    const result = await new Promise((resolve, reject) => {
      const r = http.request({
        hostname: relayInternalUrl.hostname,
        port: Number(relayInternalUrl.port) || (relayInternalUrl.protocol === "https:" ? 443 : 80),
        path: "/api/invites",
        method: "POST",
        headers: {
          "Host": BUZZ_HOST,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
          "Authorization": authHeader,
        },
      }, (resp) => {
        let data = "";
        resp.on("data", (c) => { data += c; });
        resp.on("end", () => resolve({ status: resp.statusCode, body: data }));
      });
      r.on("error", reject);
      r.write(bodyStr);
      r.end();
    });

    if (result.status !== 200 && result.status !== 201) {
      console.error("[gc-service] invite relay error:", result.status, result.body.slice(0, 200));
      return sendJSON(res, 502, { ok: false, error: `Relay returned ${result.status}` });
    }

    let data;
    try { data = JSON.parse(result.body); } catch { data = {}; }
    return sendJSON(res, 200, { ok: true, code: data.code, expires_at: data.expires_at });
  } catch (err) {
    console.error("[gc-service] invite error:", err.message);
    return sendJSON(res, 500, { ok: false, error: err.message });
  }
}

async function handleModel(req, res) {
  let body;
  try { body = await jsonBody(req); }
  catch { return sendJSON(res, 400, { ok: false, error: "Invalid JSON body." }); }

  const question = String(body?.question ?? "").trim().slice(0, 2000);
  if (!question) return sendJSON(res, 400, { ok: false, error: "question field is required." });

  const parsed = await parseScenario(question);
  if (!parsed.ok) {
    return sendJSON(res, 200, {
      ok: false,
      error: parsed.error ?? null,
      prompt: parsed.prompt ?? null,
      missingParams: parsed.missingParams ?? [],
    });
  }

  const params = parsed.params;
  let chartUrl = null;
  let svgChart = null;

  try {
    svgChart = renderCurve({
      anchorDays: params.retentionAnchors.days,
      anchorRates: params.retentionAnchors.rates,
      periods: params.periods ?? 90,
      dailyNew: params.dailyNew ?? null,
      spikeDay: params.spikeDay ?? null,
      spikeSize: params.spikeSize ?? null,
      unit: params.unit ?? "units",
    });
    const id = storeChart(svgChart);
    chartUrl = `${CHART_BASE}/chart/${id}.svg`;
  } catch (err) {
    console.error("[gc-service] chart render error:", err.message);
  }

  let answer;
  try {
    answer = composeAnswer(params, chartUrl);
  } catch (err) {
    return sendJSON(res, 500, { ok: false, error: `Engine error: ${err.message}` });
  }

  sendJSON(res, 200, { ok: true, params, answer, chartUrl, svgChart });
}

function handleChart(res, id) {
  const svg = chartCache.get(id);
  if (!svg) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Chart not found.");
  }
  res.writeHead(200, {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=86400",
    "Content-Length": Buffer.byteLength(svg),
  });
  res.end(svg);
}

function handleHealth(res) {
  sendJSON(res, 200, { ok: true, uptime: process.uptime() });
}

/* ─── Server ─────────────────────────────────────────────────────── */

const server = http.createServer(async (req, res) => {
  const url = req.url ?? "/";

  if (req.method === "POST" && url === "/model") {
    return handleModel(req, res);
  }

  if (req.method === "POST" && url === "/invite") {
    return handleInvite(req, res);
  }

  const chartMatch = url.match(/^\/chart\/([a-f0-9]{24})\.svg$/);
  if (req.method === "GET" && chartMatch) {
    return handleChart(res, chartMatch[1]);
  }

  if (req.method === "GET" && url === "/health") {
    return handleHealth(res);
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found.");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[gc-service] Growth Cartography service listening on port ${PORT}`);
  console.log(`[gc-service] Chart base URL: ${CHART_BASE}`);
});

server.on("error", (err) => {
  console.error("[gc-service] server error:", err.message);
  process.exit(1);
});
