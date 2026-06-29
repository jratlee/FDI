#!/bin/bash
set -e

# Post-merge reconciliation for "System Dynamics Engine" (FDI).
# Python deps are provided by Replit's Nix environment (requirements.txt /
# modules) and cannot be pip-installed into the immutable /nix/store, so they
# are intentionally not handled here. The only mutable dependency surface is the
# canvas mockup-sandbox's node_modules.

if [ -f artifacts/mockup-sandbox/package.json ]; then
  echo "[post-merge] installing mockup-sandbox node deps"
  npm install --prefix artifacts/mockup-sandbox --no-audit --no-fund
fi

echo "[post-merge] done"
