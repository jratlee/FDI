---
description: Run a content asset through all three Skillfoundry gates (Relevance, Performance, Algorithmic Signal) and return one consolidated strategic audit report.
argument-hint: [path to a text asset, or paste the text after the command]
---

# /skillfoundry:strategic-audit

You are running the Skillfoundry strategic audit — the hero command. Route the
asset through all three gates in order and return **one consolidated report**.

## Input

The asset is provided as `$ARGUMENTS`. It may be:
- a path to a text/markdown file — read it, or
- pasted text — use it directly.

If no asset is supplied, ask for one and stop.

## Procedure

1. Read `skills/shared-audit-contract/SKILL.md`. Every gate output and the final
   report must conform to it. The machine schema is `schema/audit-report.schema.json`.
2. Run the gates in fixed order, each against the **original** asset text:
   1. Gate 1 — read `skills/relevance-gate/SKILL.md`, produce the relevance `GateResult`.
   2. Gate 2 — read `skills/performance-gate/SKILL.md`, produce the performance `GateResult`.
   3. Gate 3 — read `skills/signal-gate/SKILL.md`, produce the signal `GateResult`.
3. For each gate: score the sub-criteria first, compute the weighted total, derive
   the verdict (PASS >= 75, REVISE 50-74, BLOCK < 50), list ranked reasons with
   quoted evidence, and give specific line-level rewrites. A gate below PASS must
   return at least three rewrites.
4. Build the rollup: composite score (relevance 0.40, performance 0.35, signal
   0.25), ship recommendation (SHIP only if all PASS; BLOCK if any BLOCK; else
   REVISE), and the 3-5 ranked `top_moves` across all gates.

## Output

Emit a Markdown report with this shape:

```
# Skillfoundry Strategic Audit — <asset title>
Composite: <score>/100 · Recommendation: <SHIP|REVISE|BLOCK>

## Top moves
1. [<gate>] <move>
...

## Gate 1 — Relevance (Market-Deficit Analyzer) — <score>/100 · <verdict>
Framework: Jobs-to-be-Done (Christensen)
Ranked reasons: ...
Rewrites: original -> revised (rationale)

## Gate 2 — Performance (Enterprise Valuation Gate) — <score>/100 · <verdict>
...

## Gate 3 — Algorithmic Signal (Adversarial Defense Matrix) — <score>/100 · <verdict>
...
```

If the caller asks for machine-readable output, also emit the JSON object that
validates against `schema/audit-report.schema.json`. The Markdown and JSON must
agree.

Be specific. Every finding cites the asset; every rewrite is a concrete span
replacement, never vague advice. Name the public framework each gate applied.
