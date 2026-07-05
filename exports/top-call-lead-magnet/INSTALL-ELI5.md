# Install Top Call — ELI5 Walkthrough

Think of Top Call like a very organized research assistant.

You give it a folder of trusted sources and a set of rules. It reads those sources, ignores weak junk, and writes a smart executive brief.

## Step 1 — Create the workspace folder

Create a folder called:

```text
Top Call Workspace
```

Put it somewhere easy to find, like OneDrive, SharePoint, or your Documents folder.

## Step 2 — Copy these files into it

Copy these files into `Top Call Workspace`:

```text
COPILOT-AGENT-INSTRUCTIONS.md
INSTALL-ELI5.md
memory.md
archive.md
```

Then create this folder:

```text
00-references
```

Copy these files into `00-references`:

```text
SOURCE-AUTHORITY-POLICY.md
SEARCH-QUERY-LIBRARY.md
EXEC-MOVES-MODEL.md
NO-PAID-INGESTION-PLAYBOOK.md
EXAMPLE-OUTPUT-TEMPLATE.md
```

## Step 3 — Create source folders

Inside `Top Call Workspace`, create these folders:

```text
01-watchlists
02-newsletters
03-article-exports
04-prior-briefs
05-drafts
06-source-logs
```

What goes where?

- `01-watchlists`: companies, executives, clients, or sources you care about.
- `02-newsletters`: copied newsletters from trusted sources.
- `03-article-exports`: PDFs, saved articles, or copied article text.
- `04-prior-briefs`: old briefs you want Top Call to learn from.
- `05-drafts`: new drafts Top Call writes.
- `06-source-logs`: source logs and rejected-source notes.

## Step 4 — Install in Microsoft Copilot / Copilot Studio

### If using regular Microsoft Copilot

1. Open Microsoft Copilot.
2. Attach or reference `COPILOT-AGENT-INSTRUCTIONS.md`.
3. Attach or reference the files in `00-references`.
4. Ask Copilot:

```text
Use the Top Call workflow. Read the attached instructions and reference files. Create a weekly executive brief from the source files I provide. Label paywalled sources and include a source log.
```

### If using Copilot Studio

1. Create a new agent.
2. Name it: `Top Call Intelligence Brief`.
3. Paste the full contents of `COPILOT-AGENT-INSTRUCTIONS.md` into the agent instructions.
4. Add the `00-references` files as knowledge sources.
5. Connect the workspace folder if your organization allows OneDrive/SharePoint knowledge.
6. Tell the agent it should draft only and never send externally without approval.

## Step 5 — Install in Claude Co-work-style workspace

If using Claude Co-work, Claude Code, or a Markdown workspace:

1. Rename or copy `COPILOT-AGENT-INSTRUCTIONS.md` as your workstation instruction file.
2. Keep it short and do not paste every reference file into it.
3. Keep the detailed files in `00-references`.
4. Put current facts in `memory.md`.
5. Put old history in `archive.md`.

Simple rule:

- Instructions/rules go in the instruction file.
- Current facts go in `memory.md`.
- Old stuff goes in `archive.md`.
- Detailed playbooks go in `00-references`.

## Step 6 — Add sources

Before asking for a brief, add some trusted source files:

- newsletters from Ad Age, Adweek, Marketing Dive, Retail Brew, etc.
- article PDFs or copied article text
- company watchlists
- executive watchlists
- prior briefs

You can still use open web search, but local sources make Top Call much better.

## Step 7 — Run your first brief

Use this prompt:

```text
Use the Top Call workflow.

Category: advertising, marketing, media, retail media, commerce, agencies, platforms, streaming, brands, consumer behavior, executive moves, analysts, and trade bodies.
Audience: senior executives and client-service leaders.
Time period: current week.
Output length: weekly executive brief.
Sources: use the files in this workspace first, then high-authority web sources if available.

Produce a Top Call, TLDR, current-week executive moves, ranked developments, so-what implications, watchlist, and source log. Label paywalled or primary-source-only items. Do not pad weak sections with low-quality sources.
```

## Step 8 — Review before sending

Before sharing the brief:

- Click source links.
- Check paywall labels.
- Remove weak stories.
- Tighten the Top Call.
- Make sure anything external-facing has human approval.

That is it. You installed Top Call.
