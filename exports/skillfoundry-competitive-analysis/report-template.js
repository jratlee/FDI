/* Shared report template. Imported by:
   - build-pdf.mjs (Node + chromium print -> PDF)
   - the React web preview (artifacts/mockup-sandbox competitive-analysis)
   Renders US-Letter pages (816 x 1056 px @ 96dpi) that mirror page-by-page.
   Font loading is supplied per-consumer (base64 for print, Google Fonts for web). */

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const dot = (val, sf) => {
  const cls = `dot ${val}${sf ? " sf" : ""}`;
  const inner = val === "no" && sf ? "&times;" : "";
  return `<span class="${cls}">${inner}</span>`;
};

function dossier(c) {
  return `
  <div class="dossier">
    <div class="dhead">
      <div class="dname">${esc(c.name)}</div>
      <div class="darena">${esc(c.arena)}</div>
    </div>
    <div class="dpos">${esc(c.positioning)}</div>
    <div class="dmeta">
      <div><span class="dlbl">Stage</span>${esc(c.stage)}</div>
      <div><span class="dlbl">Pricing</span>${esc(c.pricing)}</div>
    </div>
    <div class="dsw">
      <div class="dcol">
        <div class="dcolh win">Strengths</div>
        <ul>${c.strengths.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>
      <div class="dcol">
        <div class="dcolh loss">Weaknesses</div>
        <ul>${c.weaknesses.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>
    </div>
    ${c.flag ? `<div class="dflag">Note: ${esc(c.flag)}</div>` : ""}
  </div>`;
}

function page(kicker, title, inner, opts = {}) {
  return `
  <section class="page${opts.cls ? " " + opts.cls : ""}">
    <div class="ptop">
      <span class="brand">FALSE DAWN INDUSTRIES</span>
      <span class="gc">Growth Cartography</span>
    </div>
    ${
      kicker
        ? `<div class="shead"><div class="kicker">${esc(kicker)}</div><h2>${esc(
            title,
          )}</h2><div class="rule"></div></div>`
        : ""
    }
    <div class="pbody">${inner}</div>
    <div class="pfoot"><span>SkillFoundry Competitive Analysis &nbsp;|&nbsp; ${esc(
      opts.date || "",
    )} &nbsp;|&nbsp; Confidential</span><span>${opts.page || ""}</span></div>
  </section>`;
}

export function renderReportHTML(data) {
  const m = data.meta;
  const pos = data.positioning;
  const pm = data.positioningMap;
  const kano = data.whitespace.kano;
  let n = 0;
  const pg = () => ++n;

  /* ---- Cover ---- */
  const cover = `
  <section class="page cover">
    <div class="cover-band">
      <div class="cover-kicker">FALSE DAWN INDUSTRIES &nbsp;&middot;&nbsp; GROWTH CARTOGRAPHY</div>
      <h1>SkillFoundry</h1>
      <div class="cover-sub">Competitive Analysis &amp; Positioning</div>
      <p class="cover-lede">A defensible, cited view of where SkillFoundry wins and loses in the market for AI-era content strategy, and how to sharpen positioning and sales messaging.</p>
      <div class="cover-date">${esc(m.date).toUpperCase()}</div>
    </div>
    <div class="cover-body">
      <div class="cover-thesis-lbl">The one-line thesis</div>
      <p class="cover-thesis">${esc(pos.statement)}</p>
      <div class="cover-cat"><span class="kicker">Category</span><div class="cover-cat-v">${esc(
        m.category,
      )}</div></div>
      <div class="cover-fine">
        <p>${esc(m.asOf)}</p>
        <p>${esc(m.confidence)}</p>
      </div>
    </div>
    <div class="pfoot"><span>SkillFoundry Competitive Analysis &nbsp;|&nbsp; ${esc(
      m.date,
    )} &nbsp;|&nbsp; Confidential</span><span>${pg()}</span></div>
  </section>`;

  /* ---- Exec summary ---- */
  const exec = page(
    "01  ·  Executive Summary",
    "Positioning & the so-what",
    `
    <div class="sublbl">Positioning statement (April Dunford format)</div>
    <div class="statement-box">${esc(pos.statement)}</div>
    <div class="sublbl mt">Top 3 strategic recommendations</div>
    <ol class="recs">
      ${data.recommendations
        .map(
          (r) =>
            `<li><div class="rec-t">${esc(r.title)}</div><div class="rec-b">${esc(
              r.body,
            )}</div></li>`,
        )
        .join("")}
    </ol>`,
    { date: m.date, page: pg() },
  );

  /* ---- Landscape (split across 2 pages) ---- */
  const landA = page(
    "02  ·  Competitive Landscape",
    "Who SkillFoundry competes with",
    `<p class="lead">Competition framed by alternative, not feature. SkillFoundry competes across four arenas that map to its three gates plus its delivery model. Five alternatives get a full dossier; the remainder are on the watchlist.</p>
     ${data.competitors.slice(0, 3).map(dossier).join("")}`,
    { date: m.date, page: pg() },
  );
  const landB = page(
    "02  ·  Competitive Landscape",
    "Alternatives, continued",
    `${data.competitors.slice(3).map(dossier).join("")}
     <div class="watch">
       <div class="sublbl">Also on the watchlist</div>
       <ul class="watchlist">${data.watchlist
         .map((w) => `<li>${esc(w)}</li>`)
         .join("")}</ul>
     </div>`,
    { date: m.date, page: pg() },
  );

  /* ---- Feature matrix ---- */
  const cols = data.matrix.columns;
  const matrix = page(
    "03  ·  Feature Matrix",
    "Where SkillFoundry wins and loses",
    `<p class="lead">Rows are capabilities weighted 1-5 by how often they surface in buyer conversations. Green marks a SkillFoundry win; brick marks a gap.</p>
     <table class="matrix">
       <thead><tr><th class="cap">Capability</th><th class="wt">Wt</th>${cols
         .map(
           (c) =>
             `<th class="${c === "SkillFoundry" ? "sfcol" : ""}">${esc(c)}</th>`,
         )
         .join("")}</tr></thead>
       <tbody>
       ${data.matrix.rows
         .map(
           (row) =>
             `<tr><td class="cap">${esc(row.cap)}</td><td class="wt">${
               row.w
             }</td>${row.cells
               .map(
                 (v, i) =>
                   `<td class="${cols[i] === "SkillFoundry" ? "sfcol" : ""}">${dot(
                     v,
                     cols[i] === "SkillFoundry",
                   )}</td>`,
               )
               .join("")}</tr>`,
         )
         .join("")}
       </tbody>
     </table>
     <div class="legend">
       ${dot("yes")}<span>Full</span>
       ${dot("partial")}<span>Partial</span>
       ${dot("no")}<span>Absent</span>
       ${dot("yes", true)}<span>SkillFoundry win</span>
       ${dot("no", true)}<span>SkillFoundry gap</span>
     </div>`,
    { date: m.date, page: pg() },
  );

  /* ---- Positioning map ---- */
  const dots = pm.points
    .map(
      (p) =>
        `<div class="pt${p.highlight ? " hi" : ""}" style="left:${(
          p.x * 100
        ).toFixed(1)}%;top:${((1 - p.y) * 100).toFixed(
          1,
        )}%"><span class="pt-dot"></span><span class="pt-lbl">${esc(
          p.name,
        )}</span></div>`,
    )
    .join("");
  const map = page(
    "04  ·  Positioning Map",
    "The quadrant buyers decide on",
    `<p class="lead">Axes chosen on buyer decision criteria. Horizontal: log into a dashboard you rent, or run in the stack you own? Vertical: a point tool doing one job, or a strategic firewall spanning relevance, enterprise value, and algorithmic signal?</p>
     <div class="mapwrap">
       <div class="ylab ytop">${esc(pm.yTop)}</div>
       <div class="ylab ybot">${esc(pm.yBottom)}</div>
       <div class="plot">
         <div class="ws-band"></div>
         <div class="ws-tag">WHITE SPACE</div>
         <div class="vline"></div><div class="hline"></div>
         ${dots}
       </div>
       <div class="xlab xleft">${esc(pm.xLeft)}</div>
       <div class="xlab xright">${esc(pm.xRight)}</div>
     </div>
     <p class="mapnote">SkillFoundry sits alone in the upper-right: it runs in your stack and gates content across all three strategic layers. Every direct rival clusters in the lower-left dashboard-and-point-tool corner. A GEO agency reaches strategic scope but stays rented; DIY prompting runs in your stack but never rises to a strategic firewall.</p>`,
    { date: m.date, page: pg() },
  );

  /* ---- White space ---- */
  const ws = page(
    "05  ·  White Space & Opportunities",
    "The gap no one serves",
    `<div class="sublbl">The unoccupied quadrant</div>
     <p class="lead">${esc(data.whitespace.gap)}</p>
     <div class="sublbl mt">Kano categorization of competitor features</div>
     <div class="kano">
       <div class="kcard basics"><div class="kh">Basics: table stakes</div><ul>${kano.basics
         .map((i) => `<li>${esc(i)}</li>`)
         .join("")}</ul></div>
       <div class="kcard perf"><div class="kh">Performance: more is better</div><ul>${kano.performance
         .map((i) => `<li>${esc(i)}</li>`)
         .join("")}</ul></div>
       <div class="kcard delight"><div class="kh">Delighters: SkillFoundry's edge</div><ul>${kano.delighters
         .map((i) => `<li>${esc(i)}</li>`)
         .join("")}</ul></div>
     </div>
     <p class="kanonote"><b>Kano's warning:</b> ${esc(kano.note)}</p>`,
    { date: m.date, page: pg() },
  );

  /* ---- Action plan ---- */
  const action = page(
    "06  ·  Action Plan",
    "Battlecards for the sales conversation",
    `<p class="lead">Three moves, each with a trap-setting question that surfaces the gap in the buyer's current alternative. Use them in discovery to reframe the deal on SkillFoundry's terms.</p>
     ${data.actionPlan
       .map(
         (a) =>
           `<div class="battle">
             <div class="bt">${esc(a.target)}</div>
             <div class="blbl">Move</div>
             <div class="bmove">${esc(a.action)}</div>
             <div class="trap"><div class="traplbl">Trap-setting question</div><div class="trapq">${esc(
               a.trap,
             )}</div></div>
           </div>`,
       )
       .join("")}`,
    { date: m.date, page: pg() },
  );

  /* ---- Sources ---- */
  const sources = page(
    "07  ·  Sources",
    "Every claim, verifiable",
    `<p class="lead">Funding and pricing figures re-verified at build time (${esc(
      m.date,
    )}). Review-based strengths and weaknesses draw on public aggregators (G2, Capterra, Trustpilot) as cited.</p>
     <ol class="sources">${data.sources
       .map(
         (s) =>
           `<li><span class="snum">${s.n}</span><span class="stxt">${esc(
             s.t,
           )}<br><a href="${esc(s.u)}">${esc(s.u)}</a></span></li>`,
       )
       .join("")}</ol>`,
    { date: m.date, page: pg() },
  );

  return [cover, exec, landA, landB, matrix, map, ws, action, sources].join("\n");
}

export const REPORT_CSS = `
:root{
  --ink:#0D0B08; --paper:#FAF6EC; --card:#F4EEE0; --line:#D6CAB2;
  --faded:#7A6A50; --sub:#5A4E3A; --amber:#E0920C; --amber-lt:#FFB12B;
  --win:#2E7D32; --loss:#B0422B; --cream:#F0E8D5;
}
*{box-sizing:border-box}
.report{background:#3a332a;padding:0;margin:0}
.page{
  position:relative;width:816px;height:1056px;background:var(--paper);
  color:var(--ink);padding:56px 56px 44px;overflow:hidden;
  font-family:'Inter',system-ui,sans-serif;
  page-break-after:always;break-after:page;margin:0 auto;
}
.page:last-child{page-break-after:auto}
.ptop{display:flex;justify-content:space-between;align-items:center;
  border-bottom:2px solid var(--ink);padding-bottom:8px;margin-bottom:22px}
.ptop .brand{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:11px;letter-spacing:.14em}
.ptop .gc{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--faded)}
.pfoot{position:absolute;left:56px;right:56px;bottom:20px;display:flex;
  justify-content:space-between;border-top:2px solid var(--line);padding-top:8px;
  font-size:9px;color:var(--faded);font-family:'JetBrains Mono',monospace}
.shead{margin-bottom:18px}
.kicker{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--amber);font-weight:600}
.shead h2{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:26px;
  margin:8px 0 8px;letter-spacing:-.02em;text-transform:uppercase}
.rule{width:52px;height:3px;background:var(--amber-lt);}
.pbody{font-size:12.5px;line-height:1.5;color:var(--sub)}
.lead{font-size:12.5px;line-height:1.55;color:var(--sub);margin:0 0 14px}
.sublbl{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;
  color:var(--ink);margin-bottom:10px}
.mt{margin-top:22px}

/* cover */
.cover{padding:0}
.cover-band{background:var(--ink);color:var(--cream);padding:52px 56px 40px}
.cover-kicker{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:var(--amber-lt);margin-bottom:26px}
.cover-band h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:64px;margin:0;letter-spacing:-.03em;text-transform:uppercase}
.cover-sub{font-size:22px;color:#C9BA9E;margin-top:6px;font-weight:500}
.cover-lede{font-size:13.5px;line-height:1.6;color:#A8997B;max-width:640px;margin:20px 0 0}
.cover-date{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:12px;color:var(--amber-lt);margin-top:34px;letter-spacing:.1em}
.cover-body{padding:40px 56px}
.cover-thesis-lbl{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;margin-bottom:12px}
.cover-thesis{font-size:16px;line-height:1.65;color:var(--sub);margin:0 0 28px}
.cover-cat .cover-cat-v{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:15px;margin-top:6px;color:var(--ink)}
.cover-fine{margin-top:34px;border-top:1px solid var(--line);padding-top:16px}
.cover-fine p{font-size:11px;color:var(--faded);margin:0 0 6px;line-height:1.5}

/* statement + recs */
.statement-box{background:var(--card);
  border:2px solid var(--line);border-left:4px solid var(--amber);
  padding:16px 18px;font-style:italic;font-size:13.5px;line-height:1.6;color:var(--sub)}
.recs{counter-reset:r;list-style:none;padding:0;margin:0}
.recs li{position:relative;padding-left:30px;margin-bottom:16px}
.recs li::before{counter-increment:r;content:counter(r) ".";position:absolute;left:0;top:0;
  font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--amber);font-size:15px}
.rec-t{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;color:var(--ink);margin-bottom:3px}
.rec-b{font-size:11.8px;line-height:1.5;color:var(--sub)}

/* dossiers */
.dossier{border:2px solid var(--line);background:var(--card);border-radius:0;
  padding:14px 16px;margin-bottom:13px}
.dhead{display:flex;justify-content:space-between;align-items:baseline}
.dname{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;color:var(--ink)}
.darena{font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--amber);text-align:right}
.dpos{font-style:italic;font-size:11px;color:var(--sub);margin:5px 0 8px;line-height:1.4}
.dmeta{display:flex;gap:20px;font-size:10.5px;color:var(--ink);margin-bottom:8px}
.dmeta>div{flex:1}
.dlbl{display:block;font-family:'JetBrains Mono',monospace;font-size:8.5px;
  letter-spacing:.08em;color:var(--faded);text-transform:uppercase;margin-bottom:2px}
.dsw{display:flex;gap:18px}
.dcol{flex:1}
.dcolh{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.08em;
  text-transform:uppercase;margin-bottom:4px;font-weight:600}
.dcolh.win{color:var(--win)}.dcolh.loss{color:var(--loss)}
.dcol ul{margin:0;padding-left:13px}
.dcol li{font-size:10px;line-height:1.4;color:var(--sub);margin-bottom:2px}
.dflag{font-style:italic;font-size:9px;color:var(--faded);margin-top:7px}

/* watchlist */
.watch{margin-top:16px}
.watchlist{margin:0;padding-left:16px}
.watchlist li{font-size:11px;line-height:1.45;color:var(--sub);margin-bottom:5px}

/* matrix */
table.matrix{width:100%;border-collapse:collapse;margin-top:4px}
table.matrix th,table.matrix td{border-bottom:1px solid var(--line);padding:7px 3px;text-align:center;font-size:10px}
table.matrix th{font-family:'JetBrains Mono',monospace;font-size:8.6px;color:var(--faded);
  text-transform:uppercase;letter-spacing:.03em;vertical-align:bottom;border-bottom:2px solid var(--ink)}
table.matrix th.cap,table.matrix td.cap{text-align:left;width:186px;font-size:10.5px}
table.matrix td.cap{color:var(--ink);font-family:'Inter',sans-serif}
table.matrix th.wt,table.matrix td.wt{width:26px}
table.matrix td.wt{font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--amber)}
table.matrix .sfcol{background:#FFF3DC}
table.matrix th.sfcol{color:var(--amber);font-weight:700}
tbody tr:nth-child(even) td:not(.sfcol){background:rgba(0,0,0,.02)}
.dot{display:inline-block;width:13px;height:13px;border-radius:50%;vertical-align:middle;
  line-height:13px;font-size:9px;font-weight:700;color:#fff;text-align:center}
.dot.yes{background:var(--ink)}
.dot.partial{background:var(--paper);border:1.5px solid var(--faded);
  box-shadow:inset 0 0 0 3px var(--faded)}
.dot.no{background:transparent;border:1.5px solid var(--line)}
.dot.yes.sf{background:var(--win)}
.dot.partial.sf{background:var(--paper);border:1.5px solid var(--win);box-shadow:inset 0 0 0 3px var(--win)}
.dot.no.sf{background:transparent;border:1.5px solid var(--loss);color:var(--loss);text-shadow:none}
.legend{display:flex;align-items:center;gap:8px;margin-top:16px;font-size:10px;color:var(--sub);flex-wrap:wrap}
.legend .dot{margin-left:10px}
.legend .dot:first-child{margin-left:0}

/* positioning map */
.mapwrap{position:relative;width:600px;margin:6px auto 0;padding-left:26px;padding-bottom:26px}
.plot{position:relative;width:560px;height:420px;background:#fff;border:2px solid var(--line);margin-left:14px}
.ws-band{position:absolute;left:50%;top:0;width:50%;height:50%;background:#FFF6E3}
.ws-tag{position:absolute;right:8px;top:8px;font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--amber);font-weight:700;letter-spacing:.06em}
.vline{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#E1D6BE}
.hline{position:absolute;left:0;right:0;top:50%;height:1px;background:#E1D6BE}
.pt{position:absolute;transform:translate(-6px,-6px);display:flex;align-items:center;gap:6px;white-space:nowrap}
.pt-dot{width:9px;height:9px;border-radius:50%;background:var(--ink);flex:none}
.pt-lbl{font-size:10.5px;color:var(--sub)}
.pt.hi .pt-dot{width:15px;height:15px;background:var(--amber);border:2px solid var(--ink);margin-left:-3px}
.pt.hi .pt-lbl{font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--ink);font-size:12px}
.xlab{position:absolute;bottom:0;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--faded);font-weight:600}
.xlab.xleft{left:14px}.xlab.xright{right:0}
.ylab{position:absolute;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:var(--faded);font-weight:600;
  writing-mode:vertical-rl;transform:rotate(180deg)}
.ylab.ytop{left:-4px;top:0}.ylab.ybot{left:-4px;bottom:26px}
.mapnote{font-size:11.5px;line-height:1.55;color:var(--sub);margin-top:22px}

/* kano / white space */
.kano{display:flex;gap:12px;margin-top:4px}
.kcard{flex:1;border:2px solid var(--line);padding:12px;background:var(--card)}
.kcard .kh{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:11.5px;margin-bottom:7px}
.kcard.basics .kh{color:var(--faded)}
.kcard.perf .kh{color:var(--amber)}
.kcard.delight{background:#FFF6E3;border-color:var(--amber-lt)}
.kcard.delight .kh{color:var(--win)}
.kcard ul{margin:0;padding-left:14px}
.kcard li{font-size:10px;line-height:1.4;color:var(--sub);margin-bottom:5px}
.kanonote{font-size:11.5px;line-height:1.55;color:var(--sub);margin-top:18px;font-style:italic}

/* battlecards */
.battle{border:2px solid var(--line);padding:14px 16px;margin-bottom:14px;background:var(--card)}
.bt{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14.5px;color:var(--ink);margin-bottom:8px}
.blbl,.traplbl{font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.08em;
  text-transform:uppercase;color:var(--amber);font-weight:600;margin-bottom:4px}
.bmove{font-size:11.5px;line-height:1.5;color:var(--sub);margin-bottom:12px}
.trap{background:var(--ink);border-left:4px solid var(--amber);padding:11px 14px}
.trap .traplbl{color:var(--amber-lt)}
.trapq{font-style:italic;font-size:12px;line-height:1.5;color:var(--cream)}

/* sources */
ol.sources{list-style:none;padding:0;margin:6px 0 0;columns:2;column-gap:30px}
ol.sources li{display:flex;gap:9px;margin-bottom:12px;break-inside:avoid;-webkit-column-break-inside:avoid}
.snum{font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--amber);font-size:11px;flex:none;width:18px}
.stxt{font-size:10px;line-height:1.35;color:var(--ink)}
.stxt a{color:#3f6fa3;font-size:8.5px;word-break:break-all;text-decoration:none}
`;
