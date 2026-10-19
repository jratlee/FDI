---
name: grill-me
description: Use when the user says "grill me".
version: 1.0.0
author: Matt Pocock (mattpocock/skills, MIT); adapted for Hermes
license: MIT
metadata:
  hermes:
    tags: [design-review, questioning, router, planning]
    related_skills: [productivity/grilling]
---

# Grill Me

## When to Use

- The user types "grill me", or asks to be interviewed / stress-tested on a plan.

Thin router. Adapted from `mattpocock/skills` -> `skills/productivity/grill-me` (MIT), where it is
marked user-invoked (`disable-model-invocation: true` + `policy.allow_implicit_invocation: false`)
and its body is a single line: _Call the Skill tool with "grilling"_. Hermes has no Skill tool and
does not enforce model-invocation gating, so the pointer is rewritten for Hermes below.

Its sibling `grill-with-docs` (**engineering/grill-with-docs**) is the same interview plus the
writing discipline: terminology is sharpened and `GLOSSARY.md` / ADRs are written as decisions
settle.

Pick the route from what the user asked for:

| Trigger | Load |
|---|---|
| "grill me", "poke holes in this", "interview me" | `productivity/grilling` |
| "grill me with docs", "grill me on this codebase", "and write down the decisions" | `productivity/grilling` + `engineering/domain-modeling` (or just load `engineering/grill-with-docs`) |

```
# Hermes
skill_view(name="productivity/grilling")
# docs route, additionally:
skill_view(name="engineering/grill-with-docs")

# any other agent (Replit / Claude Code / Codex): read the files directly, wherever
# the skills root puts them (category folders vary by install)
<skills-root>/**/grilling/SKILL.md
<skills-root>/**/grill-with-docs/SKILL.md
```

Do not paraphrase the interview from memory -- load the skill and work its rounds. Do not write any
glossary entry or ADR unless the docs route is active and the user has settled that decision.
