#!/usr/bin/env bash
# /opt/buzz/scripts/buzz-version-check.sh
#
# Weekly Buzz relay version check.
#
# Compares the running version (git describe --tags in /opt/buzz) against the
# latest stable release on GitHub. If behind, posts a kind-9 Nostr message to
# wss://lab.falsedawn.industries so the operator sees it in the Lab without
# needing email or an external webhook.
#
# Environment (loaded from /opt/fdi-community/.env.agent by the systemd unit,
# or exported before running manually):
#   BUZZ_AGENT_PRIVATE_KEY  64-char hex Nostr private key (required)
#   BUZZ_RELAY_URL          WebSocket URL, defaults to wss://lab.falsedawn.industries
#
# Runs silently when already on the latest version.
#
set -euo pipefail

BUZZ_DIR=/opt/buzz
FDI_DIR=/opt/fdi-community
LAB_CHANNEL_ID="f5156ed0-59f8-4ec3-b133-b2a1d66495bc"
GITHUB_API="https://api.github.com/repos/block/buzz/releases/latest"

log() { echo "[buzz-version-check] $*"; }
die() { echo "[buzz-version-check] ERROR: $*" >&2; exit 1; }

# ── Validate environment ──────────────────────────────────────────────────
[ -d "$BUZZ_DIR/.git" ] || die "$BUZZ_DIR is not a git repository."
[ -n "${BUZZ_AGENT_PRIVATE_KEY:-}" ] || die "BUZZ_AGENT_PRIVATE_KEY is not set."
[ "${#BUZZ_AGENT_PRIVATE_KEY}" -eq 64 ] || die "BUZZ_AGENT_PRIVATE_KEY must be 64 hex chars."

# ── Read current tag ──────────────────────────────────────────────────────
cd "$BUZZ_DIR"
CURRENT_TAG="$(git describe --tags 2>/dev/null || echo "")"
if [ -z "$CURRENT_TAG" ]; then
  log "WARNING: git describe returned nothing. Falling back to .built-version."
  CURRENT_TAG="$(cat "$BUZZ_DIR/.built-version" 2>/dev/null || echo "unknown")"
fi

# ── Fetch latest stable release from GitHub ───────────────────────────────
log "checking GitHub for latest release"
LATEST_TAG="$(curl -sfL \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "$GITHUB_API" \
  | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"

if [ -z "$LATEST_TAG" ]; then
  log "WARNING: could not fetch latest tag from GitHub. Skipping (will retry next week)."
  exit 0
fi

log "current: $CURRENT_TAG  |  latest: $LATEST_TAG"

# ── Already current — exit silently ──────────────────────────────────────
if [ "$CURRENT_TAG" = "$LATEST_TAG" ]; then
  log "Already on latest ($CURRENT_TAG). Nothing to report."
  exit 0
fi

# ── Post Nostr kind-9 notification to the Lab ─────────────────────────────
#
# Signing Nostr events requires secp256k1 which isn't available in bash.
# Delegate to Node.js using nostr-tools already installed in $FDI_DIR.
# Message and relay config are passed via env vars to avoid quoting issues.
#
NOTIFICATION="Buzz $LATEST_TAG is available (running $CURRENT_TAG). Run buzz-update.sh to upgrade."
log "posting Lab notification: $NOTIFICATION"

export BUZZ_NOTIFY_MESSAGE="$NOTIFICATION"
export BUZZ_NOTIFY_RELAY="${BUZZ_RELAY_URL:-wss://lab.falsedawn.industries}"
export BUZZ_NOTIFY_CHANNEL="$LAB_CHANNEL_ID"
# BUZZ_AGENT_PRIVATE_KEY is already in the environment.

node --input-type=module <<'NOSTR_SCRIPT'
import { WebSocket } from "ws";
import { getPublicKey, finalizeEvent } from "nostr-tools/pure";

const PRIVATE_KEY_HEX = process.env.BUZZ_AGENT_PRIVATE_KEY;
const RELAY_URL       = process.env.BUZZ_NOTIFY_RELAY;
const CHANNEL_ID      = process.env.BUZZ_NOTIFY_CHANNEL;
const MESSAGE         = process.env.BUZZ_NOTIFY_MESSAGE;

if (!PRIVATE_KEY_HEX || PRIVATE_KEY_HEX.length !== 64) {
  process.stderr.write("[nostr] BUZZ_AGENT_PRIVATE_KEY missing or invalid\n");
  process.exit(1);
}

function hexToBytes(hex) {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) b[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return b;
}

const privBytes = hexToBytes(PRIVATE_KEY_HEX);

const event = finalizeEvent(
  {
    kind: 9,
    content: MESSAGE,
    tags: [["h", CHANNEL_ID]],
    created_at: Math.floor(Date.now() / 1000),
  },
  privBytes
);

const ws = new WebSocket(RELAY_URL);
let eventSent = false;
let settled   = false;

function sendEvent() {
  if (!eventSent) {
    eventSent = true;
    ws.send(JSON.stringify(["EVENT", event]));
  }
}

ws.on("open", () => {
  // Give the relay up to 1 s to issue an AUTH challenge; otherwise send directly.
  setTimeout(sendEvent, 1000);
});

ws.on("message", (rawData) => {
  let msg;
  try { msg = JSON.parse(rawData.toString()); } catch { return; }
  if (!Array.isArray(msg)) return;

  if (msg[0] === "AUTH") {
    // NIP-42: respond to challenge then (re-)send the event.
    const authEvent = finalizeEvent(
      {
        kind: 22242,
        content: "",
        tags: [["relay", RELAY_URL], ["challenge", msg[1]]],
        created_at: Math.floor(Date.now() / 1000),
      },
      privBytes
    );
    ws.send(JSON.stringify(["AUTH", authEvent]));
    setTimeout(sendEvent, 400);
    return;
  }

  if (msg[0] === "OK") {
    settled = true;
    if (msg[2] === true) {
      process.stdout.write("[nostr] notification posted (id=" + event.id.slice(0, 12) + "...)\n");
    } else {
      process.stderr.write("[nostr] relay rejected event: " + (msg[3] ?? "(no reason)") + "\n");
      process.exitCode = 1;
    }
    ws.close();
  }
});

ws.on("error", (err) => {
  process.stderr.write("[nostr] ws error: " + err.message + "\n");
  process.exitCode = 1;
  settled = true;
  ws.close();
});

ws.on("close", () => {
  if (!settled) {
    process.stderr.write("[nostr] connection closed before OK received\n");
    process.exitCode = 1;
  }
});

// Timeout after 20 s.
setTimeout(() => {
  if (!settled) {
    process.stderr.write("[nostr] timed out waiting for relay OK\n");
    process.exitCode = 1;
    ws.close();
  }
}, 20000);
NOSTR_SCRIPT
