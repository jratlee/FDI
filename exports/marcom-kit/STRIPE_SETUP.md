# MarCom Architecture Kit: Stripe setup

The kit reuses the SkillFoundry commerce engine (`site/commerce.mjs`). One
entitlement store, one webhook, one checkout endpoint; kit purchases are scoped
with `product = 'marcom-kit'`. SkillFoundry setup (secret key, webhook,
`DATABASE_URL`) is a prerequisite: see `skillfoundry/STRIPE_SETUP.md`.

## 1. Shared secrets (already required by SkillFoundry)

| Secret | What it is |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API secret key (`sk_test_...` then `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the `POST /api/stripe/webhook` endpoint |
| `DATABASE_URL` | Postgres for entitlements and the webhook idempotency ledger |

## 2. Kit price IDs

Create these products/prices in the Stripe Dashboard, then set each price ID
as a secret. Any tier whose secret is unset simply returns "checkout isn't
live yet" and the page falls back to the waitlist; nothing breaks.

| Secret | Tier | Mode | Suggested price |
| --- | --- | --- | --- |
| `MARCOMKIT_TIER1_PRICE_ID` | Foundation Playbook | one-time | $149 (launch $99) |
| `MARCOMKIT_TIER2_MONTHLY_PRICE_ID` | Living Architecture, monthly | subscription | $199/mo (founding $149/mo) |
| `MARCOMKIT_TIER2_ANNUAL_PRICE_ID` | Living Architecture, annual | subscription | $1,500/yr |
| `MARCOMKIT_TIER2_AGENCY_PRICE_ID` | Agency Team (white-label rights) | subscription | $399/mo |
| `MARCOMKIT_TIER3_PRICE_ID` | Architecture Partner retainer | subscription | $5,000/mo |
| `MARCOMKIT_SPRINT_PRICE_ID` | Transformation Sprint | one-time | $10,000 |
| `MARCOMKIT_AUDIT_PRICE_ID` | Governance Risk Audit | one-time | $1,500 to $2,500 |

## 3. What each tier provisions

- `mk1` (Playbook): perpetual license key (`MK1-...`) + gated download of
  `site/private/marcom-kit-playbook.zip` via `GET /api/marcom-kit/download?key=`.
- `mk2`, `mk2-annual`: subscription key (`MKS-...`) + the same gated download
  while the subscription is active.
- `mk2-agency`: as above, plus `white_label = true` on the entitlement row.
  White-label rights are gated to this tier only.
- `mk3`, `mk-sprint`, `mk-audit`: manual fulfillment. The buyer gets a key for
  reference, no self-serve download, and the team gets a "manual fulfillment
  needed" email at `WAITLIST_NOTIFY_EMAIL` (requires `RESEND_FROM`).

Kit keys never unlock SkillFoundry endpoints (validate/run/plugin download)
and SkillFoundry keys never unlock the kit download.

## 4. Go live

1. Set the secrets above (test mode first) and restart the server.
2. Flip `KIT_CHECKOUT_LIVE` to `true` in `site/build.mjs` and rebuild; the kit
   tier buttons switch from waitlist links to live checkout buttons.
3. Run a test-mode purchase of each tier; confirm the success page at
   `/marcom-kit/success`, the key email, and (for mk1/mk2) the download.
4. Swap to live keys and prices, re-point the webhook, and repeat one purchase.
