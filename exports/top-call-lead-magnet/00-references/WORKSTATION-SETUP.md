# Top Call Workstation Setup

This setup applies the workspace lessons from the reviewed YouTube video to Top Call.

The key distinction from the video:

> A **workstation** is a place you work with accumulated context. A **skill** is a repeatable process that should run the same way every time.

Top Call should be packaged as both:

1. **Top Call Workstation** — the ongoing workspace for a user/team/category, with memory, source lists, watchlists, prior briefs, and client context.
2. **Top Call Skills** — repeatable processes inside that workstation: source scan, exec-move scan, authority audit, brief generation, source-log generation, and archive/update.

## Recommended Folder Structure

```text
Top Call Workspace/
  CLAUDE.md                    # workstation instructions / operating rules
  memory.md                    # active category/team/client context
  archive.md                   # historical decisions, old briefs, old sources
  00-references/
    source-authority-policy.md
    search-query-library.md
    exec-moves-model.md
    no-paid-ingestion-playbook.md
  01-watchlists/
    exec-moves.xlsx
    key-companies.csv
    key-sources.md
  02-newsletters/
    adweek.md
    ad-age.md
    campaign.md
    retail-brew.md
    marketing-dive.md
  03-article-exports/
    paywalled-articles/
    analyst-reports/
  04-prior-briefs/
  05-drafts/
  06-source-logs/
```

## CLAUDE.md / Workstation Instruction Rules

Keep the root workstation instruction file short. Target **200–250 lines**, with **300 lines as the hard maximum**.

Only include rules needed every session:

- what Top Call is;
- source authority policy summary;
- local-context-first rule;
- paywall labeling rule;
- routing map to reference files;
- brief output standard;
- human-review requirement.

Move task-specific detail into reference files:

- detailed search queries;
- exec-moves model;
- source authority policy;
- no-paid-ingestion playbook;
- archive rules;
- prompt templates.

## Memory Rules

Use `memory.md` for facts that can change:

- active categories;
- current client/team priorities;
- known source folders;
- recurring cron jobs;
- current watchlists;
- last brief date;
- source gaps to improve.

Do **not** put behavior rules in `memory.md`. Behavior rules belong in `CLAUDE.md` or reference files.

Use `archive.md` for:

- old briefs;
- old source logs;
- old rejected-source patterns;
- old watchlists;
- outdated client priorities;
- prior decisions no longer needed every session.

## Suggested Top Call Skills

### 1. Exec-Move Scan Skill

Repeatable process:

1. Read local exec trackers and watchlists.
2. Run named executive/company queries.
3. Run role/company/category queries.
4. Validate source authority.
5. Label source type: Tier 1, trade, analyst/trade body, primary-source-only, specialist newsletter, low-confidence.
6. Output current-week executive moves plus source-log exclusions.

### 2. Source Authority Audit Skill

Repeatable process:

1. Review every included item.
2. Assign source tier.
3. Flag paywalled links.
4. Flag primary-source-only items.
5. Reject or caveat vendor/SEO/low-authority sources.
6. Produce source log.

### 3. Brief Generation Skill

Repeatable process:

1. Use validated source log.
2. Pick Top Call.
3. Draft TLDR.
4. Draft sections.
5. Add so-what implications.
6. Add watchlist.
7. Save/archive.

### 4. Workstation Audit Skill

Repeatable process:

1. Check whether rules are misplaced in memory.
2. Check whether memory facts are misplaced in CLAUDE.md.
3. Check root instruction length.
4. Move rarely used detail to reference files.
5. Archive stale context.

## Paywall Labeling Rule

If a source appears to be paywalled, subscription-only, a gift article, or only partially extracted, label it before the user clicks:

```markdown
Source: [Adweek, Oct. 7, 2025](URL) — **Paywalled / subscription-only**
```

or:

```markdown
Source: [Ad Age, Date](URL) — **Gift article / may require registration**
```

or:

```markdown
Source: [eMarketer, Date](URL) — **Paywalled / extraction limited**
```

## Current-Week Exec-Move Fallback

Do not leave the executive-moves section empty after one failed trade search.

Use this fallback ladder:

1. Tier 1 / brand-name trade current-week coverage.
2. Specialist exec-move newsletters or indexes, clearly labeled.
3. Company press releases / investor relations / Nasdaq / Business Wire / PR Newswire primary-source announcements.
4. Local user-provided newsletters/article exports.
5. If still thin, include the best primary-source-only moves in a section labeled **Primary-source-only current-week moves**.
6. Keep low-confidence scraped/SEO results out of the main brief.

## User Experience Improvement

The product should tell users:

> Top Call improves over time. Every source list, article export, rejected-source note, and prior brief you add to the workstation becomes reusable context for future runs.

This mirrors the video’s core idea: a well-structured AI workspace compounds.
