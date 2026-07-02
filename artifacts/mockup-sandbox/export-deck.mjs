import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";

const CHROME = execSync("which chromium").toString().trim();
const URL = "http://localhost:23636/__mockup/deck/field-guide-deck.html";
const OUT = path.resolve(import.meta.dirname, "../../exports/field-guide-launch");
const SLIDES = 13;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--force-color-profile=srgb"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "load", timeout: 30000 });
await page.evaluate(async () => { await document.fonts.ready; });
await new Promise((r) => setTimeout(r, 300));

await mkdir(path.join(OUT, "deck-slides"), { recursive: true });

for (let i = 1; i <= SLIDES; i++) {
  const el = await page.$(`#s${i}`);
  const box = await el.boundingBox();
  const name = `deck-slides/slide-${String(i).padStart(2, "0")}-1920x1080.png`;
  await page.screenshot({ path: path.join(OUT, name), clip: { x: box.x, y: box.y, width: 1920, height: 1080 } });
  console.log(`[${i}/${SLIDES}] ${name}`);
}

// Multi-page PDF (one 1920x1080 page per slide; margins collapsed via @page in the deck CSS)
await page.emulateMediaType("print");
await page.pdf({
  path: path.join(OUT, "fdi-field-guide-deck.pdf"),
  printBackground: true,
  preferCSSPageSize: true,
});
console.log("PDF: fdi-field-guide-deck.pdf");

await browser.close();
console.log(`Done -> ${OUT}`);
