#!/usr/bin/env node
// Recapture the /davos-kit-demo journey screenshots that can be automated.
//
// Usage:  DAVOS_DEMO_PASSWORD=... node site/capture-davos-journey.mjs [baseUrl]
//
// Captures journey-1 (the gated product page hero) headlessly with the auth
// cookie, at the same 1360x850 viewport @2x used for the originals, and
// writes it to site/src/assets/davos-demo/. Screenshots 2-4 (Stripe checkout,
// success page, gated download) require a live test-mode purchase and must be
// recaptured by hand when the flow changes; journey-5 is a rendered document
// mock. Run `node site/build.mjs` afterwards so dist/ picks up the new file.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "src", "assets", "davos-demo");
const BASE = process.argv[2] || `http://localhost:${process.env.PORT || 5000}`;
const PASSWORD = process.env.DAVOS_DEMO_PASSWORD;

if (!PASSWORD) {
  console.error("DAVOS_DEMO_PASSWORD is not set; cannot authenticate to the gated page.");
  process.exit(1);
}

async function getCookie() {
  const res = await fetch(`${BASE}/davos-kit-demo`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password: PASSWORD }),
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const m = setCookie.match(/dk_demo=([^;]+)/);
  if (!m) {
    console.error(`Gate did not issue a cookie (status ${res.status}). Wrong password?`);
    process.exit(1);
  }
  return m[1];
}

function chromiumPath() {
  try {
    return execSync("which chromium || which chromium-browser", { encoding: "utf8" }).trim();
  } catch {
    console.error("chromium not found on PATH (Nix chromium is required).");
    process.exit(1);
  }
}

const token = await getCookie();
const { default: puppeteer } = await import("puppeteer-core");
const browser = await puppeteer.launch({
  executablePath: chromiumPath(),
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1360, height: 850, deviceScaleFactor: 2 });
  const url = new URL(BASE);
  await page.setCookie({ name: "dk_demo", value: token, domain: url.hostname, path: "/" });
  await page.goto(`${BASE}/davos-kit-demo`, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 800)); // let fonts settle
  const out = path.join(OUT_DIR, "journey-1-product-page.png");
  await page.screenshot({ path: out });
  console.log(`captured ${path.relative(process.cwd(), out)} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
  console.log("Reminder: journey-2..4 need a manual Stripe test purchase if the flow changed.");
} finally {
  await browser.close();
}
