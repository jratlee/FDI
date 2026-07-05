#!/usr/bin/env node
/**
 * Top Call CLI — the human/CI entry point to the owned corpus.
 *
 *   node bin/topcall.mjs ingest [sources-dir]      grade sources into the corpus
 *   node bin/topcall.mjs scan   [--company X] [--category Y] [--type T] [--min-tier 1B]
 *   node bin/topcall.mjs audit                      source-authority audit / log
 *   node bin/topcall.mjs brief  [--category Y]       full provenance-stamped brief
 *   node bin/topcall.mjs stats                       corpus growth (compounding proof)
 *
 * The CLI and the MCP server share the same read layer, so an agent and a human
 * get identical, provenance-stamped answers.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCorpus, saveCorpus, CORPUS_PATH } from "../lib/corpus.mjs";
import { ingestDir } from "../lib/ingest.mjs";
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

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      flags[key] = val;
    }
  }
  return flags;
}

const [cmd, ...rest] = process.argv.slice(2);
const flags = parseFlags(rest);
const positional = rest.filter((a) => !a.startsWith("--"));

switch (cmd) {
  case "ingest": {
    const dir = positional[0] || join(ROOT, "sources");
    const corpus = loadCorpus();
    const run = ingestDir(corpus, dir);
    saveCorpus(corpus);
    console.log(`Ingested ${run.sources_ingested} source(s) from ${dir}`);
    console.log(`  new moves:          ${run.moves_new}`);
    console.log(`  corroborated moves: ${run.moves_corroborated}`);
    if (run.confidence_upgrades.length) {
      console.log(`  confidence upgrades (compounding):`);
      for (const u of run.confidence_upgrades) {
        console.log(`    ${u.move}: ${u.from} -> ${u.to}`);
      }
    }
    console.log(`Corpus saved -> ${CORPUS_PATH}`);
    break;
  }
  case "scan": {
    const corpus = loadCorpus();
    const moves = execMoveScan(corpus, {
      company: flags.company,
      category: flags.category,
      moveType: flags.type,
      minTier: flags["min-tier"],
    });
    if (flags.json === "true") console.log(JSON.stringify(moves, null, 2));
    else console.log(renderExecMoves(moves));
    break;
  }
  case "audit": {
    const corpus = loadCorpus();
    const sources = authorityAudit(corpus);
    if (flags.json === "true") console.log(JSON.stringify(sources, null, 2));
    else console.log(renderAudit(sources));
    break;
  }
  case "brief": {
    const corpus = loadCorpus();
    console.log(generateBrief(corpus, { category: flags.category, date: flags.date }));
    break;
  }
  case "stats": {
    const corpus = loadCorpus();
    console.log(JSON.stringify(corpusStats(corpus), null, 2));
    break;
  }
  default:
    console.log(
      [
        "Top Call — Signal as Code, the owned radar",
        "",
        "Usage:",
        "  node bin/topcall.mjs ingest [sources-dir]",
        "  node bin/topcall.mjs scan   [--company X] [--category Y] [--type T] [--min-tier 1B] [--json]",
        "  node bin/topcall.mjs audit  [--json]",
        "  node bin/topcall.mjs brief  [--category Y] [--date YYYY-MM-DD]",
        "  node bin/topcall.mjs stats",
      ].join("\n"),
    );
    if (cmd && cmd !== "help") process.exit(1);
}
