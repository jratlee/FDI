---
name: performance-gate
description: Gate 2 of the Skillfoundry audit. The Enterprise Valuation Gate - the Performance Filter. Scores whether a content asset ties its narrative to defensible enterprise value and category authority a C-suite can accept. Rests on Aaker's brand equity and Porter's competitive positioning. Read shared-audit-contract first.
---

# Gate 2 — Enterprise Valuation Gate (The Performance Filter)

**Frameworks (public, cited):**
- David A. Aaker, *Managing Brand Equity* (1991) and *Building Strong Brands*
  (1996) — brand equity as awareness, perceived quality, associations, and
  loyalty; the discipline of translating soft brand signals into asset value.
- Michael E. Porter, *Competitive Strategy* (1980) and *"What Is Strategy?"*
  (HBR, 1996) — differentiation and defensible positioning; strategy is the
  choice of a distinct, hard-to-copy position, not operational sameness.

**What this gate is for:** comms leaders lose budget when they defend work in soft
PR metrics (impressions, sentiment) that a CFO discounts. This gate forces the
asset's narrative to connect to enterprise value drivers a C-suite already tracks,
and to stake a differentiated, defensible category position rather than
restating category consensus.

## Conform to the contract

Return a `GateResult` (`gate: "performance"`) as defined in
`shared-audit-contract`. Score the sub-criteria first, then compute the total.

## Sub-criteria (weights sum to 1.0)

1. **Value-driver linkage (weight 0.30).**
   Does the narrative connect to a driver the C-suite tracks — revenue, cost of
   acquisition, retention/LTV, risk, or capital efficiency — rather than
   impressions or vanity engagement? Full points when at least one claim maps to a
   named business driver. Zero for pure reach/awareness framing.

2. **Category-authority position (weight 0.25).**
   Does the asset stake a distinct, defensible position (a point of view a
   competitor could not honestly copy), or does it restate what the whole category
   already says? Reward a proprietary thesis, mechanism, or proof. Penalize
   me-too "leadership" claims with no evidence of difference.

3. **Claim substantiation (weight 0.25).**
   Is every strong claim grounded — a number, a named source, a shipped artifact,
   a mechanism — or is it assertion? Full points when claims carry proof a skeptic
   can check. Penalize adjectives standing in for evidence ("game-changing,"
   "revolutionary").

4. **Risk-constraint architecture (weight 0.20).**
   Does the asset avoid claims that create legal, competitive, or credibility
   risk (overpromising, unfalsifiable superlatives, disclosing what should stay
   private)? Full points for confident claims that stay inside what can be
   defended. Penalize exposure.

**Score = round(sum(weight_i * points_i))**, points_i in 0-100.

## Ranked reasons

Lead with the finding that most weakens the business case. Every `high`-severity
reason quotes the line and has a matching rewrite. Typical high-severity findings:
- Defends the work in impressions/sentiment a CFO discounts.
- Claims category leadership with no differentiating proof.
- Superlatives ("transformative") standing in for measurable value.

## Rewrites (line-level)

For each defect, pair the exact `original` span with a `revised` version that:
- Re-anchors a soft claim to a named enterprise value driver.
- Converts a me-too claim into a differentiated, defensible one (or attaches the
  proof that makes it defensible).
- Replaces an unsubstantiated superlative with a checkable fact or mechanism.

Name the criterion in each `rationale`. Do not rewrite spans that already pass.

## Clean-room note

Built from the public Aaker brand-equity and Porter positioning literature. Do
not reproduce any employer-proprietary valuation model, KPI taxonomy, or
"enterprise value" scoring rubric. Restate from the cited public sources when in
doubt.
