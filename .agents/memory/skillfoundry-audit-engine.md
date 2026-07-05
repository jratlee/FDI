---
name: Skillfoundry server-side audit engine
description: Why the Tier 2 run endpoint uses a deterministic heuristic engine, not an LLM, and how the gate rubrics map to it.
---

# Skillfoundry server-side audit engine

The Tier 2/3 "Living Brain" run path (`POST /api/skillfoundry/run`) runs a
**deterministic, zero-dependency heuristic engine** (`skillfoundry/engine/audit.mjs`),
not an LLM call.

**Why:** The MCP server is deliberately bring-your-own-model (it composes the
rubric+contract+schema+asset into a prompt and lets the client's model reason),
and there is no server-side chat-LLM available in this repo (only replitmail +
resend; external_apis has no general LLM). A deterministic engine also matches the
product's "strategy as code" promise: the score is computed from the gate's
weighted sub-criteria and is repeatable (same asset -> same report), so an owner
can trust/track/defend it. An LLM audit would not be reproducible.

**How to apply:** The engine implements each gate's rubric sub-criteria as text
heuristics (LLM-tell regex counts, value-driver vs. vanity-metric detection,
citation/number/named-entity density, author-serving-CTA detection, etc.),
computes weighted scores + verdicts + composite + top_moves, and produces
evidence quotes and line-level rewrites from real spans. Output is validated
against `schema/audit-report.schema.json` before it leaves the server via the
shared validator core `schema/validate.mjs` (the CLI `validate-report.mjs` and the
`audit-report` workflow import the same core, so CI and over-the-wire validate
identically). Heuristics are approximate for judgment-heavy gates (relevance,
performance) and strongest for the signal gate; that tradeoff was accepted in
favor of determinism and no external dependency. If you ever add an LLM path,
keep the deterministic engine as the graceful-degradation fallback.
