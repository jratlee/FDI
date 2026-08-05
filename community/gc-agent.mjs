/**
 * Growth Cartography Agent
 *
 * Connects to a self-hosted Buzz relay (Nostr/NIP-01 protocol) as an agent
 * identity. Listens for mentions in the configured channel. When a mention
 * contains a growth-modeling question, parses the scenario and replies with
 * a modeled answer: parameters used, equilibrium/floor, curve summary, and
 * two or three sensitivity notes.
 *
 * Environment variables (set in deployment, never hardcoded):
 *   BUZZ_RELAY_URL          WebSocket URL of the Buzz relay, e.g. wss://relay.falsedawn.industries
 *   BUZZ_AGENT_PRIVATE_KEY  Nostr private key (hex, 64 chars) for the agent's keypair
 *   BUZZ_CHANNEL_ID         Nostr channel event ID the agent should monitor (optional; monitors all mentions if unset)
 *   OPENAI_API_KEY          Provided by the Replit OpenAI integration
 *
 * The agent participates using standard Nostr keypair auth (NIP-42). No Keycloak
 * or Buzz-specific auth extensions are needed for a basic message agent.
 *
 * Run: node community/gc-agent.mjs
 */

import { WebSocket } from "ws";
import { randomBytes } from "node:crypto";
import { getPublicKey, finalizeEvent } from "nostr-tools/pure";
import {
  buildRetentionProfile,
  projectDAU,
  equilibrium,
  requiredDailyNew,
  cumulativeRevenue,
  cacDefensibility,
  buildSpikeVsDrip,
} from "./gc-engine.mjs";
import { parseScenario } from "./gc-parser.mjs";
import { renderCurve } from "./gc-render.mjs";

/* ─── Config ─────────────────────────────────────────────────────────── */

const RELAY_URL = process.env.BUZZ_RELAY_URL;
const PRIVATE_KEY_HEX = process.env.BUZZ_AGENT_PRIVATE_KEY;
const CHANNEL_ID = process.env.BUZZ_CHANNEL_ID || null;
// When GC_SERVICE_URL is set the agent delegates to the HTTP service, which
// handles parsing, engine math, and chart rendering in one call and returns
// a chart URL that community members can open in a browser.
const SERVICE_URL = process.env.GC_SERVICE_URL || null;
const AGENT_NAME = "Growth Cartography Agent";
const AGENT_ABOUT = "I model growth scenarios using the FDI compounding cohort-decay engine. Ask me a question with numbers and I will show you where the math points.";

if (!RELAY_URL) {
  console.error("[gc-agent] BUZZ_RELAY_URL is not set. Exiting.");
  process.exit(1);
}
if (!PRIVATE_KEY_HEX || PRIVATE_KEY_HEX.length !== 64) {
  console.error("[gc-agent] BUZZ_AGENT_PRIVATE_KEY must be a 64-char hex Nostr private key. Exiting.");
  process.exit(1);
}

/* ─── Nostr crypto (secp256k1 via nostr-tools v2) ───────────────────── */

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

const PRIVATE_KEY_BYTES = hexToBytes(PRIVATE_KEY_HEX);
const PUBKEY = getPublicKey(PRIVATE_KEY_BYTES);

console.log(`[gc-agent] pubkey: ${PUBKEY.slice(0, 16)}...`);

/** Create and sign a Nostr event. */
function makeEvent(kind, content, tags) {
  return finalizeEvent(
    { kind, content, tags, created_at: Math.floor(Date.now() / 1000) },
    PRIVATE_KEY_BYTES
  );
}

/** Build a NIP-42 AUTH response event for the given relay challenge. */
function makeAuthEvent(relayUrl, challenge) {
  return finalizeEvent(
    {
      kind: 22242,
      content: "",
      tags: [
        ["relay", relayUrl],
        ["challenge", challenge],
      ],
      created_at: Math.floor(Date.now() / 1000),
    },
    PRIVATE_KEY_BYTES
  );
}

/* ─── Answer composition ─────────────────────────────────────────────── */

function formatAnswer(params) {
  const { unit, periods, dailyNew, retentionAnchors, cac, revenuePerUnitPerDay, spikeDay, spikeSize, question } = params;
  const maxDay = periods || 90;

  const profile = buildRetentionProfile(retentionAnchors.days, retentionAnchors.rates, maxDay);
  const lines = [];

  lines.push(`Modeling: ${question}`);
  lines.push("");
  lines.push(`Assumptions used: unit=${unit}, periods=${maxDay} days, retention anchors=[${retentionAnchors.days.map((d, i) => `day-${d}: ${retentionAnchors.rates[i].toFixed(1)}%`).join(", ")}]${dailyNew ? `, daily new: ${dailyNew}` : ""}${cac ? `, CAC: $${cac}` : ""}${revenuePerUnitPerDay ? `, revenue/unit/day: $${revenuePerUnitPerDay}` : ""}`);
  lines.push("");

  if (dailyNew) {
    const eq = equilibrium(profile, dailyNew);
    lines.push(`Equilibrium: at ${dailyNew} new ${unit}/day, the network stabilizes at ${Math.round(eq).toLocaleString()} active ${unit}.`);
  }

  if (cac && revenuePerUnitPerDay) {
    const ltv = cumulativeRevenue(profile, revenuePerUnitPerDay, maxDay);
    const { ratio, defensible } = cacDefensibility(ltv, cac);
    lines.push(`CAC: $${cac}. Projected ${maxDay}-day LTV: $${ltv.toFixed(2)} => LTV/CAC ratio ${ratio.toFixed(2)}x. ${defensible ? "Defensible at this horizon." : "Below 3x threshold at this horizon."}`);
  }

  if (spikeDay != null && spikeSize != null && dailyNew != null) {
    const { dripCohorts, spikeCohorts } = buildSpikeVsDrip(maxDay, dailyNew, spikeDay, spikeSize);
    const dripDAU = projectDAU(profile, dripCohorts, maxDay);
    const spikeDAU = projectDAU(profile, spikeCohorts, maxDay);
    const dripFinal = dripDAU[maxDay - 1];
    const spikeFinal = spikeDAU[maxDay - 1];
    lines.push(`Drip vs spike at day ${maxDay}: drip=${Math.round(dripFinal).toLocaleString()} active ${unit}, spike=${Math.round(spikeFinal).toLocaleString()} active ${unit}. ${dripFinal > spikeFinal ? "Steady drip wins at this horizon." : "Spike holds the advantage at this horizon."}`);
  }

  lines.push("");
  lines.push("Sensitivity notes:");

  if (retentionAnchors.rates && retentionAnchors.rates.length >= 2) {
    const day30Rate = retentionAnchors.rates[retentionAnchors.rates.length - 1];
    const betterProfile = buildRetentionProfile(retentionAnchors.days, retentionAnchors.rates.map((r, i) => i === retentionAnchors.rates.length - 1 ? r * 1.25 : r), maxDay);
    if (dailyNew) {
      const betterEq = equilibrium(betterProfile, dailyNew);
      const baseEq = equilibrium(profile, dailyNew);
      lines.push(`1. If day-30 retention improves from ${day30Rate.toFixed(1)}% to ${(day30Rate * 1.25).toFixed(1)}%, equilibrium rises from ${Math.round(baseEq).toLocaleString()} to ${Math.round(betterEq).toLocaleString()} active ${unit} (+${((betterEq / baseEq - 1) * 100).toFixed(0)}%).`);
    }
  }
  if (cac && revenuePerUnitPerDay) {
    const breakEvenDays = cac / revenuePerUnitPerDay;
    lines.push(`2. Payback period (ignoring churn): ${Math.ceil(breakEvenDays)} days. Accounting for retention, effective payback extends substantially beyond this floor.`);
  }
  if (dailyNew) {
    const reqNew = requiredDailyNew(profile, (dailyNew || 0) * 1.5);
    lines.push(`3. To reach 1.5x current equilibrium, daily new ${unit} inflow would need to be approximately ${Math.round(reqNew).toLocaleString()}/day.`);
  }

  lines.push("");
  lines.push("This is a model output, not investment or business advice. Assumptions are stated above.");

  return lines.join("\n");
}

/* ─── WebSocket agent loop ───────────────────────────────────────────── */

const SUB_ID = randomBytes(8).toString("hex");
let ws;
let authenticated = false;

function subscribe() {
  const filter = { kinds: [42], "#p": [PUBKEY], limit: 0 };
  if (CHANNEL_ID) filter["#e"] = [CHANNEL_ID];
  ws.send(JSON.stringify(["REQ", SUB_ID, filter]));
  console.log(`[gc-agent] subscribed (sub=${SUB_ID})`);
}

function connect() {
  console.log(`[gc-agent] connecting to ${RELAY_URL}`);
  ws = new WebSocket(RELAY_URL);
  authenticated = false;

  ws.on("open", () => {
    console.log("[gc-agent] connected");
    // Do not subscribe yet — wait for AUTH challenge or a short delay.
    // If the relay doesn't send AUTH within 2s, subscribe anyway (open relay).
    setTimeout(() => {
      if (!authenticated) subscribe();
    }, 2000);
  });

  ws.on("message", async (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    if (!Array.isArray(msg)) return;

    const [type, ...rest] = msg;

    /* ── NIP-42: respond to AUTH challenge ─────────────────────────── */
    if (type === "AUTH") {
      const challenge = rest[0];
      if (typeof challenge !== "string") return;
      const authEvent = makeAuthEvent(RELAY_URL, challenge);
      ws.send(JSON.stringify(["AUTH", authEvent]));
      console.log(`[gc-agent] AUTH sent (challenge=${challenge.slice(0, 16)}...)`);
      authenticated = true;
      // Subscribe after auth
      setTimeout(subscribe, 300);
      return;
    }

    /* ── OK: log relay acceptance/rejection ────────────────────────── */
    if (type === "OK") {
      const [eventId, success, message] = rest;
      if (!success) {
        console.warn(`[gc-agent] relay rejected event ${eventId?.slice(0, 12)}: ${message}`);
      } else {
        console.log(`[gc-agent] event accepted (id=${eventId?.slice(0, 12)}...)`);
      }
      return;
    }

    /* ── NOTICE ────────────────────────────────────────────────────── */
    if (type === "NOTICE") {
      console.log(`[gc-agent] NOTICE: ${rest[0]}`);
      return;
    }

    /* ── CLOSED: re-subscribe ──────────────────────────────────────── */
    if (type === "CLOSED") {
      console.warn(`[gc-agent] subscription closed by relay: ${rest[1]}. Resubscribing...`);
      setTimeout(subscribe, 1000);
      return;
    }

    /* ── EVENT: handle incoming messages ──────────────────────────── */
    if (type !== "EVENT") return;
    const event = rest[1];
    if (!event || event.kind !== 42) return;
    if (event.pubkey === PUBKEY) return;

    const content = event.content || "";
    if (!content.toLowerCase().includes("@gc") && !content.toLowerCase().includes("@growth")) {
      return;
    }

    const question = content.replace(/@\w+/g, "").trim();
    console.log(`[gc-agent] received question: ${question.slice(0, 100)}`);

    let replyContent;

    // When the HTTP service is running (GC_SERVICE_URL set), delegate to it.
    if (SERVICE_URL) {
      try {
        const res = await fetch(`${SERVICE_URL}/model`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        const result = await res.json();
        if (result.ok) {
          replyContent = result.answer;
        } else {
          replyContent = result.prompt
            || result.error
            || "I could not parse that scenario. Please include the unit type (users/nodes/agents), retention rates at day 1, 7, and 30, and a daily inflow or churn rate.";
        }
      } catch (err) {
        console.error("[gc-agent] service call failed, falling back to local:", err.message);
        replyContent = null;
      }
    }

    // Local path: parse + run engine directly.
    if (!replyContent) {
      const parsed = await parseScenario(question);
      if (!parsed.ok) {
        replyContent = parsed.prompt
          || "I need a few more details to run the model. Please include retention rates (day 1, 7, 30) and a daily inflow or churn rate.";
      } else {
        try {
          const svg = renderCurve({
            anchorDays: parsed.params.retentionAnchors.days,
            anchorRates: parsed.params.retentionAnchors.rates,
            periods: parsed.params.periods ?? 90,
            dailyNew: parsed.params.dailyNew ?? null,
            spikeDay: parsed.params.spikeDay ?? null,
            spikeSize: parsed.params.spikeSize ?? null,
            unit: parsed.params.unit ?? "units",
          });
          console.log(`[gc-agent] chart rendered (${svg.length} bytes SVG)`);
          replyContent = formatAnswer(parsed.params);
        } catch (err) {
          console.error("[gc-agent] engine error:", err);
          replyContent = `The model encountered an error with those parameters: ${err.message}. Please check the inputs and try again.`;
        }
      }
    }

    const replyTags = [["e", event.id, "", "reply"], ["p", event.pubkey]];
    if (CHANNEL_ID) replyTags.unshift(["e", CHANNEL_ID, "", "root"]);
    const reply = makeEvent(42, replyContent, replyTags);
    ws.send(JSON.stringify(["EVENT", reply]));
    console.log(`[gc-agent] replied (id=${reply.id.slice(0, 12)}...)`);
  });

  ws.on("close", (code) => {
    console.log(`[gc-agent] disconnected (code=${code}). reconnecting in 10s...`);
    authenticated = false;
    setTimeout(connect, 10_000);
  });

  ws.on("error", (err) => {
    console.error("[gc-agent] ws error:", err.message);
  });
}

connect();
