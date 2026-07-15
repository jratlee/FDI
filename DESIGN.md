# False Dawn Industries — DESIGN.md

The authoritative brand and design system document for False Dawn Industries
(FDI). Every value in this file is extracted from the codebase; nothing here
is invented. Each section cites its source file so a designer or agent can
verify any token against the working system.

Brand concept: **Cartographic Precision.** "A precision navigational
instrument that helps a growth marketer chart their bearings in unmapped
marketplaces where human and machine dynamics collide."
(Source: `artifacts/mockup-sandbox/src/components/mockups/brand-kit/BrandGuidelines.tsx`)

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
| Brand rules of record | `replit.md` ("Brand rules (locked)") |
| Deploy gate | `site/check.mjs` (rebuilds and validates links/assets/slides) |

### Goals

- Ship the owned-systems thesis as working product ("Proof, not slides. A
  thesis you can't ship is just a slide." — `site/build.mjs`).
- MarCom OS first; SkillFoundry as its running enforcement engine; the Field
  Guide series as the thesis surface; waitlist capture on every page.

---

## 2. Color system (locked)

Strict two-tone warm family. **Signal Orange `#FF5E00` is the logo mark
ONLY.** No off-family teal/red. (Source of record: `replit.md`; color tokens
identical in `site/src/site.css` `:root` and
`artifacts/mockup-sandbox/public/ads/brand.css` `:root`; the site stylesheet
additionally defines the layout tokens `--maxw` and `--readw`.)

### Backgrounds and surfaces

| Token | Hex | Name (brand boards) | Use |
| --- | --- | --- | --- |
| `--base` | `#0D0B08` | Base (Parchment Night) | page background |
| `--surface` | `#141009` | Surface (Tobacco) | cards, panels |
| `--elevated` | `#1C160D` | Elevated Surface | raised panels |

### Borders

| Token | Hex | Use |
| --- | --- | --- |
| `--border` | `#2A2015` | default border (Umber) |
| `--hairline` | `#3A2D1C` | subtle divider (Hairline) |

### Text and neutrals

| Token | Hex | Use |
| --- | --- | --- |
| `--cream` | `#F0E8D5` | primary text (Cream) |
| `--faded` | `#A8997B` | secondary text (Faded Ink) |
| `--muted` | `#7A6A50` | quiet text/labels (Muted) |

### Signal and action

| Token | Hex | Use |
| --- | --- | --- |
| `--signal-orange` | `#FF5E00` | **logo mark only** |
| `--amber` | `#FFB12B` | Signal Amber: primary accent, links, primary buttons |
| `--amber-press` | `#E0920C` | deep accent / pressed |
| `--amber-glow` | `#FFCB6B` | light accent / hover |

Extended amber tints used only on the tonal-ramp brand board
(`ColorTypography.tsx`): `#FFE5AD` (Tint 1), `#FFF8E7` (Tint 2).

### Rules (from `BrandGuidelines.tsx`)

- DO: "Use Signal Amber sparingly for the most important action on a screen
  or to highlight critical shifts in data. Backgrounds stay warm dark."
- DON'T: "Never use amber for large fills, background colors, or generic
  decorative elements."
- Colorblind safety: distinguish data series "by label, weight, or position —
  never by hue alone."

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

---

## 3. Typography

Three families, all self-hosted woff2 (never fetched from Google at
render/export time). Sources: `site/src/site.css` (latin subsets,
`font-display: swap`) and `artifacts/mockup-sandbox/public/ads/brand.css`
(latin + latin-ext, `font-display: block` for exact-pixel export).

| Family | Role | Weights in repo |
| --- | --- | --- |
| **Space Grotesk** | Display / headings, buttons, wordmark | 400, 500, 600, 700 |
| **Inter** | Body / UI | 400, 500, 600 |
| **JetBrains Mono** | Labels, eyebrows, numerics, data, code | 400, 500, 700 |

Site defaults (`site/src/site.css`): body 17px/1.6 Inter; headings Space
Grotesk 600, line-height 1.08, letter-spacing -.015em; section `h2` scales
`clamp(28px, 4.4vw, 46px)`.

Type scale reference (brand board `ColorTypography.tsx`): Display 72px Space
Grotesk; H1 48px Space Grotesk; H2 32px Space Grotesk; Body 16px Inter;
Caption 12px JetBrains Mono uppercase tracked.

---

## 4. Layout and spacing

From `site/src/site.css`:

- `--maxw: 1180px` (`.wrap` max content width, 24px side padding)
- `--readw: 720px` (article/prose measure)
- Section rhythm: `.section { padding: clamp(56px, 9vw, 120px) 0; }`
- Section header block `.section-hd`: max-width 760px, 48px bottom margin
- Sticky nav 68px tall, blurred `rgba(13,11,8,.82)` background
- Buttons: 8px radius, 13px 22px padding, Space Grotesk 600 15px

---

## 5. Logo and identity

Primary mark: **the Dawn Mark** ("Concept 02: Dawn Mark — Primary" in
`LogoConcepts.tsx`): "a bold false dawn breaking over the horizon — a solid
lower half rising into an open ring. Rendered in Signal Orange so the mark
cuts through at any size, while amber stays the supporting accent across the
rest of the system."

Canonical geometry (inline `MARK` in `site/build.mjs`, styled by `.mark` in
both stylesheets; stroke-width 7, color `#FF5E00`):

```svg
<svg viewBox="0 0 100 100" fill="none">
  <path d="M12 50 A38 38 0 0 1 88 50" stroke="#FF5E00" stroke-width="7" fill="none"/>
  <path d="M12 50 A38 38 0 0 0 88 50 Z" fill="#FF5E00"/>
</svg>
```

Lockup (`.lockup` in both stylesheets): wordmark "False Dawn Industries" in
Space Grotesk 600, uppercase, letter-spacing .14em, with the mark trailing
(row-reverse) at 1em square. Tagline under lockups on the brand boards:
"Growth Cartography" (uppercase, tracked, muted).

Usage rules (`BrandGuidelines.tsx` / `LogoConcepts.tsx` boards):

- Clear space: 2x logo height.
- Don't recolor the mark (it stays Signal Orange; on light chips it may be
  rendered in Base `#0D0B08`, as shown on the logo-concepts board).
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

## 6. Component patterns (site)

All from `site/src/site.css` + markup in `site/build.mjs`:

- **`.eyebrow`** — JetBrains Mono, uppercase, .28em tracking, 12px, faded;
  amber 2px rule before the text. Leads every section.
- **`.btn-primary`** — amber fill, near-black text (`#1a1206`), glow on
  hover, arrow glyph `→` that slides on hover.
- **`.btn-ghost`** — transparent, hairline border, amber on hover.
- **`.card`** / **`.card.featured`** — surface panels with `.tag` /
  `.pill` labels; featured card carries the flagship pill.
- **`.statband`** — cited stat row (JetBrains Mono numerals, amber
  highlights, superscript `[source]` cite links).
- **`.lockup`** — nav and footer brand lockup.
- **Deck system** — 13-slide 16:9 deck (`.deck-frame` PDF iframe +
  `.slides-strip` PNG thumbnails); slide PNGs in
  `site/src/assets/deck-slides/` and `deck-slides-002/`.
- **Ad system** (`brand.css`) — fixed-viewport `.ad` layout: photographic
  hero + scrim + vignette, lockup top-left, `.corner` meta top-right,
  eyebrow/headline/subline stack, amber tick + `.metaline` footer. Exported
  at 1200x628, 1080x1350, 1080x1080, 1080x1920.

---

## 7. Voice, tone, and copy rules (locked)

Tone (`BrandGuidelines.tsx`): "Tone is navigational and considered.
Instrument-grade clarity over marketing hype. We speak with quiet
confidence." Sample phrases: "Chart the network." / "Mark your coordinates."
/ "Find true north in unmapped markets." DO: "The model lost its bearing."
DON'T: "Unleash the power of next-gen AI to supercharge your ROI!"

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
wide in a mobile feed, so they must pass the thumbnail test.

- **One oversized hero element per image.** A giant stat (18-22vw), a bold
  claim headline (6-7.5vw), or a single dominant diagram. Never a grid of
  equal-weight cards with no focal point.
- **Minimum type sizes at 1200px wide** (1vw = 12px): hero claim >= 5.5vw;
  row/item titles >= 3vw; supporting lines >= 2vw and used sparingly; only
  decorative kickers/eyebrows may go below 1.6vw.
- **Word budget:** aim for <= 60 words per image; supporting lines one short
  sentence max; cut body copy before shrinking type.
- **Fill the frame.** No stretched empty cards and no dead bottom third:
  content blocks use flex fill (`flex:1` + `justify-content:space-evenly`)
  and the footer pins to the bottom edge.
- **brand.css gotchas:** inside `.ad`, the class `hero` is reserved for the
  absolute-positioned photo slot (use `big`/`lead` instead), and `.ad .foot`
  sets its own margins, so page-level foot overrides need `.ad .wrap .foot`
  specificity.
- Verify every export by viewing the PNG scaled down before shipping.

---

The distributable brand package (tokens, fonts, logos, boards, starter demo)
lives at `exports/fdi-brand-package/` and is zipped to
`exports/fdi-brand-package.zip`. `tokens.json` there is in W3C design-tokens
format for import into Figma via Tokens Studio (a literal `.fig` binary is a
proprietary format that cannot be authored outside Figma).
