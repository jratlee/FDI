---
name: Canvas asset verification & export (mockup-sandbox HTML creatives)
description: How to verify and export static HTML ad/channel creatives at true target pixel dimensions.
---

# Verifying & exporting fixed-ratio HTML creatives in the mockup-sandbox

These creatives (ads, channel banners) live in `artifacts/mockup-sandbox/public/**`,
use `100vw/100vh` (and `vmin`) sizing, and are served by the Component Preview Server
workflow at `http://localhost:23636/__mockup/...` (port + `/__mockup/` base come from the
vite config's `PORT`/`BASE_PATH`). Render against that live URL, not `file://` — the CSS
uses absolute `/__mockup/...` paths for fonts and hero images.

## Exporting to flat PNGs (the reliable path)
- **Install `chromium` via Nix system deps** (`installSystemDependencies(["chromium"])`).
  The bundled Playwright chromium is still libnspr4-blocked, but the Nix chromium works.
- Render with headless screenshot at the EXACT target viewport:
  `chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars
   --force-device-scale-factor=1 --virtual-time-budget=6000
   --window-size=W,H --screenshot=out.png URL`
  Output is a PNG of exactly W×H. `--virtual-time-budget` lets fonts/large PNG heroes paint.
  The `CreatePlatformSocket() ... Address family not supported` stderr lines are harmless IPv6 noise.
- **Chromium enforces a MINIMUM window width (~500px).** Requesting `--window-size=320,320`
  or `400,400` renders the layout at the min width and crops to 320/400 → content ends up
  off-center. **Fix:** render small assets (avatars) at a large square (e.g. 1080×1080),
  then downscale with `magick master.png -filter Lanczos -resize 320x320 out.png`
  (imagemagick `magick`/`convert` is on the replit-runtime-path). Large-width assets
  (1128×191, 1280×320) are fine rendered directly.
- `zip` is NOT preinstalled; install via Nix system deps if a .zip deliverable is wanted
  (`tar -czf` always works).

## Screenshot-tool verification caveats (when no browser export)
- **The `external_url` screenshot tool always renders at a wide (~1920×1080) viewport**, so
  shooting a single creative HTML directly shows the WRONG aspect ratio (vh/vw look huge).
  Build a temporary contact-sheet HTML embedding each creative in an `<iframe width=.. height=..>`
  at exact export dims, then screenshot the sheet. The iframe constrains vh/vw to the real size.
- firecrawl/external_url has a capture-time limit: heavy iframes (large PNG heroes) may show
  pure BLACK because they hadn't painted — re-shoot a lightweight single-asset page to confirm.
- Now that Nix chromium works, prefer real headless screenshots over the iframe-contact-sheet trick.
