#!/usr/bin/env node
/**
 * Top Call MCP server (stdio, zero-dependency).
 *
 * Speaks MCP over line-delimited JSON-RPC 2.0 on stdin/stdout. It is the
 * verifiable interface to the owned Top Call corpus and exposes the repeatable
 * read skills as BOTH:
 *   - MCP prompts (slash commands in clients that support prompts)
 *   - MCP tools   (callable by agents that drive tools)
 *
 * KEY DIFFERENCE FROM SKILLFOUNDRY: Skillfoundry composes a rubric for the
 * client's model to reason over. Top Call does NOT hand back a prompt — it READS
 * the persistent, provenance-stamped corpus and returns real answers with source,
 * tier, and confidence attached to every claim. The corpus is the moat; this
 * server is the gated interface an agent can call and cite.
 */

import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCorpus } from "../lib/corpus.mjs";
import {
  execMoveScan,
  authorityAudit,
  corpusStats,
  generateBrief,
  renderExecMoves,
  renderAudit,
} from "../lib/query.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CORPUS = join(ROOT, "corpus", "corpus.json");
const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "topcall", version: "1.0.0" };

function corpus() {
  return loadCorpus(CORPUS);
}

/* ---------- tool implementations (read the corpus, return provenance) ---------- */

const TOOLS = [
  {
    name: "exec_move_scan",
    description:
      "Scan the Top Call corpus for executive moves. Returns provenance-stamped moves (source, tier, confidence). Optional filters: company, category, type, min_tier.",
    inputSchema: {
      type: "object",
      properties: {
        company: { type: "string", description: "Filter by company name (substring)." },
        category: { type: "string", description: "Filter by category (e.g. 'Retail Media')." },
        type: { type: "string", description: "Filter by move type (e.g. 'm&a', 'commercialization')." },
        min_tier: { type: "string", description: "Require at least one source of this tier or better (1A|1B|1C|2|3)." },
      },
    },
    run: (a) =>
      renderExecMoves(
        execMoveScan(corpus(), {
          company: a.company,
          category: a.category,
          moveType: a.type,
          minTier: a.min_tier,
        }),
      ),
  },
  {
    name: "authority_audit",
    description:
      "Audit every source in the corpus by authority tier, with access/paywall flags and how many moves each supports. The trust layer, on demand.",
    inputSchema: { type: "object", properties: {} },
    run: () => renderAudit(authorityAudit(corpus())),
  },
  {
    name: "generate_brief",
    description:
      "Generate a full Top Call intelligence brief from the corpus: the Top Call, TLDR, executive moves, bottom line, and a source-authority log. Every line is provenance-stamped. Optional: category.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Scope the brief to one category." },
      },
    },
    run: (a) => generateBrief(corpus(), { category: a.category }),
  },
  {
    name: "corpus_stats",
    description:
      "Return corpus growth: node/edge counts by entity, moves by confidence, ingest runs, and all-time confidence upgrades — the proof that the corpus compounds.",
    inputSchema: { type: "object", properties: {} },
    run: () => JSON.stringify(corpusStats(corpus()), null, 2),
  },
];

const TOOL_BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

// Mirror tools as prompts (slash commands) for clients that surface prompts.
const PROMPTS = TOOLS.map((t) => ({
  name: t.name.replace(/_/g, "-"),
  description: t.description,
  arguments: Object.entries(t.inputSchema.properties || {}).map(([name, s]) => ({
    name,
    description: s.description || "",
    required: false,
  })),
  toolName: t.name,
}));
const PROMPT_BY_NAME = Object.fromEntries(PROMPTS.map((p) => [p.name, p]));

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
      return;

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
      const text = TOOL_BY_NAME[p.toolName].run(params.arguments || {});
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
      let text;
      try {
        text = t.run(params.arguments || {});
      } catch (e) {
        return result(id, {
          content: [{ type: "text", text: `Top Call error: ${e.message}` }],
          isError: true,
        });
      }
      return result(id, { content: [{ type: "text", text }] });
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

process.stderr.write("topcall MCP server ready (stdio)\n");
