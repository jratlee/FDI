# SEO Strategy — False Dawn Industries (FDI)

## Site overview
Static site (`site/dist/`) built by `site/build.mjs`. Fully server-rendered / statically generated HTML. No SPA rendering issues; all public pages emit complete HTML to crawlers.

## Public pages in scope
- `/` — Homepage
- `/field-guide`, `/field-guide-002`, `/field-guide-003`, `/field-guide-004` — Field Guide articles
- `/fdcp` — FDCP report
- `/skillfoundry` — Product landing page
- `/marcom-kit` — Product landing page
- `/topcall` — noindex (coming soon); out of scope
- `/roadmap` — noindex (coming soon); out of scope
- `/series`, `/aggregated`, `/decentralized`, `/autonomous` — Series/market pages
- `/community` — The Open Cartography Lab (indexed, live)
- `/workshop` — Workshop page
- `/engine` — System Dynamics Engine tool
- `/davos-kit-demo` — noindex, password-gated; out of scope

## Out of scope
- `/davos-kit-demo` (noindex, client-gated)
- `/topcall` (noindex, coming soon)
- `/roadmap` (noindex, coming soon)
- `/admin/**` (token-gated internal tools)

## Target audience
B2B marketing leaders, CMOs, growth strategists interested in AI-era marketing systems, owned marketing infrastructure, and decentralized/autonomous market dynamics.

## Primary topics/keywords
- Owned marketing systems
- AI-era marketing
- MarCom OS / marketing operations
- SkillFoundry / MCP plugin
- Field Guide (FDI thesis series)
- Aggregated, decentralized, autonomous markets

## Rendering mode
Fully static HTML (SSG via `site/build.mjs`). All metadata, structured data, and content are in initial HTML. No JavaScript rendering dependency for SEO content.

## Dismissed categories
- (None yet)
