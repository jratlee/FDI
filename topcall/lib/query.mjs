/**
 * Top Call read layer.
 *
 * Every function here answers a question FROM the persistent corpus and returns
 * provenance with the answer — source, tier, and confidence attached to each
 * claim. This is what makes Top Call verifiable: an agent (via MCP) or a human
 * (via CLI) gets the same graded answer, and can trace every line to a source.
 *
 * Unlike a prompt-pack, nothing here re-derives judgment from a blank page. The
 * grading already happened at ingest and lives in the graph.
 */

import { nodesOfType, neighbors, indexNodes, moveSources } from "./corpus.mjs";
import { tierRank, confRank } from "./source-tiers.mjs";

function accessTag(access) {
  if (!access || access === "open") return "";
  const map = {
    paywalled: " — **Paywalled / subscription-only**",
    registration: " — **May require registration**",
    gift: " — **Gift article / may require registration**",
    limited: " — **Extraction limited**",
  };
  return map[access] || ` — **${access}**`;
}

function moveContext(corpus, byId, move) {
  const impIds = neighbors(corpus, move.id, "implies");
  const implications = impIds.map((id) => byId.get(id)?.props.text).filter(Boolean);
  return {
    id: move.id,
    move_type: move.props.move_type,
    headline: move.props.headline,
    summary: move.props.summary,
    so_what: move.props.so_what,
    date: move.props.date,
    company: move.props.company,
    executive: move.props.executive,
    category: move.props.category,
    confidence: move.props.confidence,
    confidence_rationale: move.props.confidence_rationale,
    source_count: move.props.source_count || (move.provenance || []).length,
    sources: moveSources(move),
    implications,
  };
}

/**
 * Executive-move scan. Filters by company/category/min tier, sorts by
 * confidence then recency, and returns provenance-stamped move objects.
 */
export function execMoveScan(corpus, { company, category, minTier, moveType } = {}) {
  const byId = indexNodes(corpus);
  let moves = nodesOfType(corpus, "move").map((m) => moveContext(corpus, byId, m));

  if (company) {
    const c = company.toLowerCase();
    moves = moves.filter((m) => (m.company || "").toLowerCase().includes(c));
  }
  if (category) {
    const c = category.toLowerCase();
    moves = moves.filter((m) => (m.category || "").toLowerCase().includes(c));
  }
  if (moveType) {
    const t = moveType.toLowerCase();
    moves = moves.filter((m) => (m.move_type || "").toLowerCase() === t);
  }
  if (minTier) {
    const max = tierRank(minTier);
    moves = moves.filter((m) => m.sources.some((s) => tierRank(s.tier) <= max));
  }

  moves.sort(
    (a, b) =>
      confRank(b.confidence) - confRank(a.confidence) ||
      String(b.date || "").localeCompare(String(a.date || "")),
  );
  return moves;
}

/** Source-authority audit: every source in the corpus, graded, with flags. */
export function authorityAudit(corpus) {
  const sources = nodesOfType(corpus, "source").map((s) => {
    const supports = corpus.edges.filter((e) => e.to === s.id && e.rel === "cited_by").length;
    return {
      id: s.id,
      publication: s.props.publication,
      tier: s.props.tier,
      tier_label: s.props.tier_label,
      url: s.props.url,
      date: s.props.date,
      access: s.props.access,
      supports_moves: supports,
      flags: [
        ...(s.props.access && s.props.access !== "open" ? [`access:${s.props.access}`] : []),
        ...(s.props.tier === "3" ? ["low-authority: discovery only, keep out of main brief"] : []),
        ...(s.props.tier === "2" ? ["primary source: confirms facts, not interpretation"] : []),
      ],
    };
  });
  sources.sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
  return sources;
}

export function corpusStats(corpus) {
  const count = (t) => nodesOfType(corpus, t).length;
  const moves = nodesOfType(corpus, "move");
  const byConf = { high: 0, medium: 0, low: 0 };
  for (const m of moves) byConf[m.props.confidence] = (byConf[m.props.confidence] || 0) + 1;
  const totalUpgrades = (corpus.meta.runs || []).reduce(
    (n, r) => n + (r.confidence_upgrades?.length || 0),
    0,
  );
  return {
    version: corpus.meta.version,
    updated_at: corpus.meta.updated_at,
    runs: (corpus.meta.runs || []).length,
    nodes: corpus.nodes.length,
    edges: corpus.edges.length,
    entities: {
      executive: count("executive"),
      company: count("company"),
      category: count("category"),
      move: count("move"),
      implication: count("implication"),
      source: count("source"),
    },
    moves_by_confidence: byConf,
    confidence_upgrades_all_time: totalUpgrades,
  };
}

/* ---------- markdown renderers (what agents & humans read) ---------- */

function fmtSource(s) {
  const link = s.url ? `[${s.publication}, ${s.date || "n.d."}](${s.url})` : `${s.publication}, ${s.date || "n.d."}`;
  return `${link} — *${s.tier} · ${s.tier_label}*${accessTag(s.access)}`;
}

export function renderExecMoves(moves) {
  if (moves.length === 0) {
    return "_No high-confidence executive moves in the corpus for this filter. Add local newsletters or article exports and re-ingest._";
  }
  const out = ["## Executive Moves", ""];
  for (const m of moves) {
    const who = m.executive ? `${m.company} — ${m.executive}` : m.company || "";
    out.push(`- **${who ? who + ": " : ""}${m.headline}** _(${m.move_type} · confidence: ${m.confidence})_`);
    if (m.summary) out.push(`  - ${m.summary}`);
    if (m.so_what) out.push(`  - **Why it matters:** ${m.so_what}`);
    for (const s of m.sources) out.push(`  - Source: ${fmtSource(s)}`);
    if (m.source_count > 1) out.push(`  - _Corroborated by ${m.source_count} sources — ${m.confidence_rationale}_`);
  }
  return out.join("\n");
}

export function renderAudit(sources) {
  const out = [
    "## Source Authority Audit",
    "",
    "| Publication | Tier | Access | Supports | Flags |",
    "|---|---|---|---:|---|",
  ];
  for (const s of sources) {
    out.push(
      `| ${s.publication} | ${s.tier} · ${s.tier_label} | ${s.access} | ${s.supports_moves} | ${
        s.flags.join("; ") || "—"
      } |`,
    );
  }
  return out.join("\n");
}

/**
 * Full Top Call brief, generated deterministically from the corpus. The "Top
 * Call" is the highest-confidence, most-corroborated move. Every line carries
 * its provenance.
 */
export function generateBrief(corpus, { category, date } = {}) {
  const moves = execMoveScan(corpus, { category });
  const briefDate = date || new Date().toISOString().slice(0, 10);
  const scope = category ? ` — ${category}` : " — Advertising, Marketing, Media & Commerce";
  const out = [`# Top Call Intelligence Brief${scope} — ${briefDate}`, ""];

  if (moves.length === 0) {
    out.push("_The corpus has no moves for this scope yet. Ingest sources to build it._");
    return out.join("\n");
  }

  const top = moves[0];
  out.push("## Top Call");
  out.push(`**${top.company ? top.company + ": " : ""}${top.headline}**`);
  out.push("");
  if (top.so_what) out.push(`- **Why it matters:** ${top.so_what}`);
  out.push(`- **Confidence:** ${top.confidence} — ${top.confidence_rationale || "single source"}`);
  out.push(`- **Provenance:** ${top.sources.map((s) => `${s.publication} (${s.tier})`).join("; ")}`);
  out.push("");

  // TLDR: one line per distinct category present.
  out.push("## TLDR");
  const cats = [...new Set(moves.map((m) => m.category).filter(Boolean))];
  if (cats.length) {
    for (const c of cats) {
      const first = moves.find((m) => m.category === c);
      out.push(`- **${c}:** ${first.headline} _(confidence: ${first.confidence})_`);
    }
  } else {
    out.push(`- ${top.headline}`);
  }
  out.push("");

  out.push(renderExecMoves(moves));
  out.push("");

  out.push("## Bottom Line");
  const byId = indexNodes(corpus);
  const impl = [];
  for (const m of nodesOfType(corpus, "move")) {
    for (const id of neighbors(corpus, m.id, "implies")) {
      const t = byId.get(id)?.props.text;
      if (t && !impl.includes(t)) impl.push(t);
    }
  }
  for (const t of impl.slice(0, 5)) out.push(`- ${t}`);
  out.push("");

  out.push(renderAudit(authorityAudit(corpus)));
  return out.join("\n");
}
