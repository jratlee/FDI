# VPS Deployment Runbook: Buzz Relay + Growth Cartography Agent

Target: Hetzner CX32 (4 vCPU / 8GB RAM / 80GB SSD), Ubuntu 24.04 LTS.
Estimated monthly cost: ~$10/month.

This runbook sets up:
1. The Buzz relay (Rust, Axum, WebSocket + REST)
2. PostgreSQL 17 and Redis 7 (via apt)
3. The Buzz web client (served as a static Vite build on port 3001)
4. The Growth Cartography Agent (Node.js, connects as an agent to the relay)

**No Docker is required.** Everything is built from source and managed with systemd.

---

## Prerequisites

- A domain or subdomain pointed at the VPS IP (e.g. `relay.falsedawn.industries`).
- A TLS certificate (use certbot + nginx as a reverse proxy).
- SSH access to the VPS as root or a sudo user.

---

## 1. System setup

```bash
apt update && apt upgrade -y
apt install -y build-essential pkg-config libssl-dev git curl nginx certbot python3-certbot-nginx
```

---

## 2. PostgreSQL 17

```bash
apt install -y postgresql-17
systemctl enable --now postgresql

sudo -u postgres psql -c "CREATE USER buzz WITH PASSWORD 'choose-a-strong-password';"
sudo -u postgres psql -c "CREATE DATABASE buzz OWNER buzz;"
```

---

## 3. Redis 7

```bash
apt install -y redis-server
systemctl enable --now redis-server
```

---

## 4. Rust toolchain

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustup toolchain install 1.88
rustup default 1.88
```

---

## 5. Build the Buzz relay

```bash
git clone https://github.com/block/buzz.git /opt/buzz
cd /opt/buzz
git checkout v0.4.22

# Build only the relay crate (not the full workspace)
cargo build --release -p buzz-relay
```

The binary is at `/opt/buzz/target/release/buzz-relay`.

---

## 6. Run migrations

```bash
cd /opt/buzz
DATABASE_URL="postgres://buzz:choose-a-strong-password@localhost:5432/buzz" \
  ./target/release/buzz-relay migrate
```

---

## 7. Relay systemd service

Create `/etc/systemd/system/buzz-relay.service`:

```ini
[Unit]
Description=Buzz Relay
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/buzz
EnvironmentFile=/opt/buzz/.env.production
ExecStart=/opt/buzz/target/release/buzz-relay serve
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Create `/opt/buzz/.env.production`:

```env
DATABASE_URL=postgres://buzz:choose-a-strong-password@localhost:5432/buzz
REDIS_URL=redis://localhost:6379
HOST=0.0.0.0
PORT=3000
# Set to your actual domain:
RELAY_URL=wss://relay.falsedawn.industries
# Leave MinIO/S3 unset to disable media uploads for Ring 1.
```

```bash
systemctl daemon-reload
systemctl enable --now buzz-relay
journalctl -fu buzz-relay
```

---

## 8. Node.js and the web client

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pnpm

cd /opt/buzz/web
pnpm install
VITE_RELAY_URL=wss://relay.falsedawn.industries pnpm build
# Static build is in /opt/buzz/web/dist/
```

---

## 9. Nginx reverse proxy + TLS

Create `/etc/nginx/sites-available/buzz`:

```nginx
server {
    listen 80;
    server_name relay.falsedawn.industries lab.falsedawn.industries;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name relay.falsedawn.industries;

    ssl_certificate /etc/letsencrypt/live/relay.falsedawn.industries/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.falsedawn.industries/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}

server {
    listen 443 ssl;
    server_name lab.falsedawn.industries;

    ssl_certificate /etc/letsencrypt/live/lab.falsedawn.industries/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lab.falsedawn.industries/privkey.pem;

    root /opt/buzz/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/buzz /etc/nginx/sites-enabled/
certbot --nginx -d relay.falsedawn.industries -d lab.falsedawn.industries
nginx -t && systemctl reload nginx
```

---

## 10. Growth Cartography Agent

```bash
apt install -y nodejs  # already done above
cd /opt/fdi-community  # or wherever the FDI repo is cloned
npm install ws openai  # ws for WebSocket, openai for the parser
```

Generate the agent's Nostr keypair:

```bash
node -e "
const { randomBytes } = await import('node:crypto');
const priv = randomBytes(32).toString('hex');
console.log('BUZZ_AGENT_PRIVATE_KEY=' + priv);
" --input-type=module
```

Create `/etc/systemd/system/gc-agent.service`:

```ini
[Unit]
Description=FDI Growth Cartography Agent
After=network.target buzz-relay.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/fdi-community
EnvironmentFile=/opt/fdi-community/.env.agent
ExecStart=/usr/bin/node community/gc-agent.mjs
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Create `/opt/fdi-community/.env.agent`:

```env
BUZZ_RELAY_URL=wss://relay.falsedawn.industries
BUZZ_AGENT_PRIVATE_KEY=<64-char hex from keygen above>
OPENAI_API_KEY=<from Replit OpenAI integration or direct API key>
```

```bash
systemctl daemon-reload
systemctl enable --now gc-agent
journalctl -fu gc-agent
```

---

## 11. Flip the marketing site

Once the relay and web client are up:

```bash
# In the Replit deployment env vars:
COMMUNITY_URL=https://lab.falsedawn.industries
```

Redeploy. The `/community` page automatically switches from waitlist to "Enter the Lab".

---

## Ongoing maintenance

- Relay updates: use `sudo /opt/buzz/scripts/buzz-update.sh` (see §12 below)
- Web client updates: `cd /opt/buzz/web && pnpm install && VITE_RELAY_URL=wss://lab.falsedawn.industries pnpm build`
- Agent updates: pull the FDI repo, `systemctl restart gc-agent`
- Certs: certbot auto-renews via the cron job it installs.

---

## 12. Version check and safe upgrade scripts

### Purpose

`buzz-version-check.sh` — run weekly by systemd timer. Compares `/opt/buzz` git
tag against the latest stable GitHub release. If behind, posts a kind-9 Nostr
message to `wss://lab.falsedawn.industries` visible in the Lab. Silent when current.

`buzz-update.sh` — run manually when you are ready to upgrade. Fetches the target
tag (defaults to latest stable), backs up the current binary, builds the relay and
web client, restarts all services, waits 10 s, then health-checks `/api/health`
and the NIP-11 endpoint. Rolls back the binary automatically on failure.

### Installation (done by setup.sh — manual steps if re-running)

```bash
# Copy scripts from the FDI repo (community/scripts/) to /opt/buzz/scripts/
mkdir -p /opt/buzz/scripts
cp /opt/fdi-community/community/scripts/buzz-update.sh        /opt/buzz/scripts/
cp /opt/fdi-community/community/scripts/buzz-version-check.sh /opt/buzz/scripts/
chmod +x /opt/buzz/scripts/buzz-update.sh /opt/buzz/scripts/buzz-version-check.sh

# Install systemd units
cp /opt/fdi-community/community/scripts/buzz-version-check.service /etc/systemd/system/
cp /opt/fdi-community/community/scripts/buzz-version-check.timer   /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now buzz-version-check.timer

# Verify
systemctl list-timers buzz-version-check.timer
```

### Running manually

```bash
# Check for a new release now (exits silently if already current)
sudo BUZZ_AGENT_PRIVATE_KEY=... BUZZ_RELAY_URL=wss://lab.falsedawn.industries \
  /opt/buzz/scripts/buzz-version-check.sh

# Or let systemd inject the env from .env.agent:
sudo systemctl start buzz-version-check.service
journalctl -u buzz-version-check.service

# Dry-run the upgrade (shows plan, builds nothing)
sudo /opt/buzz/scripts/buzz-update.sh --dry-run

# Upgrade to the latest stable release
sudo /opt/buzz/scripts/buzz-update.sh

# Upgrade to a specific tag
sudo /opt/buzz/scripts/buzz-update.sh v0.4.25
```

### What the timer looks like when healthy

```
NEXT                        LEFT    LAST                        PASSED  UNIT                       ACTIVATES
Sun 2026-08-09 09:00:00 UTC 2d 14h  -                           -       buzz-version-check.timer   buzz-version-check.service
```

### Notification format

When a new release is available the Lab receives (from @gc):

> Buzz v0.4.23 is available (running v0.4.22). Run buzz-update.sh to upgrade.

### Rollback behaviour

If the health check fails after an upgrade, `buzz-update.sh` copies
`/opt/buzz/target/release/buzz-relay.prev` back over the binary, git-checks-out
the previous tag (best-effort), and restarts services. If no backup binary exists
(first-ever build) a manual recovery command is printed instead.
