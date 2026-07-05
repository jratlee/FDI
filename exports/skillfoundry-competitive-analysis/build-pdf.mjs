import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderReportHTML, REPORT_CSS } from "./report-template.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const FONTS = path.join(ROOT, "artifacts", "mockup-sandbox", "public", "fonts");
const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "report-data.json"), "utf8"),
);

const b64 = (file) =>
  fs.readFileSync(path.join(FONTS, file)).toString("base64");
const face = (family, weight, file, style = "normal") =>
  `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64(
    file,
  )}) format('woff2');}`;

const fontCss = [
  face("Space Grotesk", 400, "space-grotesk-400-latin.woff2"),
  face("Space Grotesk", 500, "space-grotesk-500-latin.woff2"),
  face("Space Grotesk", 600, "space-grotesk-600-latin.woff2"),
  face("Space Grotesk", 700, "space-grotesk-700-latin.woff2"),
  face("Inter", 400, "inter-400-latin.woff2"),
  face("Inter", 500, "inter-500-latin.woff2"),
  face("Inter", 600, "inter-600-latin.woff2"),
  face("JetBrains Mono", 400, "jetbrains-mono-400-latin.woff2"),
  face("JetBrains Mono", 500, "jetbrains-mono-500-latin.woff2"),
].join("\n");

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${fontCss}
html,body{margin:0;padding:0;background:#fff}
${REPORT_CSS}
.page{margin:0 auto}
</style></head><body><div class="report">${renderReportHTML(data)}</div></body></html>`;

const htmlPath = path.join(__dirname, "report.html");
fs.writeFileSync(htmlPath, html);

const CHROME = execSync("which chromium").toString().trim();
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
const page = await browser.newPage();
await page.goto("file://" + htmlPath, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");

const outPath = path.join(__dirname, "SkillFoundry-Competitive-Analysis.pdf");
await page.pdf({
  path: outPath,
  width: "816px",
  height: "1056px",
  printBackground: true,
  pageRanges: "",
});
await browser.close();

const bytes = fs.statSync(outPath).size;
console.log("Wrote " + outPath + " (" + bytes + " bytes)");
