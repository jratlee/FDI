# False Dawn Industries Brand Package

The distributable FDI brand kit. System of record: **Signal Neo-Brutalism**
(adopted July 2026). `DESIGN.md` is the authoritative document; values that
already ship in the codebase cite their source file, and values from the
adopted direction cite the reference spec.

## Contents

- `DESIGN.md`: the full brand and design system document (purpose, critical
  files, colors, type, layout, logo, components, voice, copy rules).
- `tokens/tokens.css`: the CSS custom properties. Base tokens match the
  `:root` blocks of `site/src/site.css` and the ad system's `brand.css`;
  the umber surface ramp, role tokens, type scale, and shape tokens come
  from the adopted Signal Neo-Brutalism reference spec. The layout tokens
  `--maxw`/`--readw` come from the site stylesheet only.
- `tokens/tokens.json`: the same tokens in W3C design-tokens format,
  importable into Figma via the Tokens Studio plugin. This is the Figma
  path: a literal `.fig` binary is a proprietary format that cannot be
  authored outside Figma, so tokens JSON + the SVG mark are the supported
  import route (paste `logo/fdi-mark.svg` directly into Figma; import
  `tokens.json` with Tokens Studio).
- `fonts/`: all 20 self-hosted woff2 files: Space Grotesk 400/500/600/700,
  Inter 400/500/600, JetBrains Mono 400/500/700, latin + latin-ext subsets.
- `logo/fdi-mark.svg`: the Dawn Mark in Signal Orange `#FF5E00` (canonical
  geometry from the site's inline mark).
- `logo/favicon.svg`: the favicon currently served by the site (a plain
  rounded square in `#FF3C00`; the mark of record is `fdi-mark.svg`).
- `logo/fdi-lockup-dark-1600x400.png`: the lockup PNG export on the Base
  `#0D0B08` background (mark in Signal Orange, wordmark in Cream), rendered
  from the site's exact `.lockup` markup, CSS, and self-hosted fonts.
- `logo/fdi-lockup-light-1600x400.png`: the lockup on the Cream light chip
  (mark and wordmark in Base `#0D0B08`, per the logo-concepts board rule
  that the mark on light chips renders in Base).
- `logo/li-avatar-400x400.png`: the LinkedIn avatar export of the mark.
- `brand-boards/`: the four exported brand boards (1280x1600): color and
  typography, logo concepts, brand in action, brand guidelines.
- `demo/starter.html`: a self-contained Signal Neo-Brutalism demo page that
  renders the core components (glass header, watermark, kicker, display
  hero, rotated signal section, buttons, cards, swatches, data numerals)
  using only package-local fonts and tokens. Open it directly in a browser.

## Hard rules

- **Signal Amber `#FFB12B` is the primary action color** (buttons, thick
  2-4px borders, highlighted headline words; `#E0920C` press, `#FFCB6B`
  glow). **Signal Orange `#FF5E00` is the secondary "alert" accent**
  (full-bleed color-block sections, 5%-opacity watermarks, kicker ticks,
  hover/invert states) and remains the logo mark color. No teal/red.
- Backgrounds stay warm dark (base `#0D0B08` plus the umber surface ramp).
  Large amber/orange fills are allowed only as full-bleed section panels
  with base-dark text; never tint cards or backgrounds amber.
- Sharp 0px corners, thick 2px/4px borders instead of shadows, uppercase
  viewport-scale Space Grotesk display type with amber text-glow.
- No em-dashes in customer-facing copy; CTAs read "Join the waitlist"
  (SkillFoundry's live Stripe tier buttons are the one exception).
- MCP is described as an open standard, with no affiliation claims.
