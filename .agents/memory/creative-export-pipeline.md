---
name: Exporting mockup-sandbox HTML creatives to image files
description: How to render the FDI ad/channel HTML creatives to exact-dimension PNGs headlessly on Replit's Nix env.
---

# Exporting HTML creatives to PNG (headless)

The ad/channel creatives live as responsive HTML (100vw/100vh, vmin/vw/vh
sizing) in `artifacts/mockup-sandbox/public/{ads,channel}/`. To produce flat
image files at exact platform dimensions:

- **Use the Nix `chromium` system package, NOT Playwright's bundled chromium.**
  Playwright's download fails with `libnspr4.so: cannot open shared object file`.
  Install via `installSystemDependencies(["chromium"])`; the binary lands at
  `/nix/store/<hash>-chromium-*/bin/chromium` (resolve with `which chromium` —
  the hash/version changes on reinstall, so don't hardcode it long-term).
  Drive it with `puppeteer-core` (`executablePath` = that binary), launch args
  `--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage --disable-gpu`.

- **Load via the local vite URL, NOT `file://`.** The HTML references assets with
  absolute paths (`/__mockup/fonts/*.woff2`, `/__mockup/images/*.png`) served by
  the mockup-sandbox vite dev server. Locally that is `http://localhost:23636/__mockup/...`
  (vite `strictPort`, port from `PORT` env). `file://` breaks the absolute paths.

- **Exact dimensions:** set `page.setViewport({width,height,deviceScaleFactor:1})`
  and `screenshot({clip:{x:0,y:0,width,height}})`. deviceScaleFactor:2 doubles the
  output pixels (good for crispness, but then files are NOT the named size and
  raster heroes upscale) — keep 1 when the deliverable must be exact platform px.
  Wait for `document.fonts.ready` before shooting so self-hosted fonts apply.

- **Run synchronously in ONE bash call.** Background processes (`nohup ... &`) get
  killed when the bash tool call returns, so they never finish. ~28 shots fit
  under ~100s if you reuse a single `page`, use `waitUntil:'load'` (not
  `networkidle0`), and a ~150ms settle delay. Wrap in `timeout 115` and write
  stdout to a log file (piping to `tail` buffers and loses output on kill).

- `zip` is not installed; build archives with Python's `zipfile` module.

- **Canonical deliverable folder is `exports/false-dawn-campaign/`** (28 PNGs in
  angle/channel subdirs, filenames encode exact dims, plus `.zip` + `.tar.gz`).
  An older `exports/ads/` + `exports/channel/` set (+ `fdi-creative-assets.zip`)
  was a superseded earlier naming and has been deleted — `false-dawn-campaign`
  is the only export set; re-export and refresh archives only for it.

- React brand boards preview at `/__mockup/preview/<subdir>/<Component>` (e.g.
  `/__mockup/preview/brand-kit/LogoConcepts`) — the subdir under
  `src/components/mockups/` is required, not just the component name.
