---
name: Skillfoundry commerce (Stripe)
description: Durable invariants/decisions for the paid Skillfoundry Stripe flow on the static Node site.
---

# Skillfoundry commerce — invariants

Paid Skillfoundry checkout runs on the plain-`http` FDI site (NOT Express).

- **Credentials are env secrets, deliberately NOT the Replit Stripe connector.**
  **Why:** this is a founder-configured production payment surface; the connector
  is for agent-time API calls, not runtime checkout.
- **Idempotency is DB-enforced, never just an `if`.** Provisioning is guarded by
  a UNIQUE index on the checkout session id; each webhook event is claimed in a
  ledger row before it's applied, and the claim is released if handling throws.
  **Why:** the success page and the webhook both provision the same purchase
  concurrently — the `if` loses the race, the unique index does not (Pile pattern).
- **The subscription gate is subscription-only.** Validating/running for Tier 2/3
  must require `key_type === "subscription"` AND active — an active Tier 1
  *license* key must be refused (402). **Why:** otherwise a one-time license
  buys perpetual access to the recurring server-side run path (authz/revenue leak;
  caught in code review).
- **The gated download must NOT live under the public `dist/`.** The Tier 1 plugin
  zip is built outside it and streamed only for an active license key.
- **Graceful degradation is required.** With no Stripe secrets: checkout 503s, buy
  buttons fall back to the waitlist, pages show "checkout isn't live yet" — mirrors
  the waitlist's 503-when-unconfigured behavior.

Tiers: T1 one-time → perpetual license + download; T2/T3 subscription → server-
validated subscription key (T3 also flags manual onboarding, no self-serve
download). Founder setup steps live in `skillfoundry/STRIPE_SETUP.md`.
