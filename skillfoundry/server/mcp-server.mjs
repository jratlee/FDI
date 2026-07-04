#!/usr/bin/env node
/**
 * Skillfoundry MCP server (stdio, zero-dependency).
 *
 * Speaks MCP over line-delimited JSON-RPC 2.0 on stdin/stdout. It exposes the
 * three Skillfoundry gates and the chained strategic audit as BOTH:
 *   - MCP prompts  (surfaced as slash commands in clients that support prompts)
 *   - MCP tools    (callable by clients / agents that drive tools)
 *
 * There is no backend and no model call here by design (see task non-goals). The
 * server composes the gate rubric + the shared output contract + the caller's
 * asset into one instruction payload; the client's own model does the reasoning
 * and returns the scored report. The rubric text is the single source of truth,
 * loaded live from ../skills so the server never drifts from the skills.
 */

import { createInterface } from "node:readline";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROTOCOL_VERSION = "2024-11-05";

const SERVER_INFO = { name: "skillfoundry", version: "1.0.0" };

function readSkill(name) {
  return readFileSync(join(ROOT, "skills", name, "SKILL.md"), "utf8");
}
function readFileSafe(rel) {
  try {
    return readFileSync(join(ROOT, rel), "utf8");
  } catch {
    return "";
  }
}

const CONTRACT = () => readSkill("shared-audit-contract");
const SCHEMA = () => readFileSafe("schema/audit-report.schema.json");

const GATES = {
  relevance: {
    id: "relevance",
    name: "Market-Deficit Analyzer",
    filter: "Relevance Filter",
    skill: "relevance-gate",
    framework: "Jobs-to-be-Done (Christensen)",
  },
  performance: {
    id: "performance",
    name: "Enterprise Valuation Gate",
    filter: "Performance Filter",
    skill: "performance-gate",
    framework: "Brand equity (Aaker) + competitive positioning (Porter)",
  },
  signal: {
    id: "signal",
    name: "Adversarial Defense Matrix",
    filter: "Algorithmic-Signal Filter",
    skill: "signal-gate",
    framework: "GEO/AEO (KDD 2024) + E-E-A-T + Schema.org",
  },
};

const ORDER = ["relevance", "performance", "signal"];

/* ---------- prompt/tool payload composition ---------- */

function singleGatePrompt(gateId, asset) {
  const g = GATES[gateId];
  return [
    `You are running Skillfoundry Gate — ${g.name} (${g.filter}).`,
    `Apply the rubric below and return ONE GateResult that conforms to the shared audit contract.`,
    ``,
    `=== SHARED AUDIT CONTRACT ===`,
    CONTRACT(),
    ``,
    `=== GATE RUBRIC ===`,
    readSkill(g.skill),
    ``,
    `=== OUTPUT SCHEMA (JSON) ===`,
    SCHEMA(),
    ``,
    `=== ASSET TO AUDIT ===`,
    asset || "(no asset provided — ask the caller for one)",
    ``,
    `Score the sub-criteria first, compute the weighted total, derive the verdict,`,
    `list ranked reasons with quoted evidence, and give specific line-level rewrites.`,
    `Name the public framework you applied: ${g.framework}.`,
  ].join("\n");
}

function auditPrompt(asset) {
  return [
    `You are running the Skillfoundry STRATEGIC AUDIT (hero command).`,
    `Route the asset through all three gates in fixed order (relevance, performance,`,
    `signal) against the ORIGINAL text, then emit ONE consolidated report that`,
    `conforms to the shared audit contract.`,
    ``,
    `=== SHARED AUDIT CONTRACT ===`,
    CONTRACT(),
    ``,
    `=== GATE 1 RUBRIC (Relevance / Market-Deficit Analyzer) ===`,
    readSkill("relevance-gate"),
    ``,
    `=== GATE 2 RUBRIC (Performance / Enterprise Valuation Gate) ===`,
    readSkill("performance-gate"),
    ``,
    `=== GATE 3 RUBRIC (Algorithmic Signal / Adversarial Defense Matrix) ===`,
    readSkill("signal-gate"),
    ``,
    `=== OUTPUT SCHEMA (JSON) ===`,
    SCHEMA(),
    ``,
    `=== ASSET TO AUDIT ===`,
    asset || "(no asset provided — ask the caller for one)",
    ``,
    `Produce a Markdown report with a rollup (composite score using weights`,
    `relevance 0.40 / performance 0.35 / signal 0.25, a SHIP/REVISE/BLOCK`,
    `recommendation, and 3-5 ranked top moves) followed by the three gate sections.`,
    `Every finding cites the asset; every rewrite is a concrete span replacement.`,
    `If the caller asks for machine output, also emit JSON validating the schema.`,
  ].join("\n");
}

/* ---------- MCP surface definitions ---------- */

const ASSET_ARG = {
  name: "asset",
  description: "The content asset to audit: paste the text (or a path your client can resolve).",
  required: true,
};

const PROMPTS = [
  {
    name: "strategic-audit",
    description:
      "Run a content asset through all three Skillfoundry gates and return one consolidated strategic audit report.",
    arguments: [ASSET_ARG],
    build: (args) => auditPrompt(args.asset),
  },
  ...ORDER.map((id) => ({
    name: `${id}-gate`,
    description: `Run only Gate (${GATES[id].filter}) on a content asset and return its GateResult.`,
    arguments: [ASSET_ARG],
    build: (args) => singleGatePrompt(id, args.asset),
  })),
];

const PROMPT_BY_NAME = Object.fromEntries(PROMPTS.map((p) => [p.name, p]));

const TOOLS = PROMPTS.map((p) => ({
  name: p.name.replace(/-/g, "_"),
  description: p.description,
  inputSchema: {
    type: "object",
    properties: {
      asset: { type: "string", description: ASSET_ARG.description },
    },
    required: ["asset"],
  },
  promptName: p.name,
}));

const TOOL_BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

/* ---------- JSON-RPC plumbing ---------- */

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
function result(id, res) {
  send({ jsonrpc: "2.0", id, result: res });
}
function error(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function handle(msg) {
  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize":
      return result(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { prompts: {}, tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
    case "initialized":
      return; // notification, no response

    case "ping":
      return result(id, {});

    case "prompts/list":
      return result(id, {
        prompts: PROMPTS.map(({ name, description, arguments: a }) => ({
          name,
          description,
          arguments: a,
        })),
      });

    case "prompts/get": {
      const p = PROMPT_BY_NAME[params?.name];
      if (!p) return error(id, -32602, `Unknown prompt: ${params?.name}`);
      const text = p.build(params.arguments || {});
      return result(id, {
        description: p.description,
        messages: [{ role: "user", content: { type: "text", text } }],
      });
    }

    case "tools/list":
      return result(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      });

    case "tools/call": {
      const t = TOOL_BY_NAME[params?.name];
      if (!t) return error(id, -32602, `Unknown tool: ${params?.name}`);
      const p = PROMPT_BY_NAME[t.promptName];
      const text = p.build(params.arguments || {});
      return result(id, {
        content: [{ type: "text", text }],
      });
    }

    default:
      if (isNotification) return;
      return error(id, -32601, `Method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return error(null, -32700, "Parse error");
  }
  try {
    handle(msg);
  } catch (e) {
    if (msg && msg.id != null) error(msg.id, -32603, `Internal error: ${e.message}`);
  }
});

process.stderr.write("skillfoundry MCP server ready (stdio)\n");
