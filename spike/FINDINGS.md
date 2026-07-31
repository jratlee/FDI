# Buzz Relay Spike — Findings & Hosting Recommendation

**Date:** 2026-07-31  
**Buzz commit:** `10d5a26` (HEAD of `main`, cloned depth-1)  
**Rust toolchain installed:** 1.86.0 (Replit Nix default)  
**Outcome:** Dead end — build blocked at three hard constraints. Per the spike brief, this is a valid outcome; findings below support the go/no-go hosting decision.

---

## What was attempted

| Step | Result |
|---|---|
| Clone `github.com/block/buzz` | ✅ Succeeded — 26 crates, 26 migrations |
| Check for pre-built relay binary in GitHub releases | ❌ Only desktop app installers (DMG, AppImage, DEB, EXE) — no server binary |
| `cargo check --package buzz-relay` | ❌ Fails — Rust version gate (see below) |
| Install Redis via `nix-env -iA nixpkgs.redis` | ❌ Nix store derivation cannot be built in this Replit environment |
| Install newer Rust via `rustup` | ❌ `rustup` is not installed; no path to upgrade in-env |
| Web client and agent roundtrip | ❌ Not reached — blocked by relay build failure |

---

## Hard blockers (all three must be resolved before a relay can boot)

### 1. Rust version mismatch — build stops immediately

```
error: rustc 1.86.0 is not supported by the following packages:
  buzz-audit@0.1.0 requires rustc 1.88.0
  buzz-auth@0.1.0 requires rustc 1.88.0
  ... (all 26 workspace crates)
```

- `rust-toolchain.toml` pins **1.95.0**; workspace `Cargo.toml` sets minimum **1.88.0**.
- Replit's Nix environment ships **1.86.0** and does not include `rustup`.
- `nix-env` cannot build newer Rust derivations in this store — the Nix daemon is read-only for user installs in the Replit container.
- **No workaround available in this environment without infrastructure changes.**

### 2. Redis not available

- Buzz relay requires a Redis URL (`BUZZ_REDIS_URL`) at startup; the connection is non-optional.
- `nix-env -iA nixpkgs.redis` timed out with a store-build failure.
- No `redis-server` binary is on `$PATH`.

### 3. S3/MinIO media storage required

- The relay config (`crates/buzz-relay/src/config.rs`) loads `BUZZ_S3_ENDPOINT`, `BUZZ_S3_ACCESS_KEY`, and `BUZZ_S3_SECRET_KEY` on startup with no disable flag.
- The Docker Compose dev setup uses `minio/minio:latest`. Running MinIO in this environment would require Docker (not available) or a standalone binary install.

---

## What Buzz actually needs to run (for any target environment)

From `docker-compose.yml` and the relay config:

| Dependency | Image / version | Notes |
|---|---|---|
| Postgres | postgres:17-alpine | 26 migrations to apply |
| Redis | redis:7-alpine | Required — no skip flag |
| Object storage | minio/minio:latest (dev) or real S3 | `BUZZ_S3_ENDPOINT` + credentials |
| Rust toolchain | 1.95.0 (pinned) | For building from source |
| Node / pnpm | Node 20+, pnpm | Web client (`web/`) Vite build |

Postgres 16 is present in this workspace (and the existing tables are in their own schema, so isolation is achievable). That is the only dep that was ready.

---

## Resource footprint (from codebase + docs review)

- **26 Rust crates** — tokio async runtime, axum HTTP, sqlx Postgres, deadpool-redis, nostr protocol, iroh mesh transport, OpenTelemetry tracing. Not a lightweight binary.
- **Estimated build time from cold cache:** 15–25 minutes on a 2-vCPU machine (the `ci` Cargo profile builds deps at opt-level 3 and workspace crates at opt-level 1 — similar to a release build).
- **RAM at runtime:** The relay is multi-threaded with per-connection buffers. The docker-compose dev setup suggests 512 MB–1 GB working set is realistic for a small community.
- **Disk:** Build artifacts alone run 2–4 GB for a full Rust workspace this size.

---

## Hosting recommendation: external VPS over Replit Reserved VM

### Option A — Replit Reserved VM

| | |
|---|---|
| **Cost** | $7/mo (1 vCPU, 2 GB RAM) or $25/mo (2 vCPU, 4 GB RAM) + Replit Object Storage ~$0.03/GB/mo |
| **Feasibility** | Low without significant env work |

**Problems:**
- The Rust toolchain blocker exists here too — Reserved VM runs the same Nix base. A custom Nix overlay or a pre-compiled binary archive would be needed before the relay could even be built.
- Redis: same unavailability as the dev environment. Would require a managed Redis add-on (none native to Replit) or a sidecar process.
- Object storage: Replit Object Storage is S3-compatible, so `BUZZ_S3_ENDPOINT` could point at it — this is the one advantage, but it only solves one of the three blockers.
- No Docker Compose support — each service must be wired manually.
- Replit's autoscale deployment model does not fit a stateful WebSocket relay that needs a persistent connection pool and a long-lived Redis pub/sub connection.

**Verdict: Not recommended.** The toolchain and Redis blockers are the same as this spike, and the Reserved VM model is optimised for stateless HTTP services, not long-lived relay processes.

---

### Option B — External VPS (Hetzner or DigitalOcean) ✅ Recommended

| Provider | Instance | RAM | vCPU | Est. cost/mo |
|---|---|---|---|---|
| Hetzner Cloud | CX22 | 4 GB | 2 | ~€4.35 (~$4.70) |
| Hetzner Cloud | CX32 | 8 GB | 4 | ~€7.60 (~$8.20) |
| DigitalOcean | Basic Droplet | 2 GB | 1 | $12 |
| DigitalOcean | Basic Droplet | 4 GB | 2 | $24 |

Add ~$5–15/mo for a managed Postgres if not self-hosting it in Docker.  
**Realistic all-in total: $10–25/mo** for a small community pilot.

**Why this works:**
- Full Docker support — `docker compose up` from the Buzz repo launches Postgres, Redis, and MinIO in one command, then `cargo build --release` produces the relay binary.
- Hetzner CX22 (4 GB RAM, 2 vCPU) comfortably handles a Rust release build and runtime for a small community.
- Standard Ubuntu/Debian — install `rustup`, pin to `1.95.0`, done. No Nix constraints.
- The relay's `docker-compose.yml` already covers the full dev stack; a production overlay just swaps MinIO for real S3 (or keeps MinIO behind a volume).
- TLS via Caddy reverse proxy (one extra service, free).
- Hetzner is cost-leader for EU; DigitalOcean if US region is preferred.

**Setup estimate (from cold VPS):**
- ~30 min provisioning + Docker + Rust install
- ~20 min `cargo build --release` (cold, 4 vCPU)
- ~10 min migrations + web client build + Caddy config
- Total: under 1 hour to a working relay

---

## Go / No-Go recommendation

| Decision | Recommendation |
|---|---|
| **Is Buzz the right protocol for the FDI community?** | **Conditional go.** The Nostr-native identity model (keypair per member/agent) and the agent-as-member model align well with the Growth Cartography agent task. The Apache 2.0 license is clean. The codebase is actively developed (main branch has recent commits as of July 2026). |
| **Can it run in this Replit workspace?** | **No.** Three hard blockers: Rust version, Redis, S3 — none resolvable without infrastructure unavailable here. |
| **Where should it run?** | **Hetzner CX22 (~$5/mo) or DigitalOcean $12 droplet.** Use Docker Compose for Postgres/Redis/MinIO; build relay from source with rustup 1.95.0; Caddy for TLS. |
| **Next concrete step** | Provision a Hetzner CX22, re-run this spike against it, and produce the working demo the /community page will point users at. |

---

## Version pins (for reproducibility)

```
buzz commit:   10d5a26 (main, 2026-07-31)
rust required: 1.95.0 (rust-toolchain.toml) / ≥1.88.0 (Cargo.toml minimum)
postgres:      17-alpine (docker-compose.yml)
redis:         7-alpine  (docker-compose.yml)
minio:         minio/minio:latest (docker-compose.yml)
```

---

## Spike directory

All spike code lives in `spike/` and can be deleted without affecting the public site, its build, or deployment. The `spike/buzz/` clone is the only artefact.
