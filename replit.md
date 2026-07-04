# False Dawn Industries (FDI)

## Overview
False Dawn Industries is building the thesis of **owned marketing systems** for
aggregated, decentralized, and autonomous markets. This repo holds three things:

1. **The public marketing site** (`site/`) — the FDI umbrella homepage, the
   Field Guide (thesis article + visuals + launch deck), and the Skillfoundry
   product/landing page. This is the deployed, public web presence.
2. **The System Dynamics Engine** (`app.py`) — an internal Streamlit modeling
   tool (compounding cohort decay). Internal only; not linked from the public site.
3. **Brand + launch assets** (`artifacts/mockup-sandbox/`, `exports/`) — the FDI
   creative system, ad/channel creatives, brand boards, and the Field Guide
   launch bundle (article, images, deck PDF + slides).

## The public site (`site/`)
- Lightweight, dependency-light static site. `build.mjs` renders the thesis
  markdown (`exports/field-guide-launch/linkedin-thesis-article.md`) with `marked`,
  folds the inline visuals + captions into `<figure>`s, copies the launch assets
  and self-hosted fonts, and emits three pages to `site/dist/`:
  - `/` — homepage (hero, stat band, product line, proof builds, about)
  - `/field-guide` — the article + 3 inline visuals + inline deck viewer, deck
    PDF download, launch-bundle download, and a 13-slide thumbnail strip
  - `/skillfoundry` — three Signal-to-Value gates, Anthropic-standard modular
    architecture, three-tier pricing ladder, and a waitlist email-capture CTA
    (opens a prefilled `mailto:` — no backend, by design)
- `serve.mjs` is a zero-dependency Node static server with correct MIME types,
  long-cache headers for `/fonts` + `/assets`, and clean extensionless routing
  (`/field-guide` → `field-guide.html`).
- Build: `node site/build.mjs`. Serve: `node site/serve.mjs` (PORT env, default 5000).
- The site reuses the locked FDI brand tokens/fonts but has its own scrollable
  stylesheet (`site/src/site.css`) — it does NOT import the ad system's fixed
  100vh/overflow-hidden `brand.css`.

## Workflows & deployment
- Workflow **Start application** builds then serves the site on port 5000
  (`node site/build.mjs && node site/serve.mjs`) — this is what the preview shows.
- Deployment: `autoscale`, build `npm --prefix site ci && node site/build.mjs`,
  run `node site/serve.mjs`.
- The Streamlit engine can still be run manually (`streamlit run app.py`) but is
  no longer the public/deployed surface.

## Brand rules (locked)
Strict two-tone warm family. **Signal Orange `#FF5E00` is the logo mark ONLY.**
Accents use the amber ramp (`#FFB12B` / `#E0920C` / `#FFCB6B`); neutrals are
cream `#F0E8D5` / faded `#A8997B` / muted `#7A6A50` on near-black `#0D0B08`.
No off-family teal/red. Fonts: Space Grotesk (display), Inter (body),
JetBrains Mono (labels). Lead with the FDI master brand + the "Growth
Cartography" eyebrow.

## User preferences
- (none recorded yet)
