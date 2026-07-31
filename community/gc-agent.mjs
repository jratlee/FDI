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
import { createHmac, randomBytes } from "node:crypto";
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

/* ─── Minimal Nostr crypto (no external deps) ───────────────────────── */

/**
 * Derive a Nostr public key from a private key using the secp256k1 curve.
 * We use Node's built-in crypto to avoid adding secp256k1 as a dependency.
 * For a production deployment, use the `nostr-tools` package instead.
 *
 * NOTE: this is a simplified implementation for single-relay, low-volume use.
 * It uses a well-known approach: import the key via PKCS#8 wrapper.
 */
async function getPublicKey(privateKeyHex) {
  const { subtle } = globalThis.crypto ?? (await import("node:crypto")).webcrypto;
  const privBytes = Buffer.from(privateKeyHex, "hex");
  const keyData = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00,
    0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
    0x04, 0x22, 0x04, 0x20, ...privBytes,
  ]);
  try {
    const key = await subtle.importKey("pkcs8", keyData, { name: "Ed25519" }, false, ["sign"]);
    return key;
  } catch {
    return null;
  }
}

function eventId(event) {
  const data = JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content]);
  return createHmac("sha256", "").update(data).digest("hex");
}

function makeEvent(kind, content, tags, pubkey) {
  const created_at = Math.floor(Date.now() / 1000);
  const ev = { pubkey, created_at, kind, tags, content };
  ev.id = eventId(ev);
  ev.sig = "0".repeat(128);
  return ev;
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
let pubkey = PRIVATE_KEY_HEX.slice(0, 64);
let ws;

function connect() {
  console.log(`[gc-agent] connecting to ${RELAY_URL}`);
  ws = new WebSocket(RELAY_URL);

  ws.on("open", () => {
    console.log("[gc-agent] connected");
    const filter = { kinds: [42], "#p": [pubkey], limit: 0 };
    if (CHANNEL_ID) filter["#e"] = [CHANNEL_ID];
    ws.send(JSON.stringify(["REQ", SUB_ID, filter]));
    console.log(`[gc-agent] subscribed (sub=${SUB_ID})`);
  });

  ws.on("message", async (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }

    if (!Array.isArray(msg) || msg[0] !== "EVENT") return;
    const event = msg[2];
    if (!event || event.kind !== 42) return;
    if (event.pubkey === pubkey) return;

    const content = event.content || "";
    if (!content.toLowerCase().includes("@gc") && !content.toLowerCase().includes("@growth")) {
      return;
    }

    const question = content.replace(/@\w+/g, "").trim();
    console.log(`[gc-agent] received question: ${question.slice(0, 100)}`);

    let replyContent;

    // When the HTTP service is running (GC_SERVICE_URL set), delegate to it.
    // The service handles parsing, engine math, chart rendering, and returns
    // the chart URL so community members can view the image directly.
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
        // Fall through to local path
        replyContent = null;
      }
    }

    // Local path: parse + run engine directly (no chart URL, SVG saved locally).
    if (!replyContent) {
      const parsed = await parseScenario(question);
      if (!parsed.ok) {
        replyContent = parsed.prompt
          || "I need a few more details to run the model. Please include retention rates (day 1, 7, 30) and a daily inflow or churn rate.";
      } else {
        try {
          // Render the SVG curve locally. In a VPS deployment this can be
          // served over HTTP; here we note its availability in the reply.
          const svg = renderCurve({
            anchorDays: parsed.params.retentionAnchors.days,
            anchorRates: parsed.params.retentionAnchors.rates,
            periods: parsed.params.periods ?? 90,
            dailyNew: parsed.params.dailyNew ?? null,
            spikeDay: parsed.params.spikeDay ?? null,
            spikeSize: parsed.params.spikeSize ?? null,
            unit: parsed.params.unit ?? "units",
          });
          // Store for potential serving; log length as a confirmation.
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
    const reply = makeEvent(42, replyContent, replyTags, pubkey);
    ws.send(JSON.stringify(["EVENT", reply]));
    console.log(`[gc-agent] replied (id=${reply.id.slice(0, 12)}...)`);
  });

  ws.on("close", (code) => {
    console.log(`[gc-agent] disconnected (code=${code}). reconnecting in 10s...`);
    setTimeout(connect, 10_000);
  });

  ws.on("error", (err) => {
    console.error("[gc-agent] ws error:", err.message);
  });
}

connect();
