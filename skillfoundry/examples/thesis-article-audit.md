# Worked Example — Strategic Audit of the FDI thesis article

This is a **dogfood proof**: the Skillfoundry strategic audit run against a real,
already-published FDI asset — `exports/field-guide-launch/linkedin-thesis-article.md`
("Build the Machine, Not the Ad"). It is the output you should expect from
`/skillfoundry:strategic-audit`. Scores are computed from each gate's weighted
sub-criteria per `skills/shared-audit-contract`.

> The point of this example is the **success metric**: an audit that surfaces
> concrete, non-obvious changes a generic "make this better" prompt would not
> produce. The four numbered rewrites below are those changes.

---

## Skillfoundry Strategic Audit — "Build the Machine, Not the Ad"

**Composite: 72 / 100 · Recommendation: REVISE**
_Asset: linkedin-thesis-article.md · ~1,050 words_

### Top moves (ranked, highest leverage first)
1. **[relevance]** Replace the closing "Follow False Dawn Industries" CTA — it
   serves the author's reach, not the reader's job. End on an action the CMO can
   take Monday.
2. **[signal]** Attach an inline source to the two load-bearing stats
   ("$1.3 trillion," "2.5 seconds of active attention"). One fix that also raises
   Gate 2 (defensibility) and Gate 3 (answer-engine citability).
3. **[relevance]** Surface the reader's *emotional/career* job early: the CMO who
   bet a 2026 budget on reach and now has to answer for it. Right now only the
   functional job is on the page.
4. **[signal]** Front-load the one-sentence thesis so an answer engine can extract
   it; today it sits at paragraph 8, behind two thinkers' setups.

---

### Gate 1 — Relevance · Market-Deficit Analyzer — 69 / 100 · REVISE
**Framework:** Jobs-to-be-Done (Christensen, *Competing Against Luck* / HBR 2016)

**Subscores:** defined audience & circumstance 70 (w .25) · job clarity F/E/S 65
(w .30) · progress delivered 60 (w .25) · deficit vs. noise 85 (w .20).

**Ranked reasons**
1. _high_ — The asset ends on the author's job, not the reader's.
   Evidence: "Follow False Dawn Industries to get each one the day it drops."
   That is impression-farming: it asks for reach instead of delivering the
   reader's next progress.
2. _medium_ — The emotional/social layer of the job is unspoken. The subtitle
   names "a CMO," but the body never names the fear driving them (career exposure
   when the reach bet fails). Evidence: "For thirty years, marketing has been a
   bet on reach... That bet is over."
3. _low_ — Audience drifts from the named CMO to a generic "you" mid-article.

**Rewrites**
- original: "Follow False Dawn Industries to get each one the day it drops, and
  pressure-test the thinking against real, working code at github.com/jratlee/FDI."
  revised: "Before your next budget cycle, pick one marketing asset you could
  prove you own — a corpus, an identity, an interface an agent could call — and
  audit whether you actually own it. If you can't name one, that's your Q1. The
  working code and the next Field Guides are at github.com/jratlee/FDI."
  rationale: _progress delivered_ — converts an author-serving reach ask into a
  concrete first action the reader takes Monday.
- original: "That bet is over, and most 2026 budgets haven't noticed yet."
  revised: "That bet is over, and the CMO who renews it in 2026 is the one who
  has to explain the miss when it doesn't compound."
  rationale: _job clarity (emotional/social)_ — names the career stakes, not just
  the market fact.

---

### Gate 2 — Performance · Enterprise Valuation Gate — 73 / 100 · REVISE
**Framework:** Brand equity (Aaker) + competitive positioning (Porter)

**Subscores:** value-driver linkage 60 (w .30) · category-authority position 90
(w .25) · claim substantiation 65 (w .25) · risk-constraint architecture 80
(w .20).

**Ranked reasons**
1. _high_ — The economic case is macro, not tied to a driver on the reader's own
   P&L. Evidence: "The world will spend $1.3 trillion on advertising in 2026."
   A CFO discounts industry totals; connect it to CAC, retention/LTV, or capital
   efficiency the reader controls.
2. _medium_ — Load-bearing stats are asserted, not sourced, which weakens the
   claim in a boardroom. Evidence: "the average digital ad earns about 2.5
   seconds of active attention."
3. _low_ (strength) — Category authority is genuinely differentiated and
   code-backed (Pile, Talk to NYC). Keep this; it is the asset's moat.

**Rewrites**
- original: "Every quarter you spend buying commoditized reach is a quarter you
  didn't spend building the identity, the corpus, and the interfaces..."
  revised: "Every quarter you spend buying commoditized reach raises the CAC you
  can't lower and builds no asset you keep — while a corpus, an identity, and an
  agent-callable interface compound into retention you own."
  rationale: _value-driver linkage_ — re-anchors the claim to CAC and retention,
  drivers a CFO already tracks.

---

### Gate 3 — Algorithmic Signal · Adversarial Defense Matrix — 77 / 100 · PASS
**Framework:** GEO/AEO (Aggarwal et al., KDD 2024) + Google E-E-A-T + Schema.org

**Subscores:** LLM-tell removal 75 (w .30) · human-signal density 90 (w .30) ·
answer-engine structure 60 (w .25) · metadata & machine-legibility 85 (w .15).

**Ranked reasons**
1. _high_ — The thesis is not extractable: an answer engine that lands here can't
   lift a single attributable sentence that states the claim, because it sits at
   paragraph 8. Evidence: "when reach is commoditized and platforms are opaque,
   the only durable marketing assets are the ones you own and can prove."
2. _medium_ — Citable numbers carry no citation, so no engine will attribute them
   to you (the GEO-proven lever is *cited* statistics). Evidence: "$1.3 trillion,"
   "2.5 seconds."
3. _low_ (strength) — Human-signal density is excellent: named thinkers, a dated
   thesis, two real shipped builds. This is what a model can't fabricate.

**Rewrites**
- original: (opening) "The cost of making content just fell to zero. That's not
  the opportunity. That's the emergency."
  revised: "The cost of making content just fell to zero. That's not the
  opportunity — it's the emergency. When reach is commoditized and ad platforms
  are opaque, the only durable marketing assets are the ones you own and can
  prove."
  rationale: _answer-engine structure_ — front-loads the extractable, attributable
  thesis into the opening so a generative engine can quote it.
- original: "The world will spend $1.3 trillion on advertising in 2026, and the
  average digital ad earns about 2.5 seconds of active attention."
  revised: "Global ad spend is forecast to pass $1.3 trillion in 2026 (WARC),
  while eye-tracking studies put active attention on the average digital ad at
  roughly 2.5 seconds (Ebiquity / Amplified Intelligence)."
  rationale: _answer-engine structure + metadata_ — cited statistics are the
  GEO-proven lever for being quoted as a source; also fixes Gate 2 substantiation.

---

## Before / after (the highest-leverage change)

**Before (published):**
> You can keep feeding the black box. Or you can build the machine.
>
> Three Field Guides are on the way: Aggregated, Decentralized, Autonomous.
> Follow False Dawn Industries to get each one the day it drops, and
> pressure-test the thinking against real, working code at github.com/jratlee/FDI.

**After (audited):**
> You can keep feeding the black box. Or you can build the machine.
>
> Before your next budget cycle, pick one marketing asset you could prove you own
> — a corpus, an identity, an interface an agent could call — and audit whether
> you actually own it. If you can't name one, that's your Q1. The working code and
> the next Field Guides (Aggregated, Decentralized, Autonomous) are at
> github.com/jratlee/FDI.

**Why this beats "make this better":** a generic prompt smooths tone. The audit
found a *strategic* defect — the ending optimizes for the author's reach instead
of the reader's job — and four other concrete, sourced, framework-named fixes an
owner can accept or reject one by one. That is the difference between editing and
strategy as code.
