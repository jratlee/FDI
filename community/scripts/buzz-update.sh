#!/usr/bin/env bash
# /opt/buzz/scripts/buzz-update.sh
#
# Safe Buzz relay upgrade script.
#
# Usage:
#   sudo /opt/buzz/scripts/buzz-update.sh            # upgrade to latest stable tag
#   sudo /opt/buzz/scripts/buzz-update.sh v0.4.24    # upgrade to specific tag
#   sudo /opt/buzz/scripts/buzz-update.sh --dry-run  # print plan, build nothing
#
# What it does:
#   1. Fetches tags from GitHub
#   2. Determines target tag (arg or latest stable release via GitHub API)
#   3. Backs up the current binary
#   4. Checks out the target tag and builds buzz-relay
#   5. Rebuilds the web client with VITE_RELAY_URL
#   6. Restarts buzz-relay, buzz-operator, gc-agent, gc-service
#   7. Waits 10 s, then hits /api/health + NIP-11 endpoint
#   8. If either health check fails: restores the backup binary and restarts
#
# Rollback:
#   If the upgrade fails the health check, the previous binary is restored and
#   all services are restarted. The web client is NOT rolled back automatically
#   (Buzz web-only changes are typically safe; relay binary is the critical path).
#
set -euo pipefail

BUZZ_DIR=/opt/buzz
FDI_DIR=/opt/fdi-community
LAB_DOMAIN="${LAB_DOMAIN:-lab.falsedawn.industries}"
RELAY_DOMAIN="${RELAY_DOMAIN:-relay.falsedawn.industries}"
SERVICES="buzz-relay gc-agent gc-service"
# buzz-operator is optional — skip gracefully if not installed
OPTIONAL_SERVICES="buzz-operator"

BINARY="$BUZZ_DIR/target/release/buzz-relay"
BACKUP="$BUZZ_DIR/target/release/buzz-relay.prev"

DRY_RUN=false
TARGET_TAG=""

log()  { echo "[buzz-update] $*"; }
die()  { echo "[buzz-update] ERROR: $*" >&2; exit 1; }

# ── Parse arguments ──────────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    v*)        TARGET_TAG="$arg" ;;
    *)         die "Unknown argument: $arg. Usage: buzz-update.sh [vX.Y.Z] [--dry-run]" ;;
  esac
done

# ── Must run as root ─────────────────────────────────────────────────────
[ "$(id -u)" -eq 0 ] || die "This script must be run as root (sudo)."

# ── Fetch latest tag if not specified ────────────────────────────────────
log "fetching latest release info from GitHub"
LATEST_TAG="$(curl -sfL \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/block/buzz/releases/latest" \
  | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"
[ -n "$LATEST_TAG" ] || die "Could not fetch latest tag from GitHub. Check network access."

if [ -z "$TARGET_TAG" ]; then
  TARGET_TAG="$LATEST_TAG"
fi

# ── Read current tag ─────────────────────────────────────────────────────
cd "$BUZZ_DIR"
CURRENT_TAG="$(git describe --tags 2>/dev/null || echo "unknown")"

log "current tag : $CURRENT_TAG"
log "target tag  : $TARGET_TAG"
log "latest tag  : $LATEST_TAG"

if [ "$CURRENT_TAG" = "$TARGET_TAG" ]; then
  log "Already on $TARGET_TAG — nothing to do."
  exit 0
fi

# ── Dry-run: print plan and exit ─────────────────────────────────────────
if $DRY_RUN; then
  echo ""
  echo "=== Upgrade plan (dry-run — nothing will be built or restarted) ==="
  echo "  Repository : $BUZZ_DIR"
  echo "  Current    : $CURRENT_TAG"
  echo "  Target     : $TARGET_TAG"
  echo "  Steps:"
  echo "    1. git fetch --tags"
  echo "    2. git checkout $TARGET_TAG"
  echo "    3. cp $BINARY $BACKUP"
  echo "    4. cargo build --release -p buzz-relay"
  echo "    5. cd $BUZZ_DIR/web && pnpm install && VITE_RELAY_URL=wss://$LAB_DOMAIN pnpm build"
  echo "    6. systemctl restart $SERVICES ($OPTIONAL_SERVICES if active)"
  echo "    7. sleep 10"
  echo "    8. curl https://$RELAY_DOMAIN/health  (expect 200)"
  echo "    9. curl https://$RELAY_DOMAIN/        (expect NIP-11 JSON)"
  echo "   10. On failure: cp $BACKUP $BINARY && systemctl restart $SERVICES"
  echo "==================================================================="
  exit 0
fi

# ── Fetch tags and checkout ──────────────────────────────────────────────
log "fetching tags"
git fetch --tags

log "checking out $TARGET_TAG"
git checkout "$TARGET_TAG"

# ── Back up current binary ───────────────────────────────────────────────
if [ -f "$BINARY" ]; then
  log "backing up current binary -> $BACKUP"
  cp -f "$BINARY" "$BACKUP"
else
  log "no existing binary found, skipping backup"
fi

# ── Build relay ──────────────────────────────────────────────────────────
log "building buzz-relay (cargo build --release -p buzz-relay)"
source "$HOME/.cargo/env" 2>/dev/null || true
cargo build --release -p buzz-relay
echo "$TARGET_TAG" > "$BUZZ_DIR/.built-version"
log "relay build complete"

# ── Rebuild web client ───────────────────────────────────────────────────
log "rebuilding web client (VITE_RELAY_URL=wss://$LAB_DOMAIN)"
cd "$BUZZ_DIR/web"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
VITE_RELAY_URL="wss://$LAB_DOMAIN" pnpm build
log "web client build complete"

# ── Restart services ─────────────────────────────────────────────────────
log "restarting services: $SERVICES"
# shellcheck disable=SC2086
systemctl restart $SERVICES

for svc in $OPTIONAL_SERVICES; do
  if systemctl is-active --quiet "$svc" 2>/dev/null || systemctl is-enabled --quiet "$svc" 2>/dev/null; then
    log "restarting optional service: $svc"
    systemctl restart "$svc" || log "WARNING: could not restart $svc (skipping)"
  fi
done

# ── Health check ─────────────────────────────────────────────────────────
log "waiting 10 s for services to stabilise"
sleep 10

HEALTH_OK=true

# /api/health
HTTP_STATUS="$(curl -sfLo /dev/null -w "%{http_code}" "https://$RELAY_DOMAIN/api/health" 2>/dev/null || echo "000")"
if [ "$HTTP_STATUS" = "200" ]; then
  log "health check /api/health: OK (200)"
else
  log "ERROR: /api/health returned HTTP $HTTP_STATUS"
  HEALTH_OK=false
fi

# NIP-11: relay info document (Accept: application/nostr+json)
NIP11_STATUS="$(curl -sfLo /dev/null -w "%{http_code}" \
  -H "Accept: application/nostr+json" \
  "https://$RELAY_DOMAIN/" 2>/dev/null || echo "000")"
if [ "$NIP11_STATUS" = "200" ]; then
  log "health check NIP-11: OK (200)"
else
  log "ERROR: NIP-11 endpoint returned HTTP $NIP11_STATUS"
  HEALTH_OK=false
fi

# ── Rollback on failure ───────────────────────────────────────────────────
if ! $HEALTH_OK; then
  if [ -f "$BACKUP" ]; then
    log "ROLLBACK: restoring previous binary from $BACKUP"
    cp -f "$BACKUP" "$BINARY"
    # Return to previous tag in git (best-effort; binary is what matters)
    git checkout "$CURRENT_TAG" 2>/dev/null || log "WARNING: could not git checkout $CURRENT_TAG; binary restored"
    log "restarting services after rollback"
    # shellcheck disable=SC2086
    systemctl restart $SERVICES
    sleep 5
    log "rollback complete — relay running previous binary ($CURRENT_TAG)"
  else
    log "ROLLBACK: no backup binary found — services may be in a failed state."
    log "  Manual recovery: cd $BUZZ_DIR && git checkout $CURRENT_TAG && cargo build --release -p buzz-relay && systemctl restart $SERVICES"
  fi
  die "Upgrade to $TARGET_TAG failed health check. Rolled back to $CURRENT_TAG."
fi

# ── Record the new version ────────────────────────────────────────────────
log "upgrade to $TARGET_TAG complete."
log "  Run: journalctl -fu buzz-relay   to confirm relay is healthy."
