# Threat Model

## Project Overview

False Dawn Industries (FDI) is a marketing-operations consultancy website built on Node.js with a custom HTTP server (`site/serve.mjs`). It serves a public static marketing site, Stripe-powered product checkout (SkillFoundry, MarCom OS, Davos kit), a waitlist/email-capture system (Resend + PostgreSQL double opt-in), and a token-gated internal admin panel (waitlist management, pipeline tracker, LLM-powered defrag report generator).

Tech stack: Node.js ESM, vanilla HTTP (`node:http`), PostgreSQL (`pg`), Stripe SDK, Resend email API, OpenAI SDK (defrag reports only), Puppeteer-Core + headless Chromium (PDF export), Replit autoscale deployment.

Users: anonymous visitors, email waitlist subscribers, paid product buyers (SkillFoundry / MarCom OS / Davos kit), and one internal admin.

## Assets

- **Admin credentials (`WAITLIST_ADMIN_TOKEN`)** — grants full access to the admin panel: waitlist CSV export (PII), defrag report generation (OpenAI spend), pipeline CRUD, and signup deletion. Single shared secret; no user accounts.
- **Stripe secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)** — compromise allows arbitrary charges, fraudulent refunds, and manipulation of entitlements.
- **Waitlist PII** — email addresses, signup source, confirmation status. Stored in Postgres `waitlist_signups`.
- **Product entitlements + license keys** — `skillfoundry_entitlements` table. A leaked or enumerated key unlocks paid product functionality (audit runs, file downloads).
- **Product download ZIPs** — MarCom OS playbook, Davos Decision Kit, SkillFoundry plugin; served from `site/private/`. Gate bypass gives away paid content for free.
- **OpenAI API key** — used only by the defrag report path; uncontrolled access burns API budget.
- **Davos demo password (`DAVOS_DEMO_PASSWORD`)** — gates a password-protected demo page and its downloadable kit, intended for a single prospect (The Content Bureau).

## Trust Boundaries

- **Public internet → Node server** — all inbound HTTP. The server is deployed on Replit autoscale behind Replit's reverse proxy; TLS is handled by the platform. The raw `Host` and `X-Forwarded-*` headers arrive from Replit's proxy but can be influenced by attacker-supplied values (see Stripe redirect finding).
- **Node server → PostgreSQL** — direct `pg` pool connection. All queries use parameterized statements. Compromise of the connection string gives full DB access.
- **Node server → Stripe API** — server-to-server with `STRIPE_SECRET_KEY`. Webhooks are signature-verified (`stripe.webhooks.constructEvent`).
- **Node server → OpenAI API** — used only for the admin-gated defrag report generation path. Document content is fenced and HTML-escaped before any LLM interaction.
- **Node server → Resend** — transactional email (confirmation, recovery, team notifications). Uses `RESEND_API_KEY`.
- **Anonymous visitor / authenticated admin** — the only privilege boundary. The admin panel is protected by a single `WAITLIST_ADMIN_TOKEN` bearer secret (cookie or Authorization header). There is no per-user authentication; any holder of the token has full admin access.
- **Public routes vs gated download routes** — product download endpoints require a valid, active, product-matched license key verified server-side.

## Scan Anchors

**Production entry points:**
- `site/serve.mjs` — single HTTP server handling all routes; deployed as `node site/serve.mjs` on port 5000
- Public API: `POST /api/waitlist`, `GET /api/waitlist/confirm`, `GET /unsubscribe`, `POST /api/checkout`, `POST /api/stripe/webhook`, `POST /api/manage`, `GET /api/portal`, `POST /api/skillfoundry/validate`, `POST /api/skillfoundry/run`, download endpoints
- Admin panel: all routes under `/admin/*` — gated by `WAITLIST_ADMIN_TOKEN`
- Davos demo: `/davos-kit-demo` — gated by `DAVOS_DEMO_PASSWORD`

**Highest-risk code areas:**
- `site/serve.mjs` lines 870–880 (`isAdmin` — admin auth including URL token path)
- `site/serve.mjs` lines 1879–1883 (`reqOrigin` — trusts Host header; embedded in Stripe redirect URLs)
- `site/serve.mjs` lines 1886–1931 (`handleCheckout` — no rate limit)
- `site/serve.mjs` lines 1973–2110 (`handleValidate`, `handleRun` — no rate limit, enumeration oracle)
- `site/commerce.mjs` lines 305–334 (`createCheckoutSession` — `success_url`/`cancel_url` constructed from caller-supplied origin)
- `site/defrag.mjs` lines 152–179 (LLM system prompt, document fencing, prompt injection mitigations)

**Public vs authenticated vs admin surfaces:**
- Public (no auth): `/`, `/field-guide`, `/skillfoundry`, `/marcom-kit`, `/topcall`, `/series/*`, `/api/waitlist`, `/api/checkout`, `/api/stripe/webhook`, `/api/skillfoundry/validate`, `/api/skillfoundry/run`
- Password-gated: `/davos-kit-demo` and its assets (cookie `dk_demo`)
- Key-gated downloads: `/api/skillfoundry/download`, `/api/marcom-kit/download`, `/api/davos-kit/download`
- Admin-only (`WAITLIST_ADMIN_TOKEN`): all `/admin/*` routes

**Dev-only areas (ignore unless reachability is proven):**
- `artifacts/mockup-sandbox/` — design mockups, served at `/__mockup/` via a separate canvas preview server
- `app.py` / Streamlit engine — internal only, not linked from the public site
- `topcall/` — CLI + MCP server, Node ESM, zero HTTP surface

## Threat Categories

### Spoofing

The admin panel uses a single shared secret token (`WAITLIST_ADMIN_TOKEN`). The `isAdmin()` function accepts this token via HTTP cookie, Authorization Bearer header, or `?token=` URL query parameter. The URL-parameter path exposes the raw secret in server logs and browser history. There is no session rotation, MFA, or login-attempt audit log.

The Davos demo gate derives a session token via HMAC(password, fixed-string) and stores it in a cookie. This is cryptographically sound but tied to a single static password with no rotation mechanism.

**Required guarantees:** Admin token must never appear in URLs. `WAITLIST_ADMIN_TOKEN` must be a high-entropy random string (≥32 bytes). The `?token=` query-parameter path in `isAdmin()` should be removed.

### Tampering

All database queries in `serve.mjs`, `commerce.mjs`, and `defrag.mjs` use parameterized statements. Stripe checkout prices and product/tier metadata are resolved server-side from a hardcoded `TIERS` map — the client only supplies a `tierId` string which is validated against the map. No SQL injection or price-tampering paths were identified.

The LLM defrag report path fences user-supplied document content between `<<<DOCUMENT` / `DOCUMENT>>>` delimiters, neutralises fence-delimiter smuggling, and instructs the model to ignore instructions in the document. Model output is normalised and HTML-escaped before rendering or PDF generation.

### Information Disclosure

The `reqOrigin()` function trusts the attacker-supplied `Host` header and embeds the result into Stripe checkout `success_url` and `cancel_url`. A spoofed host causes Stripe to redirect the buyer to an attacker domain after payment, leaking the `CHECKOUT_SESSION_ID`. The key-recovery email path already applies the correct fix (`SITE_ORIGIN || reqOrigin(req)`); the checkout and portal paths do not.

The `/api/skillfoundry/validate` endpoint returns distinguishable responses for "key not found" vs "key found but inactive vs active", enabling key enumeration with no rate limit.

**Required guarantees:** `SITE_ORIGIN` must be set and used unconditionally in `createCheckoutSession` and portal redirect paths. Validate endpoint responses must not distinguish between absent and inactive keys.

### Denial of Service

`POST /api/checkout` (Stripe session creation), `POST /api/skillfoundry/validate`, and `POST /api/skillfoundry/run` have no per-IP rate limit. The waitlist (`/api/waitlist`) and key-recovery (`/api/manage`) paths are correctly rate-limited with Postgres-backed `rate-limiter-flexible` instances.

An attacker can spam `/api/checkout` to exhaust Stripe API quota and flood the Stripe dashboard. `/api/skillfoundry/validate` can be used for key brute-force with no throttle.

**Required guarantees:** All public POST endpoints that touch external APIs or perform non-trivial DB queries must have per-IP rate limits consistent with the existing `waitlistLimiter` pattern.

### Elevation of Privilege

All admin routes check `isAdmin()` before performing any action. Download endpoints verify both `product` and `tier` fields from the DB before serving gated files (cross-product key reuse is blocked). Stripe webhook processing uses `stripe.webhooks.constructEvent` signature verification and a DB-enforced idempotency ledger. No privilege-escalation paths were identified.

The `wl_admin` cookie stores the raw admin token value (not a signed session reference). Theft of the cookie (e.g., via server infrastructure access) directly reveals the admin secret rather than just a session handle.
