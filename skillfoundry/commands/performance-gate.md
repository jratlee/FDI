---
description: Run only Gate 2 (Performance / Enterprise Valuation Gate, brand equity + competitive positioning) on a content asset and return its GateResult.
argument-hint: [path to a text asset, or paste the text]
---

# /skillfoundry:performance-gate

Run **only** Gate 2 of the Skillfoundry audit on the asset in `$ARGUMENTS`
(a file path or pasted text). If none is supplied, ask for one and stop.

1. Read `skills/shared-audit-contract/SKILL.md` for the output contract.
2. Read `skills/performance-gate/SKILL.md` and apply its rubric.
3. Return a single `performance` GateResult: sub-criteria scored first, weighted
   total, verdict, ranked reasons with quoted evidence, and line-level rewrites.

This is a thin wrapper around one gate — for the full three-gate report use
`/skillfoundry:strategic-audit`.
