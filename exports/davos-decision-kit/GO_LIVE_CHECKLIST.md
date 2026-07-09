# Davos Decision Kit: Commerce Go-Live Checklist (internal)

The kit is fully wired into the shared commerce engine (product `davoskit`,
tier `dk1`, key prefix DK1). Everything degrades gracefully today: with no
secrets set, the demo page's buy button falls back to the waitlist and the
API returns 503. To flip it live:

1. **Stripe product + price.** In Stripe, create the product "Davos Decision
   Kit" with a one-time price ($299 list or $199 launch). Copy the price id.
2. **Secrets.** Set `DAVOSKIT_TIER1_PRICE_ID` to that price id. The shared
   secrets `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` and `DATABASE_URL`
   are already required by SkillFoundry commerce; if unset, set them too
   (webhook endpoint: `POST /api/stripe/webhook`, shared across products).
3. **Demo page.** The internal demo page is emitted at `/davos-kit-demo`
   (noindex, never linked from nav) while `DAVOS_DEMO = true` in
   `site/build.mjs`. Set it to `false` to stop emitting the page.
4. **Gated package.** `node site/build.mjs` builds
   `site/private/davos-decision-kit.zip` from `exports/davos-decision-kit/`
   (this checklist and the convenience zip are excluded). It lives outside
   public `dist/`; the only way to obtain it is
   `GET /api/davos-kit/download?key=` with an active DK1 license.
5. **Test in Stripe test mode.** With test keys set: buy from
   `/davos-kit-demo` with card 4242 4242 4242 4242, confirm the
   `/davos-kit/success` page shows a DK1 key and the download works, confirm
   the key email arrives (Resend), and confirm cross-product refusal (a DK1
   key must 403 on `/api/skillfoundry/download` and `/api/marcom-kit/download`
   and 402 on `/api/skillfoundry/validate`).
6. **Refund path.** Issue a test refund; the `charge.refunded` webhook flips
   the license inactive and the download starts returning 403.
7. **Swap to live keys** and repeat one real purchase + refund.

Success/cancel URLs, tax collection, promotion codes, idempotent key
provisioning, and the buyer key email are all inherited from the shared
engine; nothing kit-specific remains to build.
