# Davos Decision Kit: Commerce Go-Live Checklist (internal)

The kit is a public FDI product at `/davos-kit` (indexed, in the sitemap and
llms.txt, linked from the homepage product grid). The commerce engine is fully
wired: product `davoskit`, tier `dk1`, key prefix DK1. Everything degrades
gracefully today with the test key: the buy button shows a test-mode Stripe
checkout. To flip the kit to live mode:

## Remaining steps for live commerce

1. **Live Stripe product + price.** In the Stripe Dashboard (live mode), create
   the product "Davos Decision Kit" with a one-time price at $199. Copy the
   price ID (`price_live_...`).

2. **Secrets.** In Replit Secrets (deployment env), set:
   - `STRIPE_SECRET_KEY` → live secret key (`sk_live_...`)
   - `DAVOSKIT_TIER1_PRICE_ID` → the live price ID from step 1
   - `STRIPE_WEBHOOK_SECRET` → the signing secret for the live webhook (step 3)
   The existing `STRIPE_TEST_API_KEY` and `DATABASE_URL` stay untouched.

3. **Live webhook endpoint.** In the Stripe Dashboard (live mode), register:
   `POST https://falsedawn.industries/api/stripe/webhook`
   Events: `checkout.session.completed`, `customer.subscription.*`,
   `charge.refunded`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

4. **Stripe Tax.** In the Stripe Dashboard → Settings → Tax, ensure automatic
   tax is enabled on the account. The checkout already sends
   `automatic_tax: { enabled: true }` and `billing_address_collection: required`.

5. **Test in live mode.** With live keys set: place a real $199 purchase,
   confirm the `/davos-kit/success` page shows a DK1 key and the download
   works, confirm the key email arrives (Resend), confirm cross-product key
   refusal still holds.

6. **Refund path.** Issue a test refund in Stripe; the `charge.refunded`
   webhook must flip the license inactive.

## What is already in place

- Public product page `/davos-kit` (indexed, in sitemap + llms.txt + homepage)
- White-label offer page `/davos-kit-white-label`
- `/davos-kit-demo` redirects 301 → `/davos-kit` (old TCB demo retired)
- `DAVOSKIT_TIER1_PRICE_ID` set (currently test price; swap to live price above)
- `STRIPE_WEBHOOK_SECRET` set (currently test webhook secret; swap above)
- Success/cancel/download paths: `/davos-kit/success`, `/davos-kit`,
  `/api/davos-kit/download?key=`
- Idempotent key provisioning + buyer email (DK1 prefix) via Resend
- Cross-product gates: DK1 keys 403 on SF/MK downloads, 402 on SF validate
- `site/gate-check.mjs` (davos-gate validation) now verifies the 301 redirect
  and public page accessibility

## Blockers not in this task's scope (tracked separately)

- Account-level Stripe Tax enablement (separate task #295)
- Webhook registration on deployed domain (separate task #258)
- RESEND_FROM sender domain (currently onboarding@resend.dev; separate task #208)
