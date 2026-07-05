# SkillFoundry Competitor Monitoring

A lightweight, repeatable cadence for keeping the SkillFoundry competitive
analysis current. The full report lives in
`exports/skillfoundry-competitive-analysis/` (PDF + canonical `report-data.json`)
with a matching web preview in the mockup sandbox
(`/preview/competitive-analysis/SkillfoundryReport`).

_Last full review: July 2026._

## What to watch and why

SkillFoundry competes across four arenas that map to its three gates plus its
delivery model. Watch the leader in each, plus the delivery-model threat.

| Priority | Who | Arena | Why it matters to SkillFoundry |
| --- | --- | --- | --- |
| P0 | **Profound** | GEO/AEO visibility (Gate 3) | Best-funded category leader ($96M Series C, ~$1B val). Sets the AEO benchmark; watch for a move into pre-publish gating or in-workflow/MCP delivery, which would attack SkillFoundry's wedge directly. |
| P0 | **MCP ecosystem** | Delivery model | SkillFoundry's core differentiator is running in-workflow via MCP. If the incumbents ship MCP servers, the "runs in your stack" delighter becomes a basic. Track MCP adoption + competitor MCP launches. |
| P1 | **Surfer SEO** | Content optimization (Gate 1) | 150k+ users; the default content-scoring habit. Watch for a credible AEO/GEO pivot beyond keyword-density SEO. |
| P1 | **Muck Rack** | PR-to-C-suite reporting (Gate 2) | Owns the executive reporting relationship SkillFoundry wants. Watch for an AI-citation/pre-publish layer. |
| P1 | **Otterly.ai** | Lightweight GEO tracker (Gate 3) | Cheapest credible entry ($29/mo) and ships API/MCP on higher tiers. Closest price + delivery-model overlap at the low end. |
| P2 | **DIY prompting / GEO agencies** | Do nothing | Dunford's #1 alternative. Watch general-model capability and agency pricing ($1.5k-50k/mo). |
| P2 (watchlist) | Peec AI, Scrunch, AthenaHQ, Clearscope, MarketMuse, Writer, Cision | Various | Emerging trackers + incumbents. Any could commoditize a gate. |
| P2 (watchlist) | **Semrush / Ahrefs** | SEO incumbents | Fastest route to commoditizing Gate 3 tracking if they bolt on GEO/AEO toolkits at scale. |

## Signals that should trigger a report update

Refresh `report-data.json` (and rebuild the PDF + preview) when any of these fire:

- **Funding / M&A** — a P0/P1 raises a round, gets acquired, or acquires a rival.
- **Pricing change** — any tracked vendor changes tiers or list price (the
  matrix and dossiers cite exact prices; stale prices undermine credibility).
- **Positioning shift** — a competitor adopts "in-workflow", "MCP-native",
  "pre-publish gating", "ownership/perpetual license", or "strategy as code"
  language. This is the highest-severity signal: it is a direct attack on the
  white-space quadrant.
- **New entrant** — a credible product lands in the runs-in-your-stack +
  strategic-firewall quadrant. Add a dossier and re-plot the map.
- **Category tipping** — a delighter becomes a basic (e.g. MCP delivery becomes
  standard). Re-run the Kano categorization.

## Cadence

- **Weekly (5 min):** scan Google Alerts + the P0 vendors' blogs/changelogs.
- **Monthly (30 min):** re-verify P0/P1 pricing pages; skim G2/Capterra for new
  review themes; check MCP adoption stats.
- **Quarterly (half day):** full re-verification of every source in the report,
  refresh `report-data.json`, rebuild the PDF and preview, re-plot the 2x2, and
  re-run the weighted matrix. Update the "Last full review" date above.
- **Event-driven:** any triggering signal above jumps the queue.

## Recommended monitoring setup (low/no cost)

- **Google Alerts** (email) for each tracked vendor name, plus topic alerts:
  `"generative engine optimization"`, `"answer engine optimization"`,
  `"AI search visibility"`, `"MCP" content marketing`.
- **Vendor changelogs / blogs / pricing pages** — bookmark and check on the
  monthly cadence (pricing pages are the most decision-relevant).
- **Review sites** — G2 and Capterra category pages for AEO/GEO and content
  optimization, sorted by most recent, to catch shifting strengths/weaknesses.
- **Funding** — Fortune Term Sheet, TechCrunch, and PitchBook/Crunchbase alerts
  for the P0/P1 vendors.
- **MCP adoption** — track the periodic MCP adoption stat roundups; the SDK
  download trend is the leading indicator for how fast the delivery-model wedge
  commoditizes.

## How to refresh the report

1. Re-verify each figure against the URLs in the `sources` array of
   `exports/skillfoundry-competitive-analysis/report-data.json`.
2. Edit `report-data.json` (single source of truth for both the PDF and the web
   preview). Keep every claim tied to a numbered source.
3. Rebuild the PDF:
   `node exports/skillfoundry-competitive-analysis/build-pdf.mjs`
4. Sync the preview copy (the artifact reads its own copy of the shared files):
   `cp exports/skillfoundry-competitive-analysis/report-data.json exports/skillfoundry-competitive-analysis/report-template.js artifacts/mockup-sandbox/src/components/mockups/competitive-analysis/`
5. Verify the PDF has no blank pages and the preview renders, then update the
   "Last full review" date.
