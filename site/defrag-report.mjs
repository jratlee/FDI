// Branded rendering for Process Defragmentation Reports: on-brand HTML for
// the admin view and a headless-chromium PDF export. All report strings are
// HTML-escaped here, so nothing the model (or the source document) produced
// can inject markup.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "..", "artifacts", "mockup-sandbox", "public", "fonts");

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------------- fonts ---------------- */

const FONT_FACES = [
  ["Space Grotesk", 400, "space-grotesk-400-latin.woff2"],
  ["Space Grotesk", 600, "space-grotesk-600-latin.woff2"],
  ["Space Grotesk", 700, "space-grotesk-700-latin.woff2"],
  ["Inter", 400, "inter-400-latin.woff2"],
  ["Inter", 500, "inter-500-latin.woff2"],
  ["Inter", 600, "inter-600-latin.woff2"],
  ["JetBrains Mono", 500, "jetbrains-mono-500-latin.woff2"],
  ["JetBrains Mono", 700, "jetbrains-mono-700-latin.woff2"],
];

let _embeddedFontCss = null;
export function embeddedFontCss() {
  if (_embeddedFontCss !== null) return _embeddedFontCss;
  const rules = [];
  for (const [family, weight, file] of FONT_FACES) {
    try {
      const b64 = fs.readFileSync(path.join(FONTS_DIR, file)).toString("base64");
      rules.push(
        `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`,
      );
    } catch {
      // Missing font file: fall back to system fonts silently.
    }
  }
  _embeddedFontCss = rules.join("\n");
  return _embeddedFontCss;
}

function linkedFontCss() {
  return FONT_FACES.map(
    ([family, weight, file]) =>
      `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url('/fonts/${file}') format('woff2');}`,
  ).join("\n");
}

/* ---------------- template ---------------- */

const REPORT_CSS = `
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0D0B08;color:#F0E8D5;font-family:'Inter',system-ui,sans-serif;font-size:14px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{max-width:820px;margin:0 auto;padding:52px 48px}
  .eyebrow{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:#A8997B;display:flex;align-items:center;gap:12px;margin:0 0 18px}
  .eyebrow::before{content:"";width:22px;border-top:2px solid #FFB12B}
  h1{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:30px;line-height:1.12;letter-spacing:-.015em;margin:0 0 6px;color:#F0E8D5}
  h2{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:19px;margin:0 0 14px;color:#F0E8D5}
  .meta{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px;color:#7A6A50;margin:0 0 34px}
  .meta b{color:#A8997B;font-weight:500}
  section{margin:0 0 36px;break-inside:avoid-page}
  .summary{font-size:15px;color:#E7DFC9}
  .scoreband{display:flex;gap:26px;align-items:center;border:1px solid #2a2418;border-radius:12px;padding:22px 26px;background:#15120c;margin:0 0 36px;break-inside:avoid}
  .score{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:52px;line-height:1;color:#FFB12B;min-width:110px}
  .score small{display:block;font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:500;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#A8997B;margin-top:8px}
  .score-why{color:#A8997B;font-size:13.5px}
  .item{border:1px solid #2a2418;border-radius:10px;padding:16px 18px;margin:0 0 12px;background:#100e09;break-inside:avoid}
  .item h3{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:15px;margin:0 0 6px;color:#F0E8D5}
  .item p{margin:0;color:#A8997B;font-size:13.5px}
  .sev{float:right;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;border:1px solid #2a2418;border-radius:999px;padding:3px 10px;margin-left:12px}
  .sev.high{color:#FFB12B;border-color:#E0920C}
  .sev.medium{color:#FFCB6B}
  .sev.low{color:#A8997B}
  .call{float:right;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#FFCB6B;border:1px solid #E0920C;border-radius:999px;padding:3px 10px;margin-left:12px}
  ol.recs{margin:0;padding:0 0 0 22px}
  ol.recs li{margin:0 0 10px;color:#E7DFC9}
  .foot{border-top:1px solid #2a2418;padding-top:20px;margin-top:44px;color:#7A6A50;font-size:11.5px}
  .foot p{margin:0 0 8px}
  .brand{font-family:'Space Grotesk',sans-serif;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#A8997B;font-size:11px}
`;

const DISCLAIMER =
  "This report is an advisory diagnostic generated from the material provided. Findings are directional and worth validating against your own records. It is not legal, financial, or compliance advice.";

// Render the full report document. `mode` is "web" (fonts served from /fonts)
// or "pdf" (fonts base64-embedded so headless chromium can use them).
export function renderReportHTML(row, mode = "web") {
  const r = row.report;
  const fonts = mode === "pdf" ? embeddedFontCss() : linkedFontCss();
  const date = (row.created_at instanceof Date ? row.created_at : new Date(row.created_at))
    .toISOString()
    .slice(0, 10);

  const bottlenecks = (r.bottlenecks || [])
    .map(
      (b) => `<div class="item"><span class="sev ${esc(b.severity)}">${esc(b.severity)}</span><h3>${esc(b.name)}</h3><p>${esc(b.diagnosis)}</p></div>`,
    )
    .join("");
  const killList = (r.kill_list || [])
    .map((k) => `<div class="item"><h3>${esc(k.item)}</h3><p>${esc(k.reason)}</p></div>`)
    .join("");
  const classification = (r.classification || [])
    .map(
      (c) => `<div class="item"><span class="call">${esc(c.call)}</span><h3>${esc(c.activity)}</h3><p>${esc(c.rationale)}</p></div>`,
    )
    .join("");
  const recs = (r.recommendations || []).map((x) => `<li>${esc(x)}</li>`).join("");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(r.title)} | False Dawn Industries</title>
<style>${fonts}\n${REPORT_CSS}</style></head><body><div class="page">
<p class="eyebrow">Growth Cartography · Process Defragmentation</p>
<h1>${esc(r.title)}</h1>
<p class="meta">Prepared for <b>${esc(row.prospect)}</b> · ${esc(date)} · False Dawn Industries</p>

<div class="scoreband">
  <div class="score">${Number(r.readiness_score) || 0}<small>Readiness / 100</small></div>
  <div class="score-why">${esc(r.score_rationale)}</div>
</div>

<section><h2>Executive summary</h2><p class="summary">${esc(r.summary)}</p></section>

${bottlenecks ? `<section><h2>Bottleneck diagnosis</h2>${bottlenecks}</section>` : ""}
${killList ? `<section><h2>Audit-to-Kill candidates</h2>${killList}</section>` : ""}
${classification ? `<section><h2>Use / Compose / Build calls</h2>${classification}</section>` : ""}
${recs ? `<section><h2>Recommended next moves</h2><ol class="recs">${recs}</ol></section>` : ""}

<div class="foot">
  <p class="brand">False Dawn Industries</p>
  <p>${esc(DISCLAIMER)}</p>
  <p>Source material is retained only for the stated retention window and deleted on request. Client data is not used to train models.</p>
</div>
</div></body></html>`;
}

/* ---------------- PDF export ---------------- */

let _chromiumPath = null;
function chromiumPath() {
  if (_chromiumPath) return _chromiumPath;
  _chromiumPath = execSync("which chromium").toString().trim();
  return _chromiumPath;
}

// Print any self-contained HTML document to a PDF Buffer with headless
// chromium. Flowing Letter pages, so long documents paginate naturally.
export async function htmlToPDF(html) {
  const { default: puppeteer } = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: chromiumPath(),
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
    });
  } finally {
    await browser.close();
  }
}

// Render a defrag report row to a PDF Buffer.
export async function renderReportPDF(row) {
  return htmlToPDF(renderReportHTML(row, "pdf"));
}
