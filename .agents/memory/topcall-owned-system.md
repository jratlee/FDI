---
name: Top Call owned system & site forms
description: How Top Call ("Signal as Code") is structured as the paid sibling to Skillfoundry, plus the generic site email-capture pattern.
---

# Top Call — the owned-system sibling to Skillfoundry

Two-sided product: a FREE prompt-pack lead magnet (proves the thesis *and* its
ceiling) and a PAID owned system in `topcall/`.

**Positioning contrast (keep consistent):** Skillfoundry = "Strategy as Code"
(composes prompts, no backend). Top Call = "Signal as Code" (reads a persistent,
provenance-stamped corpus and returns real answers). This *difference* is the
point — do not homogenize them.

**Three constructs map to the FDI thesis:** Aggregated → citable corpus;
Decentralized → knowledge graph; Autonomous → verifiable MCP interface. The moat
is the graded, provenance-stamped corpus, NOT the prompts.

**Compounding invariant:** source-authority tiers (1A/1B/1C=high, 2=medium,
3=low); a move's confidence is computed from ALL supporting sources, so a later
Tier-1 corroboration UPGRADES an earlier medium move to high. The canonical demo
is the Kroger move going medium→high. Any change to ingest/query must preserve
this upgrade path (validator checks confidence math).

**topcall/ is zero-dependency Node ESM.** Ingest skips readme-prefixed files and
sources with no moves; id prefixes use short forms (`exec:`/`src:`) enforced by
both the schema pattern and validator PREFIX map. Sample data = real companies +
FICTIONAL execs (labeled illustrative in `sources/README.md`).

# Generic site email-capture forms (`site/build.mjs` SITE_JS)

One handler drives every capture form. Mark a form `class="js-capture"` and set:
- `data-source` → waitlist tag sent to `/api/waitlist` (server allow-lists
  `[a-z0-9._-]`, else `"site"`)
- `data-subject` / `data-mail-body` → mailto fallback text
- `data-download` → on success, triggers that file download instead of a
  "you're on the list" message (used by the lead-magnet form)
- a sibling `.form-msg` element (found via `form.parentNode`) holds inline status

**Why:** originally the JS was hardcoded to a single `#waitlist-form` with source
"skillfoundry". Adding Top Call's two forms (lead-magnet + waitlist) required
generalizing. Keep one form per parent container so the `.form-msg` lookup stays
unambiguous. `site/check.mjs` EXPECTED_ROUTES must list every page route.
