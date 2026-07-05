# 07 · Brand Pass & Slide Copy

All participant-facing materials for The Cartographers' Table follow the locked FDI
brand. This file is the brand checklist plus the slide-by-slide copy spec for the
flagship session deck (Session 1 · Aggregated).

## Brand rules (locked, apply everywhere)

- **Palette:** strict two-tone warm family. Near-black base `#0D0B08`, cream text
  `#F0E8D5`, faded `#A8997B` and muted `#7A6A50` for secondary text, amber ramp for
  accents (`#FFB12B` / `#E0920C` press / `#FFCB6B` glow). No off-family teal or red.
- **Signal Orange `#FF5E00` is the logo mark ONLY.** Never use it for accents,
  highlights, buttons, or slide furniture. It appears only inside the FDI mark.
- **Fonts:** Space Grotesk (display / headings), Inter (body), JetBrains Mono
  (labels, eyebrows, kickers, data).
- **Lead with the master brand + eyebrow.** Every deck, worksheet, and email opens
  with the FDI master brand and the **Growth Cartography** eyebrow. Aggregated /
  Decentralized / Autonomous appears as the series footer line.
- **No em-dashes in public-facing copy.** Rewrite the sentence instead (the site
  and all launch assets follow this).
- **MCP framing:** describe the Model Context Protocol as an open standard. Never
  claim Anthropic affiliation or endorsement.
- **Naming:** "SkillFoundry" in visible copy (the URL stays lowercase). "Top Call"
  and "Field Guide" as written. The series is **The Cartographers' Table**.

## Slide-by-slide copy (flagship deck, 13 slides)

Layout convention per slide: **eyebrow** (JetBrains Mono, faded), **headline**
(Space Grotesk, cream, amber for the one emphasis word), **body / support** (Inter,
faded). Amber for emphasis, never Signal Orange.

**Slide 1 · Title**
- Eyebrow: `GROWTH CARTOGRAPHY`
- Headline: Become the Answer the Machine **Cites**
- Support: The Cartographers' Table · Session 1 · Aggregated
- Footer: False Dawn Industries · Aggregated · Decentralized · Autonomous
- Note: this is the only slide showing the full FDI mark (Signal Orange).

**Slide 2 · The promise**
- Eyebrow: `TONIGHT`
- Headline: You leave having built one **owned** answer object.
- Support: For a real client. That an AI assistant should cite. Plus the method to
  repeat it.

**Slide 3 · Cold open prompt** (facilitator types live over this)
- Eyebrow: `LIVE`
- Headline: Ask the machine a real buyer's question.
- Support: Now watch which sources it decided to **trust**.

**Slide 4 · The emergency**
- Eyebrow: `THE TERRAIN`
- Headline: The cost of making content just fell to zero.
- Support: That is not the opportunity. That is the emergency. If content is free to
  make, making it is worth nothing. What stays scarce is provenance, trust, and the
  system that decides who gets seen.

**Slide 5 · The one diagram**
- Eyebrow: `AGGREGATED`
- Headline: The machine is the new front door.
- Visual: buyer's question → a model → the model reaches past a wall of "renters"
  to cite one "owner." Renters in muted grey, the owner in amber.
- Support: You cannot negotiate reach with an aggregator. You can own a corpus it
  cites.

**Slide 6 · The reframe**
- Eyebrow: `THE SHIFT`
- Headline: Being found is **rented**. Being cited is **owned**.
- Support: A ranking is a position you rent from an algorithm that changes weekly.
  An answer a model trusts and cites is an asset you own and can prove.

**Slide 7 · The skill**
- Eyebrow: `WHAT YOU WILL DO`
- Headline: Audit. Grade. Build.
- Support: Pick one high-intent question. Audit who the machine cites now. Grade
  those sources. Build the owned answer object that deserves the citation.

**Slide 8 · The build brief** (stays up during the 55-min build)
- Eyebrow: `BUILD · 55 MIN`
- Headline: Work a real client.
- Support (three lines):
  - A · Audit the question. What does AI cite today?
  - B · Grade the sources. Tier 1 own it, Tier 2 corroborated, Tier 3 noise.
  - C · Build the answer object. Direct answer, proof, provenance, freshness.

**Slide 9 · Source-authority tiers** (reference during grading)
- Eyebrow: `GRADE IT`
- Headline: What should a machine **trust**?
- Support:
  - Tier 1 · Own it. First-party, named, dated, verifiable.
  - Tier 2 · Corroborated. Independent, evidence shown.
  - Tier 3 · Noise. Optimized to rank, not to be true.

**Slide 10 · The share**
- Eyebrow: `SHOW YOUR WORK`
- Headline: Read me your one-sentence answer.
- Support: Then tell me who is winning the citation today, and what tier they
  actually deserve.

**Slide 11 · The catch** (the bridge opens here)
- Eyebrow: `THE CEILING`
- Headline: You did this once. Now it starts to **evaporate**.
- Support: Next week you re-audit from scratch. Nothing compounds. Nothing is
  provable to a client. An agent cannot call it. The recipe is not the moat.

**Slide 12 · The owned system**
- Eyebrow: `BUILD THE MACHINE`
- Headline: SkillFoundry makes tonight **repeatable and provable**.
- Support: Source-authority grading as code. Every answer stamped with where it came
  from. Over an open interface an agent can query and trust. You own the system, you
  do not rent the outcome.
- Note: describe MCP as an open standard; no Anthropic endorsement claim.

**Slide 13 · Close & next**
- Eyebrow: `THE MAP CONTINUES`
- Headline: Next month: **Decentralized**.
- Support: Your answer object becomes the first node in an owned knowledge graph.
  Check your inbox tonight for the worksheet, the Field Guide, and the free
  prompt-pack.
- Footer: falsedawn.industries · Growth Cartography
- Capture QR bottom-right (from `05`).

## Print material brand notes

- Worksheets (`04`) and exit cards (`06`): cream on near-black if produced as
  branded prints, or clean black-on-white for cheap photocopies. Either way, headings
  in Space Grotesk, labels in JetBrains Mono, body in Inter, amber as the only accent.
- Table tents: FDI mark (Signal Orange permitted here, it is the mark), the session
  title, the capture QR, and the series footer line.
- Name tags: "The Cartographers' Table" kicker, big first name, small practice line.

## Reuse note

The site already ships self-hosted brand fonts and the exact color tokens in
`site/src/site.css` (`--base`, `--cream`, `--amber`, `--signal-orange`, etc.). Pull
hex values and font files from there so the workshop deck and prints match the live
site pixel-for-pixel. Do not import the ad system's fixed-viewport `brand.css`; the
scrollable token set in `site.css` is the reference.
