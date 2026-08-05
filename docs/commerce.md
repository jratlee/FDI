# Commerce (shared Stripe engine)

Full detail for the three product families riding the shared Stripe engine in
`site/commerce.mjs`. Summary and live/off flags live in `replit.md`.

## SkillFoundry commerce
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

## MarCom OS commerce
- MarCom OS commerce reuses the SAME engine in `commerce.mjs` (not a fork):
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

## Davos Decision Kit commerce (public product)
- Davos Decision Kit: product `davoskit` / tier `dk1` (key prefix DK1) is
  wired into the shared engine in `commerce.mjs` (`DAVOSKIT_TIER1_PRICE_ID`
  secret; $199 one-time). `build.mjs` builds
  `site/private/davos-decision-kit.zip` via `buildDavosZip()` (outside `dist/`,
  excludes the checklist + convenience zip).
- **Public product page** `/davos-kit`: indexed, in sitemap + llms.txt + homepage
  product grid. Buy button (`js-buy dk1`), Solvra worked-example visuals
  (score bars, budget range bars, 90-day runway, meeting-request script),
  AI advisor section, pricing section, waitlist fallback when Stripe is
  unconfigured. `DAVOS_DEMO=false` in `build.mjs` (old TCB demo page not emitted).
- **White-label offer page** `/davos-kit-white-label`: generic agency offer
  ("build this kit under your brand"), $7,500 fixed + $2,500 commerce add-on.
  Both pages in sitemap and llms.txt.
- **Retired demo**: `/davos-kit-demo` and `/davos-kit-demo.html` return 301 →
  `/davos-kit` (matched on decoded path so percent-encoded variants also
  redirect). `site/gate-check.mjs` (validation step `davos-gate`) now verifies
  the redirect and public page accessibility.
- Routes: `/davos-kit/success` (product-aware success page), `GET
  /api/davos-kit/download?key=` (active dk1 license only). Cross-product gates
  unchanged: DK1 keys 403 on SF/MK downloads, 402 on SF validate.
- **Kit documents de-branded**: README, `start-here-ai-prompts.md`, and the
  Claude Skill's `SKILL.md` have no "book a strategy session" / "team behind
  this kit" upsell language. Outreach proposal (`exports/outreach-kit/
  davos-kit-proposal.md`) rewritten as a generic agency white-label offer.
- **Go-live steps** (currently in test mode): see
  `exports/davos-decision-kit/GO_LIVE_CHECKLIST.md`. Requires: live Stripe key
  (`STRIPE_SECRET_KEY`), live price ID (`DAVOSKIT_TIER1_PRICE_ID`), live webhook
  secret (`STRIPE_WEBHOOK_SECRET`). Stripe Tax enablement and webhook
  registration on the deployed domain are tracked in separate tasks.
