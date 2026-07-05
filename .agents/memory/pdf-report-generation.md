---
name: PDF report generation in this repo
description: How to generate branded multi-page PDF reports when the npm firewall blocks PDF libs
---

# Generating PDF reports in this repo

**Constraint:** the npm package firewall blocks `jspdf` (403 "Blocked by Security
Policy"), and likely other PDF libraries. Do not spend time trying to `npm install`
a PDF lib.

**Working approach:** render an HTML report and print it to PDF with headless
chromium. Everything needed is already vendored:
- `puppeteer-core` lives in the repo-root `node_modules` (run build scripts from
  the repo root so the import resolves).
- The chromium binary is on PATH via Nix; get it with
  `execSync("which chromium")`.
- Print with `page.pdf({ width: "816px", height: "1056px", printBackground: true })`
  for US-Letter pages at 96dpi. Await `document.fonts.ready` before printing.

**Fonts:** the brand woff2 files live in
`artifacts/mockup-sandbox/public/fonts/`. For print, base64-embed them as
`@font-face` data URIs (chromium file:// won't reliably pick up external paths).
The mockup-sandbox web preview loads the same families from Google Fonts, so a
shared stylesheet renders identically in both.

**Page parity (PDF + React preview):** put the markup builder and CSS in a plain
ESM `.js` template (`renderReportHTML(data)` + `REPORT_CSS`) and import it from
BOTH the Node build script and the React mockup component (via
`dangerouslySetInnerHTML`). One source of truth = the web preview mirrors the PDF
page-for-page. The artifact needs its own copy of the shared `.js` + data `.json`
inside its vite root; re-copy them after edits.

**Fixed-height pages clip overflow.** Pages are `height:1056px; overflow:hidden`,
so any section that overflows is silently clipped (looks like missing content, not
a blank page). Always render every page to PNG (`pdftoppm`) and eyeball them.
Long lists (e.g. a 20+ item sources list) must be tightened or set to
`columns:2` to fit one page.

**Gotcha:** text passed through an HTML-escaping helper must not contain HTML
entities like `&middot;` — they render literally. Use the actual unicode char.
