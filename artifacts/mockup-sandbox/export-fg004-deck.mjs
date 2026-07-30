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

const BASE_URL = "http://localhost:23636/__mockup";
const DECK_URL = `${BASE_URL}/deck/field-guide-004-deck.html`;
const COVER_URL = `${BASE_URL}/deck/fg004-cover.html`;
const OUT = path.resolve(import.meta.dirname, "../../exports/field-guide-004-autonomous");
const SLIDES = 13;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--force-color-profile=srgb"],
});

// ---- deck slides + PDF ----
const deckPage = await browser.newPage();
await deckPage.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await deckPage.goto(DECK_URL, { waitUntil: "load", timeout: 30000 });
await deckPage.evaluate(async () => { await document.fonts.ready; });
await new Promise((r) => setTimeout(r, 500));

await mkdir(path.join(OUT, "deck-slides"), { recursive: true });

for (let i = 1; i <= SLIDES; i++) {
  const el = await deckPage.$(`#s${i}`);
  if (!el) {
    console.error(`Slide #s${i} not found in the deck HTML; expected ${SLIDES} slides.`);
    await browser.close();
    process.exit(1);
  }
  const box = await el.boundingBox();
  if (!box) {
    console.error(`Slide #s${i} has no bounding box (not rendered?).`);
    await browser.close();
    process.exit(1);
  }
  const name = `deck-slides/slide-${String(i).padStart(2, "0")}-1920x1080.png`;
  await deckPage.screenshot({ path: path.join(OUT, name), clip: { x: box.x, y: box.y, width: 1920, height: 1080 } });
  console.log(`[${i}/${SLIDES}] ${name}`);
}

await deckPage.emulateMediaType("print");
await deckPage.pdf({
  path: path.join(OUT, "fdi-field-guide-004-deck.pdf"),
  printBackground: true,
  preferCSSPageSize: true,
});
console.log("PDF: fdi-field-guide-004-deck.pdf");

// ---- cover image 1200x627 ----
const coverPage = await browser.newPage();
await coverPage.setViewport({ width: 1200, height: 627, deviceScaleFactor: 1 });
await coverPage.goto(COVER_URL, { waitUntil: "load", timeout: 30000 });
await coverPage.evaluate(async () => { await document.fonts.ready; });
await new Promise((r) => setTimeout(r, 300));

const coverEl = await coverPage.$("#cover");
const coverBox = await coverEl.boundingBox();
await coverPage.screenshot({
  path: path.join(OUT, "fg004-cover-1200x627.png"),
  clip: { x: coverBox.x, y: coverBox.y, width: 1200, height: 627 },
});
console.log("Cover: fg004-cover-1200x627.png");

await browser.close();
console.log(`Done -> ${OUT}`);
