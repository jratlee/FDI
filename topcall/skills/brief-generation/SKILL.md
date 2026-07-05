---
name: brief-generation
description: Repeatable process to generate a full Top Call intelligence brief from the corpus — Top Call, TLDR, executive moves, bottom line, and source log — deterministically and provenance-stamped.
---

# Skill — Brief Generation

Produce an executive-ready brief entirely from the owned corpus. Unlike a
prompt-pack that drafts from a blank page each run, this reads accumulated,
graded knowledge — so the brief gets richer as the corpus compounds.

## Process

1. Load the corpus; optionally scope to one `category`.
2. **Top Call** — pick the highest-confidence, most-corroborated move. State why
   it matters, its confidence + rationale, and its provenance chain.
3. **TLDR** — one line per category present, each with its confidence.
4. **Executive Moves** — the full provenance-stamped scan (see `exec-move-scan`).
5. **Bottom Line** — the distinct `implication` nodes across the corpus.
6. **Source Authority Log** — the full audit table (see `authority-audit`).

## Interfaces

- CLI: `node bin/topcall.mjs brief [--category Y] [--date YYYY-MM-DD]`
- MCP tool: `generate_brief({ category? })`

## Standard

Every included item must carry a source and a "so what". The Top Call must
synthesize across the corpus, not restate one headline. The source log must show
the authority tier of everything the brief rests on. Human review before external
use — the brief is a draft, not a publication.
