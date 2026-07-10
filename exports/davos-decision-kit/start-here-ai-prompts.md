# Start Here: Turn This Kit Into Your AI Advisor

Every document in this kit is plain text on purpose. That makes it the most
portable format there is for AI assistants. You do not install anything.
You load these documents into the AI tool you already use (ChatGPT, Claude,
or Microsoft Copilot) and the kit stops being a set of worksheets and becomes
an interactive advisor that interviews you, scores you, and plans with you.

## Two ways to load the kit

**The quick way (any AI chat).** Drag any single document into a new
conversation and paste the matching prompt below. Works everywhere, zero setup.

**The recommended way (a standing advisor).** ChatGPT (Projects or a custom
GPT), Claude (Projects), and Copilot (Notebooks) all let you upload reference
files once so they stay attached to every future conversation. Upload all five
kit documents to one project, name it something like "Davos Advisor," and come
back to it all year: in March, ask what the runway says March is for.

## Copy-paste prompts, one per document

**1. The Go/No-Go Scorecard (start here)**

> You are my Davos decision advisor. Use the attached Go/No-Go Scorecard
> exactly as written. Interview me one criterion at a time, ask follow-up
> questions where my answer is vague, then calculate my weighted score, state
> the go / conditional go / no-go recommendation, and draft the five-line
> recommendation page for my board.

**2. The Budget Calculator**

> Using the attached Budget Calculator, walk me through each cost line for my
> scenario. Ask me the sizing questions first (party size, nights, badge or
> promenade-only, hosted moment or not), then produce my low and high totals
> and the hidden-time line. Flag any line where my assumption is outside the
> public ranges in the document.

**3. The Twelve-Month Runway**

> Using the attached Twelve-Month Runway, today's date, and my target January,
> build my personal version: compress or expand the months to fit the time I
> actually have, list what I have already done, and give me the three most
> urgent actions for the next 30 days.

**4. The Visibility Plan Templates**

> Using the attached Visibility Plan Templates, help me build my meeting
> stack. Interview me about my positioning, my anchor content, and my top ten
> target conversations, then instantiate the meeting-request script for my top
> three targets in my voice, and set up the daily briefing-doc structure for
> my week.

**5. The Worked Example**

> Read the attached worked example (Solvra). Then compare my situation to
> Solvra's as I describe it, and tell me where my scorecard, budget, and
> runway are likely to differ and why.

## If you have a paid plan: advanced setups

Feature names and availability vary by vendor and plan; check your tool's
current documentation. The kit is plain markdown, so it works in all of them.

**Claude Pro, Max, or Team.** Beyond Projects, Claude supports Skills, and
this kit ships one pre-built: the `claude-skill/davos-decision-advisor/`
folder already contains the instruction file and the five kit documents. Drop
that folder into Claude's skills (where your plan supports them) and Claude
loads your Davos decision advisor on demand across the Claude apps, Claude
Code, and Cowork. In Cowork, drop the same folder into a session and let
Claude work the documents against your real files, for example filling the
budget calculator from your draft spreadsheet.

**Microsoft 365 Copilot.** Beyond Notebooks, use the agent builder or Copilot
Studio to create a "Davos Advisor" agent grounded in the kit documents and
share it with your team inside Teams and Office. A simple scheduled flow can
send runway reminders so the plan comes to you.

**ChatGPT Plus or Team.** Build a custom GPT from the kit documents and the
prompts above, then share it with your team so everyone gets the same advisor
with the same grounding.

**Anything similar.** Gemini (Gems), Notion AI, or your company's own AI
stack: any tool that accepts reference documents can run the kit.

## One rule

The AI works from the documents, and the documents work from your answers.
Give it real numbers and honest answers; the kit's math does the rest. For
the judgment calls the documents deliberately stop short of (which rooms,
which conversations, which positioning), that is what a strategy session with
the team behind this kit is for.

---

Estimates in this kit are drawn from public ranges; verify current prices
before budgeting. Independent guidance, not affiliated with or endorsed by
the World Economic Forum. Not legal or financial advice.
