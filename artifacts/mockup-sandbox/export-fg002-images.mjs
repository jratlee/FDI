import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

const CHROME = execSync("which chromium").toString().trim();
const BASE = "http://localhost:23636/__mockup/launch";
const OUT = path.resolve(import.meta.dirname, "../../exports/field-guide-002-aggregated");

const jobs = [
  { url: `${BASE}/fg002-cover.html`, w: 1200, h: 627, out: "fg002-cover-1200x627.png" },
  { url: `${BASE}/viz-answer-layer.html`, w: 1200, h: 700, out: "viz-answer-layer-1200x700.png" },
  { url: `${BASE}/viz-reach-collapse.html`, w: 1200, h: 640, out: "viz-reach-collapse-1200x640.png" },
  { url: `${BASE}/viz-triopoly-2026.html`, w: 1200, h: 680, out: "viz-triopoly-2026-1200x680.png" },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--force-color-profile=srgb"],
});

const page = await browser.newPage();
await mkdir(OUT, { recursive: true });
let ok = 0;
for (const job of jobs) {
  await page.setViewport({ width: job.w, height: job.h, deviceScaleFactor: 1 });
  await page.goto(job.url, { waitUntil: "load", timeout: 30000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise((r) => setTimeout(r, 150));
  await page.screenshot({ path: path.join(OUT, job.out), clip: { x: 0, y: 0, width: job.w, height: job.h } });
  ok++;
  console.log(`[${ok}/${jobs.length}] ${job.out}`);
}
await browser.close();
console.log(`Done -> ${OUT}`);
