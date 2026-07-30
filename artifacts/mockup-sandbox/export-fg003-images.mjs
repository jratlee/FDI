import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

let CHROME;
try {
  CHROME = execSync("which chromium").toString().trim();
} catch {
  console.error("chromium not found on PATH; install via Nix before running.");
  process.exit(1);
}

const BASE = "http://localhost:23636/__mockup/launch";
const OUT = path.resolve(import.meta.dirname, "../../exports/field-guide-003-decentralized");

const jobs = [
  { url: `${BASE}/fg003-cover.html`,            w: 1200, h: 627,  out: "fg003-cover-1200x627.png" },
  { url: `${BASE}/viz-protocol-ownership.html`, w: 1200, h: 680,  out: "viz-protocol-ownership-1200x680.png" },
  { url: `${BASE}/viz-wallet-identity.html`,    w: 1200, h: 640,  out: "viz-wallet-identity-1200x640.png" },
  { url: `${BASE}/viz-agent-settlement.html`,   w: 1200, h: 700,  out: "viz-agent-settlement-1200x700.png" },
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
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: path.join(OUT, job.out), clip: { x: 0, y: 0, width: job.w, height: job.h } });
  ok++;
  console.log(`[${ok}/${jobs.length}] ${job.out}`);
}
await browser.close();
console.log(`Done -> ${OUT}`);
