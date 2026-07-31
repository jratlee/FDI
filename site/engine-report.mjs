// Branded Growth Report PDF for the System Dynamics Engine lead tool.
// Called when a confirmed engine signup has non-null meta (session params).
// Uses the same htmlToPDF / embeddedFontCss helpers from defrag-report.mjs.

import { embeddedFontCss, htmlToPDF } from "./defrag-report.mjs";
import { PARADIGM_DEFAULTS, cohortDauCurve, targetBackCalc, revenueProjection } from "./src/engine-math.mjs";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n, decimals = 0) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n) {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return "$" + fmt(n / 1_000_000, 2) + "M";
  if (n >= 1_000) return "$" + fmt(n / 1_000, 1) + "K";
  return "$" + fmt(n, 2);
}

const REPORT_CSS = `
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0D0B08;color:#F0E8D5;font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:820px;margin:0 auto;padding:52px 48px}
  .eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:#A8997B;display:flex;align-items:center;gap:12px;margin:0 0 18px}
  .eyebrow::before{content:"";width:22px;border-top:2px solid #FFB12B}
  h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:32px;line-height:1.08;letter-spacing:-.02em;margin:0 0 6px;color:#F0E8D5}
  h2{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:19px;margin:36px 0 14px;color:#F0E8D5;text-transform:uppercase;letter-spacing:-.01em}
  h3{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:15px;margin:0 0 8px;color:#FFB12B;text-transform:uppercase;letter-spacing:.04em}
  .meta{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px;color:#7A6A50;margin:0 0 34px}
  .meta b{color:#A8997B;font-weight:500}
  .session-card{border:1px solid #2a2418;border-left:4px solid #FFB12B;border-radius:0;padding:24px 28px;background:#15120c;margin:0 0 36px;break-inside:avoid}
  .session-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:18px}
  .session-metric{background:#0D0B08;border:1px solid #2a2418;padding:16px 18px}
  .sm-label{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7A6A50;margin:0 0 6px}
  .sm-value{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:26px;line-height:1;color:#FFB12B;letter-spacing:-.02em}
  .sm-unit{font-size:13px;color:#A8997B;font-weight:500}
  .goal-block{background:#1C160D;border:1px solid #2a2418;border-left:3px solid #FF5E00;padding:16px 20px;margin:0 0 32px;break-inside:avoid}
  .goal-label{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#7A6A50;margin:0 0 8px}
  .goal-text{color:#F0E8D5;font-size:14px;line-height:1.6;margin:0}
  .implication{border:1px solid #2a2418;border-radius:0;padding:20px 22px;margin:0 0 16px;background:#100e09;break-inside:avoid}
  .imp-market{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#FFB12B;border-bottom:1px solid #2a2418;padding-bottom:10px;margin-bottom:12px}
  .imp-def{color:#A8997B;font-size:13.5px;line-height:1.6;margin:0 0 12px}
  .imp-tactic{background:#0D0B08;border-left:3px solid #FFB12B;padding:10px 14px;margin:0;color:#F0E8D5;font-size:13.5px;line-height:1.55}
  .tactic-label{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#7A6A50;display:block;margin-bottom:5px}
  .inputs-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:0 0 32px}
  .inp-row{background:#100e09;border:1px solid #2a2418;padding:12px 16px;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
  .inp-key{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7A6A50}
  .inp-val{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:14px;color:#F0E8D5}
  .foot{border-top:1px solid #2a2418;padding-top:20px;margin-top:44px;color:#7A6A50;font-size:11.5px}
  .foot p{margin:0 0 8px}
  .brand{font-family:'Space Grotesk',sans-serif;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#A8997B;font-size:11px}
  section{margin:0 0 32px;break-inside:avoid-page}
`;

const DISCLAIMER =
  "This Growth Report is generated from your modelling session parameters. Results are directional projections based on exponential cohort-decay math — they are not predictions. Actual retention, costs, and yields depend on execution, market conditions, and factors not captured in the model. This is not financial or investment advice.";

const MARKET_DEFS = {
  saas: {
    name: "Aggregated Consumer / SaaS",
    definition:
      "Aggregated markets are platforms where a small number of intermediaries (Meta, Google, TikTok, app stores) sit between you and your audience and set the terms of discovery. SaaS growth in these markets is driven by paid acquisition competing for algorithmically-gated attention. The durable advantage is an owned corpus and identity that the platforms cannot revoke: content, community, and a distribution surface you control.",
    tactic:
      "Audit your top-of-funnel for platform dependency: if any single channel accounts for more than 40% of new trials, redirect 20% of that CAC budget into building a directly-owned, searchable answer corpus. Use cohort-decay data to defend the shift to finance.",
  },
  web3: {
    name: "Decentralized Compute / Web3",
    definition:
      "Decentralized networks are participant-owned: protocols, token incentives, and onchain governance instead of a company's database. There is no feed to buy. Node acquisition (DAN growth) depends on token incentive design and reputation within the protocol community. Churn is structural — early participants extract token bounties and leave unless the protocol delivers durable yield.",
    tactic:
      "Model retention decay separately for incentive-driven early adopters versus intrinsically motivated participants. Set a token-vesting schedule that aligns reward release with the maturity milestone you need for yield extraction. Front-loading bounties accelerates churn; back-loading them retains the nodes that matter.",
  },
  autonomous: {
    name: "Autonomous AI Economy",
    definition:
      "Autonomous markets are where AI agents transact with other agents on behalf of humans, on open protocol stacks (MCP, A2A, AP2, x402). Selection, pricing, and routing decisions run at machine speed with no human latency. Early advantages in machine-legibility — structured schemas, provenance trails, deterministic tool-call interfaces — compound into structural moats faster than any organic-reach collapse on social platforms.",
    tactic:
      "Prioritize making your interface callable before optimizing for conversion rate: an agent can't choose what it can't discover and invoke. Publish an MCP-compatible tool spec, assign a semantic version, and put a latency SLA on every call. Agents that trust your interface return; agents that time out do not.",
  },
};

function buildImplicationForGoal(goal, paradigm) {
  // All three markets are always shown; the stated goal is woven into the framing.
  const goalHint = (goal || "").trim().slice(0, 200);
  const goalPhrase = goalHint
    ? `Given your stated goal (${esc(goalHint)}), the most relevant move in each market is:`
    : "A concrete move in each market:";
  return goalPhrase;
}

// Safely parse a meta value, falling back to `fallback` only when the value
// is absent or non-finite. Explicit zeros from the visitor are preserved.
function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Compute three headline metrics from the meta session parameters.
// Each tab uses its own retention anchors: the visitor can configure
// r1/r7/r30 independently in Tab 0, Tab 1, and Tab 2.
function computeMetrics(meta, pd) {
  // Tab 0 retention anchors (UI fields t0-r1, t0-r7, t0-r30).
  const r1  = num(meta.r1,  pd.r1);
  const r7  = num(meta.r7,  pd.r7);
  const r30 = num(meta.r30, pd.r30);

  // Tab 1 retention anchors (UI fields t1-r1, t1-r7, t1-r30).
  // Fall back to Tab 0 anchors when the payload predates this field.
  const t1r1  = num(meta.t1r1,  r1);
  const t1r7  = num(meta.t1r7,  r7);
  const t1r30 = num(meta.t1r30, r30);

  // Tab 2 retention anchors (UI fields t2-r1, t2-r7, t2-r30).
  const t2r1  = num(meta.t2r1,  r1);
  const t2r7  = num(meta.t2r7,  r7);
  const t2r30 = num(meta.t2r30, r30);

  // Tab 0 metric: total units required to hit the DAU target.
  const tab0 = targetBackCalc({
    targetDau:    num(meta.targetDau,    pd.defaultTargetDau),
    timelineDays: num(meta.timelineDays, pd.defaultTimeline),
    costPerUnit:  num(meta.costPerUnit,  pd.defaultCostPerUnit),
    r1, r7, r30,
  });

  // Tab 1 metric: stable DAU at end of horizon under steady drip.
  const horizon    = num(meta.horizon,    pd.defaultHorizon);
  const basePerDay = num(meta.basePerDay, pd.defaultBasePerDay);
  const stableDau  = cohortDauCurve(basePerDay, horizon, t1r1, t1r7, t1r30)[horizon - 1] || 0;

  // Tab 2 metric: projected total revenue using Tab 2's retention curve.
  const revResult = revenueProjection({
    newPerDay:    num(meta.newPerDay,    pd.defaultNewPerDay),
    horizon:      num(meta.revHorizon,   pd.defaultTimeline),
    maturityDays: num(meta.maturityDays, pd.defaultMaturityDays),
    yieldRate:    num(meta.yieldRate,    pd.defaultYieldRate),
    yieldValue:   num(meta.yieldValue,   pd.defaultYieldValue),
    r1: t2r1, r7: t2r7, r30: t2r30,
  });

  return { tab0, stableDau, revResult, r1, r7, r30, t1r1, t1r7, t1r30, t2r1, t2r7, t2r30 };
}

export function renderEngineReport(signup, meta) {
  const fonts = embeddedFontCss();
  const paradigm = (meta.paradigm || "saas");
  const pd = PARADIGM_DEFAULTS[paradigm] || PARADIGM_DEFAULTS.saas;
  const goal = (meta.goal || "").trim();
  const date = new Date().toISOString().slice(0, 10);

  const { tab0, stableDau, revResult, r1, r7, r30, t1r1, t1r7, t1r30, t2r1, t2r7, t2r30 } = computeMetrics(meta, pd);
  const marketDef = MARKET_DEFS[paradigm] || MARKET_DEFS.saas;

  // Build session summary card
  const sessionMetrics = `
<div class="session-card">
  <h3>Session summary</h3>
  <div class="session-grid">
    <div class="session-metric">
      <div class="sm-label">Paradigm</div>
      <div class="sm-value" style="font-size:16px;line-height:1.3;">${esc(pd.label)}</div>
    </div>
    <div class="session-metric">
      <div class="sm-label">Units required</div>
      <div class="sm-value">${fmt(Math.round(tab0.totalUnits))}<span class="sm-unit"> ${esc(pd.unitLabel)}</span></div>
    </div>
    <div class="session-metric">
      <div class="sm-label">Total capital</div>
      <div class="sm-value" style="font-size:20px;">${fmtCurrency(tab0.totalCapital)}</div>
    </div>
    <div class="session-metric">
      <div class="sm-label">Stable ${esc(pd.unitLabel)} (end)</div>
      <div class="sm-value">${fmt(Math.round(stableDau))}</div>
    </div>
    <div class="session-metric">
      <div class="sm-label">Projected revenue</div>
      <div class="sm-value" style="font-size:20px;">${fmtCurrency(revResult.totalRevenue)}</div>
    </div>
    <div class="session-metric">
      <div class="sm-label">Matured ${esc(pd.unitLabel)} (end)</div>
      <div class="sm-value">${fmt(Math.round(revResult.finalAgedDau))}</div>
    </div>
  </div>
</div>`;

  // Build inputs summary — use `num()` throughout so explicit zeros are
  // preserved and only absent/non-finite values fall back to paradigm defaults.
  // Retention values come from the computeMetrics call above.
  const inp = (k, v) => `<div class="inp-row"><span class="inp-key">${esc(k)}</span><span class="inp-val">${esc(v)}</span></div>`;
  const inputs = [
    inp("Target " + pd.unitLabel,       fmt(num(meta.targetDau,    pd.defaultTargetDau))),
    inp("Timeline (days)",              fmt(num(meta.timelineDays, pd.defaultTimeline))),
    inp(pd.acqLabel + " (cost/unit)",   fmtCurrency(num(meta.costPerUnit, pd.defaultCostPerUnit))),
    inp("Tab 0 · Day 1 retention",      (r1  * 100).toFixed(0) + "%"),
    inp("Tab 0 · Day 7 retention",      (r7  * 100).toFixed(0) + "%"),
    inp("Tab 0 · Day 30 retention",     (r30 * 100).toFixed(0) + "%"),
    inp("New/day (stability)",          fmt(num(meta.basePerDay,   pd.defaultBasePerDay))),
    inp("Horizon (days)",               fmt(num(meta.horizon,      pd.defaultHorizon))),
    inp("Tab 1 · Day 1 retention",      (t1r1  * 100).toFixed(0) + "%"),
    inp("Tab 1 · Day 7 retention",      (t1r7  * 100).toFixed(0) + "%"),
    inp("Tab 1 · Day 30 retention",     (t1r30 * 100).toFixed(0) + "%"),
    inp("New/day (revenue)",            fmt(num(meta.newPerDay,    pd.defaultNewPerDay))),
    inp("Maturity milestone (days)",    fmt(num(meta.maturityDays, pd.defaultMaturityDays))),
    inp("Yield rate",                   (num(meta.yieldRate, pd.defaultYieldRate) * 100).toFixed(1) + "%"),
    inp(pd.valueLabel + " / unit / day", fmtCurrency(num(meta.yieldValue, pd.defaultYieldValue))),
    inp("Tab 2 · Day 1 retention",      (t2r1  * 100).toFixed(0) + "%"),
    inp("Tab 2 · Day 7 retention",      (t2r7  * 100).toFixed(0) + "%"),
    inp("Tab 2 · Day 30 retention",     (t2r30 * 100).toFixed(0) + "%"),
  ].join("");

  // Implications section — all three markets always shown
  const goalPhrase = buildImplicationForGoal(goal, paradigm);
  const implications = Object.entries(MARKET_DEFS).map(([key, m]) => `
<div class="implication">
  <div class="imp-market">${esc(m.name)}</div>
  <p class="imp-def">${esc(m.definition)}</p>
  <div class="imp-tactic">
    <span class="tactic-label">One concrete tactic</span>
    ${esc(m.tactic)}
  </div>
</div>`).join("");

  const goalBlock = goal ? `
<div class="goal-block">
  <div class="goal-label">Your stated growth goal</div>
  <p class="goal-text">${esc(goal)}</p>
</div>` : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Growth Report | False Dawn Industries</title>
<style>${fonts}\n${REPORT_CSS}</style></head><body><div class="page">
<p class="eyebrow">Growth Cartography · System Dynamics Engine</p>
<h1>Your Growth Report</h1>
<p class="meta">Generated ${esc(date)} for ${esc(signup.email || "you")} · False Dawn Industries · System Dynamics Engine</p>

${sessionMetrics}

${goalBlock}

<h2>Key session inputs</h2>
<div class="inputs-grid">${inputs}</div>

<h2>Implications by market</h2>
<p style="color:#A8997B;font-size:14px;margin:0 0 20px;">${esc(goalPhrase)}</p>
${implications}

<div class="foot">
  <p class="brand">False Dawn Industries</p>
  <p>${esc(DISCLAIMER)}</p>
  <p>Growth Cartography: <a href="https://falsedawn.industries" style="color:#FFB12B;">falsedawn.industries</a></p>
</div>
</div></body></html>`;
}

export async function renderEngineReportPDF(signup, meta) {
  return htmlToPDF(renderEngineReport(signup, meta));
}
