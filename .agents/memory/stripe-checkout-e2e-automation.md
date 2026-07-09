---
name: Stripe Checkout e2e automation
description: How to drive a real Stripe test-mode Checkout purchase headlessly with puppeteer-core + Nix chromium.
---

# Driving Stripe Checkout headlessly (test mode)

It IS possible to prove a checkout flow end to end without a human: create a
session via the site API, open the `checkout.stripe.com` URL in puppeteer-core
(Nix chromium, `--no-sandbox`), fill, submit, and follow the redirect to the
success page.

**Gotchas that cost multiple attempts:**
- Card fields (`#cardNumber`, `#cardExpiry`, `#cardCvc`, `#billingName`) live
  in the MAIN frame, not an iframe, but only render after the card
  payment-method accordion is expanded.
- With `automatic_tax` enabled, submission silently no-ops until the FULL
  billing address is filled: select `#billingCountry`, click the "Enter
  address manually" link, then `#billingAddressLine1`, `#billingLocality`,
  `#billingPostalCode`, select `#billingAdministrativeArea`. The tell is the
  summary saying "Enter address to calculate".
- Uncheck `#enableStripePass` (Link save-info) or it may demand a phone number.
- Run the script from a directory that resolves the project's `node_modules`
  (dynamic import of puppeteer-core resolves from the script path, not cwd).

**How to apply:** any future commerce product on the shared engine can be
verified the same way; price IDs are not secrets, so a test-mode price can be
created via the Stripe API and set as a development env var.
