# Performance Thinking 01 · The Hourglass Bet

The complete launch bundle for the next edition of the "Performance Thinking"
LinkedIn newsletter, built from the MarCom organizational-design research
report. Everything here is paste-ready; nothing publishes automatically.

## What's inside

| File | Role | Dimensions |
|---|---|---|
| `performance-thinking-org-design.md` | The newsletter edition (paste into the LinkedIn article editor) | - |
| `images/pt-cover-1280x720.png` | Edition cover image | 1280 x 720 |
| `images/viz-org-shapes-1200x1500.png` | Figure 1: the four org shapes | 1200 x 1500 |
| `images/viz-loop-ladder-1200x1500.png` | Figure 2: the four loop levels | 1200 x 1500 |
| `images/viz-proof-stack-1200x1500.png` | Figure 3: the Proof Stack | 1200 x 1500 |
| `images/viz-seo-geo-1200x1500.png` | Figure 4: SEO to GEO / LEO | 1200 x 1500 |
| `fdi-performance-thinking-01-deck.pdf` | 12-slide deck (attach as a LinkedIn document post, or present) | 1920 x 1080 per page |
| `deck-slides/` | The same 12 slides as individual PNGs | 1920 x 1080 |

## Image placement

LinkedIn's article editor does not read Markdown, so insert images manually:

1. **`pt-cover-1280x720.png`** - set as the edition's cover image.
2. **`viz-org-shapes-1200x1500.png`** - after the "four shapes" bullet list,
   before "The reason the Hourglass wins is boring and human".
3. **`viz-loop-ladder-1200x1500.png`** - after the four numbered loop levels,
   before "In MarCom terms".
4. **`viz-proof-stack-1200x1500.png`** - in the "Proof beats promise" section,
   after the sentence ending "validation you didn't pay for."
5. **`viz-seo-geo-1200x1500.png`** - after the paragraph about LLMs citing
   2 to 7 domains per query.

The deck PDF works standalone as a separate LinkedIn document post to promote
the edition (same pattern as the Field Guide launch).

## Source HTML and export scripts (for future edits)

- Visuals: `artifacts/mockup-sandbox/public/pt01/*.html`, rendered by
  `artifacts/mockup-sandbox/export-pt01.mjs`
- Deck: `artifacts/mockup-sandbox/public/deck/performance-thinking-01-deck.html`,
  exported by `artifacts/mockup-sandbox/export-pt01-deck.mjs`
- Both scripts require the mockup sandbox dev server running on port 23636.

## Which assets should also land on the public site?

Recommendation: none of these files need new site pages. The site-facing work
from the same research report is already scoped in its own tasks:

- **Task #144** - MarCom OS playbook report upgrades (Hourglass, loops,
  riverbank material lands inside the kit's playbook, where buyers see it).
- **Task #145** - Top Call LEO and M2M positioning (the SEO to GEO and
  agent-visibility material strengthens the `/topcall` page).
- **Task #146** - Site Proof Stack narrative pass (receipts-before-vision
  sequencing across the public pages).

If the user later wants this edition republished as a site article (a
`/field-guide`-style page), that is a small follow-up task: the markdown and
images here are already in site-ready form. The deck PDF could also join the
`/marcom-kit` page as a teaser asset once Task #144 ships, but it should not
jump the queue ahead of that task.

## Copy rules honored

No em-dashes. Sources named without affiliation claims (MCP is described as
an open standard). Softened risk claims. No former-client names. Brand system
per `DESIGN.md`: near-black base, cream text, amber accents, Signal Orange
reserved for the logo mark.
