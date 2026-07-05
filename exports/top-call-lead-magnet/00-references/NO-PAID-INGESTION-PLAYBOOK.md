# Top Call No-Paid-Ingestion Playbook

This playbook solves weak source coverage without requiring the end user to pay for source ingestion.

The guiding principle:

> Use local context first, high-authority free/open web second, and paid/API ingestion later only as an optional upgrade.

Local context does not override source quality. The product should still classify the original publication/source and prioritize validated Tier 1 media, brand-name trades, reputable analyst/trade bodies, or clearly identified primary sources.

## Problem Buckets

The validation runs showed weak or inconsistent coverage in:

1. Executive moves
2. Agency account reviews / M&A
3. CTV / streaming news
4. Paywalled trade coverage
5. Source extraction timeouts
6. Generic SEO results overwhelming high-quality sources

## Solution Architecture Without Paid Ingestion

### Layer 1 — Local Context Files

Ask the user to keep source materials in a local folder or workspace. The product should query these files first.

Recommended folder structure:

```text
Top Call Sources/
  01-watchlists/
    exec-moves.xlsx
    key-companies.csv
    key-sources.md
  02-newsletters/
    adweek-newsletter.md
    ad-age-newsletter.md
    retail-brew.md
    marketing-dive.md
  03-pdfs-and-exports/
    paywalled-articles/
    analyst-reports/
  04-prior-briefs/
  05-client-context/
```

Supported file types:

- Markdown
- TXT
- CSV
- XLSX
- DOCX
- PDF
- HTML exports
- copied email/newsletter text

### What to Extract From Local Context

- companies to track
- executives to track
- source URLs
- article headlines
- dates
- copied summaries
- paywalled article PDFs or text exports
- client-specific priorities
- previous briefs
- rejected-source examples

### Local Search Terms

Before web search, scan local context for:

```text
exec moves
executive tracker
leadership tracker
priority
watchlist
key companies
source list
newsletter instructions
coverage universe
client priorities
CMO
chief marketing officer
chief creative officer
head of advertising
retail media
agency review
principal media
CTV
upfronts
Cannes
```

## Layer 2 — Free/Open Web Search

Use granular Boolean query matrices.

Rules:

- Search by bucket.
- Use site-specific searches for known sources.
- Split broad Boolean queries when the search tool performs poorly.
- Use company/source watchlists extracted from local files.
- Search named executives before broad role terms.
- Search primary sources directly when possible.

## Layer 3 — Free Primary Sources

Prioritize free primary sources:

- company press rooms
- investor relations pages
- conference speaker pages
- trade-body announcements
- Business Wire / PR Newswire
- event programmes
- official blogs
- SEC filings, if relevant
- LinkedIn public snippets, if available and clearly dated

## Layer 4 — Manual Drop Zone

For paywalled articles and newsletters, the user should not need a paid ingestion integration.

Instead, provide a manual drop-zone workflow:

1. User saves/copies article text, PDF, or newsletter into `Top Call Sources/02-newsletters/` or `03-pdfs-and-exports/`.
2. Top Call reads those files as local context.
3. The brief cites the publication and labels the source as “user-provided local context.”
4. If the original URL is included, link it.

This is simple, legal-user-controlled, and avoids paid scraping/API dependencies.

## Layer 5 — Browser Fallback

If extraction fails but browser access is available:

1. Open the page.
2. Capture title, date, author, visible summary, and key snippets.
3. If content is blocked, cite only what is visible and label as limited access.
4. Do not invent details behind paywalls.

## Weak Bucket Solutions

## 1. Executive Moves

### Problem

Broad web search returns stale, generic, or low-confidence people-move results.

### No-paid solution

Use a three-pass system:

#### Pass A — Local watchlist

Read local files for:

- executives
- companies
- titles
- LinkedIn URLs
- prior roles
- replacement fields
- priority tiers

Then run named queries:

```text
"[Executive Name]" "[Company]" (appointed OR named OR joins OR exits OR "steps down" OR promoted OR "new role")
```

#### Pass B — Company-role queries

For each tracked company:

```text
"[Company]" (CMO OR "chief marketing officer" OR CEO OR president OR "chief creative officer" OR "head of advertising") (appoints OR names OR hires OR exits OR joins)
```

#### Pass C — Source-specific role queries

Run source-specific searches across Adweek, Ad Age, Campaign, Business Wire, PR Newswire, company press rooms, and LinkedIn snippets.

### Future paid/integrated upgrade

- LinkedIn Sales Navigator / approved LinkedIn workflow
- People Data Labs / Apollo / ZoomInfo style enrichment
- paid media monitoring
- premium trade feeds

## 2. Agency Reviews / M&A

### Problem

Search returns generic agency rankings and SEO pages.

### No-paid solution

Use event-specific terms:

```text
"agency review"
"media review"
"creative review"
"media account"
"creative account"
"agency of record"
"AOR"
"global media account"
"competitive pitch"
"retains"
"defends account"
"moves account"
```

Combine with holding companies and major advertiser watchlists from local files.

Prioritize:

- Ad Age
- Adweek
- Campaign
- The Drum
- Marketing Dive
- company press releases
- agency press rooms

### Future upgrade

- trade publication integrations
- agency database subscriptions
- media monitoring API

## 3. CTV / Streaming

### Problem

CTV queries return vendor SEO reports.

### No-paid solution

Use player + buyer-problem queries:

```text
(Netflix OR Disney OR Roku OR Paramount OR Peacock OR YouTube OR "Prime Video") (upfront OR advertising OR measurement OR sports OR CTV)
```

```text
CTV (deduplicated reach OR frequency OR attribution OR measurement OR fragmentation OR "walled gardens")
```

Prioritize:

- Adweek Convergent TV
- Ad Age TV Upfront
- Variety
- TheWrap
- Marketing Dive
- platform primary sources
- IAB video / CTV reports

### Future upgrade

- Kantar / Nielsen / Comscore feeds
- TVREV / Ampere / Antenna / MoffettNathanson reports, if licensed by user

## 4. Paywalled Trade Coverage

### Problem

Some of the best sources are paywalled.

### No-paid solution

Use user-controlled local context:

- user exports/saves article PDFs
- user copies newsletter/article text into a local file
- user stores URLs and notes in Markdown
- product reads local files first

Template:

```markdown
# Source Drop

Publication:
Date:
URL:
Headline:
Copied text or notes:
Why this matters:
```

## 5. Extraction Timeouts

### Problem

Some pages time out or block extraction.

### No-paid solution

- Try web extraction.
- If it fails, search exact title.
- If still blocked, use visible search result snippets only and mark confidence medium/low.
- If browser available, inspect visible page.
- If user has the article locally, prioritize local copy.

## Product Workflow Update

When generating any brief:

1. Read local context files first.
2. Build or update the watchlist from local context.
3. Run named queries from the watchlist.
4. Run bucket-level Boolean queries.
5. Extract and rank results.
6. Produce the brief and source log.
7. List coverage gaps and suggested local files the user can add.

## User-Facing Setup Instructions

Tell users:

> You do not need paid source ingestion. To improve results, create a local folder called `Top Call Sources` and drop in newsletters, article exports, PDFs, watchlists, and prior briefs. Top Call will use those files as your private source layer before searching the open web.

## Future Product Integration

Paid/source integrations should be positioned as optional upgrades:

### Pro / Team

- Google Drive / OneDrive / SharePoint folder reading
- Gmail/Outlook newsletter search
- scheduled folder scans

### Enterprise

- licensed media monitoring feeds
- paid trade publication integrations where permitted
- CRM/contact-data enrichment
- compliance review workflow
- source retention/audit logs

## Key Product Claim

Use this phrasing:

> Top Call works with the sources you already have. It can read local context files, user-provided newsletters, watchlists, exports, and prior briefs before searching the open web. Paid source integrations are optional upgrades, not requirements.
