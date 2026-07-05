# Top Call — Signal as Code, the owned radar

Top Call is the **inbound sibling to Skillfoundry**. Where Skillfoundry is
*Strategy as Code* — a firewall that grades any content asset against opinionated
gates — Top Call is *Signal as Code*: it turns executive-intelligence monitoring
into an **owned asset** instead of a disposable weekly brief.

The free [Top Call prompt-pack](https://falsedawn.industries/topcall) proves the
thesis *and* its own ceiling: a prompt-pack is a recipe anyone can copy, and
every run starts from a blank page. This — the paid owned system — is what a
prompt-pack structurally cannot be.

## The three constructs (the thesis, in code)

| FDI thesis | Top Call construct | What it means |
|---|---|---|
| **Aggregated** | a citable **corpus** | every source you grade is written into a persistent, provenance-stamped store (`corpus/corpus.json`). The audit compounds instead of evaporating. |
| **Decentralized** | a **knowledge graph** | executives, companies, moves, categories, implications, and sources become a queryable node/edge graph — the relationships preserved, not re-derived. |
| **Autonomous** | a verifiable **MCP interface** | the repeatable read skills are exposed as MCP tools built to the same Anthropic standard as Skillfoundry, so an agent can call them and get answers stamped with source, tier, and confidence. |

## Why it compounds (and a prompt-pack can't)

Every source is classified into a **source-authority tier** (1A/1B/1C/2/3) at
ingest, and each executive move's confidence is computed from *all* the sources
that support it. When a Tier 1 trade later corroborates a move first seen in a
Tier 2 press release, the move's provenance array grows and its confidence
**upgrades from medium to high** — automatically, permanently, and traceably.

That upgrade is the moat: the non-replicable asset is not the prompts, it is the
graded, provenance-stamped corpus and the gated interface agents can trust.

## Layout

```
topcall/
  corpus/corpus.json          the owned asset (the graph, provenance-stamped)
  schema/                     corpus.schema.json + zero-dep validator
  lib/                        source-tiers · corpus (graph) · ingest · query
  sources/                    illustrative sample sources (drop your own here)
  bin/topcall.mjs             CLI: ingest / scan / audit / brief / stats
  server/mcp-server.mjs       stdio MCP server — reads the corpus, returns provenance
  skills/                     corpus-contract · exec-move-scan · authority-audit · brief-generation
  commands/                   /exec-move-scan · /authority-audit · /brief · /corpus-stats
  examples/                   generated brief + scan + stats
  .claude-plugin/plugin.json  Claude plugin manifest
  .mcp.json                   MCP server registration
```

## Quick start

```bash
cd topcall
node bin/topcall.mjs ingest            # grade sources into the corpus
node schema/validate-corpus.mjs        # verify integrity + confidence math
node bin/topcall.mjs brief             # a full, provenance-stamped brief
node bin/topcall.mjs scan --category "Retail Media" --min-tier 1B
node bin/topcall.mjs stats             # see the corpus compound
```

Re-running `ingest` is cumulative: known moves gain provenance (and may gain
confidence) instead of duplicating.

## MCP tools

| Tool | Returns |
|---|---|
| `exec_move_scan` | provenance-stamped executive moves, filterable by company / category / type / min tier |
| `authority_audit` | every source graded by tier, with paywall/discovery flags |
| `generate_brief` | a full Top Call brief from the corpus, every line sourced |
| `corpus_stats` | corpus growth: entities, moves by confidence, runs, confidence upgrades |

Register with any MCP client via `.mcp.json`; the tools are also surfaced as
prompts/slash commands.

## Scope

This is the owned-system MVP: a working corpus, graph, trust layer, and verifiable
interface with illustrative seed data. Live source ingestion (feeds, connectors),
payment/checkout, and licensing finalization are future work — the site lists the
paid tiers behind a waitlist. Every brief is a human-review draft, not a
publication.
