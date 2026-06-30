---
name: FDI campaign brand color & naming system
description: The locked color/naming rules for the False Dawn Industries (FDI) creative campaign assets in artifacts/mockup-sandbox.
---

# FDI brand color & naming rules (campaign assets)

Applies to `artifacts/mockup-sandbox/public/{ads,channel}/`, the brand boards
in `src/components/mockups/brand-kit/`, AND the live Streamlit product `app.py`
(it injects the same warm tokens via custom CSS: near-black base, cream/faded
text, amber accents, Signal Orange reserved for the header dawn-circle mark; the
header leads with the FDI master brand + "Growth Cartography" eyebrow, with
"System Dynamics Engine" demoted to the product/tool title).

## Color
- **Strict two-tone warm family.** Signal Orange `#FF5E00` is the **logo mark
  ONLY** — never use it for text, accents, or fills. Accents use the amber ramp:
  Signal Amber `#FFB12B`, Amber Press `#E0920C`, Amber Glow `#FFCB6B`. Neutrals:
  cream `#F0E8D5`, faded ink `#A8997B`, muted `#7A6A50` on near-black `#0D0B08`.
- **Do NOT reintroduce off-family hues.** The old `meridian` teal `#5ABFA8` and
  `distress` red `#D8504A` tokens were deliberately removed everywhere. Don't add
  green/teal "success" or red "error/volatile" colors back, even for data-viz or
  DO/DON'T indicators — it breaks the one-family cohesion the user asked for.
- **Data-viz with two series:** distinguish by warmth + a non-color cue, not hue
  alone. Convention used: stable/baseline = faded `#A8997B` **dashed**; the
  critical/volatile series = Signal Amber `#FFB12B` solid, plus label/marker.

**Why:** user explicitly wanted the per-ad color worlds unified into ONE warm
amber family with no leftover clashing red/teal, and the logo reserved as the
only orange moment.

## Naming
- Lead with the **FDI master brand** + the POV signature eyebrow
  **"Growth Cartography"** (consistent across all ad/channel eyebrows).
- The **"System Dynamics Engine"** sub-brand is demoted: keep the full phrase
  only where it literally names the product (the app header in
  `BrandInAction.tsx`). Elsewhere it was replaced — e.g. the IG highlight trio is
  now Model / Method / Network ("Model" replaced "Engine").

**How to apply:** when editing or adding any FDI creative, grep for `5ABFA8`,
`D8504A`, `meridian`, `distress`, and stray "System Dynamics Engine" / "Engine"
labels before shipping; re-export via `artifacts/mockup-sandbox/export.mjs` (see
`creative-export-pipeline.md`) and rebuild both archives in `exports/`.
