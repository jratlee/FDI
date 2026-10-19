---
name: grill-with-docs
description: Use when the user asks to be grilled AND wants the design written down as you go — a relentless interview that sharpens terminology and records the domain model (glossary + ADRs) inline.
version: 1.0.0
author: Matt Pocock (mattpocock/skills, MIT); adapted for Hermes
license: MIT
metadata:
  hermes:
    tags: [design-review, questioning, domain-modeling, glossary, adr, planning]
    related_skills: [productivity/grilling, engineering/domain-modeling, productivity/grill-me]
---

# Grill With Docs

Adapted from `mattpocock/skills` -> `skills/engineering/grill-with-docs` (MIT, upstream body is a
single line: _Call the Skill tool twice, for "grilling" and "domain-modeling"_). Hermes has no Skill
tool, so the pointer is rewritten below. Behaviour is unchanged.

## When to Use

- The user says "grill me with docs", "grill me on this codebase", "stress-test this and write down
  the decisions", or asks for an interview where the output should be design documentation.
- Use plain `productivity/grill-me` when they only want the interrogation and no docs.

## Do this now

Load BOTH skills and work them together -- do not paraphrase from memory.

```
# Hermes
skill_view(name="productivity/grilling")
skill_view(name="engineering/domain-modeling")

# any other agent (Replit / Claude Code / Codex): read the files directly, wherever
# the skills root puts them (category folders vary by install)
<skills-root>/**/grilling/SKILL.md
<skills-root>/**/domain-modeling/SKILL.md
```

`grilling` supplies the interview discipline (rounds, the frontier, a recommended answer per
question). `domain-modeling` supplies the writing discipline (challenge terms, sharpen fuzzy
language, test scenarios, update the glossary and ADRs the moment a decision crystallises).

## How the two combine

- Each round is still a `grilling` round: numbered questions, one recommended answer each, wait for
  the answers before the next round.
- While asking, apply `domain-modeling` **inline**: when an answer resolves a term, write it to
  `GLOSSARY.md` immediately; when a decision passes all three ADR tests (hard to reverse, surprising
  without context, a real trade-off), offer the ADR and write it then.
- Before asking a question, check the code and the existing `GLOSSARY.md` / `docs/adr/` first. A
  contradiction between what the user says and what the code does is a question, not a footnote.
- Docs are the *side effect* of settled decisions, never a way to pre-empt them: never write a term
  or an ADR the user has not agreed to.

## Hermes notes

- Use `clarify` for pickable rounds (up to 5 per call); drop to numbered prose when a question needs
  a long answer.
- Fact-finding is yours: read the repo, run commands, or `delegate_task` for wide searches. Never ask
  the user for something you could look up. Don't block the whole round on a running search -- only
  the questions downstream of it wait.
- In a repo, the docs live at the repo root (`GLOSSARY.md`, `docs/adr/`, or `GLOSSARY-MAP.md` +
  per-context glossaries). Outside a repo (Obsidian, business planning), put the same two files
  beside the work you are planning and say where you wrote them.
- Report at the end: which terms were added, which ADRs were written, and which questions are still
  open.
