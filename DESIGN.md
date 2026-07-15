# False Dawn Industries — DESIGN.md

The authoritative brand and design system document for False Dawn Industries
(FDI). **System of record: Signal Neo-Brutalism** (adopted July 2026 from the
approved reference direction; source spec preserved at
`attached_assets/DESIGN_1784149690872.md` with reference mockup
`attached_assets/code_1784149690872.html` and screenshot
`attached_assets/screen_1784149690873.png`).

This document is now prescriptive: it defines the target system every surface
is being migrated to (public site, ad/channel creatives, social visuals,
decks, boards, brand package). Where a value already ships in the codebase its
source file is cited; where a value comes from the adopted direction it is
cited to the reference spec.

Brand concept: **Growth Cartography, rendered industrial.** The act of
mapping and operationalizing complex, unmapped marketplaces. The personality
is **aggressive, industrial, and high-velocity**: massive viewport-scale
typography, high-contrast color blocks, raw structural lines, and
"machine-like" functionalism. It rejects soft gradients and decorative
flourishes; the audience is high-level strategic operators who value clarity,
speed, and systemic thinking. (Source: reference spec, "Brand & Style".)

Master eyebrow / positioning line: **Growth Cartography**
(used site-wide as the lead eyebrow and in the footer base; sources:
`site/build.mjs`, `replit.md`).

---

## 1. What this codebase is

False Dawn Industries builds the thesis of **owned marketing systems** for
aggregated, decentralized, and autonomous markets (source: `replit.md`):

- **Aggregated**: marketing within today's platforms (Meta, Google, TikTok)
  plus what is not yet understood about AI platforms like ChatGPT.
- **Decentralized**: marketing within crypto-powered decentralized networks.
- **Autonomous**: agents transacting with agents, and the dynamics and growth
  curve as those marketplaces scale toward the size of Meta and Google today.

Homepage headline: "Build the machine, *not the ad*." Lede: "Owned marketing
systems for aggregated, decentralized, and autonomous markets. We map the
machine that decides who gets seen and build the tools to own your place in
it." (Source: `site/build.mjs`, `home()`.)

### The product family (lead feature first)

Per the homepage hierarchy ("The FDI Operating System" section in
`site/build.mjs`), **MarCom OS is the flagship and leads everything**:

1. **MarCom OS** — Flagship. Pill copy: "Flagship · Structure as Code".
   "The blueprint for an AI-era marketing organization: the Hourglass org
   design, the Use, Compose, Build capability calculator, and the Riverbank
   governance system, shipped as a working kit instead of a slide deck.
   Structure as code." Route `/marcom-kit`; assets in `exports/marcom-kit/`.
2. **SkillFoundry** — "Product · Strategy as Code". "The enforcement engine
   inside the kit: a strategic firewall that routes any asset through three
   Signal-to-Value gates (Relevance, Performance, and Algorithmic Signal) as
   a plugin built on the open Model Context Protocol (MCP)." Route
   `/skillfoundry`; code in `skillfoundry/`.
3. **Top Call** — the paid "Signal as Code" sibling to SkillFoundry: a
   source-authority-graded corpus + knowledge graph + verifiable MCP
   interface. Route `/topcall`; code in `topcall/`.
4. **The Field Guides** — "The CMO's Field Guide" (Field Guide 001, system
   and cohort dynamics) and the series (Aggregated · Decentralized ·
   Autonomous). Routes `/field-guide`, `/field-guide-002`, `/series`,
   `/aggregated`, `/decentralized`, `/autonomous`.

About line: "Belief lives in culture. Trust lives in experience. Identity is
the bridge." (Source: `site/build.mjs`, `#about`.)

### Critical files

| Area | Files |
| --- | --- |
| Public site generator | `site/build.mjs` (all pages + copy), `site/serve.mjs` |
| Site stylesheet (scrollable pages) | `site/src/site.css` |
| Ad/creative stylesheet (fixed-viewport) | `artifacts/mockup-sandbox/public/ads/brand.css` |
| Brand boards (source components) | `artifacts/mockup-sandbox/src/components/mockups/brand-kit/` (`ColorTypography.tsx`, `LogoConcepts.tsx`, `BrandGuidelines.tsx`, `_group.css`) |
| Brand board PNG exports | `exports/false-dawn-campaign/brand-boards/` (4 boards, 1280x1600) |
| Self-hosted fonts | `artifacts/mockup-sandbox/public/fonts/` (20 woff2 files; latin subsets copied to `site/dist/fonts/` at build) |
| Logo mark | inline `MARK` SVG in `site/build.mjs`; favicon at `artifacts/mockup-sandbox/public/favicon.svg` |
| Campaign creatives | `exports/false-dawn-campaign/ads/` (4 angles x 4 formats), `exports/false-dawn-campaign/channel/` (LinkedIn, Instagram, GitHub) |
| Adopted direction (reference) | `attached_assets/DESIGN_1784149690872.md`, `attached_assets/code_1784149690872.html` |
| Brand rules of record | `replit.md` ("Brand rules (locked)") |
| Deploy gate | `site/check.mjs` (rebuilds and validates links/assets/slides) |

### Goals

- Ship the owned-systems thesis as working product ("Proof, not slides. A
  thesis you can't ship is just a slide." — `site/build.mjs`).
- MarCom OS first; SkillFoundry as its running enforcement engine; the Field
  Guide series as the thesis surface; waitlist capture on every page.

---

## 2. Color system (locked)

High-contrast warm-industrial family on **Base Dark `#0D0B08`** with
high-visibility signal accents. No off-family teal/red. (Sources: existing
tokens in `site/src/site.css` / `brand.css`; new roles and the surface ramp
from the adopted reference spec.)

### RULE CHANGE (July 2026): Signal Orange promoted

The old rule "Signal Orange `#FF5E00` is the logo mark ONLY" is **retired**.
Under Signal Neo-Brutalism:

- **Signal Amber `#FFB12B`** is the **primary** action and focus color:
  primary buttons, thick borders, highlighted headline words, selection.
- **Signal Orange `#FF5E00`** is the **secondary "alert" accent**: full-bleed
  high-impact color-block sections, background watermarks, kicker ticks,
  hover/invert states, and single emphasized headline words. It remains the
  logo mark color. Use it deliberately and sparingly at small scale; at large
  scale it appears only as a full section fill or a 5%-opacity watermark.
- Large amber and orange **fills are now allowed** as full-bleed section
  panels with near-black (`#0D0B08`) text on top. The old "never use amber
  for large fills" rule applies only *inside* dark sections (do not tint
  cards or backgrounds amber; a panel is either fully signal-colored or dark).

### Backgrounds and surfaces (umber ramp)

Deeply desaturated umbers and earths; never pure gray. (Ramp from the
reference spec; legacy `--surface`/`--elevated` kept as aliases.)

| Token | Hex | Use |
| --- | --- | --- |
| `--base` / base-dark | `#0D0B08` | page background, text-on-signal |
| surface-container-lowest | `#110e05` | deepest inset panels |
| surface (reference) | `#161308` | alternate page background |
| surface-container-low | `#1f1b10` | low-emphasis panels |
| surface-container | `#231f14` | default card fill on dark |
| surface-container-high | `#2e2a1d` | raised panels |
| surface-container-highest | `#393527` | highest panels, chips |
| surface-bright | `#3d392c` | brightest surface |
| `--surface` (legacy) | `#141009` | existing card fill (maps to container-low band) |
| `--elevated` (legacy) | `#1C160D` | existing raised panels |

### Borders

| Token | Hex | Use |
| --- | --- | --- |
| `--border` | `#2A2015` | default border (Umber) |
| `--hairline` | `#3A2D1C` | subtle divider (Hairline) |
| outline | `#9f8e7a` | high-visibility outline (reference) |
| outline-variant | `#524534` | mid outline (reference) |

Structural borders are **thick**: 2px or 4px in `--amber` or `--hairline`.

### Text and neutrals

| Token | Hex | Use |
| --- | --- | --- |
| `--cream` | `#F0E8D5` | primary text (Cream) |
| on-surface (reference) | `#eae2cf` | primary text on reference surfaces |
| `--faded` | `#A8997B` | secondary text (Faded Ink) |
| `--muted` | `#7A6A50` | quiet text/labels (Muted Earth) |
| on-surface-variant | `#d7c4ad` | secondary text on umber panels |

Typography colors are strictly tiered: high-contrast cream/amber/orange for
headlines; Faded Ink or on-surface-variant for supporting body copy.

### Signal and action

| Token | Hex | Use |
| --- | --- | --- |
| `--amber` | `#FFB12B` | **primary**: actions, borders, highlights |
| `--amber-press` | `#E0920C` | pressed / deep accent |
| `--amber-glow` | `#FFCB6B` | light accent / hover |
| `--signal-orange` | `#FF5E00` | **secondary alert accent** + logo mark |
| glow (effect) | `rgba(255,177,43,.4)` | text-glow shadow color |

Extended amber tints used only on the tonal-ramp brand board
(`ColorTypography.tsx`): `#FFE5AD` (Tint 1), `#FFF8E7` (Tint 2).

### Contrast (on `#0D0B08`, from the brand-guidelines board)

| Color | Ratio | WCAG |
| --- | --- | --- |
| Cream #F0E8D5 | 16.11:1 | AAA |
| Faded Ink #A8997B | 7.03:1 | AAA |
| Muted #7A6A50 | 3.75:1 | Large text only |
| Signal Orange #FF5E00 | 6.3:1 | AA normal text |
| Signal Amber #FFB12B | 10.83:1 | AAA |
| Amber Glow #FFCB6B | 13.11:1 | AAA |
| Amber Press #E0920C | 7.94:1 | AAA |

On signal fills (amber or orange panels) text is always near-black
`#0D0B08`; white is permitted only for a single emphasized headline word on
an orange panel (per the reference mockup). Colorblind safety: distinguish
data series by label, weight, or position, never by hue alone.

---

## 3. Typography

Typography is the primary driver of layout. Three families, all self-hosted
woff2 (never fetched from Google at render/export time). Sources:
`site/src/site.css` (latin subsets, `font-display: swap`) and
`artifacts/mockup-sandbox/public/ads/brand.css` (latin + latin-ext,
`font-display: block` for exact-pixel export).

| Family | Role | Weights in repo |
| --- | --- | --- |
| **Space Grotesk** | Display: massive viewport-relative uppercase headlines, buttons, wordmark | 400, 500, 600, 700 (reference uses up to 800; heaviest in-repo weight, 700, is the display weight) |
| **Inter** | Body / UI: functional reading, neutral counterpoint | 400, 500, 600 |
| **JetBrains Mono** | Labels, eyebrows, metadata, numerics, data, code | 400, 500, 700 |

### Display scale (Signal Neo-Brutalism)

Display type is uppercase with tight negative tracking, and may bleed past
the container edge (width up to 120%, negative left margin) to feel larger
than the device.

| Style | Spec | Use |
| --- | --- | --- |
| display-huge | Space Grotesk 700+, 22vw (clamp on wide screens), line-height 0.85, letter-spacing -0.06em, uppercase | one per page: the hero |
| punchy-heading | Space Grotesk 700+, 14vw (clamped), line-height 0.9, letter-spacing -0.05em, uppercase | section headlines |
| headline-lg | Space Grotesk 700, 2.25rem, line-height 1.1 | card titles |
| body-lg | Inter 500, 1.125rem, line-height 1.5 | ledes, standfirsts |
| body-md | Inter 400, 0.875-1.0625rem, line-height 1.4-1.6 | body copy |
| label-caps | JetBrains Mono 700, 12px, letter-spacing .2em, uppercase | kickers, tags |
| data-mono | JetBrains Mono 700, 10-12px | data labels, meta |

On the site, vw-based display sizes MUST be clamped so headlines stay sane on
desktop (e.g. `clamp(64px, 22vw, 200px)` for display-huge and
`clamp(44px, 14vw, 130px)` for punchy headings; tune per surface). Fixed-size
creative exports use raw vw since the viewport is fixed.

**Text glow:** primary display type carries `text-shadow: 0 0 20px
rgba(255,177,43,.4)` to simulate a backlit signal. Do not glow body copy.

Headline color pattern (from the reference mockup): alternate cream, amber,
and orange line by line or word by word within one display headline.

---

## 4. Layout and spacing

**Vertical Stack with Rotational Disruptions.** (Source: reference spec.)

- Sections are full-width stacked blocks. Signal color-block sections
  (amber or orange fills) use slight rotations (1deg to -1deg) and ~105%
  scale so they bleed off both edges and break the browser box model.
  Rotated sections sit above neighbors (higher z-index).
- Typography bleeds: display headlines may extend to 110-120% width with a
  small negative left offset.
- Rhythm: tight inside components, generous between sections. Define space
  with hard 2-4px borders, not extra padding.
- Watermarks: a single oversized glyph or mark per page, fixed/centered,
  `#FF5E00` at ~5% opacity, behind content (z-index below content), as
  background texture. On FDI surfaces use the Dawn Mark SVG or a cartographic
  glyph, not Material Symbols (no new font dependency).
- Reduced motion: rotations are static transforms (fine), but any animated
  glow/marquee must respect `prefers-reduced-motion`.

Existing site layout tokens (`site/src/site.css`, kept):

- `--maxw: 1180px` (`.wrap` max content width, 24px side padding)
- `--readw: 720px` (article/prose measure)
- Section rhythm: `.section { padding: clamp(56px, 9vw, 120px) 0; }`
- Sticky nav 68px tall

### Elevation and depth

No traditional soft shadows. Depth comes from:

- **Stark overlays**: physically overlapping high-contrast color blocks
  (an orange section over the black background).
- **Z-index play**: content slides over/under low-opacity watermarks.
- **Glassmorphism**: ONLY for persistent chrome (sticky header/footer):
  80-95% opacity dark glass + backdrop blur.
- **The Glow**: `box-shadow` in the signal color with no spread (an outer
  glow) to highlight active components, instead of drop shadows.

### Shapes

Strictly geometric and sharp:

- **Corner radius 0px** on all primary containers, cards, buttons, inputs.
- Exception: tiny indicators (status pips) may be full pills for contrast.
- Containers are defined by thick 2px/4px borders in `--amber` or
  `--hairline`, never by shadow.

---

## 5. Logo and identity

Primary mark: **the Dawn Mark** ("Concept 02: Dawn Mark — Primary" in
`LogoConcepts.tsx`): "a bold false dawn breaking over the horizon — a solid
lower half rising into an open ring." Rendered in Signal Orange; under the
new system orange also appears as the alert accent, so the mark keeps
primacy through its unique silhouette, not through color exclusivity.

Canonical geometry (inline `MARK` in `site/build.mjs`, styled by `.mark` in
both stylesheets; stroke-width 7, color `#FF5E00`):

```svg
<svg viewBox="0 0 100 100" fill="none">
  <path d="M12 50 A38 38 0 0 1 88 50" stroke="#FF5E00" stroke-width="7" fill="none"/>
  <path d="M12 50 A38 38 0 0 0 88 50 Z" fill="#FF5E00"/>
</svg>
```

Lockup (`.lockup` in both stylesheets): wordmark "False Dawn Industries" in
Space Grotesk 600+, uppercase, letter-spacing .14em, with the mark trailing
(row-reverse) at 1em square. Tagline under lockups on the brand boards:
"Growth Cartography" (uppercase, tracked, muted).

Usage rules (`BrandGuidelines.tsx` / `LogoConcepts.tsx` boards):

- Clear space: 2x logo height.
- Don't recolor the mark (it stays Signal Orange; on light or signal-colored
  chips it may be rendered in Base `#0D0B08`).
- On an orange panel, render the mark in Base `#0D0B08` (never
  orange-on-orange).
- Don't stretch.
- Legibility verified at 32px and 16px.

Note: the served favicon (`artifacts/mockup-sandbox/public/favicon.svg`,
copied to `site/dist/favicon.svg`) is currently a plain rounded square in
`#FF3C00`, not the Dawn Mark; the mark of record is the inline `MARK` SVG.

Alternate explored concepts (kept on the logo board, not in production use):
True North Compass, Node Constellation, Blueprint Monogram.

Secondary motif: **the machine/network graph** (`MACHINE` SVG in
`site/build.mjs`): a five-node network where "buying reach lights a single
edge; building the machine lights the whole system." Used as the homepage
hero visual.

---

## 6. Component patterns (target system)

Component rules under Signal Neo-Brutalism (reference spec, "Components").
Existing selectors in `site/src/site.css` are being migrated to these rules.

- **Kickers / eyebrows** — JetBrains Mono label-caps, uppercase, .2em+
  tracking; preceded by a solid orange tick block (a small filled rectangle,
  not a thin rule). Amber text on dark; base-dark text on signal panels.
- **Buttons** — large blocks, uppercase Space Grotesk 700, sharp corners.
  Primary: `--amber` fill + `#0D0B08` text; hover inverts or shifts to
  `--signal-orange` (+ white text allowed on orange hover). Ghost: 2px
  border, transparent fill. Key CTAs may go full-width.
- **Cards** — sharp corners, thick 2px borders (amber for featured/active,
  hairline for rest), `base-dark` or surface-container fills, label-caps
  header separated by a rule. No shadows; active cards may glow.
- **Badges / chips** — JetBrains Mono, rectangular, thin borders. (The one
  legacy exception: the flagship `.pill` may stay a pill as a "status pip".)
- **Header** — sticky, 80% opacity dark glass, backdrop blur, thick 4px
  bottom border in `--amber`.
- **Sticky footer CTA** (where used) — 95% dark glass, 2px top border in
  `--signal-orange`, orange outer-glow shadow upward.
- **Signal sections** — full-bleed `--signal-orange` or `--amber` panels,
  slight rotation, base-dark text, inner cards inverted to base-dark fills.
- **Stat bands / data** — JetBrains Mono numerals, amber highlights,
  superscript `[source]` cite links (existing `.statband` pattern carries
  over with sharp corners and thicker borders).
- **Progress / status** — horizontal bars or simple geometric fills, no
  fluid animations.
- **Deck system** — 13-slide 16:9 deck (`.deck-frame` PDF iframe +
  `.slides-strip` PNG thumbnails); slide PNGs in
  `site/src/assets/deck-slides/` and `deck-slides-002/`.
- **Ad system** (`brand.css`) — fixed-viewport `.ad` layout retained
  (lockup, `.corner` meta, eyebrow/headline/subline stack, `.metaline`
  footer), restyled to the new type scale, sharp corners, and signal
  color-block treatments. Exported at 1200x628, 1080x1350, 1080x1080,
  1080x1920.

---

## 7. Voice, tone, and copy rules (locked)

Voice under Signal Neo-Brutalism: **urgent authority with technical
precision.** Headlines are declarative, compressed, and imperative ("BUILD
THE MACHINE"); body copy stays instrument-grade and considered, never hype.
The navigational vocabulary carries over: "Chart the network." / "Mark your
coordinates." / "Find true north in unmapped markets." DO: "The model lost
its bearing." DON'T: "Unleash the power of next-gen AI to supercharge your
ROI!" Loudness lives in the typography, not in exclamation points.

Hard copy rules (source: `replit.md`):

- **No em-dashes** anywhere in `site/build.mjs`/`site.css` or customer-facing
  kit copy; sentences are rewritten instead.
- Product name is always **"SkillFoundry"** (URL and dir stay lowercase).
- Every waitlist CTA reads **"Join the waitlist"**. The ONE exception: the
  SkillFoundry Tier 1/2/3 buttons drive live Stripe checkout and keep their
  commerce labels ("Buy now", "Subscribe", "Start retainer").
- **MCP is described as an open standard**; never claim Anthropic
  affiliation or endorsement.
- No former-client names; softened risk claims; not-legal-advice disclaimers
  in kit/export assets.
- Lead with the FDI master brand + the "Growth Cartography" eyebrow.

---

## 8. Where each surface gets its styles

| Surface | Stylesheet | Notes |
| --- | --- | --- |
| Public site pages | `site/src/site.css` | scrollable; latin font subsets; never use the ad system's `brand.css` here |
| Ads / fixed creatives | `artifacts/mockup-sandbox/public/ads/brand.css` | 100vw x 100vh fixed, overflow hidden, latin+latin-ext, `font-display: block` |
| Brand boards / mockups | `brand-kit/_group.css` custom properties (same hex values, `--bg-*`/`--text-*`/`--accent-*` names) | Tailwind-based preview components |

## 9. Social visual layout rules (locked)

Rules for every social/newsletter visual (1200x1500 portrait, 1280x720 cover,
and any feed-bound export). Rationale: these images are mostly seen at ~350px
wide in a mobile feed, so they must pass the thumbnail test. These rules
predate Signal Neo-Brutalism and remain fully in force; the new system only
raises the ceiling (bigger type, signal color-blocks, sharp borders).

- **One oversized hero element per image.** A giant stat (18-22vw), a bold
  claim headline (6-14vw uppercase display), or a single dominant diagram.
  Never a grid of equal-weight cards with no focal point.
- **Minimum type sizes at 1200px wide** (1vw = 12px): hero claim >= 5.5vw;
  row/item titles >= 3vw; supporting lines >= 2vw and used sparingly; only
  decorative kickers/eyebrows may go below 1.6vw.
- **Word budget:** aim for <= 60 words per image; supporting lines one short
  sentence max; cut body copy before shrinking type.
- **Fill the frame.** No stretched empty cards and no dead bottom third:
  content blocks use flex fill (`flex:1` + `justify-content:space-evenly`)
  and the footer pins to the bottom edge.
- **Signal panels welcome:** a full-bleed amber or orange visual with
  base-dark type is a valid (and encouraged) hero treatment.
- **brand.css gotchas:** inside `.ad`, the class `hero` is reserved for the
  absolute-positioned photo slot (use `big`/`lead` instead), and `.ad .foot`
  sets its own margins, so page-level foot overrides need `.ad .wrap .foot`
  specificity.
- Verify every export by viewing the PNG scaled down before shipping.

---

The distributable brand package (tokens, fonts, logos, boards, starter demo)
lives at `exports/fdi-brand-package/` and is zipped to
`exports/fdi-brand-package.zip`. `tokens.json` there is in W3C design-tokens
format for import into Figma via Tokens Studio (a literal .fig binary is a
proprietary format that cannot be authored outside Figma).
