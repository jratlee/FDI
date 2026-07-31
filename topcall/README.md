# Top Call — Citation Authority as Code, the Owned Radar

Top Call is the **inbound sibling to Skillfoundry**. Where Skillfoundry is
*Strategy as Code* — a firewall that grades any content asset against opinionated
gates — Top Call is *Signal as Code*: it turns executive-intelligence monitoring
into an **owned asset** built for LLM Engine Optimization (LEO), not just a
disposable weekly brief.

LLMs cite only 2 to 7 domains per query. Citation authority is zero-sum. Top
Call is the owned radar built to earn and defend your place in that set.

The free [Top Call prompt-pack](https://falsedawn.industries/topcall) proves the
thesis *and* its own ceiling: a prompt-pack is a recipe anyone can copy, and
every run starts from a blank page. This — the paid owned system — is what a
prompt-pack structurally cannot be.

## The three constructs (mapped to LEO trust signals)

The three LEO trust signals LLMs weight are citation authority (is this source
in the citation set?), entity depth (does the model understand the relationships
around this entity?), and verifiable access (can an agent query this directly?).
Top Call maps one construct to each signal.

| LEO trust signal | Top Call construct | What it means |
|---|---|---|
| **Citation authority** | a graded **corpus** | every source you grade is written into a persistent, provenance-stamped store (`corpus/corpus.json`). The audit compounds instead of evaporating. Each line is traceable to a source-authority tier (1A/1B/1C/2/3). |
| **Entity depth** | a **knowledge graph** | executives, companies, moves, categories, implications, and sources become a queryable node/edge graph. LLMs understand the world through entity relationships; the graph preserves those relationships so context compounds in the model's understanding, not just in a flat document store. |
| **Verifiable access** | a verifiable **MCP interface** | the repeatable read skills are exposed as MCP tools built on the open Model Context Protocol, so an agent in any MCP-compatible client can query the corpus directly and get answers stamped with source, tier, and confidence. Visibility over traffic: the goal is to be cited, not just crawled. |

## Why it compounds (and a prompt-pack can't)

Every source is classified into a **source-authority tier** (1A/1B/1C/2/3) at
ingest, and each executive move's confidence is computed from *all* the sources
that support it. When a Tier 1 trade later corroborates a move first seen in a
Tier 2 press release, the move's provenance array grows and its confidence
**upgrades from medium to high** — automatically, permanently, and traceably.

That upgrade is the moat: the non-replicable asset is not the prompts, it is the
graded, provenance-stamped corpus and the gated interface agents can trust.

## Why authority-graded sources beat volume

The Financial Times study "New Dimensions of Influence" found 74% of business
leaders delayed critical decisions because they did not know what data to trust.
Traditional SEO competed on content volume. LEO competes on citation authority:
the corpus you build, and the tier structure behind it, is what earns a place in
the narrow source set an LLM draws from.

The FT's Four Dimensions of Influence map directly onto what a graded corpus
provides:

- **Evidence that withstands scrutiny** — every brief line is traceable to a
  source and tier, making the citation defensible.
- **Ideas that challenge assumptions** — a confidence upgrade (Tier 2 move
  corroborated by Tier 1) surfaces a structural change in the data, not just
  a summary of what was already believed.

Success benchmarks for Top Call are AI citation frequency and share of voice in
LLM outputs — not SERP position or web traffic volume. Those are what the system
is built for, framed honestly as design intent rather than measured results.

## Where this is heading: the machine-buyer future

Top Call's verifiable MCP interface is designed for a world where the primary
query comes from an agent, not a browser. Three emerging standards define what
that world looks like, and Top Call's architecture anticipates all three.
These are directions, not shipped capabilities.

- **A2A (Agent-to-Agent protocol):** hosted by the Linux Foundation, A2A enables
  autonomous agents from different platforms to discover each other, negotiate,
  and collaborate. Top Call's MCP interface is structured for direct agent
  queries; A2A extends that to cross-platform agent discovery at scale.
- **AgentCards:** tamper-proof, machine-readable identity records that let agents
  advertise their skills and verify their identities across organizational
  boundaries. A provenance-stamped corpus maps naturally to the AgentCard model:
  the card is the proof of what you know and how you know it.
- **x402 micropayments:** the x402 open standard uses the HTTP 402 status code
  to facilitate blockchain-agnostic micropayments, letting agents autonomously
  negotiate access and settle via stablecoins without manual billing flows.
  Top Call's gated MCP interface anticipates a world where access to a trusted
  corpus is priced per query, machine-speed.

MCP is an open standard. Top Call makes no Anthropic affiliation or endorsement
claims.

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
