# False Dawn Industries (FDI)

## Overview
False Dawn Industries is building the thesis of **owned marketing systems** for
aggregated, decentralized, and autonomous markets. The three series concepts
are defined as (sharpened July 2026, reflected across the live site):
- **Aggregated**: marketing within today's platforms (Meta, Google, TikTok)
  plus what is not yet understood about AI platforms like ChatGPT.
- **Decentralized**: marketing within crypto-powered decentralized networks.
- **Autonomous**: agents transacting with agents, and the dynamics and growth
  curve as those marketplaces scale toward the size of Meta and Google today.

This repo holds five things:

1. **The public marketing site** (`site/`) — the FDI umbrella homepage, the
   Field Guide (thesis article + visuals + launch deck), the SkillFoundry
   product/landing page, and the Top Call product/landing page. This is the
   deployed, public web presence.
2. **The System Dynamics Engine** (`app.py`) — an internal Streamlit modeling
   tool (compounding cohort decay). Internal only; not linked from the public site.
3. **Top Call owned system** (`topcall/`) — the paid "Signal as Code" sibling to
   SkillFoundry: a source-authority-graded corpus + knowledge graph + verifiable
   MCP interface (ingest/scan/audit/brief CLI, stdio MCP server, skills, commands).
   Zero-dependency Node ESM; illustrative seed data in `topcall/sources/`.
4. **Brand + launch assets** (`artifacts/mockup-sandbox/`, `exports/`) — the FDI
   creative system, ad/channel creatives, brand boards, the Field Guide launch
   bundle (article, images, deck PDF + slides), and the free Top Call prompt-pack
   lead magnet (`exports/top-call-lead-magnet/`, zipped to
   `exports/field-guide-launch/top-call-prompt-pack.zip`).
5. **The MarCom OS assets** (`exports/marcom-kit/`) — the
   flagship product ("Structure as code"; renamed from "MarCom Architecture
   Kit" / "MarCom Kit" to **MarCom OS** in July 2026 across all customer- and
   crawler-visible copy; the `/marcom-kit` URL, directory names, zip
   filenames, env secret names, key prefixes MK1/MKS, and DB `product`
   values deliberately keep the old identifiers): the Wedge Manifesto
   (`wedge-manifesto.md`), the complete Tier 1 MarCom OS Foundation Playbook
   (`playbook/`: Hourglass org blueprint, Use/Compose/Build calculator,
   Riverbank governance templates, Audit to Kill checklist), Tier 2/3
   fulfillment outlines (4-week fixed sprint, $1.5-2.5k Governance Risk Audit
   bridge, white-label gated to the $399 Agency tier), and the kit's
   data-handling posture doc. Free lead magnet lives in
   `exports/marcom-kit-lead-magnet/` (zipped to
   `exports/marcom-kit/fdi-marcom-starter-pack.zip`). Copy rules for all kit
   assets: no em-dashes, no former-client names, softened risk claims plus a
   not-legal-advice disclaimer, "Model C" terminology retired in favor of
   Hourglass language, SkillFoundry framed as the Riverbank's running
   enforcement engine.

**Detailed docs (authoritative deep detail; read the relevant one before
touching that area):**
- `docs/public-site.md` — pages, build/serve, contact const, GEO/JSON-LD/llms.txt
- `docs/waitlist-email.md` — capture forms, double opt-in, Resend, unsubscribe/deletion, spam defense, retention
- `docs/commerce.md` — shared Stripe engine: SkillFoundry, MarCom OS, Davos demo + password gate
- `docs/admin-tools.md` — defrag report generator, pipeline tracker, waitlist admin
- `docs/export-assets.md` — outreach kit, Davos Decision Kit source assets + proposal
- `docs/content-distribution.md` — **foundational intelligence**: Ghost/Steph Smith framework mapped to FDI; three-channel taxonomy (Owned/Earned/Paid); 1:1 creation:distribution rule; six-part model → FDI channel mapping; per-Field-Guide distribution checklist; FDI audience/channel/message/success answers. Read before any growth, content, or outreach task.

## The public site (`site/`) — summary
Dependency-light static site. `build.mjs` emits ten pages + `/llms.txt` +
`/sitemap.xml` (indexable routes only, honest lastmod) + `/robots.txt` to
`site/dist/`. Optional `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION`
env vars bake search-console ownership meta tags into every page head at
build time (not secrets; runbook in `docs/public-site.md`). Pages:
`/` (homepage, kit-first flagship framing), `/field-guide`,
`/skillfoundry`, `/marcom-kit`, `/topcall`, `/series`, `/aggregated`,
`/decentralized`, `/autonomous`, plus the gated `/davos-kit-demo` while
`DAVOS_DEMO=true`. Build: `node site/build.mjs`; serve: `node site/serve.mjs`
(Node static server + dynamic API routes; `POST /api/waitlist` upserts into
Postgres `waitlist_signups`, 503 without `DATABASE_URL`). Own scrollable
stylesheet `site/src/site.css` (never the ad system's fixed `brand.css`).
Site-wide contact is the single `CONTACT` const in `build.mjs`
(`john@ratcliffe-lee.com`); `WAITLIST_NOTIFY_EMAIL` + `RESEND_REPLY_TO` match.
Full page-by-page detail: `docs/public-site.md`.

### Brand/copy conventions (locked)
- **Universal download rule (locked):** every direct file download on the public site, even free assets, must be email-gated via the `js-capture` + `data-download` pattern. No ungated direct-link bypasses. This applies to all current and future pages.
- All visible product copy uses "SkillFoundry"
  (the `/skillfoundry` URL and `skillfoundry/` dir stay lowercase); every waitlist
  CTA and every waitlist-style pricing-tier button reads "Join the waitlist". The
  SkillFoundry Tier 1/2/3 buttons are the ONE exception: they drive live Stripe
  checkout, so they keep their commerce labels ("Buy now" one-time, "Subscribe"
  monthly, "Start retainer") and must not be relabeled to "Join the waitlist" or
  the checkout flow breaks. No em-dashes anywhere in `build.mjs`/`site.css`
  (sentences are rewritten instead); MCP is described as an open standard and the
  site never claims Anthropic affiliation or endorsement.

## Waitlist, email & data rights — summary
One generic `form.js-capture` email-capture handler (data-attrs for source,
mailto fallback, optional download-on-success). Signups are double opt-in:
pending until the emailed confirm link is clicked; only then welcome +
"confirmed" team emails fire. A brand-new pending signup (never
duplicates/resends) also fires an immediate "pending confirmation" team
notification to `WAITLIST_NOTIFY_EMAIL`, which delivers even on the test
sender (Resend via `site/email.mjs`; `RESEND_FROM` still on the shared
test sender until a domain is verified, so subscriber mail 403s except to the
account owner). Every row has an `unsub_token`; one-click `/unsubscribe`
hard-delete with RFC 8058 headers. Spam defense: honeypot + per-IP rate limit
+ bundled disposable-domain blocklist (`site/refresh-disposable-domains.mjs`
to refresh) + optional `WAITLIST_MX_CHECK=1` (fails open). Retention:
`site/purge.mjs` deletes non-converted signups older than
`WAITLIST_RETENTION_DAYS` (default 730). Full detail: `docs/waitlist-email.md`.

## Commerce (shared Stripe engine) — summary
All three product families ride ONE engine in `site/commerce.mjs` (own `pg`
pool + lazy Stripe client; all credentials are env secrets, never the Replit
connector; DB-enforced idempotency; graceful 503/waitlist degradation when
secrets are unset). Products: **SkillFoundry** (sf tiers, live checkout labels,
gated plugin zip), **MarCom OS** (mk tiers incl. white-label `mk2-agency`;
buttons stay waitlist CTAs until `KIT_CHECKOUT_LIVE=true` in `build.mjs` —
currently false), **Davos Kit demo** (dk1, $199 Stripe TEST price; live buy
button on the password-gated `/davos-kit-demo` page for The Content Bureau;
`DAVOS_DEMO_PASSWORD` secret gates page + assets, verified by
`site/gate-check.mjs` validation step `davos-gate`). `CHECKOUT_LIVE=false`
keeps SkillFoundry buttons on waitlist too. Cross-product key gates are strict
(wrong-product keys get 402/403). Full routes, tiers, secrets, and the entire
Davos demo/gate spec: `docs/commerce.md`.

## Internal admin tools (token-gated) — summary
All under `WAITLIST_ADMIN_TOKEN` (timing-safe compare, httpOnly cookie, 12h,
noindex, 503 when unset): `/admin/defrag` (LLM Process Defragmentation Report
generator, gpt-5 via Replit OpenAI integration, injection-fenced, PDF export),
`/admin/pipeline` (revenue targets CRUD + $5,000 bi-weekly Aug 15 2026 goal
bar), `/admin/waitlist` (signups table, source chips/filter, CSV export, data
rights: per-email delete + single-record JSON export). Full detail:
`docs/admin-tools.md`.

## Sales & product export assets (NOT public) — summary
`exports/outreach-kit/` (3-touch sequences, discovery guide, Sprint proposal,
Davos proposal + expertise map; PDFs via `node site/export-outreach.mjs`) and
`exports/davos-decision-kit/` (the TCB Davos Decision Kit source docs, worked
Solvra example, Claude Skill folder, internal `GO_LIVE_CHECKLIST.md`). Copy
rules everywhere: no em-dashes, no former-client names, no WEF affiliation
claims, softened risk claims, not-legal/financial-advice disclaimers. Full
detail: `docs/export-assets.md`.

## Workflows & deployment
- Workflow **Start application** builds then serves the site on port 5000
  (`node site/build.mjs && node site/serve.mjs`) — this is what the preview shows.
- Deployment: `autoscale`, build `npm --prefix site ci && node site/check.mjs`,
  run `node site/serve.mjs`. The deploy build runs the `site/check.mjs` smoke
  check (which itself rebuilds), so any broken internal link, missing
  `/assets`/`/fonts` file, missing deck PDF, or wrong slide count fails the
  build and blocks the deploy instead of shipping a broken page.
- Advisory outbound/anchor link check: `site/link-check.mjs` (workflow
  `site-links-outbound`, npm `check:links`) scans the built `dist/` for the two
  things the deploy gate deliberately skips: external/outbound URLs (fetched over
  the network) and in-page `#fragment` / cross-page `/route#fragment` anchors
  (verified against real `id`/`name` targets; PDF/asset `#view=` directives are
  skipped). It is NOT a deploy gate and NOT a validation step: by default it only
  reports and exits 0, so flaky third-party hosts never block a deploy. `--strict`
  exits non-zero only on deterministic anchor failures; `--strict-external` opts
  into failing on unreachable URLs (manual use). `site/check.mjs` remains the sole
  authoritative deploy-blocking gate.
- The Streamlit engine can still be run manually (`streamlit run app.py`) but is
  no longer the public/deployed surface.

## Design system document + brand package
`DESIGN.md` at the repo root is the authoritative brand/design-system document
(purpose, critical files, colors, type, layout, logo, components, voice, copy
rules; every value cited to its source file). The distributable brand package
lives at `exports/fdi-brand-package/` (DESIGN.md, tokens.css + W3C tokens.json
for Figma via Tokens Studio, all 20 self-hosted woff2 fonts, Dawn Mark SVG +
favicon + LinkedIn avatar, the four 1280x1600 brand boards, and a
self-contained `demo/starter.html`), zipped to `exports/fdi-brand-package.zip`.
A literal .fig binary cannot be authored outside Figma; tokens.json + SVGs are
the Figma import path.

## Brand rules (locked)
System of record: **Signal Neo-Brutalism** (adopted July 2026; full spec in
`DESIGN.md`, reference source in `attached_assets/DESIGN_1784149690872.md`).
Strict warm-industrial family on near-black `#0D0B08`; no off-family teal/red.
**RULE CHANGE (July 2026):** the old rule "Signal Orange `#FF5E00` is the
logo mark ONLY" is retired. **Signal Amber `#FFB12B` is the primary action
color** (buttons, thick 2-4px borders, highlighted headline words); **Signal
Orange `#FF5E00` is the secondary "alert" accent** (full-bleed color-block
sections, 5%-opacity watermarks, kicker ticks, hover/invert states) and
remains the logo mark color. Amber ramp `#FFB12B` / `#E0920C` / `#FFCB6B`;
neutrals cream `#F0E8D5` / faded `#A8997B` / muted `#7A6A50`; umber surface
ramp `#110e05` / `#1f1b10` / `#231f14` / `#2e2a1d` / `#393527`. Signature
moves: massive uppercase viewport-scale Space Grotesk display type (22vw hero
/ 14vw sections, clamped on scrollable pages, tight negative tracking, edge
bleeds, amber text-glow), rotated (about 1deg, ~105% scale) full-bleed
amber/orange sections with base-dark text, sharp 0px corners everywhere,
thick 2px/4px borders instead of shadows, glass sticky header/footer chrome
only. Fonts unchanged: Space Grotesk (display), Inter (body), JetBrains Mono
(labels). Lead with the FDI master brand + the "Growth Cartography" eyebrow.

## Pre-publish checklist (global — run before every "you can republish now")

Before telling the user to republish/redeploy, always run all three of these:

1. **Security scan** — run the `security-scan` skill (dependency audit + SAST + secret-leakage scan). Surface any critical/high findings before the deploy goes out. Do not skip.
2. **Growth/site audit** — run `node site/build.mjs && node site/check.mjs` to confirm all routes, links, and slide references resolve. Confirm the davos-gate, commerce-gates, and field-guide-bundle-check workflows are green.
3. **Link check** — run `node site/link-check.mjs` to confirm no outbound citations have broken or redirected. Fix any failures before advising a publish.

Only after all three are green should the user be told "ready to republish."

## Editorial rules (global — apply to every field guide, article, and export doc)

**Hyperlink rule:** Every mention of an FDI product, page, or Field Guide in any
published or publishable document must be hyperlinked on first reference. No
exceptions for LinkedIn articles, email copy, export markdown, or site article
bodies. The canonical URLs are:

| Asset | URL |
|---|---|
| Homepage | https://falsedawn.industries/ |
| Field Guide 001 | https://falsedawn.industries/field-guide |
| Field Guide 002 (Aggregated) | https://falsedawn.industries/field-guide-002 |
| Field Guide 003 (Decentralized) | https://falsedawn.industries/field-guide-003 |
| Field Guide 004 (Autonomous) | https://falsedawn.industries/field-guide-004 |
| The series (all four) | https://falsedawn.industries/series |
| SkillFoundry | https://falsedawn.industries/skillfoundry |
| MarCom OS | https://falsedawn.industries/marcom-kit |
| System Dynamics Engine | https://falsedawn.industries/engine |
| Workshop (The Cartographers' Table) | https://falsedawn.industries/workshop |
| Community | https://falsedawn.industries/community |
| GitHub | https://github.com/jratlee/FDI |

**Cross-linking rule:** Each Field Guide's opening paragraph references its
predecessors ("The first made the general case… The second mapped…"). Every such
reference must be a live hyperlink to that guide's URL. The source markdown files
in `exports/` are the canonical place to make these fixes — `build.mjs` renders
them via `marked` so the links appear on the site automatically.

**"On the way" rule:** Any copy that says a Field Guide is "coming" or "on the
way" must be updated to "now live" with a link when the guide ships. Check the
closing paragraph of every earlier guide when a new one launches.

**Plain-URL rule:** Never write a bare URL like `falsedawn.industries/community`
in publishable markdown. Always wrap it: `[falsedawn.industries/community](https://falsedawn.industries/community)`.
**Documented platform exception:** copy destined for platforms that strip
markdown (e.g. LinkedIn feed posts, X) may keep bare URLs deliberately, but the
file must carry an explicit note saying so (see
`exports/performance-thinking-02/promo-posts.md`).

## User preferences
- Reorganize `replit.md` for clarity but never trim content from it; the user
  does not want to risk context loss. (Done July 2026: detail moved verbatim
  into the `docs/` files listed above; nothing was deleted.)
