# PROVENANCE — grill-with-docs

- Source: https://github.com/mattpocock/skills (upstream path `skills/engineering/grill-with-docs`)
- Marketplace listing: https://www.skills.sh/mattpocock/skills/grill-with-docs
- Commit: `49dd158d1076134a641b33efb035946536778336` (2026-10-09), identical content verified against
  `main` on 2026-10-19.
- License: MIT (see `LICENSE`).
- Upstream body is a one-line Skill-tool router (`grilling` + `domain-modeling`). Hermes has no Skill
  tool, so it is rewritten as `skill_view` calls plus the composition rules; the interview behaviour
  is unchanged.
- Depends on: `productivity/grilling` (present in the fleet) and `engineering/domain-modeling`
  (adopted with this skill, same commit).
- Update recipe: re-fetch both upstream dirs, diff against these copies, keep the Hermes notes
  section, then push WSL -> Windows/VPS with `home-lab/fleet-skill-consistency/scripts/fleet-path-push.sh`
  and the Replit leg into the FDI repo `.agents/skills/`.
