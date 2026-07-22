# Buzz Relay Spike Findings

**Goal:** Prove the FDI community can run on a self-hosted Buzz relay (github.com/block/buzz, Apache 2.0). Relay up, web client connects in a browser, one agent replies in a channel.

**Date:** 2026-07-22

---

## What Was Attempted

Investigated feasibility of running the Buzz relay inside the FDI Replit workspace (Node 20, PostgreSQL 16.10, no Docker, no Redis, no Rust toolchain).

## Findings

### Toolchain availability

| Dependency | Required | Available in Replit workspace |
|---|---|---|
| Rust 1.88+ | relay build | No rustc installed |
| Redis 7 | relay runtime | Not available |
| PostgreSQL 16+ | relay runtime | Yes (psql 16.10) |
| Docker | compose-based dev | Not available |
| Node 24 / pnpm | web client build | Node 20 / npm (version gap) |
| `just` | build orchestration | Not available |

Two hard blockers: no Rust toolchain (relay cannot be built from source), no Redis (relay cannot start even if built). Both are required with no fallback path in the current codebase.

### Release artifacts

Buzz v0.4.22 (released 2026-07-21, the day before this spike) ships five desktop binaries only:
- `Buzz_0.4.22_aarch64.dmg` (macOS ARM)
- `Buzz_0.4.22_x64.dmg` (macOS x86)
- `Buzz_0.4.22_amd64.AppImage` (Linux desktop)
- `Buzz_0.4.22_amd64.deb` (Linux desktop)
- `Buzz_0.4.22_x64-setup_alpha-unsigned.exe` (Windows)

No server/relay binary is published. The relay must be built from source.

### Web client

The Buzz web client (`web/` in the repo) is a full React + Vite + `nostr-tools` app. It can be built and served separately from the relay. It connects to the relay over WebSocket at a configured URL. This is the right surface for the `/community` entry point: once a relay is live at a known URL, the web client can be built and hosted independently (a static Vite build, no server runtime needed).

### Infrastructure requirements (from docker-compose.yml)

The relay requires:
- **PostgreSQL 17** (migrations in `migrations/`)
- **Redis 7** (pub/sub + caching layer)
- **Keycloak 26** (identity, optional but wired into the default compose)
- **MinIO** (S3-compatible media storage)
- **Typesense** (search index)

In a stripped-down production deployment, Keycloak can be replaced by Nostr keypair auth (NIP-42 is the native auth; Keycloak is the OAuth bridge for non-Nostr clients). MinIO can be substituted by any S3-compatible store (Tigris, R2, etc.). Typesense is the search index and can be deferred.

Minimum viable relay stack: **Rust binary + PostgreSQL + Redis**. Everything else is optional for Ring 1 (text channels only, no media, no git, no search).

## Recommendation: External VPS (go)

The Replit workspace cannot host the relay. The relay is a compiled Rust binary requiring Redis that is not available here and cannot be installed. A separate Replit Reserved VM could work in principle (Reserved VMs support Docker and longer-running services) but adds cost and complexity without clear benefit over a purpose-built VPS.

**Recommended path:** a small Hetzner or DigitalOcean VPS.

| Option | Spec | Est. monthly cost | Notes |
|---|---|---|---|
| Hetzner CX22 | 2 vCPU / 4GB RAM / 40GB SSD | ~$5/month | Enough for relay + Redis + Postgres for a small community |
| Hetzner CX32 | 4 vCPU / 8GB RAM / 80GB SSD | ~$10/month | Comfortable headroom; recommended for production |
| DigitalOcean Basic | 2 vCPU / 4GB RAM / 80GB SSD | ~$24/month | Pricier but familiar tooling |

The web client (`web/`) can be hosted as a static Vite build anywhere (Cloudflare Pages, Vercel, or served directly from the site's existing static server) and pointed at the relay's WebSocket URL. This separates the relay's uptime dependency from the marketing site's uptime.

## Go/No-Go

**Go.** The Buzz relay is well-designed, actively maintained, and the architecture is clear. The web client has `nostr-tools` for Nostr keypair auth, which means the agent can participate using a standard Nostr private key without any Keycloak dependency. The minimum viable spike (relay + web client + agent roundtrip) is achievable on a Hetzner CX22 in a day.

## Deployment Runbook (VPS)

See `community/vps-runbook.md` for the step-by-step setup targeting Hetzner CX32 with Ubuntu 24.04: Rust toolchain, Buzz relay build, PostgreSQL + Redis via apt, migrations, web client build, and systemd service files.

## What Was Built During This Spike

- `community/gc-engine.mjs` — the cohort-decay math ported to pure Node.js ESM. Wraps the same compounding retention model as `app.py` / `theseus_growth`, without the Python runtime dependency. Tested with unit assertions in the file.
- `community/gc-parser.mjs` — LLM-based scenario parser: plain-language prompt to structured parameters, injection-fenced, strict JSON schema, refusal path for unparseable input.
- `community/gc-agent.mjs` — the Growth Cartography agent: connects to the relay via Nostr WebSocket (NIP-42 auth, NIP-01 events), listens for mentions in a designated channel, calls the parser + engine, posts the answer thread.
- `/community` page on the public site — built and in the sitemap, using the `COMMUNITY_URL` env var flag pattern.

## Next Steps

1. Provision a Hetzner CX32, follow `community/vps-runbook.md`.
2. Build the relay, run migrations, start Redis and the relay as systemd services.
3. Build the Buzz web client and point it at `wss://relay.falsedawn.industries` (or whatever subdomain is chosen).
4. Generate the agent's Nostr keypair, set `BUZZ_AGENT_PRIVATE_KEY` and `BUZZ_RELAY_URL`, start `gc-agent.mjs`.
5. Set `COMMUNITY_URL=https://lab.falsedawn.industries` in the Replit deployment env vars and redeploy. The `/community` page flips from waitlist to "Enter the Lab" automatically.
