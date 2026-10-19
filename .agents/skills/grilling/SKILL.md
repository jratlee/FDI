---
name: grilling
description: Use when the user wants a plan stress-tested.
version: 1.0.0
author: Matt Pocock (mattpocock/skills, MIT); adapted for Hermes
license: MIT
metadata:
  hermes:
    tags: [design-review, questioning, planning, architecture, stress-test]
    related_skills: [productivity/grill-me, engineering/grill-with-docs, engineering/domain-modeling, software-development/plan, software-development/writing-plans]
---

# Grilling

Adapted from `mattpocock/skills` -> `skills/productivity/grilling` (MIT). Source:
https://github.com/mattpocock/skills

## When to Use

- The user asks to be questioned, challenged, or stress-tested on a plan/design/decision.
- A high-stakes or hard-to-reverse decision is being made on assumptions nobody has checked.
- Don't use for: factual lookups (just answer), or building/implementing (that starts only after
  the user confirms shared understanding).

Fires on "grill me", "poke holes in this", "interview me", "what am I missing?" -- any request to
stress-test a plan, design, decision, spec, or architecture before building it.

Interview the user relentlessly until you reach a shared understanding. Map this as a **design
tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already
settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask
the whole frontier in one round: number each question and give your recommended answer. Then wait
for the user's answers before the next round.

Format a round like so:

```
- **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

  Recommended: <your recommended answer>

---

- **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

  Recommended: <your recommended answer>
```

Word each question so "yes" accepts your recommended answer.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and
unblock questions that depended on them. Recompute the frontier and ask the next round. A question
whose answer depends on another question still open in this round belongs to a _later_ round, not
this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the
environment (filesystem, tools, the web), go get it yourself -- read the repo, run the command, or
`delegate_task` a sub-agent for a wide search. Don't ask the user for anything you could look up
yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the
questions downstream of it wait for the search to report; ask the rest of the frontier now. The
_decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing
left silently assumed. Do not act on it until the user confirms you have reached a shared
understanding.

## Hermes notes

- If the user also wants the design written down ("grill me with docs", "write down the decisions"),
  pair this with `engineering/domain-modeling` — or load `engineering/grill-with-docs`, which is the
  two-skill route. Glossary entries and ADRs are written only for decisions the user has settled.
- Ask the round with the `clarify` tool when the questions are pickable (up to 5 per call); drop to
  numbered prose in chat when a question needs a long answer or discussion.
- This is a questioning discipline, not a builder: produce no code or implementation files until the
  user confirms shared understanding. (The docs route is the narrow exception: `GLOSSARY.md` and ADR
  writes for settled decisions are the point there.)
- Cost posture: fan out fact-finding to one sub-agent per independent unknown, not one per
  question.
