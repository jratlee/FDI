---
name: ai-citation-authority
description: Make the Top Call corpus and the briefs generated from it discoverable, extractable, and citable by AI answer engines (ChatGPT, Perplexity, Gemini, Claude, Copilot, Google AI Overviews). Use when asked to improve Top Call's citation authority, structure a brief so LLMs cite it, build llms.txt / agent-readable surfaces, or measure whether Top Call appears in AI answers. Maps the three LEO trust signals to Top Call's own constructs. Read corpus-contract first.
---

# Skill — AI Citation Authority (LEO)

Adapted for Top Call from the `ai-seo` / GEO / AEO body of practice. Top Call's
premise: **LLMs cite only 2-7 domains per query; citation authority is
zero-sum.** This skill is how Top Call earns and defends its place in that set.

Read `corpus-contract` first. This skill does not change what the corpus holds -
it governs how the corpus and its outputs are *surfaced* to answer engines.

## The three LEO trust signals -> Top Call constructs

| LEO trust signal | Top Call construct | Concrete mechanism |
|---|---|---|
| **Citation authority** - is this source in the citation set? | the graded **corpus** | every source graded into a tier (1A/1B/1C/2/3) and written to `corpus/corpus.json`; the audit compounds instead of evaporating per run |
| **Entity depth** - does the model understand the relationships? | the **knowledge graph** | executives, companies, moves, categories, implications, sources as a node/edge graph; relationships preserved so context compounds *in the model's understanding* |
| **Verifiable access** - can an agent query this directly? | the **MCP server** | `server/mcp-server.mjs` exposes the corpus to any MCP-capable agent |

## Governing rule (do not skip)

> Never optimize *for* an engine by degrading the corpus. Top Call's moat is
> verified provenance. Anything that raises citation odds but weakens provenance
> is a net loss - a Tier-3 fact laundered into a Tier-1 claim is exactly the
> failure the corpus exists to prevent.

## Platform behaviour (what to optimize, per engine)

| Platform | Source selection | What helps |
|---|---|---|
| **Google AI Overviews** | Strong correlation with core Search ranking | E-E-A-T, people-first content, normal headings/paragraphs. **Google explicitly says no special markup or AI files are required** and warns against writing separate content for AI (scaled-content-abuse risk). |
| **ChatGPT (search)** | Draws wider than top-ranked | extractable passages, FAQ/comparison tables, third-party corroboration |
| **Perplexity** | Always cites; favors authoritative + recent + well-structured | freshness, clear sourcing, structured blocks |
| **Gemini** | Google index + Knowledge Graph | entity clarity, structured data |
| **Copilot** | Bing index + authoritative sources | Bing indexability, authority signals |
| **Claude** | Brave Search when enabled | training data + Brave results; clean, quotable prose |

**Key stats (carry attribution):** AI Overviews appear in ~45% of Google
searches and cut site clicks up to 58%; brands are ~6.5x more likely to be cited
via third-party sources than their own domain; optimized content is cited ~3x
more often; statistics + citations lift visibility 40%+. (Source: `ai-seo`
v2.5.0, itself citing Google Search Central + GEO research.)

## How to raise Top Call's own citation authority

### 1. Make briefs extractable (does not hurt Google)
- Lead each category with a **40-60 word answer block** - a self-contained,
  quotable statement of the move and why it matters, *with its confidence and
  provenance inline*.
- Use **comparison tables** for category scans (company x move x tier).
- Use **definition blocks** for recurring entities (executive, company).
- Keep headings semantic and descriptive; no chunking tricks.

### 2. Feed the entity depth
- Every move must resolve to `exec:` / `company:` / `category:` nodes
  (per `corpus-contract` dedup rule). A model that can traverse
  exec->company->category understands the world the brief describes.
- Prefer explicit relationship sentences: "X left Y for Z" beats "there was a
  leadership change."

### 3. Publish a verifiable-access surface
- `llms.txt` at the site root + an agent-readable corpus export. Top Call ships
  this naturally via the MCP server; document the query surface publicly so
  answer engines and agents can reach the corpus directly.

### 4. Third-party corroboration beats self-publishing
- The 6.5x third-party stat is the strategic tell: Top Call's *own* domain is
  not where it gets cited. The corpus earns citations when its moves are
  corroborated across Tier 1 trades and when Top Call's graded output becomes
  the citation *others* point to.

## Measurement (do this, don't assert it)

1. Run the target queries across ChatGPT, Perplexity, Google AI Overviews,
   Gemini, Copilot.
2. Record whether Top Call (or the brand) appears, and via which third-party
   source.
3. Log as an entity in the corpus (`source` nodes with tier), so citation
   visibility is tracked with the same provenance discipline as everything else.
4. Compare across runs - the same compounding logic as move confidence.

## References

Source material (adapt, do not copy wholesale) lives in
`stars/marketingskills -> skills/ai-seo/references/`: `platform-ranking-factors.md`,
`content-patterns.md`, `content-types.md`, `okf.md`, `agent-readiness.md`,
`citations-vs-recommendations.md`, `format-volatility.md`. Treat format
volatility as real: AI citation formats shift, so optimize for the durable
signal (verified provenance + entity depth) over any single engine's current
format preference.
