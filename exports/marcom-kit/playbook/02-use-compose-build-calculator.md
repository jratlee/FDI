# Blueprint 02: The Use, Compose, Build Matrix
### An economic calculator for every MarTech and AI decision your team will face this year

**FDI Agentic MarCom Architecture Kit, Foundation Playbook V1.0. As of 2026.**

---

## 1. The matrix, defined

Every AI or MarTech capability decision resolves into one of three postures:

- **USE.** Rent the capability off the shelf. Pay the subscription, accept the vendor's roadmap, invest zero engineering. Correct when the capability is a commodity and your usage of it creates no durable advantage.
- **COMPOSE.** Assemble the capability from existing APIs and open standards with thin glue code. You own the arrangement, not the components. Correct when the advantage is in the workflow, not the model.
- **BUILD.** Create proprietary capability from scratch. Correct almost never, and only where the asset is genuinely unique narrative or data IP that compounds.

The most expensive mistake in mid-market MarCom right now is Building what should be Composed and Composing what should be Used. CFOs have funded seven-figure "proprietary AI model" projects whose entire function is replicated by a $30 seat license. The matrix exists to make that mistake hard to sign off.

## 2. The scoring worksheet

Score the capability under consideration on each question, 0 to 2 points as marked. Total the columns. Highest column wins; ties go to the cheaper posture (Use beats Compose beats Build).

| # | Question | USE points | COMPOSE points | BUILD points |
|---|---|---|---|---|
| 1 | Do at least three credible vendors sell this capability today? | Yes = 2 | Partially (pieces exist) = 2 | No vendor sells it = 2 |
| 2 | If a competitor used the identical tool, would your output be indistinguishable? | Yes = 2 | No, our workflow differs = 2 | No, our data/IP differs = 2 |
| 3 | Does the capability touch your unique narrative or proprietary data corpus? | No = 2 | Indirectly = 1 | Directly and centrally = 2 |
| 4 | Volume: will this run daily at scale across accounts? | Any = 0 | Yes = 1 | Yes = 1 |
| 5 | Can your current team maintain glue code (one engineer-equivalent or a technical generalist)? | Not needed = 1 | Yes = 2 | You would need to hire a team = minus 2 for Build |
| 6 | Switching cost if the vendor dies or triples pricing? | Low = 2 | Medium, we own the arrangement = 1 | n/a |
| 7 | Does the economics survive honest accounting (see section 3)? | Yes = 1 | Yes = 1 | Yes = 2, No = disqualify |

**Reading the result.** A Build verdict requires BOTH the high score AND a yes on question 7's honest accounting. If Build wins on points but fails the accounting, the answer is Compose and a strongly worded memo to whoever proposed Building.

## 3. Honest accounting (the part vendors hope you skip)

For each posture, the real annual cost:

- **USE** = seats x price x 12, plus onboarding time, plus the exit cost of data stuck in the tool.
- **COMPOSE** = API usage at projected volume, plus 0.25 to 0.5 of a technical generalist's year for glue and maintenance, plus monitoring.
- **BUILD** = the engineering team, times two (every internal estimate doubles), plus permanent maintenance at roughly 20 percent of build cost per year, plus the opportunity cost of those people not doing client work, plus model drift: the frontier moves every quarter, and your proprietary model does not move with it.

Rule of thumb we defend in every advisory engagement: **Build is only rational when the capability is inseparable from IP you already own and no vendor can be allowed to see.** Unique narrative voice trained on decades of owned brand corpus: maybe. A reporting summarizer: never.

## 4. Worked examples across the service line

| Capability | Verdict | Why |
|---|---|---|
| QBR and earnings-support report drafting | **USE** | Commodity capability; the advantage is in your kill list (Blueprint 04) and your data hygiene, not the drafting model |
| Brand social content generation with governance gates | **COMPOSE** | Off-the-shelf models plus your Riverbank rules (Blueprint 03) plus an enforcement layer like SkillFoundry, connected over the open Model Context Protocol. The advantage is the arrangement; every component is rented or open |
| GEO citable-corpus pipeline (making the client retrievable by answer engines) | **COMPOSE** | Structured data standards are open; retrieval infrastructure is rentable; the corpus itself is the client's owned asset |
| Influencer and creator relationship management | **USE** the tooling, keep the relationships human | The tool is a database; the asset is the human trust, which lives in your Hourglass junior pipeline |
| A proprietary brand-voice model for your largest client's decades-deep archive | **BUILD (narrow)** | The one legitimate case: the IP is unique, owned, and cannot be shipped to a vendor. Scope it to the narrowest possible surface |
| "Our own ChatGPT for the agency" | **Disqualified at question 7** | This proposal appears once a year. The matrix exists to kill it politely |

## 5. Running the exercise with your leadership team

Sixty minutes, once per quarter, and any time a five-figure tool decision surfaces:

1. List every AI/MarTech line item over $5k/year plus every proposal on the table (10 minutes).
2. Score each against the worksheet, out loud, as a group (30 minutes). Disagreement on question 2 is the productive kind; let it run.
3. For anything currently in the wrong posture, write the migration line: what it moves to, by when, who owns it (15 minutes).
4. Total the reallocated spend (5 minutes). This number typically funds the entire kit-driven restructuring with room to spare.

A one-page starter version of this worksheet ships in the free FDI MarCom Starter Pack; this full edition adds the honest-accounting model and the worked service-line examples. Living Engine subscribers additionally get the white-label edition for use in client pitches (Agency tier).

---

*Operating guidance, not financial, procurement, or legal advice. Numbers marked as rules of thumb are planning shapes drawn from advisory work, not guarantees.*
