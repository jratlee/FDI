#!/usr/bin/env node
/**
 * Zero-dependency validator for the Top Call corpus.
 *
 * Checks the corpus against corpus.schema.json (structural) PLUS Top Call
 * invariants the JSON Schema can't express:
 *   - every move node has at least one provenance entry;
 *   - every provenance source_id resolves to a source node;
 *   - every edge endpoint resolves to a node;
 *   - move confidence matches what the trust layer would compute from its tiers.
 *
 * Usage: node schema/validate-corpus.mjs [corpus/corpus.json]
 * Exits non-zero on any error (CI-friendly).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { combinedConfidence } from "../lib/source-tiers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] || join(__dirname, "..", "corpus", "corpus.json");

const NODE_TYPES = ["executive", "company", "category", "move", "implication", "source"];
const PREFIX = {
  executive: "exec",
  company: "company",
  category: "category",
  move: "move",
  implication: "implication",
  source: "src",
};
const RELS = ["led_by", "at_company", "in_category", "implies", "cited_by"];
const TIERS = ["1A", "1B", "1C", "2", "3"];

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

let corpus;
try {
  corpus = JSON.parse(readFileSync(target, "utf8"));
} catch (e) {
  console.error(`Cannot read corpus at ${target}: ${e.message}`);
  process.exit(2);
}

if (!corpus || typeof corpus !== "object") err("corpus is not an object");
if (!corpus.meta || typeof corpus.meta !== "object") err("meta missing");
if (!Array.isArray(corpus.nodes)) err("nodes must be an array");
if (!Array.isArray(corpus.edges)) err("edges must be an array");

if (errors.length === 0) {
  const ids = new Set();
  for (const n of corpus.nodes) {
    if (!n.id) err("node missing id");
    if (ids.has(n.id)) err(`duplicate node id: ${n.id}`);
    ids.add(n.id);
    if (!NODE_TYPES.includes(n.type)) err(`node ${n.id} has invalid type: ${n.type}`);
    else if (!n.id.startsWith(PREFIX[n.type] + ":"))
      err(`node ${n.id} id prefix must be "${PREFIX[n.type]}:" for type ${n.type}`);
    if (!n.props || typeof n.props !== "object") err(`node ${n.id} missing props`);
  }

  for (const m of corpus.nodes.filter((n) => n.type === "move")) {
    const prov = m.provenance || [];
    if (prov.length === 0) {
      err(`move ${m.id} has no provenance (unsourced claim)`);
      continue;
    }
    for (const p of prov) {
      if (!TIERS.includes(p.tier)) err(`move ${m.id} provenance has bad tier: ${p.tier}`);
      if (!ids.has(p.source_id)) err(`move ${m.id} provenance source_id ${p.source_id} not found`);
    }
    const expected = combinedConfidence(prov.map((p) => p.tier)).level;
    if (m.props.confidence !== expected) {
      err(
        `move ${m.id} confidence "${m.props.confidence}" != computed "${expected}" from tiers ${prov
          .map((p) => p.tier)
          .join(",")}`,
      );
    }
  }

  for (const e of corpus.edges) {
    if (!RELS.includes(e.rel)) err(`edge has invalid rel: ${e.rel}`);
    if (!ids.has(e.from)) err(`edge from ${e.from} not found`);
    if (!ids.has(e.to)) err(`edge to ${e.to} not found`);
  }

  const movesWithSource = new Set(
    corpus.edges.filter((e) => e.rel === "cited_by").map((e) => e.from),
  );
  for (const m of corpus.nodes.filter((n) => n.type === "move")) {
    if (!movesWithSource.has(m.id)) warn(`move ${m.id} has no cited_by edge`);
  }
}

for (const w of warnings) console.warn(`WARN  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR ${e}`);
  console.error(`\n✗ corpus invalid: ${errors.length} error(s)`);
  process.exit(1);
}
console.log(
  `✓ corpus valid — ${corpus.nodes.length} nodes, ${corpus.edges.length} edges, ${
    (corpus.meta.runs || []).length
  } run(s)${warnings.length ? `, ${warnings.length} warning(s)` : ""}`,
);
