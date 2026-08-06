---
name: Cassette VPS deployment
description: FDI community relay (Buzz) running at lab.falsedawn.industries; gc-agent/gc-service on same box; OpenRouter AI, kind-9 messages.
---

## VPS facts
- IP: 162.243.115.129 (medium plan DigitalOcean)
- SSH: `ssh cassette@162.243.115.129 -i /tmp/cassette-deploy/id_ed25519`
- Buzz relay: `/opt/buzz/` — running on port 3000
- gc-agent + gc-service: `/opt/fdi-community/` — Node.js, systemd services

## nginx
Both `lab.falsedawn.industries` and `relay.falsedawn.industries` proxy all
traffic (HTTP + WebSocket) to `127.0.0.1:3000`. Buzz routes community tenants
by WebSocket Host header, so domain matters.

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
- Private key (hex): `5594929a44614f19ef59e1d6959184de614e041ba5b7ade538d2dc52312548e5`
- Pubkey prefix: `7bc38f37c27aa98f...`
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

## Outstanding
- BUZZ_AGENT_PRIVATE_KEY not yet stored in Replit secrets (Task #305)
  Value: see gc-agent Nostr identity above (already on VPS, stored for DR)
