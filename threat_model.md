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
- **Waitlist email tokens (`confirm_token`, `unsub_token`)** — short-lived secrets embedded in outbound emails; theft enables phishing/token reuse.

## Trust Boundaries

- **Public internet → Node server** — all inbound HTTP. The server is deployed on Replit autoscale behind Replit's reverse proxy; TLS is handled by the platform. The raw `Host` and `X-Forwarded-*` headers arrive from Replit's proxy but can be influenced by attacker-supplied values if proxy sanitization is incomplete.
- **Node server → PostgreSQL** — direct `pg` pool connection. All queries use parameterized statements. Compromise of the connection string gives full DB access.
- **Node server → Stripe API** — server-to-server with `STRIPE_SECRET_KEY`. Webhooks are signature-verified (`stripe.webhooks.constructEvent`).
- **Node server → OpenAI API** — used only for the admin-gated defrag report generation path. Document content is fenced and HTML-escaped before any LLM interaction.
- **Node server → Resend** — transactional email (confirmation, recovery, team notifications). Uses `RESEND_API_KEY`. Outbound email URLs are derived from `reqOrigin(req)` in the waitlist paths — see Spoofing section.
- **Anonymous visitor / authenticated admin** — the only privilege boundary. The admin panel is protected by a single `WAITLIST_ADMIN_TOKEN` bearer secret (cookie or Authorization header). There is no per-user authentication; any holder of the token has full admin access.
- **Public routes vs gated download routes** — product download endpoints require a valid, active, product-matched license key verified server-side.

## Scan Anchors

**Production entry points:**
- `site/serve.mjs` — single HTTP server handling all routes; deployed as `node site/serve.mjs` on port 5000
- Public API: `POST /api/waitlist`, `GET /api/waitlist/confirm`, `GET /unsubscribe`, `POST /api/checkout`, `POST /api/stripe/webhook`, `POST /api/manage`, `GET /api/portal`, `POST /api/skillfoundry/validate`, `POST /api/skillfoundry/run`, download endpoints
- Admin panel: all routes under `/admin/*` — gated by `WAITLIST_ADMIN_TOKEN`
- Davos demo: `/davos-kit-demo` — gated by `DAVOS_DEMO_PASSWORD`

**Highest-risk code areas:**
- `site/serve.mjs` lines 1136–1148 (`isAdmin` — now cookie + Bearer only; `?token=` URL path removed)
- `site/serve.mjs` lines 653, 655, 824, 1470, 1472, 1546 (`reqOrigin(req)` without `SITE_ORIGIN` guard in waitlist email paths)
- `site/serve.mjs` lines 2393–2397 (`reqOrigin` — trusts Host header; used directly in waitlist email URL construction)
- `site/commerce.mjs` lines 305–334 (`createCheckoutSession` — now receives `SITE_ORIGIN || reqOrigin(req)` from caller)
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

The admin panel uses a single shared secret token (`WAITLIST_ADMIN_TOKEN`). The `isAdmin()` function now accepts only an HMAC-derived session cookie (`wl_admin`) or a raw Bearer token in the `Authorization` header — the `?token=` URL query-parameter path was removed to prevent credential exposure in server logs and browser history.

The admin cookie stores `HMAC(ADMIN_TOKEN, "admin-gate-v1")` rather than the raw token. Rotating `ADMIN_TOKEN` instantly invalidates all sessions. Timing-safe comparison is used throughout.

The Davos demo gate derives a session token via `HMAC(password, "davos-demo-gate-v2:" + expiry)` with an expiry timestamp, stored in an HttpOnly/Secure/SameSite=Strict cookie. Cryptographically sound; tied to a single static password with no rotation mechanism.

**Remaining concern (MEDIUM):** The waitlist signup and key-recovery email paths construct confirmation/unsubscribe URLs using `reqOrigin(req)` directly, without the `SITE_ORIGIN || reqOrigin(req)` guard used by checkout and portal paths. A forged `Host` header on a POST to `/api/waitlist` could poison outbound email links to point to an attacker-controlled domain, leaking `confirm_token` and `unsub_token` values to the attacker. See vulnerability `host-header-email-url-poisoning-waitlist`.

**Required guarantees:** `SITE_ORIGIN` must be set to `https://falsedawn.industries` in production environment secrets. All `reqOrigin(req)` call sites in email-sending paths should be changed to `SITE_ORIGIN || reqOrigin(req)` for consistency.

### Tampering

All database queries in `serve.mjs`, `commerce.mjs`, and `defrag.mjs` use parameterized statements. Stripe checkout prices and product/tier metadata are resolved server-side from a hardcoded `TIERS` map — the client only supplies a `tierId` string which is validated against the map. No SQL injection or price-tampering paths were identified.

The LLM defrag report path fences user-supplied document content between `<<<DOCUMENT` / `DOCUMENT>>>` delimiters, neutralises fence-delimiter smuggling, and instructs the model to ignore instructions in the document. Model output is normalised and HTML-escaped before rendering or PDF generation.

### Information Disclosure

The `reqOrigin()` function trusts the attacker-supplied `Host` header. The checkout and portal paths protect against this with `SITE_ORIGIN || reqOrigin(req)`; waitlist email paths do not (see Spoofing above).

The `/api/skillfoundry/validate` endpoint now returns a uniform `402 { ok: false, active: false, status: "inactive" }` for both "key not found" and "found-but-inactive" cases, closing the key-enumeration oracle.

No sensitive fields (unsub_token, confirm_token, key values) appear in admin list API responses — they are explicitly omitted per code comments.

### Denial of Service

All public POST endpoints now have per-IP rate limits backed by Postgres `rate-limiter-flexible` with in-memory insurance limiters:
- `/api/waitlist`: 8 attempts/hour
- `/api/manage`: 5 attempts/15 minutes
- `/api/checkout`: 20 attempts/hour
- `/api/skillfoundry/validate`: 15 attempts/15 minutes
- `/api/skillfoundry/run`: 10 attempts/hour
- `/api/portal`: 10 attempts/hour

Rate-limit counters are shared across autoscale instances via Postgres, preventing budget reset on restart.

### Elevation of Privilege

All admin routes check `isAdmin()` before performing any action. Download endpoints verify both `product` and `tier` fields from the DB before serving gated files (cross-product key reuse is blocked). Stripe webhook processing uses `stripe.webhooks.constructEvent` signature verification and a DB-enforced idempotency ledger. No privilege-escalation paths were identified.

The `wl_admin` cookie stores the HMAC-derived session token (not the raw admin secret). Bearer token auth transmits the raw `ADMIN_TOKEN` over HTTPS in the Authorization header, which is acceptable given TLS termination by Replit's proxy, but means the raw secret appears in the request if logs capture auth headers.
