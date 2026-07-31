/**
 * Render the Cartographers' Table Session 1 deck to PNGs + PDF.
 * Output: exports/fdi-workshop-series/deck/
 *
 * Prerequisites:
 *   - mockup-sandbox dev server running on port 23636
 *   - chromium available via `which chromium`
 */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

let CHROME;
try {
  CHROME = execSync("which chromium").toString().trim();
} catch {
  console.error("chromium not found on PATH; install it via Nix before running.");
  process.exit(1);
}

const DECK_URL = "http://localhost:23636/__mockup/deck/workshop-session1-deck.html";
const OUT = path.resolve(import.meta.dirname, "../../exports/fdi-workshop-series/deck");
const SLIDES = 13;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--force-color-profile=srgb",
  ],
});

await mkdir(OUT, { recursive: true });

const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(DECK_URL, { waitUntil: "load", timeout: 30000 });
await page.evaluate(async () => { await document.fonts.ready; });
await new Promise((r) => setTimeout(r, 600));

// ---- Per-slide PNGs ----
for (let i = 1; i <= SLIDES; i++) {
  const el = await page.$(`#s${i}`);
  if (!el) {
    console.error(`Slide #s${i} not found; expected ${SLIDES} slides. Aborting.`);
    await browser.close();
    process.exit(1);
  }
  const box = await el.boundingBox();
  if (!box) {
    console.error(`Slide #s${i} has no bounding box (not rendered?). Aborting.`);
    await browser.close();
    process.exit(1);
  }
  const name = `slide-${String(i).padStart(2, "0")}-1920x1080.png`;
  await page.screenshot({
    path: path.join(OUT, name),
    clip: { x: box.x, y: box.y, width: 1920, height: 1080 },
  });
  console.log(`[${i}/${SLIDES}] ${name}`);
}

// ---- PDF (one 1920×1080 page per slide) ----
await page.emulateMediaType("print");
await page.pdf({
  path: path.join(OUT, "fdi-workshop-session1-aggregated.pdf"),
  printBackground: true,
  preferCSSPageSize: true,
});
console.log("PDF: fdi-workshop-session1-aggregated.pdf");

await browser.close();
console.log(`Done -> ${OUT}`);
