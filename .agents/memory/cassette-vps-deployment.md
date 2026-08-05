---
name: Cassette VPS deployment
description: State of the Buzz relay VPS on Cassette — connection details, what's installed, what's left.
---

# Cassette VPS — Open Cartography Lab

## Server identity
- Provider: Cassette (cassette.sh)
- Cassette ID: `8558cf93-e8e6-4e7f-b9cc-262e96d457de`
- Name: `falling-wildflower-1`
- IP: `162.243.115.129` (permanent)
- Plan: `medium` (2 vCPU / 4GB RAM / 50GB SSD — upgraded from small)
- Region: `us-nyc-1`
- OS: Ubuntu 24.04 LTS

## SSH access
- Username: `cassette` (passwordless sudo — NOT root)
- Keypair: generated at `/tmp/cassette-deploy/id_ed25519` in Replit (ephemeral /tmp — regenerate if lost)
- Cassette key ID: `6999ba8d-1566-47e5-affb-6927dc227b35` (registered via API, assigned to cassette)
- To SSH: `ssh -i /tmp/cassette-deploy/id_ed25519 cassette@162.243.115.129`
- If /tmp key is lost: generate new ed25519 keypair, POST to `/api/v1/ssh_keys`, DELETE old assignment, POST new to `/api/v1/cassettes/:id/ssh_key_assignments`

## What's installed on the server
- Swap: 4GB at /swapfile (persists via /etc/fstab)
- System: build-essential, pkg-config, libssl-dev, git, curl, nginx, certbot, python3-certbot-nginx
- PostgreSQL: running, `buzz` role + `buzz` database, password `lab-buzz-2026`
- Redis: running on localhost:6379
- Node.js: v22.23.2
- Rust: 1.97.1 stable (had to upgrade from 1.88 — sqlx requires 1.94+, netwatch requires 1.91)
- Buzz relay: cloned at `/opt/buzz` tag v0.4.22; **build in progress** (cargo build --release -p buzz-relay)
- GC community: `/opt/fdi-community/community/*.mjs` + `ws` + `openai` npm packages

## Config files on server
- `/opt/buzz/.env.production` — DATABASE_URL, REDIS_URL, HOST, PORT, RELAY_URL (set to ws://IP:3000 temporarily)
- `/opt/fdi-community/.env.agent` — BUZZ_RELAY_URL, BUZZ_AGENT_PRIVATE_KEY, GC_SERVICE_URL, GC_CHART_BASE_URL, OPENAI_API_KEY, OPENAI_BASE_URL
- `/etc/nginx/sites-available/buzz-lab` — HTTP-only config (TLS pending DNS)
- `/etc/systemd/system/buzz-relay.service`
- `/etc/systemd/system/gc-service.service`
- `/etc/systemd/system/gc-agent.service`

## What IS running (deployed Aug 5 2026)
- minio ✅ (localhost:9000, bucket buzz-media, user fdi-community, pw lab-minio-2026)
- postgresql ✅ (migrations complete, all tables present)
- redis ✅ (localhost:6379)
- nginx ✅ (port 80, proxies to buzz-relay:3000)
- buzz-relay ✅ (port 3000/ws + 8080/health + 9102/metrics, serves web/dist)
- gc-service ✅ (port 4242, Growth Cartography HTTP service)
- gc-agent ✅ (NIP-42 authenticated pubkey 7bc38f37c27aa98f..., subscribed)

## MinIO note
Added MinIO because Buzz relay v0.4.22 requires S3-compatible object store (runs git conformance probe on startup; fails without it).
MinIO data: /opt/minio-data

## nostr-tools fix
gc-agent shipped with wrong crypto (Ed25519 slice, no AUTH handler). Fixed to use nostr-tools v2 (secp256k1, finalizeEvent, NIP-42 AUTH handler). Deployed at /opt/fdi-community/community/gc-agent.mjs.

## Community provisioned
- community_id: `826e7d07-8c79-4076-bec0-bfa8fefd819a`
- host: `162.243.115.129` (will update to `lab.falsedawn.industries` after DNS)
- owner pubkey: `7bc38f37c27aa98f032cc0e505b6c61f0cb27b871cb899b2fbf65efc94b8b63d` (the gc-agent)
- Operator API: needs NIP-98 signed request (`kind:27235`, tags `["u", url], ["method", method], ["payload", sha256body]`)
  - RELAY_OPERATOR_API_ORIGIN must match the URL used in the NIP-98 event exactly (no 127.0.0.1!)

## What's NOT done yet (blocked on DNS)
1. Point Hover DNS A-records: `relay.falsedawn.industries` and `lab.falsedawn.industries` → 162.243.115.129
2. Run certbot for TLS
3. Update RELAY_OPERATOR_API_ORIGIN, RELAY_URL, BUZZ_RELAY_URL in env files to use https/wss domains
4. Rebuild Buzz web client with `VITE_RELAY_URL=wss://relay.falsedawn.industries`
5. Re-provision community with `host: lab.falsedawn.industries`
6. Set `COMMUNITY_URL=https://lab.falsedawn.industries` in Replit deployment env vars
7. Redeploy site → /community shows "Enter the Lab"
Covered by Task #300.

## Firewall ports open
22 (SSH), 80 (HTTP), 443 (HTTPS), 3000 (relay WS), 3001 (web client), 4242 (gc-service)

## Cassette API notes
- API key: available as `CASSETTE_API_KEY` Replit secret
- Base URL: `https://cassette.sh/api/v1/`
- Resize: `POST /api/v1/cassettes/:id/resize` with `{"plan_id":"medium"}`
- Reboot: `POST /api/v1/cassettes/:id/reboot`
- Firewall: `POST /api/v1/cassettes/:id/firewall_rules`
- SSH key assignment: `POST /api/v1/cassettes/:id/ssh_key_assignments`
- Plans: small ($12/mo 1vCPU/2GB), medium ($29/mo 2vCPU/4GB), large ($99/mo 4vCPU/8GB)

## Key lessons
- Rust version: Buzz v0.4.22 deps require rustc 1.94+ (sqlx) and 1.91+ (netwatch). Install stable, not a pinned old version.
- Post-resize networking: server may be unreachable for 2-3 minutes after a resize even though API shows "running". Reboot via API fixes it.
- SSH username is `cassette`, not `root`. `sudo` works passwordlessly.
- Cassette API returns `ssh_username: "cassette"` on the cassette object — always trust that field.
