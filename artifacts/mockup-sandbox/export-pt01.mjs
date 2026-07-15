import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

let CHROME;
try {
  CHROME = execSync("which chromium").toString().trim();
} catch {
  console.error("chromium not found on PATH; install it via Nix before running this script.");
  process.exit(1);
}
const BASE = "http://localhost:23636/__mockup/pt01";
const OUT = path.resolve(import.meta.dirname, "../../exports/performance-thinking-01/images");

const jobs = [
  { url: `${BASE}/pt-cover.html`,       w: 1280, h: 720,  out: "pt-cover-1280x720.png" },
  { url: `${BASE}/viz-org-shapes.html`, w: 1200, h: 1500, out: "viz-org-shapes-1200x1500.png" },
  { url: `${BASE}/viz-loop-ladder.html`,w: 1200, h: 1500, out: "viz-loop-ladder-1200x1500.png" },
  { url: `${BASE}/viz-proof-stack.html`,w: 1200, h: 1500, out: "viz-proof-stack-1200x1500.png" },
  { url: `${BASE}/viz-seo-geo.html`,    w: 1200, h: 1500, out: "viz-seo-geo-1200x1500.png" },
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
