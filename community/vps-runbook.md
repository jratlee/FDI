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

- Relay updates: `cd /opt/buzz && git pull && cargo build --release -p buzz-relay && systemctl restart buzz-relay`
- Web client updates: `cd /opt/buzz/web && git pull && pnpm install && VITE_RELAY_URL=wss://relay.falsedawn.industries pnpm build && systemctl reload nginx`
- Agent updates: pull the FDI repo, `systemctl restart gc-agent`
- Certs: certbot auto-renews via the cron job it installs.
