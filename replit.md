# False Dawn Industries (FDI)

## Overview
False Dawn Industries is building the thesis of **owned marketing systems** for
aggregated, decentralized, and autonomous markets. This repo holds three things:

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
5. **The MarCom Architecture Kit assets** (`exports/marcom-kit/`) — the new
   flagship product ("Structure as code"): the Wedge Manifesto
   (`wedge-manifesto.md`), the complete Tier 1 MarCom Foundation Playbook
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

## The public site (`site/`)
- Lightweight, dependency-light static site. `build.mjs` renders the thesis
  markdown (`exports/field-guide-launch/linkedin-thesis-article.md`) with `marked`,
  folds the inline visuals + captions into `<figure>`s, copies the launch assets
  and self-hosted fonts, and emits eight pages plus `/llms.txt` to `site/dist/`:
  - `/` — homepage (hero, stat band, product line, proof builds, about). Eyebrow
    is just "Growth Cartography"; product-line label is "The FDI Operating
    System"; the featured pair is SkillFoundry and Top Call; the three homepage
    stats ($1.3T, 2.5s, 70,000yrs) each carry an inline `.cite` superscript
    source link; the hero tags and the series card link to the new series pages
    (not GitHub).
  - `/field-guide` — the article + 3 inline visuals + inline deck viewer, deck
    PDF download, launch-bundle download, and a 13-slide thumbnail strip
  - `/skillfoundry` — a direct-answer `.definition` block, three Signal-to-Value
    gates, modular architecture built on the open Model Context Protocol (MCP,
    `modelcontextprotocol.io`), three-tier pricing ladder with live Stripe
    checkout (Tier 1 "Buy now" one-time, Tier 2 "Subscribe" monthly; Tier 3 stays
    a waitlist CTA), a native `<details>` FAQ section, and a waitlist CTA
  - `/marcom-kit` — the flagship MarCom Architecture Kit ("Structure as code"):
    direct-answer `.definition`, FREE starter-pack lead magnet (`js-capture` +
    `data-download` serving `/assets/fdi-marcom-starter-pack.zip`, source
    `marcom-kit-starter`), three pillars (Hourglass / Use-Compose-Build /
    Riverbank), today/tomorrow outcomes, three-tier ladder (T1 $149 one-time,
    launch $99; T2 $199/mo, founding $149/mo, $1,500/yr, Agency $399/mo with
    white-label rights gated to that tier only; T3 $5,000/mo ~3 clients or
    $10,000 fixed 4-week sprint) plus the $1,500-2,500 Governance Risk Audit
    bridge card, Product+FAQPage JSON-LD, native `<details>` FAQ, a visible
    not-legal-advice disclaimer, and a data-handling FAQ where the LLM backend
    is mentioned. Kit checkout is wired end-to-end into the shared commerce
    engine (see "MarCom Kit commerce" below) but the page buttons stay waitlist
    CTAs until `KIT_CHECKOUT_LIVE` in `build.mjs` is flipped to true. Homepage
    now leads with the kit as flagship (SkillFoundry recast as
    the kit's enforcement engine); nav/footer/llms.txt list the kit first; each
    concept page carries an "Own the structure" kit-branch section
    (Aggregator-Resilient Org / Cross-Functional Graph Org / Agent-Ready Org).
  - `/topcall` — Top Call ("Signal as Code"): a FREE prompt-pack lead magnet
    (email-capture that triggers the ZIP download), the three owned-system
    constructs (corpus / knowledge graph / MCP), architecture built on the open
    Model Context Protocol (MCP), a three-tier pricing ladder (Engine / Feed /
    Desk), and a paid waitlist CTA
  - `/series` — landing page for the field-guide series (source tag `series`)
  - `/aggregated`, `/decentralized`, `/autonomous` — one-pager concept pages,
    each a direct-answer definition + pattern/answer/proof cards + a waitlist CTA
    with a per-page source tag (`series-aggregated`, etc.)
- Brand/copy conventions (locked): all visible product copy uses "SkillFoundry"
  (the `/skillfoundry` URL and `skillfoundry/` dir stay lowercase); every waitlist
  CTA and every waitlist-style pricing-tier button reads "Join the waitlist". The
  SkillFoundry Tier 1/2/3 buttons are the ONE exception: they drive live Stripe
  checkout, so they keep their commerce labels ("Buy now" one-time, "Subscribe"
  monthly, "Start retainer") and must not be relabeled to "Join the waitlist" or
  the checkout flow breaks. No em-dashes anywhere in `build.mjs`/`site.css`
  (sentences are rewritten instead); MCP is described as an open standard and the
  site never claims Anthropic affiliation or endorsement.
- GEO / AI-search visibility: `page()` injects JSON-LD `<script>` blocks
  (Organization on `/`, SoftwareApplication + FAQPage on `/skillfoundry`, Article
  on `/field-guide`, a per-concept FAQPage on the concept pages); direct-answer
  `.definition` blocks and "as of 2026" freshness markers appear on product and
  concept pages; `build.mjs` emits `/llms.txt` (served `text/plain`) as an
  AI-crawler guide to the org, products, and series.
- Double opt-in (confirmed subscriptions): a new signup lands as **pending**
  (`confirmed_at IS NULL`) with a per-signup `confirm_token` + `confirm_sent_at`.
  The only mail it triggers is a brand-styled "Confirm your email" request
  (`sendConfirmationRequest` in `site/email.mjs`) with a unique link to `GET
  /api/waitlist/confirm?token=`. Clicking it marks the row confirmed
  (idempotently, guarded on `confirmed_at IS NULL`) and only THEN sends the
  welcome email + optional team notification (`sendWelcomeEmails`). Links expire
  after `WAITLIST_CONFIRM_DAYS` days (default 7, computed off `confirm_sent_at`);
  the confirm page (reuses the on-brand `noindex` unsubscribe shell) shows
  distinct confirmed / already-confirmed / expired / invalid states and never
  reveals whether an email exists. Re-signing up with a still-pending address
  resends the confirmation and extends the window (keeps the same token);
  re-signing up with an already-confirmed address sends nothing. Pre-double-opt-in
  rows are grandfathered to confirmed once in `ensureTable` (safe/idempotent:
  only rows with no `confirm_token` are touched). Form success copy now reads
  "check your inbox for a confirmation link"; the admin view has a Status column
  (Confirmed/Pending badges), a "N confirmed, M pending" summary, and the CSV +
  single-record export carry `status` + `confirmed_at`.
- Post-confirmation the subscriber gets a best-effort transactional welcome email
  via the **Resend** integration (`site/email.mjs`, Replit Connectors proxy): a
  brand-styled, source-aware welcome to the subscriber and, if
  `WAITLIST_NOTIFY_EMAIL` is set, a plain-text notification to the FDI team (only
  fired on confirmed, proven addresses). Mail runs after the HTTP response and
  never blocks or fails a signup/confirm. Requires `RESEND_FROM`
  (an address on a Resend-verified domain, e.g. `FDI <hello@yourdomain>`); if
  unset, the confirmation is skipped and logged. Optional `RESEND_REPLY_TO`.
  Until a domain is verified in Resend, `RESEND_FROM` falls back to the Resend
  shared test sender (`onboarding@resend.dev`), which only delivers to the
  Resend account owner's own address — subscriber confirmations to any other
  recipient return a 403 that's caught and logged (team notifications to the
  owner still work). Swap `RESEND_FROM` to a verified-domain address to enable
  confirmations for all subscribers.
- All email-capture forms use one generic handler: any `form.js-capture` with
  `data-source` (waitlist tag), `data-subject`/`data-mail-body` (mailto fallback),
  optional `data-download` (success triggers a file download instead of a "you're
  on the list" message), and a sibling `.form-msg` for inline status. POSTs to
  `/api/waitlist` (durable Postgres), with `mailto:` fallback on failure.
- Self-serve deletion (data-subject rights): every `waitlist_signups` row carries
  an unguessable per-signup `unsub_token` (64 hex chars, generated on insert;
  pre-existing rows backfilled in `ensureTable`). The subscriber confirmation
  email includes a one-click "Remove me from the list" link plus RFC 8058
  `List-Unsubscribe`/`List-Unsubscribe-Post` headers pointing at
  `/unsubscribe?token=`. `GET|POST /unsubscribe` validates the token server-side,
  hard-deletes only that row (a token can never touch another record), and renders
  a responsive, on-brand, `noindex` confirmation page. Invalid/used tokens get a
  generic "link no longer active" page (never reveals whether an email exists);
  the email is never logged. Deletion is idempotent.
- Spam / bot defense on signup: a hidden `company` honeypot field, a per-IP
  rate limit, and a disposable-email-domain blocklist. The blocklist is NOT a
  hardcoded ~20-entry set anymore: `serve.mjs` loads a large, community-
  maintained list from the bundled `site/disposable-domains.txt` at startup and
  always merges in a `CORE_DISPOSABLE_DOMAINS` baseline (so it degrades to the
  known-bad core if the file is missing). Refresh the bundled list with `node
  site/refresh-disposable-domains.mjs` (`--dry-run` to preview); it fetches the
  public disposable-email-domains blocklist (override with
  `DISPOSABLE_DOMAINS_URL`), refuses to write a suspiciously small result, and
  is safe to schedule. Optional deliverability gate: set `WAITLIST_MX_CHECK=1`
  to also reject domains that authoritatively can't receive mail (MX then A/AAAA
  lookup, 6h cache); it fails OPEN so transient DNS errors never block a real
  address.
- Retention: waitlist emails are not kept forever. `site/purge.mjs` hard-deletes
  signups older than the window that have NOT converted (converted = the email
  appears in `skillfoundry_entitlements`; the join is skipped if that table
  doesn't exist). Window is `WAITLIST_RETENTION_DAYS` (default 730 = ~24 months;
  a value of 0 or below is rejected and falls back to the default as a safety).
  Run `node site/purge.mjs` (or `--dry-run` to report the count only); logs counts
  and the window only, never emails. Safe to schedule.
- `serve.mjs` is a Node static server (correct MIME types, long-cache headers
  for `/fonts` + `/assets`, clean extensionless routing) plus a single dynamic
  route: `POST /api/waitlist` validates the email, sanitizes the optional
  `source` field (allow-listed `[a-z0-9._-]`, else `"site"`), and upserts both
  into the `waitlist_signups` Postgres table (`DATABASE_URL`) with `ON CONFLICT
  DO NOTHING`. Uses the `pg` client; returns `503` if no `DATABASE_URL` is set.
- SkillFoundry commerce (Stripe) lives in `site/commerce.mjs` (self-contained:
  own `pg` pool + lazy Stripe client, so it can later move to a standalone
  backend). All credentials come from **env secrets**, never the Replit
  connector: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
  `SKILLFOUNDRY_TIER{1,2,3}_PRICE_ID`. Three tiers — Tier 1 one-time → perpetual
  **license** key + gated download; Tier 2/3 subscription → **subscription** key
  validated server-side (Tier 3 also flags manual onboarding, no self-serve
  download). Checkout enables **Stripe Tax** (`automatic_tax`) and requires a
  billing address. Routes on `serve.mjs`: `POST /api/checkout` (creates a
  Checkout session), `POST /api/stripe/webhook` (raw-body signature-verified;
  claim-first idempotency ledger in `stripe_processed_events`, releases the claim
  on handler failure so Stripe retries), `GET /skillfoundry/success` (branded
  page that fulfills the session idempotently and shows the key + download/portal),
  `POST /api/skillfoundry/validate` (Tier 2 gate → `402` when inactive), `POST
  /api/skillfoundry/run` (stub protected compute, `402` refusal if key inactive),
  `GET /api/skillfoundry/download?key=` (streams the gated plugin zip only for an
  active Tier 1 license), `POST /api/portal` (Stripe customer portal). Idempotency
  is DB-enforced: unique index on `stripe_checkout_session_id` (partial unique on
  `stripe_subscription_id`) in `skillfoundry_entitlements`, so a webhook/success
  race yields exactly one key. Buyer gets a best-effort key email via Resend
  (`sendEntitlementEmail`). Everything degrades gracefully — buy buttons fall back
  to the waitlist and pages show "checkout isn't live yet" until secrets are set.
  Founder setup: `skillfoundry/STRIPE_SETUP.md`. The gated plugin package is built
  by `build.mjs` to `site/private/skillfoundry-plugin.zip` (OUTSIDE public `dist/`,
  gitignored). Tier 2 thin client: `skillfoundry/client/thin-client.mjs`
  (reads `SKILLFOUNDRY_KEY` + `SKILLFOUNDRY_API_URL`, POSTs the run endpoint).
- MarCom Kit commerce reuses the SAME engine in `commerce.mjs` (not a fork):
  `PRODUCT_META` scopes the two product families (success/cancel/portal paths,
  key prefixes SF1/SFS vs MK1/MKS) and every `TIERS` entry carries
  `product`/`manualFulfillment`/`whiteLabel`. Kit tiers: `mk1` ($149 one-time →
  license + gated playbook download), `mk2`/`mk2-annual`/`mk2-agency`
  (subscriptions with download rights; ONLY `mk2-agency` sets
  `white_label=true`), `mk3` retainer, `mk-sprint`, `mk-audit` (one-time or sub,
  manual fulfillment: buyer gets a reference key, no self-serve download, and
  the team gets a `sendPurchaseNotification` email via `WAITLIST_NOTIFY_EMAIL`).
  Price-ID secrets: `MARCOMKIT_TIER1_PRICE_ID`,
  `MARCOMKIT_TIER2_{MONTHLY,ANNUAL,AGENCY}_PRICE_ID`, `MARCOMKIT_TIER3_PRICE_ID`,
  `MARCOMKIT_{SPRINT,AUDIT}_PRICE_ID` (setup doc:
  `exports/marcom-kit/STRIPE_SETUP.md`, excluded from the buyer zip). The
  entitlements table gained `product` (default 'skillfoundry') and `white_label`
  columns; idempotency/webhook ledger is shared and unchanged. Routes:
  `/marcom-kit/success` (product-aware shared success page) and `GET
  /api/marcom-kit/download?key=` streaming `site/private/marcom-kit-playbook.zip`
  (built by `buildKitZip()`, outside `dist/`, excludes the free starter pack)
  for active `mk1`/`mk2*` keys only. Cross-product gates are strict: kit keys
  are refused by SkillFoundry validate/run/download (402/403) and vice versa
  (SF download now also requires `tier1`). Kit buy buttons render only when
  `KIT_CHECKOUT_LIVE=true` in `build.mjs` (currently false → waitlist CTAs);
  everything degrades gracefully when secrets are unset.
- Process Defragmentation Report generator (internal, token-gated, NOT public):
  `site/defrag.mjs` (LLM engine + Postgres storage) and `site/defrag-report.mjs`
  (branded HTML template + headless-chromium PDF). Owner pastes a prospect's
  workflow doc at `GET /admin/defrag` (same `WAITLIST_ADMIN_TOKEN` auth/cookie
  as the waitlist admin); `POST /admin/defrag/generate` calls the Replit
  OpenAI integration (`AI_INTEGRATIONS_OPENAI_{BASE_URL,API_KEY}`, model
  `DEFRAG_MODEL` default `gpt-5`, `max_completion_tokens` kept high because
  gpt-5 burns hidden reasoning tokens first) with the report rubric as a system
  prompt. Injection defense: the doc is fenced as untrusted DATA (delimiters
  neutralized if smuggled in), the model is told to never follow instructions
  inside it, output is a fixed JSON shape that is validated/clamped
  (`normalizeReport`), and every string is HTML-escaped at render. Report =
  bottleneck diagnosis (severity), Audit-to-Kill candidates, Use/Compose/Build
  calls, readiness score 0-100 + rationale, recommendations; softened risk
  language + not-legal-advice disclaimer baked into the prompt and footer; no
  em-dashes. Cost/abuse controls: `DEFRAG_DAILY_LIMIT` (default 10 per 24h,
  counted from stored rows) and 200-24000 char input caps. Data posture (shown
  at the submission form): doc + report stored in `defrag_reports`, hard-deleted
  after `DEFRAG_RETENTION_DAYS` (default 90, opportunistic purge), per-report
  Delete button, no training on client data. Views: `/admin/defrag` (form +
  history + quota meter), `/admin/defrag/report?id=` (branded HTML with
  back/PDF toolbar), `/admin/defrag/report.pdf?id=` (flowing Letter PDF via
  puppeteer-core + Nix chromium, brand woff2 fonts base64-embedded), `POST
  /admin/defrag/delete`. Degrades gracefully: generation disabled with a notice
  if the AI env vars are unset.
- Outreach kit (internal sales assets, NOT public): `exports/outreach-kit/`
  holds the 3-touch email sequences (agency-president + CMO variants of the
  Riverbank/deskilling pitch), discovery-call guide, and the Transformation
  Sprint proposal source ($10,000 fixed 4-week, Governance Risk Audit
  $1,500-2,500 fallback). `node site/export-outreach.mjs` renders the two
  branded PDFs (kit one-pager + proposal template) via the shared
  `htmlToPDF`/`embeddedFontCss` helpers now exported from
  `site/defrag-report.mjs`. Copy rules: no em-dashes, no former-client names,
  softened risk claims + not-legal-advice disclaimer.
- Davos Decision Kit (client-facing product build, NOT public): a low-cost
  front-door product designed for The Content Bureau's Davos practice, modeled
  on the SkillFoundry Tier 1 pattern ($299 one-time, $199 launch). Source
  assets in `exports/davos-decision-kit/` (Go/No-Go Scorecard, Twelve-Month
  Runway, Budget Calculator, Visibility Plan Templates, README; zipped to
  `davos-decision-kit.zip`). The FDI proposal to Heather Kernahan
  ($7,500 fixed + $2,500 commerce add-on; alt $5,000 + 20% rev share 12mo)
  lives at `exports/outreach-kit/davos-kit-proposal.md` with a branded PDF
  rendered by `site/export-outreach.mjs` (which also renders
  `davos-kit-expertise-map.md/pdf`, the TCB expertise-insertion map; the shared
  outreach DISCLAIMER reads "not legal or financial advice"). The kit ships
  with a fully worked fictional example (`worked-example.md`, Solvra: scorecard
  70/100 conditional go, lined budget, condensed runway, instantiated script)
  and an internal `GO_LIVE_CHECKLIST.md` (excluded from the buyer zip).
- Davos Kit commerce demo: product `davoskit` / tier `dk1` (key prefix DK1) is
  wired into the shared engine in `commerce.mjs` (`DAVOSKIT_TIER1_PRICE_ID`
  secret; $199 test price). `build.mjs` builds
  `site/private/davos-decision-kit.zip` via `buildDavosZip()` (outside `dist/`,
  excludes the checklist + convenience zip) and, while `DAVOS_DEMO=true`, emits
  the noindex, unlinked demo page `/davos-kit-demo` (js-buy dk1 with waitlist
  fallback, capture source `davos-kit-demo`). Routes: `/davos-kit/success`
  (shared product-aware success page) and `GET /api/davos-kit/download?key=`
  (active dk1 license only). Cross-product gates verified: DK1 keys are 403 on
  SkillFoundry/kit downloads and 402 on SF validate; checkout returns 503
  `tier_unconfigured` with waitlist fallback when the price ID is unset.
  A full Stripe test-mode purchase was verified end to end (card 4242 →
  success page key → gated download).
- Revenue pipeline tracker (internal, token-gated): `GET /admin/pipeline`
  (same `WAITLIST_ADMIN_TOKEN` auth + noindex adminShell) with targets CRUD
  (`POST /admin/pipeline/save|delete`; name, org, segment, stage, value USD,
  next action, notes), funnel chips Target→Contacted→Discovery→Audit/Proposal→
  Closed (+Lost), and a goal bar showing closed $ vs the $5,000 bi-weekly
  Aug 15 2026 goal (`GOAL` in `site/pipeline.mjs`, table `pipeline_targets`).
- Internal, token-gated signups view (NOT linked from public nav): `GET
  /admin/waitlist` shows a login form; on POST it timing-safe-compares the token
  against the `WAITLIST_ADMIN_TOKEN` secret and sets an httpOnly `wl_admin`
  cookie (12h). Once authed it lists all signups (email, source, created_at,
  newest first) with a "Download CSV" link, plus a row of per-source count chips
  (All + one per source, most signups first) that filter the table when clicked.
  Both the table and CSV honor an optional `?source=` filter (sanitized with the
  same allow-list as signup inserts); the filtered CSV filename includes the
  source and the download button targets the active filter. `GET
  /admin/waitlist.csv` streams the (optionally filtered) list as a dated CSV
  attachment. Auth accepts the cookie, a `Bearer` token, or a `?token=` query
  param. `/admin/logout` clears the cookie. Returns `503` if
  `WAITLIST_ADMIN_TOKEN` is unset. Pages carry `noindex, nofollow`. The view also
  has a "Data rights" section: `POST /admin/waitlist/delete` (authed) hard-deletes
  one signup by email for erasure requests (redirects back with a generic status,
  never logs the email), and `GET /admin/waitlist/record?email=` streams a single
  person's record as a JSON attachment for a data-access request (email, source,
  created_at only; the `unsub_token` is treated as a credential and excluded).
- Build: `node site/build.mjs`. Serve: `node site/serve.mjs` (PORT env, default 5000).
- The site reuses the locked FDI brand tokens/fonts but has its own scrollable
  stylesheet (`site/src/site.css`) — it does NOT import the ad system's fixed
  100vh/overflow-hidden `brand.css`.

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
- (none recorded yet)
