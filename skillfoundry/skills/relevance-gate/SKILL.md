---
name: relevance-gate
description: Gate 1 of the Skillfoundry audit. The Market-Deficit Analyzer - the Relevance Filter. Scores whether a content asset solves a specific job-to-be-done for a defined audience, or is just impression-farming noise. Rests on Christensen's Jobs-to-be-Done. Read shared-audit-contract first.
---

# Gate 1 — Market-Deficit Analyzer (The Relevance Filter)

**Framework (public, cited):** Jobs-to-be-Done — Clayton M. Christensen et al.,
*"Know Your Customers' Jobs to Be Done,"* Harvard Business Review, Sept 2016; and
*Competing Against Luck* (Christensen, Hall, Dillon, Duncan, 2016). The core claim
we operate on: people don't buy products (or read posts) — they "hire" them to
make progress on a job that has functional, emotional, and social dimensions in a
specific circumstance.

**What this gate is for:** to reject content that farms impressions instead of
solving a real problem for a real reader. More than half of long-form social
content is now AI-generated; generic "insight" is free and worthless. The only
content worth shipping earns a reader's attention by helping them make progress on
a job they actually have. This gate finds the deficit between what the asset says
and what its audience is trying to get done.

## Conform to the contract

Return a `GateResult` (`gate: "relevance"`) exactly as defined in
`shared-audit-contract`. Score the sub-criteria below first, then compute the
weighted total.

## Sub-criteria (weights sum to 1.0)

1. **Defined audience & circumstance (weight 0.25).**
   Can you name, from the text alone, *who* this is for and *in what situation*
   they'd read it? Full points only if the asset implies a specific circumstance
   ("a CMO defending comms spend to a skeptical CFO"), not a demographic
   ("marketers"). Penalize "for everyone" framing to near-zero.

2. **Job clarity — functional / emotional / social (weight 0.30).**
   Does the asset name a concrete job and address more than its functional layer?
   Full points require an explicit functional job *plus* the emotional job (what
   the reader fears/wants to feel) *or* the social job (how they want to be seen).
   Half credit for functional-only. Zero if the "job" is really the author's goal
   (reach, thought-leadership) dressed up as the reader's.

3. **Progress delivered (weight 0.25).**
   After reading, can the person *do* something they couldn't before — a decision
   made, a framework to apply, a risk avoided? Full points for a portable
   takeaway. Penalize "awareness" with no next action.

4. **Deficit vs. noise (weight 0.20).**
   Would this change the reader's mind, or merely agree with what they already
   believe? Reward a non-obvious claim or an uncomfortable truth. Penalize
   consensus-restating and "hot takes" everyone already shares.

**Score = round(sum(weight_i * points_i))**, points_i in 0-100.

## Ranked reasons

List the biggest relevance gaps first. Every `high`-severity reason must quote the
offending line as `evidence` and have a matching rewrite. Typical high-severity
findings:
- Opens with a hook aimed at the algorithm, not the reader's job.
- Addresses no identifiable circumstance ("in today's fast-paced world...").
- Delivers agreement, not progress.

## Rewrites (line-level)

For each defect, pair the exact `original` span with a `revised` version that:
- Anchors to a named circumstance and audience.
- Surfaces the emotional or social layer of the job, not just the functional one.
- Ends on a concrete progress the reader can make.

Do **not** rewrite the whole asset. Target the specific spans that fail a
sub-criterion, and name the criterion in each `rationale`.

## Clean-room note

This gate is written from the public HBR / *Competing Against Luck* articulation
of Jobs-to-be-Done. Do not import any employer-proprietary "relevance" scoring,
weighting, or naming. When unsure, restate from the cited public source.
