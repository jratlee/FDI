#!/usr/bin/env bash
#
# Open Cartography Lab — idempotent VPS setup script.
#
# Consolidates community/vps-runbook.md into a single re-runnable script.
# Target: Ubuntu 24.04 LTS (Hetzner CX32 or equivalent), run as root.
#
# Installs and configures:
#   - System packages, nginx, certbot
#   - PostgreSQL 17, Redis 7
#   - Rust toolchain (1.88) and the Buzz relay (built from source, v0.4.22)
#   - Node.js 22 + pnpm, Buzz web client static build
#   - systemd units: buzz-relay, gc-service, gc-agent
#
# Required environment (export before running, or place in /root/.lab-setup.env):
#   BUZZ_DB_PASSWORD         password for the buzz PostgreSQL role
#   BUZZ_AGENT_PRIVATE_KEY   64-char hex Nostr private key (from community/keygen.mjs)
#   OPENAI_API_KEY           OpenAI API key for the scenario parser
#   RELAY_DOMAIN             default: relay.falsedawn.industries
#   LAB_DOMAIN               default: lab.falsedawn.industries
#   CERTBOT_EMAIL            email for Let's Encrypt registration
#   BUZZ_CHANNEL_ID          optional; set after the Lab channel is created
#
# The FDI community/ directory must be copied to /opt/fdi-community/community
# before running (the deploy step does this over scp).
#
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────
[ -f /root/.lab-setup.env ] && . /root/.lab-setup.env

RELAY_DOMAIN="${RELAY_DOMAIN:-relay.falsedawn.industries}"
LAB_DOMAIN="${LAB_DOMAIN:-lab.falsedawn.industries}"
BUZZ_DIR=/opt/buzz
FDI_DIR=/opt/fdi-community
BUZZ_VERSION=v0.4.22
RUST_VERSION=1.88

: "${BUZZ_DB_PASSWORD:?BUZZ_DB_PASSWORD must be set}"
: "${BUZZ_AGENT_PRIVATE_KEY:?BUZZ_AGENT_PRIVATE_KEY must be set}"
: "${OPENAI_API_KEY:?OPENAI_API_KEY must be set}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL must be set}"

log() { echo "[setup] $*"; }

# ── 1. System packages ─────────────────────────────────────────────────
log "system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y build-essential pkg-config libssl-dev git curl \
  nginx certbot python3-certbot-nginx

# ── 2. PostgreSQL 17 ────────────────────────────────────────────────────
log "postgresql 17"
if ! command -v psql >/dev/null || ! psql --version | grep -q " 17"; then
  # Ubuntu 24.04 ships PG16; use PGDG for 17.
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y postgresql-17
fi
systemctl enable --now postgresql

sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='buzz'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER buzz WITH PASSWORD '${BUZZ_DB_PASSWORD}';"
sudo -u postgres psql -c "ALTER USER buzz WITH PASSWORD '${BUZZ_DB_PASSWORD}';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='buzz'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE buzz OWNER buzz;"

# ── 3. Redis 7 ──────────────────────────────────────────────────────────
log "redis"
apt-get install -y redis-server
systemctl enable --now redis-server

# ── 4. Rust toolchain ───────────────────────────────────────────────────
log "rust toolchain"
if ! command -v "$HOME/.cargo/bin/rustup" >/dev/null 2>&1 && ! command -v rustup >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
fi
# shellcheck disable=SC1091
source "$HOME/.cargo/env"
rustup toolchain install "$RUST_VERSION" --profile minimal
rustup default "$RUST_VERSION"

# ── 5. Build the Buzz relay ─────────────────────────────────────────────
log "buzz relay build (${BUZZ_VERSION})"
if [ ! -d "$BUZZ_DIR/.git" ]; then
  git clone https://github.com/block/buzz.git "$BUZZ_DIR"
fi
cd "$BUZZ_DIR"
git fetch --tags
git checkout "$BUZZ_VERSION"
if [ ! -x "$BUZZ_DIR/target/release/buzz-relay" ] \
   || [ "$(cat "$BUZZ_DIR/.built-version" 2>/dev/null)" != "$BUZZ_VERSION" ]; then
  cargo build --release -p buzz-relay
  echo "$BUZZ_VERSION" > "$BUZZ_DIR/.built-version"
fi

# ── 6. Relay env + migrations ───────────────────────────────────────────
log "relay migrations"
DATABASE_URL="postgres://buzz:${BUZZ_DB_PASSWORD}@localhost:5432/buzz"
cat > "$BUZZ_DIR/.env.production" <<EOF
DATABASE_URL=${DATABASE_URL}
REDIS_URL=redis://localhost:6379
HOST=0.0.0.0
PORT=3000
RELAY_URL=wss://${RELAY_DOMAIN}
EOF
chown www-data:www-data "$BUZZ_DIR/.env.production"
chmod 600 "$BUZZ_DIR/.env.production"

DATABASE_URL="$DATABASE_URL" "$BUZZ_DIR/target/release/buzz-relay" migrate

# ── 7. Relay systemd unit ───────────────────────────────────────────────
log "buzz-relay.service"
cat > /etc/systemd/system/buzz-relay.service <<EOF
[Unit]
Description=Buzz Relay
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${BUZZ_DIR}
EnvironmentFile=${BUZZ_DIR}/.env.production
ExecStart=${BUZZ_DIR}/target/release/buzz-relay serve
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# ── 8. Node.js 22 + web client build ────────────────────────────────────
log "node.js + web client"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v22" ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pnpm >/dev/null || npm install -g pnpm

cd "$BUZZ_DIR/web"
pnpm install --frozen-lockfile || pnpm install
VITE_RELAY_URL="wss://${RELAY_DOMAIN}" pnpm build

# ── 9. nginx + TLS ──────────────────────────────────────────────────────
log "nginx + certbot"
cat > /etc/nginx/sites-available/buzz <<EOF
server {
    listen 80;
    server_name ${RELAY_DOMAIN} ${LAB_DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}
EOF
ln -sf /etc/nginx/sites-available/buzz /etc/nginx/sites-enabled/buzz
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Obtain certs (idempotent: certbot skips if cert exists and is valid)
certbot certonly --nginx --non-interactive --agree-tos -m "$CERTBOT_EMAIL" \
  -d "$RELAY_DOMAIN" -d "$LAB_DOMAIN" --keep-until-expiring

cat > /etc/nginx/sites-available/buzz <<EOF
server {
    listen 80;
    server_name ${RELAY_DOMAIN} ${LAB_DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl;
    server_name ${RELAY_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${RELAY_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${RELAY_DOMAIN}/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }
}

server {
    listen 443 ssl;
    server_name ${LAB_DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${RELAY_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${RELAY_DOMAIN}/privkey.pem;

    root ${BUZZ_DIR}/web/dist;
    index index.html;

    # Landing page — served from its own directory, not from the Buzz SPA root.
    location = / {
        root ${BUZZ_DIR}/lab-landing;
        try_files /index.html =404;
    }

    # Invite API — proxied to gc-service.
    # proxy_set_header X-Real-IP writes nginx's downstream peer address so
    # gc-service can rate-limit by real client IP without trusting the
    # client-controlled X-Forwarded-For header.
    location = /api/gc-invite {
        proxy_pass http://localhost:4242/invite;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$remote_addr;
    }

    location /charts/ {
        proxy_pass http://localhost:4242/chart/;
        proxy_set_header Host \$host;
    }

    # /app and SPA assets
    location /app {
        root ${BUZZ_DIR}/web/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    location /assets/ {
        root ${BUZZ_DIR}/web/dist;
    }

    # Relay API and WebSocket — everything else proxied to Buzz relay port 3000
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }
}
EOF
nginx -t && systemctl reload nginx

# ── 10. FDI agent + service env and units ───────────────────────────────
log "gc-agent / gc-service"
if [ ! -d "$FDI_DIR/community" ]; then
  echo "[setup] ERROR: ${FDI_DIR}/community not found. Copy the community/ directory first." >&2
  exit 1
fi
cd "$FDI_DIR"
[ -f package.json ] || npm init -y >/dev/null
npm install ws openai nostr-tools

cat > "$FDI_DIR/.env.agent" <<EOF
BUZZ_RELAY_URL=wss://${RELAY_DOMAIN}
BUZZ_AGENT_PRIVATE_KEY=${BUZZ_AGENT_PRIVATE_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}
GC_SERVICE_URL=http://localhost:4242
${BUZZ_CHANNEL_ID:+BUZZ_CHANNEL_ID=${BUZZ_CHANNEL_ID}}
EOF
cat > "$FDI_DIR/.env.service" <<EOF
GC_SERVICE_PORT=4242
GC_CHART_BASE_URL=https://${LAB_DOMAIN}/charts
OPENAI_API_KEY=${OPENAI_API_KEY}
# Keys and relay config required by gc-service for invite minting
BUZZ_AGENT_PRIVATE_KEY=${BUZZ_AGENT_PRIVATE_KEY}
BUZZ_RELAY_INTERNAL_URL=http://127.0.0.1:3000
BUZZ_RELAY_HOST=${LAB_DOMAIN}
EOF
chown www-data:www-data "$FDI_DIR/.env.agent" "$FDI_DIR/.env.service"
chmod 600 "$FDI_DIR/.env.agent" "$FDI_DIR/.env.service"
chown -R www-data:www-data "$FDI_DIR"

cat > /etc/systemd/system/gc-service.service <<EOF
[Unit]
Description=FDI Growth Cartography HTTP Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${FDI_DIR}
EnvironmentFile=${FDI_DIR}/.env.service
ExecStart=/usr/bin/node community/gc-service.mjs
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/gc-agent.service <<EOF
[Unit]
Description=FDI Growth Cartography Agent
After=network.target buzz-relay.service gc-service.service

[Service]
Type=simple
User=www-data
WorkingDirectory=${FDI_DIR}
EnvironmentFile=${FDI_DIR}/.env.agent
ExecStart=/usr/bin/node community/gc-agent.mjs
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# ── 11. Enable and start everything ─────────────────────────────────────
log "starting services"
systemctl daemon-reload
systemctl enable --now buzz-relay
systemctl restart buzz-relay
systemctl enable --now gc-service
systemctl restart gc-service
systemctl enable --now gc-agent
systemctl restart gc-agent

sleep 3
systemctl is-active buzz-relay gc-service gc-agent || true

# ── 12. Version check + upgrade scripts ──────────────────────────────────
log "installing buzz-update.sh and buzz-version-check.sh"
SCRIPTS_SRC="$FDI_DIR/community/scripts"
SCRIPTS_DST="$BUZZ_DIR/scripts"
mkdir -p "$SCRIPTS_DST"
cp "$SCRIPTS_SRC/buzz-update.sh"        "$SCRIPTS_DST/buzz-update.sh"
cp "$SCRIPTS_SRC/buzz-version-check.sh" "$SCRIPTS_DST/buzz-version-check.sh"
chmod +x "$SCRIPTS_DST/buzz-update.sh" "$SCRIPTS_DST/buzz-version-check.sh"

# Install systemd units for the weekly version check
cp "$SCRIPTS_SRC/buzz-version-check.service" /etc/systemd/system/buzz-version-check.service
cp "$SCRIPTS_SRC/buzz-version-check.timer"   /etc/systemd/system/buzz-version-check.timer

systemctl daemon-reload
systemctl enable --now buzz-version-check.timer

log "version check timer enabled (weekly, Sunday 09:00 UTC)"
log "verify: systemctl list-timers buzz-version-check.timer"

# ── Done ──────────────────────────────────────────────────────────────────
log "done. verify:"
log "  curl -s https://${RELAY_DOMAIN}/health"
log "  open https://${LAB_DOMAIN} in a browser"
