/**
 * Top Call corpus — the owned asset.
 *
 * A persistent, provenance-stamped knowledge graph stored as one JSON file. It
 * is a plain node/edge graph so it stays inspectable, diffable, and portable:
 *
 *   nodes: { id, type, props, provenance[] }
 *     types: executive | company | category | move | implication | source
 *   edges: { from, to, rel }
 *     rels: led_by | at_company | in_category | implies | cited_by
 *
 * Provenance lives on `move` nodes as an array — each corroborating source
 * appends to it, and confidence is recomputed from the set. That is the whole
 * point: the audit compounds instead of being re-derived from a blank page each
 * run. A prompt-pack cannot do this; an owned corpus can.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { combinedConfidence, tierLabel } from "./source-tiers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const CORPUS_PATH = join(ROOT, "corpus", "corpus.json");

export const CORPUS_VERSION = "1.0.0";

export function emptyCorpus() {
  return {
    meta: {
      version: CORPUS_VERSION,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      runs: [],
    },
    nodes: [],
    edges: [],
  };
}

export function loadCorpus(path = CORPUS_PATH) {
  if (!existsSync(path)) return emptyCorpus();
  return JSON.parse(readFileSync(path, "utf8"));
}

export function saveCorpus(corpus, path = CORPUS_PATH) {
  corpus.meta.updated_at = new Date().toISOString();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(corpus, null, 2) + "\n");
  return path;
}

export function slug(...parts) {
  return parts
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/* ---------- graph helpers ---------- */

export function indexNodes(corpus) {
  const by = new Map();
  for (const n of corpus.nodes) by.set(n.id, n);
  return by;
}

export function nodesOfType(corpus, type) {
  return corpus.nodes.filter((n) => n.type === type);
}

export function upsertNode(corpus, node) {
  const existing = corpus.nodes.find((n) => n.id === node.id);
  if (!existing) {
    corpus.nodes.push(node);
    return { node, created: true };
  }
  existing.props = { ...existing.props, ...node.props };
  return { node: existing, created: false };
}

export function addEdge(corpus, from, to, rel) {
  if (corpus.edges.some((e) => e.from === from && e.to === to && e.rel === rel)) return false;
  corpus.edges.push({ from, to, rel });
  return true;
}

export function neighbors(corpus, id, rel) {
  return corpus.edges
    .filter((e) => e.from === id && (!rel || e.rel === rel))
    .map((e) => e.to);
}

/**
 * Attach a source to a move's provenance array (deduped by source id) and
 * recompute the move's combined confidence from every source that supports it.
 * Returns whether confidence changed — the visible sign of compounding.
 */
export function addProvenance(moveNode, source, runId) {
  moveNode.provenance = moveNode.provenance || [];
  const already = moveNode.provenance.find((p) => p.source_id === source.id);
  if (!already) {
    moveNode.provenance.push({
      source_id: source.id,
      publication: source.props.publication,
      tier: source.props.tier,
      tier_label: tierLabel(source.props.tier),
      url: source.props.url || null,
      date: source.props.date || null,
      access: source.props.access || "open",
      run_id: runId,
      ingested_at: new Date().toISOString(),
    });
  }
  const before = moveNode.props.confidence;
  const conf = combinedConfidence(moveNode.provenance.map((p) => p.tier));
  moveNode.props.confidence = conf.level;
  moveNode.props.confidence_rationale = conf.rationale;
  moveNode.props.source_count = moveNode.provenance.length;
  return { changed: before && before !== conf.level, from: before, to: conf.level, new: !already };
}

/** All sources (with tier) that support a given move, newest first. */
export function moveSources(moveNode) {
  return [...(moveNode.provenance || [])].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || "")),
  );
}
