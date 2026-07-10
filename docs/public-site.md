# The public site (`site/`)

Full detail for the FDI public marketing site. Summary and locked rules live in
`replit.md`; this file is the authoritative deep detail.

## Pages & build
- Lightweight, dependency-light static site. `build.mjs` renders the thesis
  markdown (`exports/field-guide-launch/linkedin-thesis-article.md`) with `marked`,
  folds the inline visuals + captions into `<figure>`s, copies the launch assets
  and self-hosted fonts, and emits eight pages plus `/llms.txt` to `site/dist/`:
  - `/` — homepage (hero, stat band, product line, proof builds, about). Eyebrow
    is just "Growth Cartography"; product-line label is "The FDI Operating
    System"; the featured pair is SkillFoundry and Top Call; the three homepage
    stats ($1.3T, 2.5s, 70,000yrs) each carry an inline `.cite` superscript
    source link; the hero tags and the series card link to the new series pages
    (not GitHub). The About paragraph uses the approved brand-as-person framing
    ("...builds the systems that let a brand do what a person does: show up with
    one consistent, coherent identity in every new space, legible to machines,
    portable across communities, and verifiable by agents."). The "Talk to NYC"
    proof card heading links to `https://github.com/jratlee/nyc-chat`
    (new tab, `rel="noopener"`).
  - `/field-guide` — the article + 3 inline visuals + inline deck viewer, deck
    PDF download, launch-bundle download, and a 13-slide thumbnail strip
  - `/skillfoundry` — a direct-answer `.definition` block, three Signal-to-Value
    gates, modular architecture built on the open Model Context Protocol (MCP,
    `modelcontextprotocol.io`), three-tier pricing ladder with live Stripe
    checkout (Tier 1 "Buy now" one-time, Tier 2 "Subscribe" monthly; Tier 3 stays
    a waitlist CTA), a native `<details>` FAQ section, and a waitlist CTA
  - `/marcom-kit` — the flagship MarCom Architecture Kit ("Structure as code"):
    direct-answer `.definition`, FREE starter-pack lead magnet (`js-capture` +
    `data-download` serving `/assets/fdi-marcom-starter-pack.zip`, source
    `marcom-kit-starter`), three pillars (Hourglass / Use-Compose-Build /
    Riverbank), today/tomorrow outcomes, three-tier ladder (T1 $149 one-time,
    launch $99; T2 $199/mo, founding $149/mo, $1,500/yr, Agency $399/mo with
    white-label rights gated to that tier only; T3 $5,000/mo ~3 clients or
    $10,000 fixed 4-week sprint) plus the $1,500-2,500 Governance Risk Audit
    bridge card, Product+FAQPage JSON-LD, native `<details>` FAQ, a visible
    not-legal-advice disclaimer, and a data-handling FAQ where the LLM backend
    is mentioned. Kit checkout is wired end-to-end into the shared commerce
    engine (see `docs/commerce.md`) but the page buttons stay waitlist
    CTAs until `KIT_CHECKOUT_LIVE` in `build.mjs` is flipped to true. Homepage
    now leads with the kit as flagship (SkillFoundry recast as
    the kit's enforcement engine); nav/footer/llms.txt list the kit first; each
    concept page carries an "Own the structure" kit-branch section
    (Aggregator-Resilient Org / Cross-Functional Graph Org / Agent-Ready Org).
  - `/topcall` — Top Call ("Signal as Code"): a FREE prompt-pack lead magnet
    (email-capture that triggers the ZIP download), the three owned-system
    constructs (corpus / knowledge graph / MCP), architecture built on the open
    Model Context Protocol (MCP), a three-tier pricing ladder (Engine / Feed /
    Desk), and a paid waitlist CTA
  - `/series` — landing page for the field-guide series (source tag `series`)
  - `/aggregated`, `/decentralized`, `/autonomous` — one-pager concept pages,
    each a direct-answer definition + pattern/answer/proof cards + a waitlist CTA
    with a per-page source tag (`series-aggregated`, etc.)
- Build: `node site/build.mjs`. Serve: `node site/serve.mjs` (PORT env, default 5000).
- `serve.mjs` is a Node static server (correct MIME types, long-cache headers
  for `/fonts` + `/assets`, clean extensionless routing) plus a single dynamic
  route: `POST /api/waitlist` validates the email, sanitizes the optional
  `source` field (allow-listed `[a-z0-9._-]`, else `"site"`), and upserts both
  into the `waitlist_signups` Postgres table (`DATABASE_URL`) with `ON CONFLICT
  DO NOTHING`. Uses the `pg` client; returns `503` if no `DATABASE_URL` is set.
- The site reuses the locked FDI brand tokens/fonts but has its own scrollable
  stylesheet (`site/src/site.css`) — it does NOT import the ad system's fixed
  100vh/overflow-hidden `brand.css`.
- Site-wide contact address: the single `CONTACT` const in `build.mjs` is
  `john@ratcliffe-lee.com` (drives footer mailto, "Get in touch" button, all
  per-page "prefer email" notes, the signup mailto fallback JS, llms.txt, and
  the Organization JSON-LD email). Backend routing matches: env vars
  `WAITLIST_NOTIFY_EMAIL` and `RESEND_REPLY_TO` are set to the same address.

## Brand/copy conventions (locked)
- All visible product copy uses "SkillFoundry"
  (the `/skillfoundry` URL and `skillfoundry/` dir stay lowercase); every waitlist
  CTA and every waitlist-style pricing-tier button reads "Join the waitlist". The
  SkillFoundry Tier 1/2/3 buttons are the ONE exception: they drive live Stripe
  checkout, so they keep their commerce labels ("Buy now" one-time, "Subscribe"
  monthly, "Start retainer") and must not be relabeled to "Join the waitlist" or
  the checkout flow breaks. No em-dashes anywhere in `build.mjs`/`site.css`
  (sentences are rewritten instead); MCP is described as an open standard and the
  site never claims Anthropic affiliation or endorsement.

## GEO / AI-search visibility
- `page()` injects JSON-LD `<script>` blocks
  (Organization on `/`, SoftwareApplication + FAQPage on `/skillfoundry`, Article
  on `/field-guide`, a per-concept FAQPage on the concept pages); direct-answer
  `.definition` blocks and "as of 2026" freshness markers appear on product and
  concept pages; `build.mjs` emits `/llms.txt` (served `text/plain`) as an
  AI-crawler guide to the org, products, and series.
