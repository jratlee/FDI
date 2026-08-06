---
name: Cassette VPS deployment
description: Full state of the Buzz relay VPS at 162.243.115.129 — domains, services, communities, SSH, gc-agent architecture
---

## VPS basics
- IP: 162.243.115.129, plan: medium ($29/mo, ~2 GB RAM / 1 vCPU)
- SSH: `ssh -i /tmp/cassette-deploy/id_ed25519 cassette@162.243.115.129`
  - Key recreated 2026-08-06; key ID 44d9545c; assigned to cassette instance 8558cf93
  - The /tmp key is ephemeral — regenerate with `ssh-keygen -t ed25519 -f /tmp/cassette-deploy/id_ed25519 -N ""` then re-add to VPS if the Replit session resets
- Rust toolchain must be stable (not pinned); post-resize needs reboot; DNS/TLS/flip done 2026-08-06

## Domains
- `relay.falsedawn.industries` → nginx → buzz-relay at 127.0.0.1:3000 (WebSocket relay)
- `lab.falsedawn.industries` → nginx → buzz-relay at 127.0.0.1:3000 (WebSocket + SPA)
  - **Both** domains proxy ALL traffic to port 3000; the relay distinguishes tenants by Host header
  - TLS: both share /etc/letsencrypt/live/relay.falsedawn.industries/ cert (SAN or wildcard)

## Communities (Buzz tenants)
- `lab.falsedawn.industries` → UUID `f5156ed0-59f8-4ec3-b133-b2a1d66495bc` ← **the active Lab**
- `relay.falsedawn.industries` → UUID `030ffa74-3e39-4c67-838d-7839b27af584` (relay community, not used by the Lab)

## Buzz web client
- Built at `/opt/buzz/web`, deployed to `/opt/buzz/web/dist`
- Served by the relay itself (from BUZZ_WEB_DIR) when Host=lab or relay
- Must be rebuilt with `VITE_RELAY_URL=wss://lab.falsedawn.industries` for the Lab community

## gc-agent
- Service: gc-agent.service, WorkingDirectory=/opt/fdi-community, ExecStart=node community/gc-agent.mjs
- EnvironmentFile: /opt/fdi-community/.env.agent
- Key env vars:
  - BUZZ_RELAY_URL=wss://lab.falsedawn.industries (community routing via Host header)
  - BUZZ_CHANNEL_ID=f5156ed0-59f8-4ec3-b133-b2a1d66495bc (community UUID, used as `h` tag in kind-9 messages)
  - BUZZ_AGENT_PRIVATE_KEY=<64-char hex> (Nostr private key for gc-agent)
  - OPENAI_API_KEY / OPENAI_BASE_URL — must point to https://api.openai.com/v1 (NOT the Replit localhost:1106 proxy, which is unreachable from VPS)

## Buzz relay event kind architecture (CRITICAL)
Buzz does NOT use NIP-28 (kind-40/41/42 Public Chat). It uses:
- **KIND_STREAM_MESSAGE = 9** — channel messages (use this for all community posts/replies)
- KIND_STREAM_MESSAGE_V2 = 40002 — newer variant
- KIND_NIP29_CREATE_GROUP = 9007 — create sub-channel within community
- KIND_NIP29_PUT_USER = 9000 — add member/admin (scope: AdminChannels)
- KIND_NIP29_JOIN_REQUEST = 9021 — join request (scope: ChannelsRead)
- KIND_PROFILE = 0 — user profile metadata
- kind-42 is REJECTED with "restricted: unknown event kind"

## Buzz message format (kind-9)
- Channel scope: `["h", "<channel-or-community-uuid>"]` tag
  - For the Lab: use the community UUID `f5156ed0-...`; this scopes message to the lab community's default channel
  - The relay parses `h` tag as UUID via `extract_channel_id()`
- Threaded reply: `["e", "<parent_event_id>", "", "reply"]` + `["p", "<author_pubkey>"]`
- Full reply tags: `[["h", CHANNEL_ID], ["e", parentId, "", "reply"], ["p", authorPubkey]]`

## gc-agent subscription filter
- Subscribe to kind-9 in channel: `{ kinds: [9], "#h": [CHANNEL_ID], limit: 0 }`
- Detect @gc mentions by scanning event.content client-side (not via #p filter)
- Agent pubkey is the community owner; added as owner via kind-9000 put-user

## Lab seeded (2026-08-06)
- @gc kind-0 profile posted to relay
- 3 example exchanges seeded (PR coverage velocity, SaaS unit economics, agent network spike-vs-drip)
- All using kind-9 with h=f5156ed0 community UUID

## OpenAI connectivity gap (BLOCKER for live agent responses)
- gc-service (and gc-agent local fallback) both use OPENAI_BASE_URL=http://localhost:1106/modelfarm/openai
- That URL is the Replit AI integration sidecar — NOT reachable from the VPS
- Result: gc-service /model returns "OpenAI call failed: Connection error."
- Fix: set OPENAI_BASE_URL=https://api.openai.com/v1 and OPENAI_API_KEY to a real key in /opt/fdi-community/.env.agent
- Until fixed: gc-agent can subscribe and post seeded content but cannot parse/answer live questions

## Services (all active)
- buzz-relay, buzz-operator, gc-agent, gc-service, nginx, certbot-renew (timer)
- Total RSS ~356 MB, load avg ~0.36 — healthy headroom
