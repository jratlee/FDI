---
name: corpus-contract
description: The shared contract for the Top Call corpus — entity graph, source-authority tiers, provenance, and confidence. Every Top Call skill reads and writes against this contract so answers stay verifiable and compounding.
---

# Top Call Corpus Contract

This is the single source of truth for how Top Call represents what it knows. The
exec-move-scan, authority-audit, and brief-generation skills all operate against
this contract. The corpus is the owned asset; this contract keeps it verifiable.

## The graph

The corpus is a node/edge graph persisted as one JSON file (`corpus/corpus.json`,
validated by `schema/corpus.schema.json`).

**Nodes** — `{ id, type, props, provenance[] }`. Types:

| type | what it is | id prefix |
|---|---|---|
| `executive` | a named leader | `exec:` |
| `company` | a tracked organization | `company:` |
| `category` | a coverage bucket (Retail Media, CTV & Streaming, …) | `category:` |
| `move` | an executive/strategic event | `move:` |
| `implication` | a "so what" consequence | `implication:` |
| `source` | a graded publication/article | `src:` |

**Edges** — `{ from, to, rel }`. Rels: `led_by` (move→executive),
`at_company` (move→company), `in_category` (move→category), `implies`
(move→implication), `cited_by` (move→source).

Only `move` nodes carry `provenance[]` — the graded sources that support the
claim. Confidence is computed from that array, never asserted by hand.

## Source-authority tiers (the trust layer)

Every source is classified into exactly one tier. Unknown publications fall to
Tier 3 — nothing inherits authority it did not earn.

- **1A** — high-authority business/news media (Reuters, Bloomberg, WSJ, CNBC, FT…). Base confidence: **high**.
- **1B** — brand-name ad/marketing/media trades (Ad Age, Adweek, Digiday, Retail Dive…). Base: **high**.
- **1C** — reputable analyst / trade body / measurement (IAB, WARC, Forrester, Nielsen…). Base: **high**.
- **2** — primary sources for fact confirmation (press releases, IR, Business Wire, LinkedIn). Base: **medium**.
- **3** — supplemental / discovery only (vendor blogs, SEO pages, listicles). Base: **low**.

## Confidence (how the corpus compounds)

Confidence for a move is derived from the set of tiers of ALL its sources:

- any **Tier 1** source present → **high**;
- else any **Tier 2** source → **medium**;
- else (Tier 3 only) → **low**.

Corroboration is additive. A move first seen in a Tier 2 press release is
**medium**; when a Tier 1 trade later reports the same underlying event, its
provenance array grows and it **upgrades to high**. That upgrade is the visible
proof that the corpus compounds instead of being re-derived each run. Multiple
Tier 3 sources never launder into a Tier 1 fact.

## Move identity (dedup / corroboration)

A move's id is a slug of `company + executive + move_type`. Two articles about
the same underlying event resolve to the same move node and append provenance,
rather than creating duplicates. This is what lets corroboration accumulate.

## Move types (ontology)

`capability build`, `turnaround`, `category convergence`, `commercialization`,
`brand repositioning`, `m&a`, `governance`. Each move records the lens that makes
it matter in `so_what`.

## The rule

> Never emit a claim without its provenance. Every move an agent or human reads
> back must carry source, tier, and confidence, and must be traceable to a
> `source` node in the graph.
