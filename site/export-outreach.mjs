// Build the branded outreach-kit PDFs into exports/outreach-kit/:
//   - fdi-marcom-kit-onepager.pdf         (one-page kit overview)
//   - transformation-sprint-proposal.pdf  (fillable proposal template)
//   - davos-kit-proposal.pdf              (Davos Decision Kit proposal)
// Run from the repo root: node site/export-outreach.mjs
// Reuses the headless-chromium print pipeline from defrag-report.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { embeddedFontCss, htmlToPDF } from "./defrag-report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "exports", "outreach-kit");

/* Locked FDI brand tokens */
const CSS = `
${embeddedFontCss()}
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --base:#0D0B08; --surface:#141009; --border:#2A2015; --hairline:#3A2D1C;
  --cream:#F0E8D5; --faded:#A8997B; --muted:#7A6A50;
  --amber:#FFB12B; --amber-press:#E0920C; --amber-glow:#FFCB6B;
  --orange:#FF5E00;
}
body { background: var(--base); color: var(--cream);
  font-family: 'Inter', sans-serif; font-size: 12.5px; line-height: 1.55;
  -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { padding: 52px 56px 40px; }
.eyebrow { font-family:'JetBrains Mono',monospace; font-size:9.5px; font-weight:700;
  letter-spacing:.26em; text-transform:uppercase; color:var(--amber);
  display:inline-flex; align-items:center; gap:8px; }
.eyebrow::before { content:""; width:18px; height:6px; background:var(--orange); }
h1 { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:28px;
  line-height:1.05; letter-spacing:-.03em; text-transform:uppercase; margin:10px 0 6px; }
h1 em { font-style:normal; color:var(--amber); }
h2 { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:14px;
  text-transform:uppercase; letter-spacing:.01em;
  margin:22px 0 8px; color:var(--amber-glow); }
p { color:var(--cream); margin:0 0 9px; }
.lede { color:var(--faded); font-size:13px; border-left:3px solid var(--amber); padding-left:12px; }
.mark { color: var(--orange); }
.hdr { display:flex; justify-content:space-between; align-items:flex-start;
  border-bottom:2px solid var(--amber); padding-bottom:16px; margin-bottom:20px; }
.lockup { font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:11px;
  letter-spacing:.14em; text-transform:uppercase; display:flex; align-items:center; gap:8px; }
.cards { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:12px 0 4px; }
.card { background:var(--surface); border:2px solid var(--hairline); border-radius:0; padding:14px; }
.card .tag { font-family:'JetBrains Mono',monospace; font-size:8.5px; font-weight:700;
  letter-spacing:.18em; text-transform:uppercase; color:var(--amber);
  display:block; border-bottom:1px solid var(--hairline); padding-bottom:5px; }
.card h3 { font-family:'Space Grotesk',sans-serif; font-weight:700; text-transform:uppercase;
  font-size:12.5px; margin:7px 0 5px; }
.card p { color:var(--faded); font-size:10.5px; margin:0; }
ul { margin:0 0 9px 16px; }
li { color:var(--cream); margin-bottom:4px; }
li b { color:var(--amber-glow); font-weight:600; }
.ladder { width:100%; border-collapse:collapse; margin:6px 0 4px; font-size:11px; }
.ladder th { font-family:'JetBrains Mono',monospace; font-size:8.5px; letter-spacing:.16em;
  text-transform:uppercase; color:var(--faded); text-align:left; padding:6px 10px;
  border-bottom:2px solid var(--amber); }
.ladder td { padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:top; }
.ladder .price { font-family:'Space Grotesk',sans-serif; font-weight:700; color:var(--amber); white-space:nowrap; }
.foot { margin-top:18px; padding-top:12px; border-top:2px solid var(--hairline);
  color:var(--muted); font-size:9px; line-height:1.5; }
.fill { color:var(--amber-glow); font-family:'JetBrains Mono',monospace; font-size:11px; }
.meta { display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; background:var(--surface);
  border:2px solid var(--hairline); border-radius:0; padding:14px 16px; margin:14px 0 4px; font-size:11.5px; }
.meta .k { color:var(--faded); }
.week { display:flex; gap:12px; margin-bottom:8px; }
.week .n { flex:none; width:52px; font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:700;
  letter-spacing:.12em; text-transform:uppercase; color:var(--amber); padding-top:2px; }
.week p { font-size:11.5px; margin:0; }
.week b { color:var(--amber-glow); }
.callout { background:var(--surface); border:2px solid var(--amber-press); border-left:4px solid var(--amber);
  border-radius:0; padding:12px 16px; margin:10px 0; font-size:11.5px; }
.sig { display:flex; gap:48px; margin-top:20px; font-size:11.5px; color:var(--faded); }
.sig span { border-top:2px solid var(--hairline); padding-top:6px; min-width:220px; }
`;

const MARK = `<svg class="mark" width="14" height="14" viewBox="0 0 100 100" aria-hidden="true">
<path d="M10 78 A45 45 0 0 1 90 78" fill="none" stroke="currentColor" stroke-width="9"/>
<rect x="44" y="52" width="12" height="26" fill="currentColor"/></svg>`;

function doc(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>${CSS}</style></head><body>${body}</body></html>`;
}

const header = (label) => `<div class="hdr">
  <div><span class="eyebrow">Growth Cartography</span></div>
  <div class="lockup">${MARK} False Dawn Industries</div>
</div><span class="eyebrow">${label}</span>`;

const DISCLAIMER = `This document describes risks to assess and candidates to
consider; decisions and outcomes remain the client's. It is general guidance,
not legal or financial advice. False Dawn Industries. falsedawnindustries.com`;

/* ---------------- one-pager ---------------- */
const onePager = doc("MarCom OS", `<div class="page">
${header("One-page overview, as of 2026")}
<h1>MarCom OS: <em>structure as code</em></h1>
<p class="lede">A complete operating structure for marketing organizations
adopting AI, so the tools serve the org chart instead of quietly replacing it.</p>

<h2>The problem it solves</h2>
<p>AI is being adopted bottom-up, one seat at a time. Output rises while the
apprenticeship layer that turns juniors into seniors quietly disappears, tool
spend accumulates with no owner, and nobody can show the board an operating
model. The risk is structural, and it compounds while it stays invisible.</p>

<h2>The three pillars</h2>
<div class="cards">
  <div class="card"><span class="tag">Org shape</span><h3>The Hourglass</h3>
  <p>An org blueprint that protects senior judgment and rebuilds the path from
  junior to senior around AI-era work, instead of hollowing it out.</p></div>
  <div class="card"><span class="tag">Tooling rule</span><h3>Use / Compose / Build</h3>
  <p>A decision calculator that rules on every tool in the stack: adopt it,
  assemble it from what you have, or build it. Sprawl ends here.</p></div>
  <div class="card"><span class="tag">Governance</span><h3>The Riverbank</h3>
  <p>Guardrail templates for AI-assisted work that legal and brand can live
  with: review standards, disclosure rules, escalation paths.</p></div>
</div>

<h2>What is inside</h2>
<ul>
  <li><b>Foundation Playbook:</b> the full Tier 1 kit with the Hourglass
  blueprint, the Use/Compose/Build calculator, and Riverbank templates.</li>
  <li><b>Audit to Kill checklist:</b> a structured cull of tools, workflows,
  and deliverables that AI has made redundant. Often self-funding.</li>
  <li><b>Wedge Manifesto:</b> the argument, in writing, for restructuring
  deliberately rather than absorbing AI ad hoc.</li>
</ul>

<h2>Ways to engage</h2>
<table class="ladder">
  <tr><th>Path</th><th>What happens</th><th>Investment</th></tr>
  <tr><td><b>Kit (self-serve)</b></td><td>The complete playbook; your team
  installs the structure at its own pace.</td><td class="price">from $149</td></tr>
  <tr><td><b>Governance Risk Audit</b></td><td>Two-week structured review of
  where current AI use may expose the org, delivered as a written report.
  Fee credited toward the Sprint within 90 days.</td>
  <td class="price">$1,500 to $2,500</td></tr>
  <tr><td><b>Transformation Sprint</b></td><td>Fixed four weeks: map, design,
  install, hand over. Ends with the structure live and the team briefed.</td>
  <td class="price">$10,000 fixed</td></tr>
</table>

<div class="foot">${DISCLAIMER}</div>
</div>`);

/* ---------------- proposal template ---------------- */
const proposal = doc("Transformation Sprint Proposal", `<div class="page">
${header("Engagement proposal")}
<h1>The Transformation Sprint: <em>four weeks, installed</em></h1>
<div class="meta">
  <div><span class="k">Prepared for:</span> <span class="fill">[Client, Company]</span></div>
  <div><span class="k">Prepared by:</span> <span class="fill">[Your name], FDI</span></div>
  <div><span class="k">Date:</span> <span class="fill">[Date]</span></div>
  <div><span class="k">Valid for:</span> 30 days</div>
</div>

<h2>The situation</h2>
<p class="lede"><span class="fill">[2-3 sentences in the client's own words
from the discovery call: how AI shows up in the team today, what has no
owner, and what triggered this conversation.]</span></p>

<h2>The engagement, week by week</h2>
<div class="week"><span class="n">Week 1</span><p><b>Map.</b> Tool, workflow,
and review-practice inventory; interviews with <span class="fill">[N]</span>
team leads. Output: current-state map and the Audit to Kill candidate list.</p></div>
<div class="week"><span class="n">Week 2</span><p><b>Design.</b> Target
Hourglass org shape, Use/Compose/Build ruling on the full stack, Riverbank
guardrails adapted to your legal and brand constraints. Output: the blueprint,
reviewed with you before anything changes.</p></div>
<div class="week"><span class="n">Week 3</span><p><b>Install.</b> Governance
templates adopted, review standards for AI-assisted work in place, kill-list
decisions executed by your team with our support. Output: the structure, live.</p></div>
<div class="week"><span class="n">Week 4</span><p><b>Brief and hand over.</b>
Leadership briefing, team walkthrough, full artifact set handed over in
editable form. Output: your team runs the structure without us.</p></div>

<h2>Investment</h2>
<p><b style="font-family:'Space Grotesk',sans-serif;font-size:16px;color:var(--amber)">$10,000, fixed.</b>
Half on signing, half at the Week 2 blueprint review. Kickoff
<span class="fill">[date]</span>, handover <span class="fill">[date]</span>.
Scope is fixed to the deliverables above; changes are a new agreement.</p>

<div class="callout"><b>A lighter first step, if preferred:</b> the Governance
Risk Audit ($1,500 to $2,500 by team size) is a two-week structured review of
where current AI use may expose the organization, delivered as a written
report. The full audit fee is credited toward the Sprint within 90 days.</div>

<h2>What this is not</h2>
<p>No tool resale, no headcount recommendations delivered over your head, no
open-ended consulting tail. The Sprint ends on
<span class="fill">[end date]</span>.</p>

<div class="sig"><span>Accepted by</span><span>Date</span></div>
<div class="foot">${DISCLAIMER}</div>
</div>`);

/* ---------------- Davos Decision Kit proposal ---------------- */
const davosProposal = doc("Davos Decision Kit Proposal", `<div class="page">
${header("Engagement proposal")}
<h1>The Davos Decision Kit: <em>a front door to the practice</em></h1>
<div class="meta">
  <div><span class="k">Prepared for:</span> Heather Kernahan, The Content Bureau</div>
  <div><span class="k">Prepared by:</span> <span class="fill">[Your name], FDI</span></div>
  <div><span class="k">Date:</span> <span class="fill">[Date]</span></div>
  <div><span class="k">Valid for:</span> 30 days</div>
</div>

<h2>The gap</h2>
<p class="lede">Your Davos practice has two doors today. The free door: the
Davos Curious briefing, generous and effective, but it leaves the attendee
with notes, not a system. The big door: high-touch advisory, the right answer
for committed clients but a five-figure first step. Between them is nothing,
and that gap is where most of your audience lives.</p>

<h2>The product</h2>
<p>A self-serve, one-time-purchase decision system, downloadable the moment
someone buys. Four working assets built from your team's expertise, delivered
under your brand:</p>
<div class="cards">
  <div class="card"><span class="tag">Decide</span><h3>Go/No-Go Scorecard</h3>
  <p>A weighted framework producing a board-defensible go or no-go
  recommendation in one 45-minute session.</p></div>
  <div class="card"><span class="tag">Plan</span><h3>Twelve-Month Runway + Budget Calculator</h3>
  <p>The month-by-month plan working backward from January, and a cost
  worksheet with realistic public-range estimates.</p></div>
  <div class="card"><span class="tag">Execute</span><h3>Visibility Plan Templates</h3>
  <p>Meeting-request scripts, briefing docs, a model high-impact week, and
  the follow-up system where the ROI lives.</p></div>
</div>
<p>Every asset ends at the same next step: book a strategy session with your
team. The kit monetizes the curious who never convert, qualifies the ones who
will, and hands you a warm, pre-educated pipeline.</p>

<div class="callout"><b>Suggested buyer pricing:</b> $299 one-time, $199 at
launch. Low enough for a corporate card without approval, high enough to
signal senior advice. It sits between the free briefing and advisory and
never competes with either.</div>

<h2>Scope and timeline</h2>
<div class="week"><span class="n">Week 1</span><p><b>Transfer and draft.</b>
One working session with your team; FDI drafts all four assets plus the kit
read-me and packaging.</p></div>
<div class="week"><span class="n">Week 2</span><p><b>Revise and deliver.</b>
Your review pass; FDI revises, finalizes launch copy (product page, launch
email, two social posts), and delivers the packaged kit in editable form.</p></div>
<div class="week"><span class="n">Week 3</span><p><b>Optional add-on.</b>
Commerce plumbing: checkout, gated download, and email capture wired into
your site, tested end to end.</p></div>

<h2>Investment</h2>
<p><b style="font-family:'Space Grotesk',sans-serif;font-size:16px;color:var(--amber)">$7,500, fixed</b>
for the product, packaging, and launch copy. Half on signing, half on
delivery. Commerce plumbing add-on: $2,500. Alternative structure if
preferred: $5,000 fixed plus 20 percent of kit revenue for 12 months.</p>

<h2>What this is not</h2>
<p>No claim of WEF affiliation in any asset; all cost figures framed as
public ranges. No open-ended consulting tail: the engagement ends at
delivery, and the kit is yours outright.</p>

<div class="sig"><span>Accepted by</span><span>Date</span></div>
<div class="foot">${DISCLAIMER}</div>
</div>`);

/* ---------------- Davos Kit expertise-insertion map ---------------- */
const expertiseRow = (when, fdi, tcb, why, time) => `<tr>
  <td><b>${when}</b></td><td>${fdi}</td><td>${tcb}</td><td>${why}</td>
  <td class="price">${time}</td></tr>`;

const davosExpertiseMap = doc("Davos Decision Kit: Expertise Map", `<style>
.xmap .ladder { font-size:9.5px; }
.xmap .ladder td { padding:6px 8px; }
.xmap li { font-size:11px; margin-bottom:3px; }
.xmap .callout { margin:8px 0; padding:10px 14px; }
.xmap h2 { margin:14px 0 6px; }
</style><div class="page xmap">
${header("Build plan · expertise insertion map")}
<h1>Where your team's expertise <em>goes in</em></h1>
<p class="lede">The kit's credibility is your expertise. FDI provides the
structure: the scoring math, the document architecture, the packaging, the
commerce plumbing. Your team provides the truth: what the ranges really are,
when the calendars really fill, which scripts really get replies. This page
maps every insertion point in the 2 to 3 week build.</p>

<div class="callout"><b>Total time required from your team: about 4 to 6
hours across the build.</b> One scheduled session; everything else is async
and fits between meetings.</div>

<table class="ladder">
  <tr><th>When</th><th>What FDI brings</th><th>What TCB inserts</th><th>Why it matters</th><th>Your time</th></tr>
  ${expertiseRow(
    "Week 1: working session (the big one)",
    "Draft scorecard with six weighted factors, draft budget lines from public ranges, draft twelve-month runway.",
    "Weights and thresholds validated against real client outcomes; budget ranges corrected from your ground truth; runway timing corrected (when side-event lists really close, when calendars really fill); your voice on the badge question.",
    "Wrong weights produce confident wrong answers. Public ranges without practitioner correction read like a blog post, not senior advice.",
    "90 to 120 min",
  )}
  ${expertiseRow(
    "Week 1: async",
    "Script skeletons, briefing-doc structure, model-week grid, follow-up cadence.",
    "Real, anonymized patterns: the framings that get replies, the model week as your practice actually runs it, the cadence you have seen convert.",
    "Scripts are the part buyers copy verbatim. Your patterns are the product.",
    "60 to 90 min",
  )}
  ${expertiseRow(
    "Week 2: red-line pass",
    "The full revised kit, incorporating everything above.",
    "A red-line for anything that overpromises, conflicts with your advisory positioning, or leaks proprietary method you want kept behind the advisory door.",
    "The kit must qualify buyers for advisory, not replace it. You decide where that line sits.",
    "60 to 90 min",
  )}
  ${expertiseRow(
    "Week 2: sign-off",
    "Final packaged kit, launch copy, product page draft.",
    "A yes or a short punch list.",
    "Nothing ships under your brand without your final word.",
    "15 to 30 min",
  )}
  ${expertiseRow(
    "Week 3 (optional): commerce check",
    "Checkout, gated download, and email capture wired and tested end to end.",
    "One test purchase walkthrough on a screen share.",
    "You see exactly what a buyer sees before a buyer sees it.",
    "30 min",
  )}
</table>

<h2>Why the insertions are structured this way</h2>
<ul>
  <li><b>One big session, not many small ones.</b> Live conversation is
  concentrated in Week 1; everything else is async.</li>
  <li><b>FDI drafts first, your team corrects.</b> Correcting takes a fraction
  of authoring. Your hours go where they are irreplaceable: judgment, ranges,
  and voice.</li>
  <li><b>The red-line is a veto, not a rewrite.</b> By Week 2 the kit already
  reflects your input; the red-line catches what only you can catch.</li>
  <li><b>Nothing proprietary leaves without consent.</b> Anything close to
  your advisory method stays out of the kit until you explicitly put it in.</li>
</ul>

<div class="foot">${DISCLAIMER} The kit makes no claim of WEF affiliation and
frames all costs as public ranges.</div>
</div>`);

const JOBS = [
  ["fdi-marcom-kit-onepager.pdf", onePager],
  ["transformation-sprint-proposal.pdf", proposal],
  ["davos-kit-proposal.pdf", davosProposal],
  ["davos-kit-expertise-map.pdf", davosExpertiseMap],
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [file, html] of JOBS) {
  const pdf = await htmlToPDF(html);
  const out = path.join(OUT_DIR, file);
  fs.writeFileSync(out, pdf);
  console.log(`[outreach] wrote ${out} (${Math.round(pdf.length / 1024)} KB)`);
}
