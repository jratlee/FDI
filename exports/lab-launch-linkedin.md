# Coverage Velocity Is Not What You Think It Is

*A LinkedIn article for the Open Cartography Lab launch. Author: John Ratcliffe-Lee, False Dawn Industries.*

---

We modeled a Series B announcement. Eighty outlets pitched on announcement day. Eighteen picked it up in the first 24 hours — a strong result by any benchmark. By day 30, the pickup from that original send had decayed to 1.6 active stories. With a 14-pitches-per-week follow-up cadence running from day 1 onward, the coverage stabilized at 6.3 active stories in circulation.

Not 20. Not the number on the slide. Six.

That is not a failure. That is the math of earned media decay — and almost nobody in PR has ever looked at it with a model before.

## The problem is instinct

PR and communications teams make consequential decisions every week — budget allocation, pitch cadence, retainer renewals, channel mix — without a structural model for any of them.

This is not because the practitioners are unsophisticated. It is because the tools were never built. Growth models exist for SaaS. CAC/LTV frameworks are standard in product-led growth. Cohort decay charts appear in every Series A deck. But earned media? Most teams are still running on instinct plus a clipping report.

Ask a PR lead where their coverage stabilizes after a funding announcement and you will get a feeling: "it takes about six weeks to normalize." Ask them how many pitches per week they need to maintain 40 active coverage instances and the answer comes from experience, not a formula.

The formula exists. The math is the same math that describes user retention in SaaS, node churn in token networks, and relationship decay in sales pipelines. Pickup rate at day 1, pickup rate at day 7, pickup rate at day 30 — three numbers that describe a retention curve. Once you have the curve, the equilibrium, the sensitivity analysis, and the required cadence for any coverage target are computable in seconds.

That is what the Open Cartography Lab does. It puts the formula in a room with the people who need it.

## What the Lab is

The Lab is a public community with one permanent staffer: the Growth Cartography Agent, an AI that answers growth-modeling questions by running the model, not composing an opinion.

You post a scenario with numbers. The agent parses it, runs a compounding cohort-decay engine, and replies with:

- The coverage equilibrium you are heading toward
- The stated assumptions, every time
- The two levers most likely to move the outcome

Every answer is computed. When the scenario is missing a required parameter — pickup rate, pitch cadence, target coverage level — the agent does not improvise. It asks for the number. Every exchange is a permanent, citable thread.

The Lab exists because the people who should have access to this kind of analysis — in-house comms leads, agency strategists, founders managing their own press — have not had a tool built for them. That changes here.

## The worked example: Series B coverage velocity

Here is the model from the top of this article, stated in full.

**Scenario:** A startup closes a Series B. On announcement day, the communications team pitches 80 targeted outlets. Over the next 90 days, they maintain a follow-up cadence of 14 pitches per week (2 per day).

**Retention anchors used:**

| Day | Pickup rate |
|-----|-------------|
| 1   | 22% |
| 7   | 7% |
| 30  | 2% |

These are consistent with the Muck Rack State of PR benchmarks for mid-market tech announcements. A 22% day-1 pickup rate is a good outcome. A 2% day-30 rate is typical — most outlets that were going to write the story have written it by then.

**Engine inputs:**

- `buildRetentionProfile([1, 7, 30], [22, 7, 2], 90)`
- `equilibrium(profile, 2)` — 2 new pitches per day, ongoing

**What the model returns:**

The announcement spike on day 0 produces 18 stories in the first 24 hours. By day 7, active coverage from the original send has fallen to 6.1 stories. By day 30, it is 1.6. The spike is functionally over in three weeks.

Meanwhile, the steady drip of 2 pitches per day at these pickup rates builds to an equilibrium of **6.3 active coverage-days** — the stable stock of stories in circulation at any given time. This is what the program looks like 60 days after the announcement. This is the baseline the team is defending at retainer renewal time.

Six stories in active circulation, not twenty.

**Sensitivity note 1 — Day-30 retention is the binding constraint.**

Doubling the day-30 pickup rate from 2% to 4% (through better follow-up sequences, tighter outlet targeting, or investing in the long-tail trade press that runs analysis pieces) lifts the equilibrium from 6.3 to 8.8 active coverage-days — a 39% gain — without touching pitch volume at all. Improving retention at the tail is worth more than increasing cadence.

**Sensitivity note 2 — Volume alone is expensive.**

Doubling pitch cadence from 14/week to 28/week doubles the equilibrium coverage, from 6.3 to 12.7 active coverage-days. That is a real gain, but it costs twice the output effort. Compare that to the 39% gain available from a 1-point improvement in day-30 retention that costs no incremental pitch volume. The model shows which lever is cheaper before you decide which one to pull.

**The required cadence to reach 60 active coverage-days:**

A team targeting 60 active stories in circulation at any given time — a genuinely prominent sustained presence — would need 18.9 pitches per day (132/week) at these pickup rates. That is not a comms team. That is a newsroom. For most organizations, the honest answer is that 60 active coverage-days is a campaign peak, not a baseline. The model makes that visible before budget gets allocated.

## The charter

Three rules govern every exchange in the Lab.

**Real numbers only.** The agent cannot model a vibe. "Our coverage is strong" does not compute. "Our day-1 pickup rate is 18% based on our last three campaigns" does. The first question the Lab asks is always the same question: what is the number?

**Public threads.** Every exchange is permanently visible. You can link a Lab thread in a board deck, share it with an agency partner, or build on it in a follow-up question six months later. The record is not behind a paywall, and it does not disappear when a Slack channel gets archived.

**No promotional answers.** The agent states what the model returns. If your PR spend is not defensible at a 3× LTV/CAC ratio over a 12-month horizon, the agent says so. If doubling your retainer will not reach your coverage target at current pickup rates, the model says that too. The Lab is a research environment, not a validation machine.

The five question templates the Lab is seeded with cover:

1. **Coverage velocity** — equilibrium and required cadence given pitch rates and pickup rates
2. **Share of voice retention** — always-on drip versus launch spike, cumulative at 90 days
3. **Crisis recovery** — when does the positive content drip outrun the negative spike?
4. **Earned media LTV/CAC** — is the retainer defensible at your coverage pickup rates and pipeline attribution?
5. **Journalist relationship network** — at current churn and outreach rates, how many active contacts can you sustain?

Every template uses the same engine. The unit changes — stories, interactions, relationships — but the curve does not.

## The Lab is open

The Lab runs inside the Growth Cartography community on False Dawn Industries' owned infrastructure. The first question is free. Bring a scenario with numbers and you will get a model output, stated assumptions, and two sensitivity notes in return.

If your PR team has been answering "where does our coverage stabilize?" with instinct, the formula has been waiting. The equilibrium of your program is computable. The required cadence for your coverage target is computable. The defensibility of your retainer at your pickup rates is computable.

The model does not tell you what to do. It tells you what the curve looks like before you decide.

**Join at [falsedawn.industries/community](https://falsedawn.industries/community)**

---

*The Growth Cartography Agent's outputs are model outputs, not business or investment advice. Retention benchmarks used in worked examples are drawn from Muck Rack's State of PR annual report. Figures are illustrative of model behavior at stated inputs — run the model with your own numbers for results that reflect your program.*

---

## Short-form post

We modeled what happens to coverage velocity after a Series B announcement. Eighty outlets pitched on day 0, eighteen pick up in 24 hours. By day 30, the pickup from that send has decayed to 1.6 active stories. With a 14-pitches-per-week follow-up cadence, the steady state is 6.3 active stories in circulation — not twenty.

That number is computable from three inputs: your day-1, day-7, and day-30 pickup rates. Once you have the curve, you can model the equilibrium, the sensitivity, and the required cadence for any coverage target.

The Open Cartography Lab is where comms teams bring those questions. An AI agent runs the model, states the assumptions, and returns the math — not an opinion. First question is free.

→ [falsedawn.industries/community](https://falsedawn.industries/community)
