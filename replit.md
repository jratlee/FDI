# False Dawn Industries (FDI)

## Overview
False Dawn Industries is building the thesis of **owned marketing systems** for
aggregated, decentralized, and autonomous markets. This repo holds five things:

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

## Brand rules (locked)
Strict two-tone warm family. **Signal Orange `#FF5E00` is the logo mark ONLY.**
Accents use the amber ramp (`#FFB12B` / `#E0920C` / `#FFCB6B`); neutrals are
cream `#F0E8D5` / faded `#A8997B` / muted `#7A6A50` on near-black `#0D0B08`.
No off-family teal/red. Fonts: Space Grotesk (display), Inter (body),
JetBrains Mono (labels). Lead with the FDI master brand + the "Growth
Cartography" eyebrow.

## User preferences
- Reorganize `replit.md` for clarity but never trim content from it; the user
  does not want to risk context loss. (Done July 2026: detail moved verbatim
  into the `docs/` files listed above; nothing was deleted.)
