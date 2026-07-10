# Sales & product export assets (NOT public)

Internal sales assets and client-facing product builds under `exports/`.
Summary lives in `replit.md`.

## Outreach kit
- Outreach kit (internal sales assets, NOT public): `exports/outreach-kit/`
  holds the 3-touch email sequences (agency-president + CMO variants of the
  Riverbank/deskilling pitch), discovery-call guide, and the Transformation
  Sprint proposal source ($10,000 fixed 4-week, Governance Risk Audit
  $1,500-2,500 fallback). `node site/export-outreach.mjs` renders the two
  branded PDFs (kit one-pager + proposal template) via the shared
  `htmlToPDF`/`embeddedFontCss` helpers now exported from
  `site/defrag-report.mjs`. Copy rules: no em-dashes, no former-client names,
  softened risk claims + not-legal-advice disclaimer.

## Davos Decision Kit
- Davos Decision Kit (client-facing product build, NOT public): a low-cost
  front-door product designed for The Content Bureau's Davos practice, modeled
  on the SkillFoundry Tier 1 pattern ($299 one-time, $199 launch). Source
  assets in `exports/davos-decision-kit/` (Go/No-Go Scorecard, Twelve-Month
  Runway, Budget Calculator, Visibility Plan Templates, README,
  `start-here-ai-prompts.md`, and the pre-built Claude Skill folder
  `claude-skill/davos-decision-advisor/`; zipped to
  `davos-decision-kit.zip`). The FDI proposal to Heather Kernahan
  ($7,500 fixed + $2,500 commerce add-on; alt $5,000 + 20% rev share 12mo)
  lives at `exports/outreach-kit/davos-kit-proposal.md` with a branded PDF
  rendered by `site/export-outreach.mjs` (which also renders
  `davos-kit-expertise-map.md/pdf`, the TCB expertise-insertion map; the shared
  outreach DISCLAIMER reads "not legal or financial advice"). The kit ships
  with a fully worked fictional example (`worked-example.md`, Solvra: scorecard
  70/100 conditional go, lined budget, condensed runway, instantiated script)
  and an internal `GO_LIVE_CHECKLIST.md` (excluded from the buyer zip). Copy
  rules: no em-dashes, no WEF affiliation claims, all costs framed as
  public-range estimates, not-legal/financial-advice disclaimers. Commerce
  wiring for the kit is documented in `docs/commerce.md` ("Davos Kit commerce
  demo").
