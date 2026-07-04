import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

const CHROME = execSync("which chromium").toString().trim();
const BASE = "http://localhost:23636/__mockup/launch";
const OUT = path.resolve(import.meta.dirname, "../../exports/field-guide-launch");

const jobs = [
  { url: `${BASE}/ig-feed.html`,   w: 1080, h: 1350, out: "ig-feed-1080x1350.png" },
  { url: `${BASE}/ig-story1.html`, w: 1080, h: 1920, out: "ig-story-1-1080x1920.png" },
  { url: `${BASE}/ig-story2.html`, w: 1080, h: 1920, out: "ig-story-2-1080x1920.png" },
  { url: `${BASE}/ig-story3.html`, w: 1080, h: 1920, out: "ig-story-3-1080x1920.png" },
  { url: `${BASE}/li-card.html`,   w: 1200, h: 627,  out: "li-card-1200x627.png" },
  { url: `${BASE}/li-article-header.html`, w: 1200, h: 627, out: "li-article-header-1200x627.png" },
  { url: `${BASE}/viz-identity-bridge.html`, w: 1200, h: 620, out: "viz-identity-bridge-1200x620.png" },
  { url: `${BASE}/viz-two-builds.html`, w: 1200, h: 700, out: "viz-two-builds-1200x700.png" },
  { url: `${BASE}/viz-three-markets.html`, w: 1200, h: 680, out: "viz-three-markets-1200x680.png" },
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
