# Performance Thinking 02: The Forward-Deployed Communicator (FDCP)

The complete launch bundle for the False Dawn Industries Performance Thinking
report on the Forward-Deployed Communications Professional (FDCP): the operator
role for agent-mediated markets. The live article is published at
https://falsedawn.industries/fdcp

## Contents

- `fdcp-report.md` - the full report (about 3,000 words). Source of truth for
  the live `/fdcp` page; the site build parses this file directly.
- `linkedin-newsletter.md` - the LinkedIn newsletter edition of the report,
  with hook, single CTA to falsedawn.industries/fdcp, and hashtags.
- `promo-posts.md` - four standalone LinkedIn promo posts for the launch week.
- `images/` - all rendered visuals:
  - `fdcp-cover-1280x720.png` - newsletter / article cover.
  - `viz-fdcp-pod-1200x1500.png` - the FDCP pod (operator, fleet, platform).
  - `viz-four-dimensions-1200x1500.png` - the four dimensions of influence.
  - `viz-proof-stack-order-1200x1500.png` - receipts first, vision last.
  - `viz-m2m-agentcards-1200x1500.png` - machine-to-machine buying flow.
- `deck-slides/` - the 12-slide deck as 1920x1080 PNGs.
- `fdi-fdcp-deck.pdf` - the same deck as a single PDF.

## Usage notes

- Copy rules: no em-dashes, no former-client names, sources credited by name
  with links, MCP described as an open standard with no Anthropic affiliation
  claimed, and nothing framed as legal or financial advice.
- Brand: FDI two-tone warm system. Signal Orange is the logo mark only; amber
  ramp for accents; Space Grotesk / Inter / JetBrains Mono.
- Editing the report: change `fdcp-report.md`, then rebuild the site
  (`node site/build.mjs`). Visual sources live in
  `artifacts/mockup-sandbox/public/pt02/` and the deck in
  `artifacts/mockup-sandbox/public/deck/fdcp-deck.html`; re-export with
  `node artifacts/mockup-sandbox/export-pt02.mjs` and
  `node artifacts/mockup-sandbox/export-pt02-deck.mjs`.
