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

## MarCom Kit commerce
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

## Davos Kit commerce demo
- Davos Kit commerce demo: product `davoskit` / tier `dk1` (key prefix DK1) is
  wired into the shared engine in `commerce.mjs` (`DAVOSKIT_TIER1_PRICE_ID`
  secret; $199 test price). `build.mjs` builds
  `site/private/davos-decision-kit.zip` via `buildDavosZip()` (outside `dist/`,
  excludes the checklist + convenience zip) and, while `DAVOS_DEMO=true`, emits
  the noindex, unlinked demo page `/davos-kit-demo` (js-buy dk1 with waitlist
  fallback, capture source `davos-kit-demo`).
- The demo page is a **password-gated, client-custom presentation for The
  Content Bureau** (framed as the custom build FDI proposes for TCB, not a
  retail FDI product): single header (the shared `page()` shell), Solvra
  worked-example visuals (score bars, budget range bars, 90-day runway
  timeline, TCB insertion steps), an "After the download" AI-advisor section
  (buyer journey steps 6/7: load the kit into ChatGPT/Claude/Copilot projects,
  work it as an interactive advisor, with a labeled illustrative chat
  exchange; an "Advanced applications" card grid for paid AI plans: Claude
  Skills/Cowork, Microsoft 365 Copilot agent builder/Copilot Studio, ChatGPT
  custom GPTs, plain-markdown catch-all, all hedged as plan-dependent; a
  dashed "Roadmap" kicker naming a possible hosted chat advisor on
  contentbureau.com as a later, out-of-scope iteration; the shipped kit's
  `start-here-ai-prompts.md` mirrors the advanced setups in an "If you have a
  paid plan" section; the buyer zip also ships a pre-built Claude Skill
  folder `claude-skill/davos-decision-advisor/` whose `documents/` copies are
  regenerated from the canonical kit docs by `buildDavosZip()` each build and
  gitignored, so they can never drift), collaborative build framing (TCB and FDI align on the documents,
  substance is mostly TCB input, FDI drafts then validates/refines with TCB;
  FDI's job is the system build and product wiring), five real
  end-user-journey screenshots
  (`site/src/assets/davos-demo/journey-*.png`, captured from the live flow
  incl. a real Stripe test purchase), proposal terms, live dk1 buy button.
- Gate (in `serve.mjs`): the `DAVOS_DEMO_PASSWORD` secret guards
  `/davos-kit-demo`, `/davos-kit-demo.html`, AND `/assets/davos-demo/*`.
  Routing matches on the DECODED path (percent-encoded variants like
  `/%64avos-kit-demo` cannot bypass into the static resolver). Correct POST →
  httpOnly `dk_demo` cookie = HMAC-sha256 of a fixed label keyed by the
  password (Path=/, SameSite=Strict, 12h, Secure behind https); wrong/absent →
  on-brand 401 gate page; secret unset → 503 "not available" page. Gated
  responses are `no-store, private` + `X-Robots-Tag: noindex`; unauth asset
  requests 404. `parseCookies` tolerates malformed percent-encoding (no crash).
  Revocation = rotate the secret (token is derived from it). Routes: `/davos-kit/success`
  (shared product-aware success page) and `GET /api/davos-kit/download?key=`
  (active dk1 license only). Cross-product gates verified: DK1 keys are 403 on
  SkillFoundry/kit downloads and 402 on SF validate; checkout returns 503
  `tier_unconfigured` with waitlist fallback when the price ID is unset.
  A full Stripe test-mode purchase was verified end to end (card 4242 →
  success page key → gated download). Flip-live steps:
  `exports/davos-decision-kit/GO_LIVE_CHECKLIST.md`. Upkeep tooling:
  `site/capture-davos-journey.mjs` recaptures the journey-1 screenshot
  headlessly (journey 2-4 need a manual Stripe test purchase; journey-5 is a
  document mock), and `site/gate-check.mjs` (validation step `davos-gate`)
  boots the server on a throwaway port and asserts the gate holds
  (401/404/percent-encoded bypass/cookie/no-store/noindex, 503 when the
  secret is unset).
