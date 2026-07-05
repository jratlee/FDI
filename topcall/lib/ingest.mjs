/**
 * Top Call ingestion pipeline.
 *
 * Reads user-provided sources (newsletters, article exports, watchlists, prior
 * briefs), classifies each source by authority tier, extracts executive moves
 * against the moves ontology, and writes graded, provenance-stamped records into
 * the corpus graph. Re-running is idempotent and CUMULATIVE: an already-known
 * move gains provenance (and may gain confidence) instead of being duplicated.
 *
 * Source file format (Markdown, human-writable). One `---` frontmatter block for
 * the source, then one `## headline` block per move with `key: value` lines:
 *
 *   ---
 *   publication: Ad Age
 *   url: https://adage.com/...
 *   date: 2026-06-29
 *   access: paywalled
 *   ---
 *   ## Kroger Precision Marketing names a new CMO
 *   move_type: commercialization
 *   company: Kroger Precision Marketing
 *   sector: retail-media
 *   category: Retail Media
 *   executive: Jordan Avery
 *   summary: ...
 *   so_what: ...
 *   implication: ...
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import {
  slug,
  upsertNode,
  addEdge,
  addProvenance,
} from "./corpus.mjs";
import { classifyTier, tierLabel } from "./source-tiers.mjs";

// Canonical executive-move ontology (Why-it-matters lens).
export const MOVE_TYPES = [
  "capability build",
  "turnaround",
  "category convergence",
  "commercialization",
  "brand repositioning",
  "m&a",
  "governance",
];

function normalizeMoveType(raw) {
  const n = String(raw || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (MOVE_TYPES.includes(n)) return n;
  if (n.includes("m&a") || n.includes("merger") || n.includes("acqui")) return "m&a";
  if (n.includes("govern")) return "governance";
  if (n.includes("reposition") || n.includes("brand")) return "brand repositioning";
  if (n.includes("commercial")) return "commercialization";
  if (n.includes("converg")) return "category convergence";
  if (n.includes("turnaround")) return "turnaround";
  if (n.includes("capability") || n.includes("build")) return "capability build";
  return "capability build";
}

/** Parse one source file into { source, moves[] }. */
export function parseSource(text, filename = "source.md") {
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  const front = {};
  let body = text;
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const m = line.match(/^([a-z_]+)\s*:\s*(.*)$/i);
      if (m) front[m[1].trim().toLowerCase()] = m[2].trim();
    }
    body = text.slice(fmMatch[0].length);
  }

  const source = {
    publication: front.publication || "Unknown",
    url: front.url || null,
    date: front.date || null,
    access: (front.access || "open").toLowerCase(),
    file: basename(filename),
  };

  const moves = [];
  const blocks = body.split(/^##\s+/m).slice(1);
  for (const block of blocks) {
    const lines = block.split("\n");
    const headline = lines.shift().trim();
    const fields = {};
    for (const line of lines) {
      const m = line.match(/^([a-z_]+)\s*:\s*(.*)$/i);
      if (m) fields[m[1].trim().toLowerCase()] = m[2].trim();
    }
    if (!headline) continue;
    moves.push({
      headline,
      move_type: fields.move_type || "",
      company: fields.company || "",
      sector: fields.sector || "",
      category: fields.category || "",
      executive: fields.executive || "",
      summary: fields.summary || "",
      so_what: fields.so_what || "",
      implication: fields.implication || "",
    });
  }
  return { source, moves };
}

/** Write one parsed source's records into the corpus under a run id. */
export function ingestParsed(corpus, parsed, runId) {
  const stats = { sources: 0, moves_new: 0, moves_corroborated: 0, upgrades: [] };
  if (!parsed.moves || parsed.moves.length === 0) return stats; // nothing to grade
  const s = parsed.source;
  const tier = classifyTier(s.publication);
  const sourceId = `src:${slug(s.publication, s.date || s.file, s.url || s.file)}`;
  const sourceNode = {
    id: sourceId,
    type: "source",
    props: {
      publication: s.publication,
      tier,
      tier_label: tierLabel(tier),
      url: s.url,
      date: s.date,
      access: s.access,
      file: s.file,
    },
    provenance: [],
  };
  upsertNode(corpus, sourceNode);
  stats.sources = 1;

  for (const mv of parsed.moves) {
    const moveType = normalizeMoveType(mv.move_type);
    const companyId = mv.company ? `company:${slug(mv.company)}` : null;
    const execId = mv.executive ? `exec:${slug(mv.executive)}` : null;
    const categoryId = mv.category ? `category:${slug(mv.category)}` : null;

    if (companyId) {
      upsertNode(corpus, {
        id: companyId,
        type: "company",
        props: { name: mv.company, sector: mv.sector || null },
        provenance: [],
      });
    }
    if (execId) {
      upsertNode(corpus, {
        id: execId,
        type: "executive",
        props: { name: mv.executive },
        provenance: [],
      });
    }
    if (categoryId) {
      upsertNode(corpus, {
        id: categoryId,
        type: "category",
        props: { name: mv.category },
        provenance: [],
      });
    }

    // Identity for dedup / corroboration: the underlying event, not the article.
    const moveId = `move:${slug(mv.company || mv.headline, mv.executive, moveType)}`;
    const { node: moveNode, created } = upsertNode(corpus, {
      id: moveId,
      type: "move",
      props: {
        move_type: moveType,
        headline: mv.headline,
        summary: mv.summary,
        so_what: mv.so_what,
        date: s.date,
        company: mv.company || null,
        executive: mv.executive || null,
        category: mv.category || null,
      },
      provenance: [],
    });
    if (!moveNode.provenance) moveNode.provenance = [];

    if (companyId) addEdge(corpus, moveId, companyId, "at_company");
    if (execId) addEdge(corpus, moveId, execId, "led_by");
    if (categoryId) addEdge(corpus, moveId, categoryId, "in_category");
    addEdge(corpus, moveId, sourceId, "cited_by");

    if (mv.implication) {
      const impId = `implication:${slug(mv.company || mv.headline, mv.implication)}`;
      upsertNode(corpus, {
        id: impId,
        type: "implication",
        props: { text: mv.implication },
        provenance: [],
      });
      addEdge(corpus, moveId, impId, "implies");
    }

    const prov = addProvenance(moveNode, sourceNode, runId);
    if (prov.new && created) stats.moves_new += 1;
    else if (prov.new) stats.moves_corroborated += 1;
    if (prov.changed) {
      stats.upgrades.push({ move: moveId, from: prov.from, to: prov.to });
    }
  }
  return stats;
}

/** Ingest every source file in a directory. Returns the run record. */
export function ingestDir(corpus, dir) {
  const runId = `run:${new Date().toISOString()}`;
  const files = readdirSync(dir)
    .filter(
      (f) =>
        (f.endsWith(".md") || f.endsWith(".txt")) &&
        !/^readme/i.test(f) &&
        statSync(join(dir, f)).isFile(),
    )
    .sort();

  const totals = { sources: 0, moves_new: 0, moves_corroborated: 0, upgrades: [], files: [] };
  for (const f of files) {
    const parsed = parseSource(readFileSync(join(dir, f), "utf8"), f);
    const st = ingestParsed(corpus, parsed, runId);
    totals.sources += st.sources;
    totals.moves_new += st.moves_new;
    totals.moves_corroborated += st.moves_corroborated;
    totals.upgrades.push(...st.upgrades);
    totals.files.push(f);
  }

  const run = {
    run_id: runId,
    at: new Date().toISOString(),
    dir,
    files: totals.files,
    sources_ingested: totals.sources,
    moves_new: totals.moves_new,
    moves_corroborated: totals.moves_corroborated,
    confidence_upgrades: totals.upgrades,
  };
  corpus.meta.runs.push(run);
  return run;
}
