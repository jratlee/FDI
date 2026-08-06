---
name: Cassette VPS deployment
description: FDI community relay (Buzz) running at lab.falsedawn.industries; gc-agent/gc-service on same box; OpenRouter AI, kind-9 messages.
---

## VPS facts
- IP: 162.243.115.129 (medium plan DigitalOcean)
- SSH: `ssh cassette@162.243.115.129 -i /tmp/cassette-deploy/id_ed25519`
- Buzz relay: `/opt/buzz/` — running on port 3000
- gc-agent + gc-service: `/opt/fdi-community/` — Node.js, systemd services

## nginx layout
- `relay.falsedawn.industries` — full proxy to port 3000 (WebSocket + HTTP)
- `lab.falsedawn.industries`:
  - `/` (HTTP browser) → landing page at `/opt/buzz/lab-landing/index.html`
  - `/` (WebSocket, Upgrade header present) → proxy to port 3000 (relay)
  - `/app` → Buzz SPA at `/opt/buzz/web/dist/index.html`
  - `/assets/` → `/opt/buzz/web/dist/assets/` (SPA uses absolute asset paths)
  - `/api/` → proxy to port 3000 (relay REST API)
  - `/api/gc-invite` → gc-service at port 4242 `/invite`
- Buzz routes community tenants by the HTTP `Host` header, so domain matters.

## Buzz architecture (critical)
- Community messages: **kind-9** (KIND_STREAM_MESSAGE), NOT kind-42 (Public Chat)
- Scoped by `["h", "<community-uuid>"]` NIP-29 tag
- Lab community UUID: `f5156ed0-59f8-4ec3-b133-b2a1d66495bc`
- gc-agent subscribes with `{"#h": [CHANNEL_ID], kinds: [9]}`
- gc-agent replies as kind-9 with `["h", CHANNEL_ID]` tag
- **No auto-update for Buzz** — intentionally manual; breaking protocol/schema
  changes ship without warning. Weekly version-check script at
  `/opt/buzz/check-version.sh` (Task #306).

## VPS env file: /opt/fdi-community/.env.agent
- `BUZZ_RELAY_URL=wss://lab.falsedawn.industries`
- `BUZZ_CHANNEL_ID=f5156ed0-59f8-4ec3-b133-b2a1d66495bc`
- `OPENROUTER_API_KEY=<real OpenRouter key — set Aug 6 2026>`
- `OPENAI_BASE_URL` — no longer used; gc-parser hardcodes OpenRouter base URL

## gc-agent Nostr identity
- Pubkey prefix: `7bc38f37c27aa98f...`
- Private key stored in Replit secret `BUZZ_AGENT_PRIVATE_KEY` and in `.env.agent` on VPS
- Added as owner via kind-9000 put-user; has kind-0 profile in relay

## AI model config
- gc-parser uses OpenRouter (`https://openrouter.ai/api/v1`)
- Key fallback chain: `OPEN_ROUTER` (Replit secret name) → `OPENROUTER_API_KEY`
  (VPS env name) → `AI_INTEGRATIONS_OPENAI_API_KEY` (Replit integration fallback)
- Model pinned to `meta-llama/llama-3.3-70b-instruct` for JSON extraction
- Global default for open-ended features: `openrouter/auto-beta`
  (`openrouter/auto` is **deprecated** as of 2026 per OpenRouter docs)

## Two-tier model rule (global)
- **Deterministic/extraction tasks** (JSON schema, classification, temp=0):
  pin to `meta-llama/llama-3.3-70b-instruct` — cheaper, consistent latency
- **Open-ended tasks** (copy, reasoning, agents): `openrouter/auto-beta`

## Seeded exchanges (in relay as kind-9)
1. PR coverage velocity (day-1 spike vs drip)
2. SaaS unit economics (CAC payback + churn)
3. Agent network spike-vs-drip pattern

## Invite code endpoint
- `POST /invite` on gc-service (port 4242), proxied publicly at `/api/gc-invite`
- Builds a NIP-98 kind-27235 event signed with `BUZZ_AGENT_PRIVATE_KEY`
- **Payload hash required**: NIP-98 POST events must include `["payload", sha256hex(body)]` tag
  or the Buzz relay rejects with 401 "missing payload tag"
- **Host header**: must use `http.request` (not Node's built-in fetch) — undici treats
  `Host` as a forbidden header and won't forward it; relay routes by Host and returns
  404 "no community configured" without it
- Returns `{ok, code, expires_at}` — code is a 7-day JWT-style invite for Buzz iOS
