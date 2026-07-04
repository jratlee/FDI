---
name: signal-gate
description: Gate 3 of the Skillfoundry audit. The Adversarial Defense Matrix - the Algorithmic-Signal Filter. Scores whether a content asset survives an AI-flooded feed - strips LLM stylistic tells, raises human-signal density, and structures it to be cited by AI answer engines. Rests on public GEO/AEO research and answer-engine documentation. Read shared-audit-contract first.
---

# Gate 3 — Adversarial Defense Matrix (The Algorithmic-Signal Filter)

**Frameworks (public, cited):**
- Aggarwal, Murahari, et al., *"GEO: Generative Engine Optimization,"* KDD 2024 —
  peer-reviewed evidence that adding cited sources, statistics, and quotations
  measurably raises a source's visibility in generative-engine answers.
- Google Search Central, *"Creating helpful, reliable, people-first content"*
  (E-E-A-T guidance) — experience, expertise, authoritativeness, trust as public
  quality signals.
- Schema.org `Article` / `FAQPage` structured-data vocabulary — the public
  standard for making a page machine-parseable.

**What this gate is for:** the feed is now adversarial. Discovery increasingly runs
through recommenders and AI answer engines, and audiences discount anything that
reads as machine-generated. This gate does two jobs at once: **defense** (strip the
LLM stylistic footprint and raise human-signal density so a human trusts it) and
**offense** (structure the asset so answer engines quote it as a source).

## Conform to the contract

Return a `GateResult` (`gate: "signal"`) as defined in `shared-audit-contract`.
Score the sub-criteria first, then compute the total.

## Sub-criteria (weights sum to 1.0)

1. **LLM-tell removal (weight 0.30).**
   Count and penalize machine stylistic footprints: hedging boilerplate ("it's
   important to note," "in today's fast-paced world"), empty tricolons, "not
   only... but also," "delve/leverage/robust/seamless" filler, symmetrical
   paragraph scaffolding, and em-dash-per-sentence cadence. Full points for prose
   with none of these; deduct per recurring tell. Quote each tell as evidence.

2. **Human-signal density (weight 0.30).**
   Reward first-hand specificity a model cannot fabricate: named people, dated
   events, concrete numbers, lived detail, a real opinion with a stake in it. Full
   points when the asset could only have been written by someone who was there.
   Penalize generic authority ("studies show," "experts agree") with no source.

3. **Answer-engine structure / GEO-AEO (weight 0.25).**
   Is the asset structured to be extracted and cited — a clear claim near the top,
   scannable sub-claims, cited statistics and quotations (the GEO-proven levers),
   and a self-contained answer to an implied question? Full points when a model
   could lift a correct, attributable snippet. Penalize buried thesis and
   unsourced numbers.

4. **Metadata & machine-legibility (weight 0.15).**
   Are the machine-facing fields present and honest — title, description, primary
   keyword/question, and (where the asset is a page) Schema.org structured data?
   Full points when metadata truthfully matches the body. Penalize missing or
   keyword-stuffed metadata that misrepresents the content.

**Score = round(sum(weight_i * points_i))**, points_i in 0-100.

## Ranked reasons

Lead with whatever most makes the asset read as machine-generated or
un-citable. Every `high`-severity reason quotes the line and has a matching
rewrite. Typical high-severity findings:
- Dense with LLM tells that flag it as AI output.
- Authority-by-assertion ("studies show") with nothing an engine can cite.
- Thesis buried below scene-setting, so no engine can extract it.

## Rewrites (line-level)

For each defect, pair the exact `original` span with a `revised` version that:
- Deletes the LLM tell and replaces it with plain, specific prose.
- Swaps generic authority for a named source, number, or first-hand detail.
- Front-loads the extractable claim and attaches a citable statistic where a
  claim leans on data.

Name the criterion in each `rationale`. Preserve the author's voice — the goal is
to remove the machine footprint, not to flatten the writing.

## Clean-room note

Built from public GEO/AEO research (KDD 2024), Google's published E-E-A-T
guidance, and the open Schema.org vocabulary. Do not reproduce any
employer-proprietary detector, tell-list, or scoring model. Restate from the cited
public sources when in doubt.
