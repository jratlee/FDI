# Blueprint 05: Loop Engineering for MarCom
### From manual prompting to governed, self-improving agent workflows

**FDI MarCom OS, Foundation Playbook V1.0. As of 2026.**

---

## 1. What loop engineering is

Defined once: loop engineering is the architectural design of automated, continuous agent workflows that build, verify, measure, and learn iteratively, often running unattended for days or weeks at a time. It is the step beyond ad-hoc prompting. Where prompting is a single exchange between a human and a model, a loop is a governed, recurring system that runs whether or not anyone is watching.

The concept has been formalized by organisations including LangChain and engineers including Addy Osmani. This blueprint adapts that framework to the specific risk surface and workflow shape of a MarCom department, and maps each loop level onto the Riverbank governance model from Blueprint 03.

The payoff is compounding: a well-engineered loop that runs for ninety days accumulates more optimisation cycles than a human team could execute manually in a year. The risk, if the loop is ungoverned, is equally compounding: off-brand output, unsubstantiated claims, and disclosure failures that multiply at throughput speed. Blueprint 03 (the Riverbank) is the prerequisite. Install the banks before you let the river run fast.

## 2. The four loop levels

The architecture scales across four levels of operational complexity, mapping directly onto a Build, Verify, Measure, Learn cycle.

| Loop Level | What it does | Primary impact |
|---|---|---|
| **1. Agent Loop** | A single model calls tools repeatedly until a discrete task completes. | Automates isolated, high-volume work. Reduces manual execution time on repeatable outputs. |
| **2. Verification Loop** | The agent runs; its output is scored against a rubric. If it fails, it retries with feedback. | Ensures brand safety, factual correctness, and disclosure compliance before any human sees the draft. |
| **3. Event-Driven Loop** | Agent runs are triggered by external real-world events or data shifts to update live systems. | Automates responsive market actions at scale without requiring a human to initiate each run. |
| **4. Hill-Climbing Loop** | Analyses traces and evaluation outcomes from production to iteratively improve the underlying models, prompts, and memory configurations. | Creates a self-improving operational harness. The system learns and optimises over time against the goals its human operators set. |

Most MarCom teams should start at Level 2 and work outward. A Verification Loop running on every draft already eliminates the most expensive failure mode (bad output reaching a reviewer). Levels 3 and 4 add compounding power but require the Riverbank to be fully enforcing before they are safe to run at volume.

## 3. Mapping the loop levels onto the Riverbank

The Riverbank (Blueprint 03) provides the constraint layer that each loop level runs inside. The mapping is direct:

| Loop Level | Riverbank role | What governs it |
|---|---|---|
| Agent Loop | The Riverbank constraint block is part of the system prompt the agent executes under. | Template A, B, or C constraint block from Blueprint 03, filled for the specific workflow. |
| Verification Loop | The gate checklist from Blueprint 03 is the rubric the Verification Loop scores against. | A2, B2, or C2 gate checklist, run automatically rather than manually. |
| Event-Driven Loop | Escalation triggers from Blueprint 03 are the conditions that pause the loop and route an asset to a human. | A3, B3, or C3 escalation triggers, now enforced by code rather than by memory. |
| Hill-Climbing Loop | The constraint blocks and gate thresholds are the success criteria the Hill-Climbing Loop optimises toward. The loop cannot lower its own standards; it can only improve its hit rate against them. | The full Riverbank template for the relevant asset class, held constant. The loop tunes prompts and memory, not the banks themselves. |

This mapping is why Blueprint 03 must come first. A Verification Loop with no rubric is not a safety mechanism; it is a source of false confidence.

## 4. SkillFoundry as the running Verification Loop

FDI's SkillFoundry product ("Strategy as code", built on the open Model Context Protocol) is the running implementation of the Verification Loop described in this blueprint. Where the gate checklists in Blueprint 03 are designed to be run manually at first, SkillFoundry automates that pass: every text asset routed through it is scored against three structured gates (Relevance, Performance, Algorithmic Signal) and returned with a machine-readable audit and line-level rewrites.

In loop-engineering terms, SkillFoundry is a managed Verification Loop. It sits between the Agent Loop that produces the draft and the Event-Driven or Hill-Climbing logic that determines what happens next. Teams on the Foundation Playbook can run the gate checklists by hand and graduate to automated enforcement when the volume warrants it. Living Engine subscribers receive the SkillFoundry policy-as-code snippets that make the upgrade automatic.

## 5. Three worked MarCom loop examples

### 5.1 The SEO and GEO loop (with rollback)

**What it does.** An Agent Loop audits web properties continuously for metadata gaps, structural issues, and entity relationship weaknesses. An Event-Driven Loop monitors search visibility and AI citation frequency; if a metric drops past a threshold, it triggers a new audit run. A Hill-Climbing Loop hypothesises and tests new content structures, measuring impact over a rolling window before committing.

**The rollback rule.** Any structural change deployed by the loop must carry a version tag and a rollback trigger. If a deployed change causes a measurable drop in search ranking or LLM citation frequency within a defined observation window, the loop reverts to the prior configuration automatically before escalating to a human for review. This rule is non-negotiable: a loop without a rollback mechanism can compound a mistake across an entire domain before anyone notices.

**Where the Riverbank sits.** The Verification Loop running on every piece of generated content applies the Template A constraint block (voice, claims, source tags) before any asset is queued for publication. The Event-Driven Loop's escalation conditions mirror the A3 triggers: any content that is crisis-adjacent, makes a comparative claim, or carries an [UNSOURCED] tag pauses the loop and routes to a human.

### 5.2 The performance ads iteration loop

**What it does.** Creative strategists deploy agentic loops to automate the generation and optimisation of ad variants. A Verification Loop scores every generated asset against brand guidelines and platform compliance rules before deployment. Once live, an Event-Driven Loop continuously analyses return on ad spend. It reallocates budgets, adjusts targeting parameters, and tweaks creative elements, running continuous A/B tests until the campaign converges on optimal performance.

**The compliance gate.** Platform compliance rules (disclosure requirements, prohibited claims by category, creative specifications) are encoded in the Verification Loop's rubric, not held in a human reviewer's memory. This is the point of the Riverbank: when the rules are in the loop, they cannot be skipped at 11pm when a deadline is close.

**Where the Riverbank sits.** The Template A constraint block governs tone and claims on the generative side. The Verification Loop's rubric adds platform-specific compliance rules on top. The escalation trigger for any regulated category (financial performance, health claims) routes out of the loop before deployment, not after.

### 5.3 The customer feedback and narrative loop

**What it does.** This loop processes unstructured data from social media, reviews, and customer support channels to maintain product quality and messaging resonance. The system establishes an accuracy threshold for sentiment categorisation. If the agent's evaluations fall below that threshold because market language has shifted or a new competitor has changed the conversation, the Hill-Climbing Loop adjusts the underlying system prompts and retries the evaluations until its understanding of customer sentiment recalibrates to the benchmark.

**Where the Riverbank sits.** The reporting constraint block (Template C) governs how findings are surfaced: observation and interpretation are separated, negative signals are reported with the same prominence as positive ones, and client data stays inside its own context window. The escalation trigger for any finding that touches a public company's material information routes to counsel before it enters a report.

## 6. The human oversight boundary rule

Loop engineering does not eliminate the need for human judgment; it concentrates human judgment where it actually matters.

The rule: **human oversight is a hard requirement at two boundaries in every loop.**

1. **Before the Verification Loop's threshold is set.** The rubric the loop scores against is a human decision. The loop cannot set its own pass/fail criteria. A senior practitioner signs off on the gate weights and reviews them quarterly as platforms and disclosure rules change.

2. **Before a Hill-Climbing Loop's improvements are deployed to production.** The loop can propose a better prompt or memory configuration based on its trace analysis; it cannot promote that change to live without a human reviewing the evidence and approving the deployment. The loop optimises; the human decides when the optimisation is ready.

The loop itself lacks innate wisdom. It does not distinguish between a brilliant strategic optimisation and a tactical error that happens to score well against the current rubric. Human oversight at these two boundaries is what keeps the compounding effect of the loop working in the right direction.

---

*Operating guidance, not legal or compliance advice. Regulated-industry deployments require review and extension by qualified counsel before any loop is set to run against live assets.*
