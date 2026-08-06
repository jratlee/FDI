# PR / Comms Modeling Brief

**Growth Cartography Engine — PR & Communications Problem Templates**

*Internal reference. Informs Lab seed content and site copy. Not for external distribution.*

---

## How to Use the Lab (for PR Practitioners)

The Growth Cartography engine (`@gc`) is a deterministic cohort-decay model. It does not forecast the future or scrape live media data. What it does: given a handful of numbers you already have — pickup rates, pitch cadence, campaign spend, relationship count — it tells you the structural shape of your coverage problem: where equilibrium lies, how long a spike decays, whether your PR spend is defensible over a given horizon, and how many steady active press relationships you need to reach a coverage target.

Think of it as a spreadsheet that has already done the compound-decay math, exposed as a conversational interface. You bring the inputs (benchmark rates, your own historical data, or reasonable estimates from the sources listed below). The engine returns: retention curve, equilibrium coverage level, sensitivity analysis, and — where applicable — an LTV/CAC ratio for your PR investment. Model outputs are labeled as such and are not business or investment advice.

---

## Template 1 — Coverage Velocity

### Problem frame

Earned media pickup follows a retention curve: a press release or story pitch lands some fraction of targeted outlets on day 1, a smaller fraction follows up by day 7, and a long-tail fraction carries through to day 30. Treating those three numbers as retention anchors lets the engine project cumulative coverage, estimate equilibrium under a steady pitch cadence, and answer "how many pitches per week do we need to maintain 40 active coverage-days per month?"

### Natural-language `@gc` question

```
@gc our pitches get picked up by 18% of targeted outlets on day 1, 8% by day 7,
and 3% by day 30. We send 12 pitches a week. What is our steady-state active
coverage level, and how many pitches do we need to hit 60 active coverage-days?
```

### Parameters the parser extracts

| Parameter | Value | Derivation |
|---|---|---|
| `unit` | `"nodes"` (coverage instances) | inferred from "pitches / outlets" vocabulary |
| `retentionAnchors.days` | `[1, 7, 30]` | stated explicitly |
| `retentionAnchors.rates` | `[18, 8, 3]` | stated explicitly |
| `dailyNew` | `~1.71` | 12 pitches/week ÷ 7 |
| `periods` | `90` | default |
| `question` | "At this pitch cadence and pickup rate, what is equilibrium active coverage and the cadence required for 60 active coverage-days?" | extracted |

### Engine functions used

- `buildRetentionProfile([1,7,30], [18,8,3], 90)`
- `equilibrium(profile, 1.71)` → steady-state active coverage instances
- `requiredDailyNew(profile, targetDAU)` → pitches/day needed for 60 active coverage-days

### Expected output shape

> At 12 pitches/week with these pickup rates, your coverage stabilizes at approximately **N active coverage-days**. To reach 60 active coverage-days, you need roughly **M pitches/week**. Day-30 retention (3%) is the binding constraint; a 50% improvement in day-30 retention (to 4.5%) adds more equilibrium coverage than doubling pitch volume.

### Public data source

**GDELT Project** (`gdeltproject.org`) — story-count time-series via the GDELT 2.0 Event and Global Knowledge Graph APIs.

**Conversion recipe:** pull story counts for a specific entity/topic before and after a known press-release date. Count stories within 24 h of release (day-1 pickup %), stories in days 2–7 (day-7 rate), stories in days 8–30 (day-30 rate). Normalize against total outlets in the query set. Use these empirical rates as your retention anchors.

---

## Template 2 — Share of Voice Retention

### Problem frame

Brand presence in media decays after a campaign ends, just as user retention decays after acquisition. A sustained "always-on" drip of content and pitching produces a different equilibrium share of voice than a single launch push of the same total resource. The engine can compare both scenarios directly (spike vs. drip) and show which generates more cumulative coverage over a 90-day horizon.

### Natural-language `@gc` question

```
@gc comparing two strategies over 90 days: (A) always-on — 5 media interactions a day
at our usual 12% day-1 / 5% day-7 / 2% day-30 pickup; (B) launch push — 200 interactions
on day 1, then 2/day ongoing. Which generates more cumulative share-of-voice by day 90?
```

### Parameters the parser extracts

| Parameter | Value | Derivation |
|---|---|---|
| `unit` | `"nodes"` | media interaction / coverage instance |
| `retentionAnchors.days` | `[1, 7, 30]` | stated |
| `retentionAnchors.rates` | `[12, 5, 2]` | stated |
| `dailyDrip` | `5` | strategy A stated |
| `spikeDay` | `0` | strategy B: day-1 push |
| `spikeSize` | `200` | strategy B stated |
| `periods` | `90` | stated |

### Engine functions used

- `buildRetentionProfile([1,7,30], [12,5,2], 90)`
- `buildSpikeVsDrip(90, 2, 0, 200)` → drip and spike cohort arrays
- `projectDAU(profile, dripCohorts, 90)` and `projectDAU(profile, spikeCohorts, 90)`
- Sum each DAU array for cumulative coverage at day 90

### Expected output shape

> **Always-on (5/day):** cumulative coverage-days = N; equilibrium reached by ~day X.
> **Launch push (200 on day 1, 2/day):** cumulative coverage-days = M; spike decays to near-drip baseline by day Y.
> At these pickup rates, the [drip/spike] strategy generates [more/fewer] cumulative coverage-days by day 90. The spike advantage breaks even at day Z.

### Public data source

**Media Cloud** (`mediacloud.org`) — outlet-level story counts for specific topics or entities over time. Free academic API access available.

**Conversion recipe:** query story counts for a named brand during an always-on quarter vs. a campaign quarter. Plot weekly story counts; fit day-1/7/30 pickup rates from the post-campaign-release decay. The difference in cumulative story counts between the two periods is the empirical validation of the spike-vs-drip output.

---

## Template 3 — Crisis Recovery Curve

### Problem frame

A crisis produces a spike of negative coverage. A proactive content and outreach response is a drip of positive coverage. The question the engine answers: at the 90-day mark, which side has generated more cumulative presence? Because the engine is sign-agnostic, crisis modeling uses the spike-vs-drip comparison with inverted interpretation: the spike represents the negative event; the drip represents the response program.

### Natural-language `@gc` question

```
@gc crisis scenario: a negative story broke on day 0, generating an estimated 150
negative coverage instances in the first 48 hours. Our response program starts day 3:
4 positive story pitches per day at 20% day-1 / 9% day-7 / 4% day-30 pickup.
By day 90, does the positive content drip outrun the negative spike?
```

### Parameters the parser extracts

| Parameter | Value | Derivation |
|---|---|---|
| `unit` | `"nodes"` (coverage instances) | inferred |
| `retentionAnchors.days` | `[1, 7, 30]` | stated |
| `retentionAnchors.rates` | `[20, 9, 4]` | stated (positive content pickup) |
| `spikeDay` | `0` | day of crisis event |
| `spikeSize` | `150` | stated |
| `dailyDrip` | `4` | response cadence stated |
| `periods` | `90` | stated |

### Engine functions used

- `buildRetentionProfile([1,7,30], [20,9,4], 90)`
- `buildSpikeVsDrip(90, 4, 0, 150)`
- `projectDAU` for both scenarios; compare cumulative sums at day 90

### Interpretation note

The spike cohort represents **negative** coverage decaying over time. The drip cohort represents **positive** coverage accumulating. When `sum(dripDAU) > sum(spikeDAU)` by day 90, the response program has generated more cumulative positive presence than the crisis generated negative presence — a structural win, regardless of sentiment at any single day.

### Expected output shape

> **Negative spike (150 on day 0):** cumulative negative coverage-days by day 90 = N; spike decays to baseline by day X.
> **Positive drip (4/day from day 3):** cumulative positive coverage-days by day 90 = M.
> At this pickup rate, the response program [surpasses / does not yet surpass] the negative spike by day 90. To cross over earlier, increase daily pitch volume to P/day or improve day-30 retention above R%.

### Public data source

**GDELT tone/sentiment fields** — GDELT 2.0 Global Knowledge Graph includes a `V2Tone` column: a comma-delimited set including overall tone (positive = positive score, negative = negative score). Pull tone-weighted story counts pre- and post-crisis for a named entity to calibrate the spike size and decay rate empirically.

**Conversion recipe:** for a known crisis event, sum negative-tone stories within 48 h (spike size); fit the day-7 and day-30 decay from subsequent negative-story counts. Use these as the spike retention anchors. Separately, pull pickup rates for your positive story placements in a non-crisis period to set the drip retention anchors.

---

## Template 4 — Earned Media LTV vs. PR Spend

### Problem frame

A PR retainer or press-release program has a cost per coverage instance (CAC analog). Each coverage instance generates value — brand impressions, referral traffic, backlink equity, sales pipeline influence — that decays over time (coverage-day-weighted value). The LTV/CAC ratio tells you whether the PR spend is structurally defensible at a given horizon. The industry benchmark for defensibility is LTV ≥ 3× CAC.

### Natural-language `@gc` question

```
@gc our PR retainer costs $8,000/month. Each active coverage-day is worth roughly
$45 in attributed pipeline value. Our coverage pickup rates: 15% day-1, 6% day-7,
2% day-30. We generate about 30 new coverage instances per month. Is this retainer
defensible over a 12-month horizon?
```

### Parameters the parser extracts

| Parameter | Value | Derivation |
|---|---|---|
| `unit` | `"nodes"` | coverage instances |
| `retentionAnchors.days` | `[1, 7, 30]` | stated |
| `retentionAnchors.rates` | `[15, 6, 2]` | stated |
| `dailyNew` | `~1` | 30/month ÷ 30 |
| `revenuePerUnitPerDay` | `45` | stated |
| `cac` | `~$267` | $8,000/month ÷ 30 coverage instances |
| `periods` | `365` | 12 months stated |

### Engine functions used

- `buildRetentionProfile([1,7,30], [15,6,2], 365)`
- `cumulativeRevenue(profile, 45, 365)` → LTV per coverage instance over 12 months
- `cacDefensibility(ltv, 267)` → ratio and defensibility flag

### Expected output shape

> At $45/coverage-day and these pickup rates, each new coverage instance generates **$LTV** in cumulative pipeline value over 12 months. With a $267 CAC, the LTV/CAC ratio is **X.Xx** — [defensible (≥3×) / not yet defensible]. To reach a 3× ratio, either increase per-coverage-day value above $Y, improve day-30 retention above Z%, or reduce CAC below $W.

### Public data sources

- **PRSA Salary & PR Pricing Survey** — agency retainer benchmarks by market size; use to calibrate CAC ranges.
- **Muck Rack State of PR Report** (annual) — median cost per press release, reporter response rates by industry, pitch-to-placement conversion rates. Use conversion rates to derive empirical day-1 pickup percentages.
- **Internal attribution data** — CRM pipeline influence reports filtered to "influenced by earned media" contacts; use to estimate revenue-per-coverage-day.

**Conversion recipe:** from Muck Rack benchmarks, take the industry-median pitch-to-placement rate as your day-1 pickup %; apply the engine's default 3× day-7 and day-30 rules if you lack longitudinal data. For revenuePerUnitPerDay, divide your quarterly attributed pipeline by the number of active coverage-days in that quarter (stories that ran × days since publication until they fell out of active circulation, typically estimated at 30 days per story).

---

## Template 5 — Journalist Relationship Network

### Problem frame

An active press contact list behaves like a network of agent-economy nodes. Contacts "churn" (go dark — leave beats, change outlets, stop responding) and new contacts are added through outreach. The engine's equilibrium formula answers: at a given outreach rate and contact churn, how many steady active relationships can you maintain? And: how many new contacts per month do you need to reach a target relationship pool size?

### Natural-language `@gc` question

```
@gc we have a journalist contact network. Contacts stay active at roughly 70% after
1 month, 45% after 3 months, 20% after 6 months. We add 15 new contacts per month.
What is our steady-state active network size, and how many contacts/month do we need
to reach 200 active relationships?
```

### Parameters the parser extracts

| Parameter | Value | Derivation |
|---|---|---|
| `unit` | `"agents"` | journalist contacts as network nodes |
| `retentionAnchors.days` | `[30, 90, 180]` | stated (monthly cadence) |
| `retentionAnchors.rates` | `[70, 45, 20]` | stated |
| `dailyNew` | `0.5` | 15/month ÷ 30 |
| `periods` | `180` | 6 months (matches longest anchor) |

### Engine functions used

- `buildRetentionProfile([30,90,180], [70,45,20], 365)`
- `equilibrium(profile, 0.5)` → steady-state active contacts
- `requiredDailyNew(profile, 200/365)` → contacts/day needed for 200 active (then × 30 for monthly figure)

### Expected output shape

> At 15 new contacts/month with these activity rates, your network stabilizes at approximately **N active journalist relationships**. To reach 200 active relationships, you need to add roughly **M contacts/month**. The 6-month retention rate (20%) is the binding constraint; improving it to 30% (e.g. through quarterly check-in cadence) reduces the required inflow by approximately P%.

### Public data source

**Muck Rack journalist activity data (free tier)** — journalist profile pages show recent article activity. Manually or programmatically sampling a contact list at two time points (e.g. 3 months apart) lets you measure what fraction of contacts published at least one article relevant to your beat — a reasonable proxy for "active contact retention."

**Conversion recipe:** take a list of N journalist contacts from 6 months ago. Check each against current Muck Rack profiles. Count those with ≥1 relevant article in the last 30 days as "active." Fraction active = your 6-month retention anchor. Repeat for 1-month and 3-month cohorts to fill in the curve.

---

## Dataset Mapping Table

| Template | Engine Functions | Public Data Source | Conversion Recipe |
|---|---|---|---|
| Coverage velocity | `buildRetentionProfile`, `equilibrium`, `requiredDailyNew` | GDELT 2.0 story-count time-series | Stories within 24 h of pitch / total targeted outlets = day-1 pickup %; repeat for days 2–7 and 8–30 |
| Share of voice retention | `buildRetentionProfile`, `buildSpikeVsDrip`, `projectDAU` | Media Cloud outlet-level story counts | Query story counts for brand pre/post campaign; fit weekly decay to day-1/7/30 retention anchors; compare cumulative areas under the drip vs. spike curves |
| Crisis recovery | `buildSpikeVsDrip`, `projectDAU` | GDELT V2Tone sentiment field | Negative-tone stories in 48 h = spike size; subsequent negative-story weekly decay = spike anchors; positive content placement rates (non-crisis period) = drip anchors |
| Earned media LTV/CAC | `buildRetentionProfile`, `cumulativeRevenue`, `cacDefensibility` | PRSA pricing benchmarks; Muck Rack State of PR | Retainer ÷ monthly placements = CAC; attributed pipeline ÷ active coverage-days = revenuePerUnitPerDay; industry pitch-to-placement rate = day-1 pickup % |
| Journalist network | `buildRetentionProfile`, `equilibrium`, `requiredDailyNew` | Muck Rack journalist activity (free tier) | Fraction of contacts with ≥1 relevant article in the past 30 days (sampled at 1-, 3-, 6-month intervals) = retention anchors at those horizons |

---

## Public Dataset Quick Reference

### GDELT Project (`gdeltproject.org`)

- **Access:** free; no API key required; bulk CSV downloads or BigQuery public dataset
- **Useful fields:**
  - `SQLDATE` — publication date (for time-series bucketing)
  - `NumArticles` — story count per event cluster
  - `V2Tone` — comma-delimited: `[overall_tone, positive_score, negative_score, polarity, ...]`
  - `Actor1Name` / `Actor2Name` — entity names (for brand-specific filtering)
  - `EventCode` — CAMEO code (use to filter media/PR events)
- **Coverage velocity use:** filter `Actor1Name` or `Actor2Name` to your brand; bucket `NumArticles` by days since a known press-release date; the resulting decay curve is your retention profile
- **Crisis use:** filter to negative `V2Tone` (negative_score > positive_score); bucket by days since crisis event

### Media Cloud (`mediacloud.org`)

- **Access:** free academic API; registration required
- **Useful signals:**
  - Story count per outlet per day — directly yields "coverage instances per day" for the engine
  - Topic/entity filters — query by brand name or keyword cluster
  - Outlet metadata — segment by tier (national / trade / regional) for differentiated retention curves
- **Share of voice use:** pull weekly story counts for your brand and for two or three competitors; express your count as a fraction of the total to get share-of-voice (SoV); track SoV decay after a campaign ends vs. always-on periods

### Muck Rack (`muckrack.com`)

- **Access:** free tier allows journalist profile lookup; paid tier adds list management and analytics
- **Useful signals (free tier):**
  - Recent article count and dates per journalist — proxy for "active contact" status
  - Beat/topic tags — filter your list to relevant journalists
  - Outlet tier metadata — segment by outlet type
- **Relationship network use:** manually or programmatically sample your contact list at two time points; the fraction of contacts who published ≥1 relevant article in the intervening period is your retention rate at that horizon

### PRSA / Muck Rack State of PR (annual reports)

- **Access:** free download (email registration); published annually
- **Useful benchmarks:**
  - Median agency retainer by market size → CAC calibration
  - Pitch-to-placement conversion rates by industry → day-1 pickup % baseline
  - Average cost per press release → alternative CAC measure for project-based programs
  - Journalist response rates by pitch type → sensitivity lever for outreach optimization
- **LTV/CAC use:** use industry median pitch-to-placement rate as a floor/ceiling check on your empirical day-1 pickup %; use retainer benchmarks to sanity-check your CAC before running defensibility

---

*Document owner: FDI internal. Inform seed content and site copy. Update retention benchmarks annually from the sources above.*
