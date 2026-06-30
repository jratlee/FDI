import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

const CHROME = execSync("which chromium").toString().trim();
const BASE = "http://localhost:23636/__mockup";
const OUT = path.resolve(import.meta.dirname, "../../exports/false-dawn-campaign");

const adAngles = ["angle1-chart", "angle2-truenorth", "angle3-bearing", "angle4-coordinates"];
const adFormats = [
  ["landscape", 1200, 628],
  ["square", 1080, 1080],
  ["portrait", 1080, 1350],
  ["story", 1080, 1920],
];

const jobs = [];
for (const angle of adAngles) {
  for (const [fmt, w, h] of adFormats) {
    jobs.push({ url: `${BASE}/ads/${angle}.html`, w, h, out: `ads/${angle}/${angle}-${fmt}-${w}x${h}.png` });
  }
}

// Avatars (single vmin-based source, rendered directly at each target size)
jobs.push({ url: `${BASE}/channel/avatar.html`, w: 400, h: 400, out: "channel/github/gh-avatar-400x400.png" });
jobs.push({ url: `${BASE}/channel/avatar.html`, w: 320, h: 320, out: "channel/instagram/ig-avatar-320x320.png" });
jobs.push({ url: `${BASE}/channel/avatar.html`, w: 400, h: 400, out: "channel/linkedin/li-avatar-400x400.png" });

// GitHub
jobs.push({ url: `${BASE}/channel/gh-header.html`, w: 1280, h: 320, out: "channel/github/gh-readme-header-1280x320.png" });
jobs.push({ url: `${BASE}/channel/gh-social.html`, w: 1280, h: 640, out: "channel/github/gh-social-preview-1280x640.png" });

// Instagram
for (let i = 1; i <= 3; i++)
  jobs.push({ url: `${BASE}/channel/ig-grid${i}.html`, w: 1080, h: 1080, out: `channel/instagram/ig-grid-${i}-1080x1080.png` });
for (let i = 1; i <= 3; i++)
  jobs.push({ url: `${BASE}/channel/ig-hl${i}.html`, w: 1080, h: 1920, out: `channel/instagram/ig-highlight-${i}-1080x1920.png` });

// LinkedIn
jobs.push({ url: `${BASE}/channel/li-cover.html`, w: 1128, h: 191, out: "channel/linkedin/li-cover-1128x191.png" });

// Brand boards — rendered at deviceScaleFactor 2 for crisp documentation quality
// (logical 1280x1600; actual PNG pixels are 2560x3200)
const boardJobs = [
  { slug: "ColorTypography", name: "board-01-color-typography-1280x1600.png" },
  { slug: "LogoConcepts",    name: "board-02-logo-concepts-1280x1600.png"    },
  { slug: "BrandInAction",   name: "board-03-brand-in-action-1280x1600.png"  },
  { slug: "BrandGuidelines", name: "board-04-brand-guidelines-1280x1600.png" },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--force-color-profile=srgb"],
});

const total = jobs.length + boardJobs.length;
const page = await browser.newPage();
let ok = 0;

// --- Ad + channel jobs (exact platform px, deviceScaleFactor 1) ---
for (const job of jobs) {
  await page.setViewport({ width: job.w, height: job.h, deviceScaleFactor: 1 });
  await page.goto(job.url, { waitUntil: "load", timeout: 30000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise((r) => setTimeout(r, 150));
  const outPath = path.join(OUT, job.out);
  await mkdir(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: job.w, height: job.h } });
  ok++;
  console.log(`[${ok}/${total}] ${job.out} (${job.w}x${job.h})`);
}

// --- Brand boards (deviceScaleFactor 2 for crisp documentation quality) ---
for (const board of boardJobs) {
  const url = `${BASE}/preview/brand-kit/${board.slug}`;
  await page.setViewport({ width: 1280, height: 1600, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await new Promise((r) => setTimeout(r, 300));
  const outPath = path.join(OUT, "brand-boards", board.name);
  await mkdir(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1280, height: 1600 } });
  ok++;
  console.log(`[${ok}/${total}] brand-boards/${board.name} (1280x1600 @2x)`);
}

await browser.close();
console.log(`Done: ${ok}/${total} exported to ${OUT}`);
