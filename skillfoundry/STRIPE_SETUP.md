# Skillfoundry — Stripe setup (founder guide)

This wires real payments to the Skillfoundry pricing on the public site. Nothing
in the codebase contains keys or price ids — everything comes from environment
secrets. Until you complete these steps the buy buttons gracefully fall back to
the waitlist, so the site is never broken while you set this up.

## What you're wiring
| Tier | Marketing price | Stripe product | Buyer gets |
|------|-----------------|----------------|------------|
| Tier 1 · Perpetual | $29 one-time | **one-time price** | a perpetual **license key** + plugin download |
| Tier 2 · Living Brain | $49 / mo | **recurring price** | a **subscription key**, validated server-side on every run |
| Tier 3 · Advisory | $2,500 / mo | **recurring price** | a subscription key + manual onboarding (no self-serve download) |

> These are the current marketing prices. Set the Stripe amounts to match
> whatever you're charging — the code reads the price ids, not the amounts.

## 1. Create the three products & prices
In the Stripe Dashboard → **Product catalog → Add product**:

1. **Skillfoundry — Perpetual License**: add a **One-time** price (e.g. $29).
2. **Skillfoundry — Living Brain**: add a **Recurring / monthly** price (e.g. $49/mo).
3. **Skillfoundry — Advisory**: add a **Recurring / monthly** price (e.g. $2,500/mo).

After saving each, open the price and copy its **Price ID** (`price_...`).

## 2. Enable Stripe Tax
Dashboard → **Settings → Tax**. Set your **origin address** and turn Stripe Tax
on. The code already sends `automatic_tax: { enabled: true }` on checkout, so tax
is calculated and collected at the checkout screen — but it only works once Tax
is enabled and your origin address is set here. Checkout also requires the buyer
to enter a billing address (already configured).

## 3. Register the webhook
Dashboard → **Developers → Webhooks → Add endpoint**.

- **Endpoint URL**: `https://YOUR-DOMAIN/api/stripe/webhook`
  (use your deployed domain — e.g. the Replit deployment URL or your custom domain)
- **Events to send** (select these):
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `charge.refunded`
- Save, then click **Reveal** under *Signing secret* and copy it (`whsec_...`).

The webhook is signature-verified and idempotent (each event id is recorded once
in the database), so redeliveries are safe.

## 4. Get your API secret key
Dashboard → **Developers → API keys** → copy the **Secret key** (`sk_live_...`
for production, `sk_test_...` while testing).

## 5. Set the secrets in Replit
Add these (Replit **Secrets** tab, or ask the agent to request them). All are
required for checkout; the price ids gate which tiers are purchasable.

| Secret | Value |
|--------|-------|
| `STRIPE_SECRET_KEY` | `sk_live_...` (or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 3 |
| `SKILLFOUNDRY_TIER1_PRICE_ID` | `price_...` for Perpetual (one-time) |
| `SKILLFOUNDRY_TIER2_PRICE_ID` | `price_...` for Living Brain (monthly) |
| `SKILLFOUNDRY_TIER3_PRICE_ID` | `price_...` for Advisory (monthly) |

Already present and reused: `DATABASE_URL` (entitlement + idempotency storage)
and the Resend integration + `RESEND_FROM` (best-effort key delivery email).

## 6. Test the flow
1. Use **test mode** keys/prices first.
2. On the deployed site, open **/skillfoundry** and click **Buy now** (Tier 1).
3. Complete checkout with test card `4242 4242 4242 4242`, any future expiry/CVC.
4. You land on **/skillfoundry/success** showing your license key + a working
   **Download the plugin** button. The key also arrives by email.
5. In the Stripe Dashboard, confirm the webhook shows a `200` for
   `checkout.session.completed`.
6. Repeat with Tier 2 — the success page shows a subscription key and a **Manage
   subscription** button (Stripe customer portal). Validate it:
   ```bash
   curl -sX POST https://YOUR-DOMAIN/api/skillfoundry/validate \
     -H 'content-type: application/json' -d '{"key":"SFS-..."}'
   ```
   Active keys return `200 {"active":true,...}`; cancelled/expired return `402`.

When everything passes in test mode, swap the secrets to your **live** keys and
price ids.

## How it behaves before setup
- Buy buttons POST to `/api/checkout`; with no Stripe secrets they return `503`
  and the button scrolls the visitor to the waitlist. Nothing errors.
- `/skillfoundry/success` without configuration shows a friendly "checkout isn't
  live yet" card.
- The plugin package is built to `site/private/skillfoundry-plugin.zip` (outside
  the public `dist/`) and is only served to a valid, active Tier 1 license key.
