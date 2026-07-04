---
name: shared-audit-contract
description: The single output contract every Skillfoundry gate conforms to. Read this before running any gate so all three produce the same shape - a 0-100 score, ranked reasons, and line-level rewrites - that composes into one consolidated report.
---

# Shared Audit Contract

Every Skillfoundry gate is a function of the same signature:

```
gate(asset_text) -> GateResult
```

and a strategic audit is exactly three of those results plus a rollup. This file
is the contract. If a gate does not conform to it, the audit is invalid. The
machine-readable JSON Schema lives at `schema/audit-report.schema.json`; this
file is the human/agent-facing explanation of how to fill it.

## Why a fixed contract

The product promise is "strategy as code": a repeatable, opinionated audit whose
output a team can trust and compare across assets. A free-form "make this better"
prompt cannot be compared, tracked, or defended to a C-suite. A fixed schema can.
So the score is not a vibe — it is computed from the gate's weighted sub-criteria,
and every finding must cite evidence from the asset.

## GateResult (produced by each gate)

- `gate` — one of `relevance` | `performance` | `signal` (stable id).
- `gate_name` — the product name (e.g. `Market-Deficit Analyzer`).
- `framework` — the public, cited framework the gate rests on.
- `score` — integer 0-100, computed as the weighted sum of the gate's
  `subscores` (each criterion contributes `weight * points`). Never freehand it.
- `verdict` — derived strictly from the score:
  - `PASS` when score >= 75
  - `REVISE` when score is 50-74
  - `BLOCK` when score < 50
- `subscores` — the weighted criteria that produced the score, so the number is
  auditable. Weights within a gate sum to 1.0.
- `ranked_reasons` — why the score is what it is, most important first. Each has a
  `severity` (`high`/`medium`/`low`), a plain-language `finding`, and short
  `evidence` (a quote or location from the asset). At least one reason is required.
- `rewrites` — line-level fixes, never vague prose. Each pairs the exact
  `original` span with a concrete `revised` replacement and a `rationale` naming
  the rubric criterion it satisfies. A gate that scores below PASS must return at
  least three rewrites.

## Consolidated report (produced by the chained audit)

- `asset` — `title`, optional `source`, `word_count`, `audited_at` (ISO-8601).
- `gates` — exactly three GateResults in fixed order: relevance, performance, signal.
- `rollup`:
  - `composite_score` — weighted mean of the three gate scores. Default weights:
    **relevance 0.40, performance 0.35, signal 0.25** (relevance is weighted
    highest because an asset that solves no real job cannot be rescued by
    performance framing or distribution polish).
  - `ship_recommendation` — `SHIP` only if all three gates PASS; `BLOCK` if any
    gate BLOCKs; otherwise `REVISE`.
  - `top_moves` — the 3-5 highest-leverage changes across all gates, ranked. This
    is the single "what do I do first" answer the owner acts on.

## Output format

Emit the consolidated **Markdown report** for humans (default), and when the
caller asks for automation, also emit the JSON object validating against
`schema/audit-report.schema.json`. The Markdown and JSON must not disagree.

## Scoring discipline (applies to every gate)

1. Score the sub-criteria first, then compute the total. Do not pick a total and
   back-fill.
2. Every `high`-severity reason must have a corresponding rewrite.
3. Quote the asset. A finding with no evidence is not allowed.
4. Reward specificity, penalize genericness. If a sentence could appear verbatim
   in a competitor's post, it is a defect, not neutral.
