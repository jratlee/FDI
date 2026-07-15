# False Dawn Industries — Brand Package

The distributable FDI brand kit. Everything here is extracted verbatim from
the working codebase; `DESIGN.md` is the authoritative document and cites the
source file for every value.

## Contents

- `DESIGN.md` — the full brand and design system document (purpose, critical
  files, colors, type, layout, logo, components, voice, copy rules).
- `tokens/tokens.css` — the shared CSS custom properties (color tokens are
  identical in the `:root` blocks of `site/src/site.css` and the ad system's
  `brand.css`; the layout tokens `--maxw`/`--readw` come from the site
  stylesheet only).
- `tokens/tokens.json` — the same tokens in W3C design-tokens format,
  importable into Figma via the Tokens Studio plugin. This is the Figma
  path: a literal `.fig` binary is a proprietary format that cannot be
  authored outside Figma, so tokens JSON + the SVG mark are the supported
  import route (paste `logo/fdi-mark.svg` directly into Figma; import
  `tokens.json` with Tokens Studio).
- `fonts/` — all 20 self-hosted woff2 files: Space Grotesk 400/500/600/700,
  Inter 400/500/600, JetBrains Mono 400/500/700, latin + latin-ext subsets.
- `logo/fdi-mark.svg` — the Dawn Mark in Signal Orange `#FF5E00` (canonical
  geometry from the site's inline mark).
- `logo/favicon.svg` — the favicon currently served by the site (a plain
  rounded square in `#FF3C00`; the mark of record is `fdi-mark.svg`).
- `logo/fdi-lockup-dark-1600x400.png` — the lockup PNG export on the Base
  `#0D0B08` background (mark in Signal Orange, wordmark in Cream), rendered
  from the site's exact `.lockup` markup, CSS, and self-hosted fonts.
- `logo/fdi-lockup-light-1600x400.png` — the lockup on the Cream light chip
  (mark and wordmark in Base `#0D0B08`, per the logo-concepts board rule
  that the mark on light chips renders in Base).
- `logo/li-avatar-400x400.png` — the LinkedIn avatar export of the mark.
- `brand-boards/` — the four exported brand boards (1280x1600): color and
  typography, logo concepts, brand in action, brand guidelines.
- `demo/starter.html` — a self-contained demo page that renders the core
  components (lockup, eyebrow, buttons, cards, swatches, data numerals)
  using only package-local fonts and tokens. Open it directly in a browser.

## Hard rules

- Signal Orange `#FF5E00` is the **logo mark only**; amber `#FFB12B` (with
  `#E0920C` press and `#FFCB6B` glow) is the accent. No teal/red.
- Backgrounds stay warm dark; amber is never a large fill.
- No em-dashes in customer-facing copy; CTAs read "Join the waitlist"
  (SkillFoundry's live Stripe tier buttons are the one exception).
- MCP is described as an open standard, with no affiliation claims.
