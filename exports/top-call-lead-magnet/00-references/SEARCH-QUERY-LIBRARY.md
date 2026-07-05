# Top Call Search Query Library

This query library turns Top Call from a generic summarization workflow into a repeatable research operating system.

Use a **query matrix**:

> Bucket × Source Tier × Story Pattern × Time Window

Do not rely on one broad query. For every brief, run multiple targeted searches across source-specific and category-wide terms.

## Global Search Rules

1. Search each major bucket separately.
2. Use `site:` searches for priority high-authority sources first.
3. Use broad category discovery searches only after source-specific searches.
4. Search people moves separately from business/category news.
5. Search trade bodies and analyst sources separately from media coverage.
6. Track included and rejected sources.
7. Prioritize validated Tier 1 media, brand-name trades, reputable analyst/trade bodies, and clearly identified primary sources for factual confirmation.
8. Do not include vendor blogs, generic SEO trend posts, scraped org charts, Wikipedia, or thin AI summaries as main evidence unless corroborated by higher-authority sources.
9. If Boolean operators are weak in the search tool, split the query into smaller searches.
10. Use date filters when supported, but verify dates manually.
11. Do not pad weak sections; say when no high-confidence source surfaced.

## Source Tiers

### Tier 1 — Priority Media / Trades

- Adweek
- Ad Age
- Marketing Dive
- Digiday
- The Current
- Modern Retail
- Retail Dive
- Retail Brew
- eMarketer
- Business Insider
- Campaign
- Reuters
- CNBC
- Wall Street Journal
- Fortune
- Variety
- Sports Business Journal
- Business of Fashion

### Tier 2 — Primary / Official / Research

Use primary sources mainly for factual confirmation, not self-promotional strategic framing unless corroborated.

- Company press rooms
- Investor relations pages
- IAB
- IAB Tech Lab
- ANA
- 4A's
- ARF
- WARC
- Forrester
- Gartner
- Nielsen
- Kantar
- Comscore
- Circana
- Conference Board
- Cannes Lions
- CES / NewFronts / Upfront event pages

### Tier 3 — Discovery / Supplemental

- Specialist newsletters
- Agency blogs
- Consulting reports
- Niche trade publications
- Substack/newsletters
- PR Newswire / Business Wire

Use Tier 3 only to discover leads, terminology, or background. Do not include Tier 3 as main evidence unless corroborated by Tier 1A/1B/1C or a clearly relevant primary source.

---

# Query Sets

## 1. Executive Moves

### Priority source search

```text
site:adweek.com (CMO OR "chief marketing officer" OR "chief creative officer" OR CEO OR president OR "chief strategy officer") (appoints OR named OR hires OR joins OR exits OR "steps down")
```

```text
site:adage.com (CMO OR "chief marketing officer" OR "chief creative officer" OR CEO OR president OR "agency leader") (appoints OR named OR hires OR joins OR exits OR "steps down")
```

```text
site:campaignlive.com ("chief creative officer" OR CMO OR CEO OR president OR "new business" OR "creative leader") (joins OR appointed OR named OR exits OR hires)
```

```text
site:fortune.com/section/leadership (CMO OR CEO OR "chief marketing officer" OR president OR "executive") (named OR appoints OR exits OR joins)
```

### Category-wide search

```text
(CMO OR "chief marketing officer" OR "chief creative officer" OR CEO OR president OR "chief strategy officer") (appoints OR named OR hires OR joins OR exits OR "steps down") (advertising OR marketing OR agency OR media OR retail OR commerce OR streaming)
```

### Inclusion rules

Include:

- CEOs, CMOs, presidents, chief creative officers, agency leaders, platform ad leaders.
- VP-level only if strategically material.
- CFO/COO only if tied to major strategic change.

Exclude:

- routine HR/legal/finance moves unless category-shaping.
- obscure company moves with no broader implication.

---

## 2. Agency, Advertising & Media

### Agency reviews / account wins

```text
("agency review" OR "media review" OR "creative review" OR "media account" OR "creative account" OR "AOR" OR "agency of record") (WPP OR Publicis OR Omnicom OR IPG OR Dentsu OR Havas OR Accenture Song OR Media.Monks OR VML)
```

```text
site:adage.com ("agency review" OR "media review" OR "creative review" OR "media account" OR "AOR")
```

```text
site:adweek.com/agencies ("wins" OR "agency review" OR "media account" OR "creative account" OR "hired")
```

### Agency M&A / consolidation

```text
(agency OR "holding company" OR Publicis OR WPP OR Omnicom OR IPG OR Dentsu OR Havas OR Accenture Song) (acquires OR acquisition OR merger OR consolidation OR buys OR investment)
```

### Media transparency / principal media / measurement

```text
("principal media" OR "media transparency" OR rebates OR "non-transparent media" OR "media audit" OR "supply path" OR "programmatic transparency") (ANA OR agency OR advertiser OR marketers)
```

### AI / creative operations

```text
(agency OR advertising OR marketing) (AI OR "generative AI" OR "creative automation" OR "production studio" OR "agentic" OR workflow) (WPP OR Publicis OR Omnicom OR Dentsu OR Accenture Song OR agency)
```

---

## 3. Retail Media / Commerce Media / Marketplaces

### Core retail media

```text
("retail media" OR "commerce media" OR "retail media network" OR RMN OR "closed-loop measurement" OR "first-party data") (growth OR measurement OR partnership OR expansion OR interoperability OR CTV OR programmatic)
```

### Key players

```text
(Amazon Ads OR Walmart Connect OR Target Roundel OR Kroger Precision Marketing OR Instacart Ads OR Albertsons Media Collective OR Best Buy Ads OR Home Depot Retail Media) (advertising OR measurement OR CTV OR retail media OR partnership OR expansion)
```

### Commerce / marketplace expansion

```text
("TikTok Shop" OR marketplace OR "shoppable" OR "social commerce" OR "agentic commerce" OR "universal cart") (advertising OR brands OR sellers OR retail OR commerce)
```

### Non-retail commerce media

```text
("commerce media" OR "media network") (Marriott OR Uber OR DoorDash OR Expedia OR Chase OR PayPal OR United OR Delta OR travel OR financial services OR delivery)
```

### Source-specific searches

```text
site:modernretail.co ("retail media" OR Amazon OR Walmart OR TikTok Shop OR marketplace OR commerce)
```

```text
site:retaildive.com ("retail media" OR Amazon OR Walmart OR Target OR consumer OR returns OR tariffs)
```

```text
site:emarketer.com ("retail media" OR "commerce media" OR TikTok OR Amazon OR Walmart OR advertising)
```

---

## 4. Big Tech / Platforms / AI Search

### Platform ad products

```text
(Google OR Meta OR TikTok OR Microsoft OR Apple OR Amazon OR Reddit OR Pinterest OR Snap) (advertising OR ads OR "ad tools" OR measurement OR targeting OR attribution OR privacy)
```

### AI search / agentic commerce

```text
(Google OR Microsoft OR OpenAI OR Perplexity OR Amazon OR Apple) ("AI search" OR "AI Mode" OR "agentic commerce" OR "shopping agent" OR "conversational search" OR "universal cart" OR "ads as answers")
```

### Subscription / monetization shifts

```text
(Meta OR TikTok OR X OR Reddit OR Snapchat OR YouTube) (subscription OR paid OR monetization OR advertising OR creator OR AI)
```

### Source-specific searches

```text
site:blog.google OR site:about.ads.microsoft.com OR site:business.instagram.com OR site:newsroom.tiktok.com (ads OR advertising OR AI OR commerce OR measurement)
```

---

## 5. Streaming / CTV / Video / Upfronts

### CTV / streaming ads

```text
(CTV OR "connected TV" OR streaming OR video) (advertising OR ads OR measurement OR upfront OR programmatic OR sports OR retail media)
```

### Key players

```text
(Netflix OR Disney OR Hulu OR Roku OR Paramount OR Peacock OR YouTube OR "Prime Video" OR Fox OR Warner Bros. Discovery) (advertising OR ads OR upfront OR measurement OR sports OR shoppable OR CTV)
```

### Buyer concerns

```text
(CTV OR streaming) ("deduplicated reach" OR frequency OR measurement OR attribution OR "walled gardens" OR fragmentation OR "single platform")
```

### Source-specific searches

```text
site:variety.com OR site:adweek.com/convergent-tv OR site:marketingdive.com (streaming OR CTV OR upfront OR advertising OR measurement)
```

---

## 6. Brands / Consumer / Macro

### Consumer and spending

```text
("consumer spending" OR inflation OR tariffs OR "retail sales" OR layoffs OR "CEO confidence" OR "consumer confidence") (brands OR retailers OR marketers OR advertising OR commerce)
```

### Brand strategy

```text
(brand OR CMO OR campaign OR marketing) (AI OR experiential OR creator OR sports OR commerce OR "retail media" OR "brand building" OR loyalty)
```

### Marketing budgets / ad spend

```text
("ad spend" OR "advertising spend" OR "marketing budgets" OR "media budgets") (forecast OR cuts OR growth OR reallocation OR CMO OR marketers)
```

### Campaign inclusion check

Only include campaign stories if they signal broader trends:

- sports/culture platform shift
- creator economy shift
- AI-enabled creative/production shift
- experiential resurgence
- commerce-driven brand building
- major brand repositioning

---

## 7. Analysts / Trade Bodies / Reports

### Trade bodies

```text
(ANA OR IAB OR "IAB Tech Lab" OR "4A's" OR ARF OR "Advertising Research Foundation" OR WARC) (advertising OR marketing OR media OR measurement OR transparency OR AI OR privacy OR "ad spend")
```

### Analysts / research firms

```text
(Forrester OR Gartner OR eMarketer OR Insider Intelligence OR Nielsen OR Kantar OR Comscore OR Circana OR "Conference Board") (marketing OR advertising OR consumer OR media OR AI OR commerce OR "ad spend")
```

### Source-specific

```text
site:iab.com OR site:iabtechlab.com (AI OR advertising OR measurement OR privacy OR transparency OR agentic)
```

```text
site:ana.net (marketing OR advertising OR AI OR media OR measurement OR transparency)
```

```text
site:warc.com (advertising OR marketing OR media OR AI OR "ad spend" OR effectiveness)
```

---

## 8. Seasonal Moments

### Cannes Lions

```text
("Cannes Lions" OR Cannes) (2026 OR advertising OR marketing OR creativity OR AI OR brands OR effectiveness OR Titanium)
```

```text
site:canneslions.com (programme OR awards OR winners OR shortlist OR creator OR AI OR marketers OR effectiveness)
```

### Upfronts / NewFronts

```text
(upfronts OR NewFronts OR "TV upfront" OR "streaming upfront") (advertising OR brands OR media buyers OR measurement OR sports OR CTV)
```

### Prime Day / retail tentpoles

```text
("Prime Day" OR "holiday prep" OR "Cyber Monday" OR "Black Friday") (advertising OR retail media OR brands OR inventory OR supply chain OR consumer spending)
```

### Earnings

```text
(earnings OR guidance OR "investor day") (advertising OR retail media OR streaming OR marketing OR commerce OR consumer) (Google OR Meta OR Amazon OR Walmart OR Disney OR Netflix OR Roku OR Pinterest OR Reddit)
```

---

# Source Log Template

| Status | Bucket | Source | Date | URL | Rationale | Confidence |
|---|---|---|---:|---|---|---|
| Included | Retail media | Street Fight | June 3, 2026 | URL | Strong category signal: interoperability | High |
| Excluded | Brand news | Publication | Date | URL | Routine campaign, no broader implication | Medium |

# Brief Validation Checklist

- Did each major bucket get at least 2 targeted searches?
- Did priority sources get site-specific searches?
- Did executive moves get separate searches?
- Did trade bodies / analysts get separate searches?
- Did the final brief include only high-signal items?
- Did every included item have a “So what”?
- Did the Top Call synthesize across multiple stories?
- Did the source log show what was rejected and why?
