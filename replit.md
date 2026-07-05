# False Dawn Industries (FDI)

## Overview
False Dawn Industries is building the thesis of **owned marketing systems** for
aggregated, decentralized, and autonomous markets. This repo holds three things:

1. **The public marketing site** (`site/`) — the FDI umbrella homepage, the
   Field Guide (thesis article + visuals + launch deck), the Skillfoundry
   product/landing page, and the Top Call product/landing page. This is the
   deployed, public web presence.
2. **The System Dynamics Engine** (`app.py`) — an internal Streamlit modeling
   tool (compounding cohort decay). Internal only; not linked from the public site.
3. **Top Call owned system** (`topcall/`) — the paid "Signal as Code" sibling to
   Skillfoundry: a source-authority-graded corpus + knowledge graph + verifiable
   MCP interface (ingest/scan/audit/brief CLI, stdio MCP server, skills, commands).
   Zero-dependency Node ESM; illustrative seed data in `topcall/sources/`.
4. **Brand + launch assets** (`artifacts/mockup-sandbox/`, `exports/`) — the FDI
   creative system, ad/channel creatives, brand boards, the Field Guide launch
   bundle (article, images, deck PDF + slides), and the free Top Call prompt-pack
   lead magnet (`exports/top-call-lead-magnet/`, zipped to
   `exports/field-guide-launch/top-call-prompt-pack.zip`).

## The public site (`site/`)
- Lightweight, dependency-light static site. `build.mjs` renders the thesis
  markdown (`exports/field-guide-launch/linkedin-thesis-article.md`) with `marked`,
  folds the inline visuals + captions into `<figure>`s, copies the launch assets
  and self-hosted fonts, and emits four pages to `site/dist/`:
  - `/` — homepage (hero, stat band, product line, proof builds, about). The
    product line features Skillfoundry and Top Call as a 2x2 featured pair.
  - `/field-guide` — the article + 3 inline visuals + inline deck viewer, deck
    PDF download, launch-bundle download, and a 13-slide thumbnail strip
  - `/skillfoundry` — three Signal-to-Value gates, Anthropic-standard modular
    architecture, three-tier pricing ladder, and a waitlist email-capture CTA
  - `/topcall` — Top Call ("Signal as Code"): a FREE prompt-pack lead magnet
    (email-capture that triggers the ZIP download), the three owned-system
    constructs (corpus / knowledge graph / MCP), Anthropic-standard architecture,
    a three-tier pricing ladder (Engine / Feed / Desk), and a paid waitlist CTA
- All email-capture forms use one generic handler: any `form.js-capture` with
  `data-source` (waitlist tag), `data-subject`/`data-mail-body` (mailto fallback),
  optional `data-download` (success triggers a file download instead of a "you're
  on the list" message), and a sibling `.form-msg` for inline status. POSTs to
  `/api/waitlist` (durable Postgres), with `mailto:` fallback on failure.
- `serve.mjs` is a Node static server (correct MIME types, long-cache headers
  for `/fonts` + `/assets`, clean extensionless routing) plus a single dynamic
  route: `POST /api/waitlist` validates the email, sanitizes the optional
  `source` field (allow-listed `[a-z0-9._-]`, else `"site"`), and upserts both
  into the `waitlist_signups` Postgres table (`DATABASE_URL`) with `ON CONFLICT
  DO NOTHING`. Uses the `pg` client; returns `503` if no `DATABASE_URL` is set.
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
