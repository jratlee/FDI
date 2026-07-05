---
name: exec-move-scan
description: Repeatable process to scan the Top Call corpus for executive moves and return them provenance-stamped, filtered by company, category, move type, or minimum source tier.
---

# Skill — Exec-Move Scan

Answer "what moved and can I trust it?" from the owned corpus. This skill reads
the graph; it does not re-search the web from scratch. Grading already happened
at ingest (see `corpus-contract`).

## Inputs

- `company` (optional) — substring match on company name.
- `category` (optional) — e.g. `Retail Media`, `CTV & Streaming`.
- `type` (optional) — one move type from the ontology.
- `min_tier` (optional) — require at least one source of this tier or better.

## Process

1. Load the corpus.
2. Select `move` nodes; apply filters.
3. For each move, gather its provenance (sources, tiers), implications, and the
   computed confidence.
4. Sort by confidence, then recency.
5. Emit each move with: headline, move type, confidence, summary, "why it
   matters", and **every** supporting source with its tier and access flag. If a
   move is corroborated by more than one source, state the count and rationale.

## Interfaces

- CLI: `node bin/topcall.mjs scan [--company X] [--category Y] [--type T] [--min-tier 1B] [--json]`
- MCP tool: `exec_move_scan({ company?, category?, type?, min_tier? })`

## Guarantee

No move is returned without provenance. A move supported only by Tier 3 sources
is returned as **low** confidence and should be treated as discovery, not
brief-grade evidence.
