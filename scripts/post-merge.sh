#!/bin/bash
set -e

# Post-merge reconciliation for False Dawn Industries (FDI).
# Python deps are provided by Replit's Nix environment (requirements.txt /
# modules) and cannot be pip-installed into the immutable /nix/store, so they
# are intentionally not handled here. The mutable dependency surfaces are the
# canvas mockup-sandbox and the public marketing site's node_modules.

if [ -f artifacts/mockup-sandbox/package.json ]; then
  echo "[post-merge] installing mockup-sandbox node deps"
  npm install --prefix artifacts/mockup-sandbox --no-audit --no-fund
fi

if [ -f site/package.json ]; then
  echo "[post-merge] installing FDI site node deps"
  npm install --prefix site --no-audit --no-fund
  echo "[post-merge] building FDI site"
  node site/build.mjs
fi

echo "[post-merge] done"
