---
name: Canvas asset verification (mockup-sandbox HTML creatives)
description: How to verify static HTML ad/channel creatives at true target aspect ratios when headless browsers are unavailable.
---

# Verifying fixed-ratio HTML creatives in the mockup-sandbox

When building static HTML/CSS creatives (ads, channel banners) served from
`artifacts/mockup-sandbox/public/**` and embedded as canvas iframes:

- **The `external_url` screenshot tool always renders at a wide (~1920×1080) viewport.**
  Screenshotting a single creative HTML directly therefore shows it at the WRONG
  aspect ratio, and any `vh`/`vw`-based sizing will look enormous/broken. This is a
  false alarm, not a real bug.
  **How to apply:** To verify true target ratios, build a temporary "contact sheet"
  HTML that embeds each creative inside an `<iframe width=... height=...>` set to the
  exact export dimensions (e.g. 1128×191), then screenshot the contact sheet. The
  iframe constrains `vh`/`vw` to the real size.

- **firecrawl/external_url has a capture-time limit.** On a contact sheet with many
  heavy iframes (large PNG heroes), the last/heaviest iframes can show up pure BLACK
  because they hadn't painted yet — again not a real bug. Confirm by re-screenshotting
  a lightweight page with just that one asset.

- **Playwright is environment-blocked here:** the bundled chromium at
  `.cache/ms-playwright/chromium-1228/chrome-linux64/chrome` fails with
  `libnspr4.so: cannot open shared object file` (missing system libs), and the CLI
  defaults to a missing `chrome-headless-shell`. Don't sink time into Playwright for
  screenshots; use the iframe-contact-sheet + external_url approach instead.

- **Canvas iframes have NO capture timeout** — they load fully for the user even when
  the verification screenshot showed black. Trust a clean single-asset render.
