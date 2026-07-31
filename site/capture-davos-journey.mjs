#!/usr/bin/env node
// Recapture all five /davos-kit-demo journey screenshots headlessly.
//
// Usage:
//   DAVOS_DEMO_PASSWORD=... node site/capture-davos-journey.mjs [baseUrl]
//
// Requires:
//   - A running site server (node site/build.mjs && node site/serve.mjs)
//   - DAVOS_DEMO_PASSWORD env var
//   - DAVOSKIT_TIER1_PRICE_ID env var (for the Stripe checkout)
//   - STRIPE_TEST_API_KEY or STRIPE_SECRET_KEY env var
//   - Nix chromium on PATH
//
// Writes to site/src/assets/davos-demo/:
//   journey-1-product-page.png   — authenticated demo page hero
//   journey-2-checkout.png       — Stripe Checkout filled, ready to submit
//   journey-3-success-key.png    — success page with license key
//   journey-4-download.png       — success page download button highlighted
//   journey-5-documents.png      — rendered kit document (README.md)

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "src", "assets", "davos-demo");
const BASE = (process.argv[2] || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, "");
const PASSWORD = process.env.DAVOS_DEMO_PASSWORD;

if (!PASSWORD) {
  console.error("DAVOS_DEMO_PASSWORD is not set; cannot authenticate to the gated page.");
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

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

async function createCheckoutSession() {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier: "dk1" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok || !json.url) {
    throw new Error(`Checkout API returned ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.url;
}

function chromiumPath() {
  try {
    return execSync("which chromium || which chromium-browser", { encoding: "utf8" }).trim();
  } catch {
    console.error("chromium not found on PATH (Nix chromium is required).");
    process.exit(1);
  }
}

async function typeSlowly(page, selector, text, delay = 70) {
  await page.focus(selector);
  await page.type(selector, text, { delay });
}

function shot(size) {
  return Math.round(size / 1024) + " KB";
}

function save(filePath, label) {
  const size = fs.statSync(filePath).size;
  console.log(`  ✓ ${label} → ${path.relative(process.cwd(), filePath)} (${shot(size)})`);
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log(`\nDavos journey screenshot capture`);
console.log(`Base: ${BASE}\n`);

// Preflight: server reachable?
try {
  const ping = await fetch(`${BASE}/`);
  if (!ping.ok && ping.status !== 301 && ping.status !== 302) throw new Error(`HTTP ${ping.status}`);
} catch (err) {
  console.error(`Server not reachable at ${BASE}: ${err.message}`);
  console.error("Run: node site/build.mjs && node site/serve.mjs");
  process.exit(1);
}

const token = await getCookie();
console.log("  ✓ Gate authenticated, dk_demo cookie obtained");

const checkoutUrl = await createCheckoutSession();
console.log(`  ✓ Checkout session created: ${checkoutUrl.slice(0, 72)}…`);

const { default: puppeteer } = await import("puppeteer-core");
const execPath = chromiumPath();
const browser = await puppeteer.launch({
  executablePath: execPath,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--font-render-hinting=none",
    "--disable-gpu",
  ],
  headless: true,
});

const VIEWPORT = { width: 1360, height: 850, deviceScaleFactor: 2 };

try {
  // ── Journey 1: authenticated product demo page ──────────────────────────
  console.log("\n[1/5] Demo product page…");
  {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    const url = new URL(BASE);
    await page.setCookie({ name: "dk_demo", value: token, domain: url.hostname, path: "/" });
    await page.goto(`${BASE}/davos-kit-demo`, { waitUntil: "networkidle0", timeout: 60_000 });
    await new Promise((r) => setTimeout(r, 900)); // fonts settle
    const out = path.join(OUT_DIR, "journey-1-product-page.png");
    await page.screenshot({ path: out });
    save(out, "journey-1-product-page.png");
    await page.close();
  }

  // ── Journey 2: Stripe checkout page (filled, before submit) ─────────────
  console.log("\n[2/5] Stripe checkout (filled)…");
  let checkoutPage;
  let licenseKey;
  {
    checkoutPage = await browser.newPage();
    checkoutPage.setDefaultTimeout(60_000);
    await checkoutPage.setViewport(VIEWPORT);

    await checkoutPage.goto(checkoutUrl, { waitUntil: "networkidle0", timeout: 60_000 });

    // Accept cookie banner if present.
    try {
      await checkoutPage.click('[data-testid="accept-cookies-button"]', { timeout: 3000 });
    } catch { /* none */ }

    // Expand card accordion if needed.
    try {
      const cardAccordion =
        (await checkoutPage.$('[data-testid="card-accordion-item"]')) ||
        (await checkoutPage.$('[id*="card"][role="radio"]'));
      if (cardAccordion) {
        await cardAccordion.click();
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch { /* already open */ }

    // Billing country first (unlocks address fields).
    await checkoutPage.select("#billingCountry", "US");
    await new Promise((r) => setTimeout(r, 500));

    // "Enter address manually" link.
    try {
      const manualLink = await checkoutPage.waitForSelector(
        'a[data-testid="manual-address-link"], button[data-testid="manual-address-link"]',
        { timeout: 4000 },
      );
      await manualLink.click();
      await new Promise((r) => setTimeout(r, 400));
    } catch { /* already manual */ }

    // Address fields.
    for (const [sel, val] of [
      ["#billingAddressLine1", "123 Main St"],
      ["#billingLocality",     "Brooklyn"],
      ["#billingPostalCode",   "11201"],
    ]) {
      try {
        await checkoutPage.waitForSelector(sel, { timeout: 3000 });
        await checkoutPage.$eval(sel, (el) => { el.value = ""; });
        await typeSlowly(checkoutPage, sel, val);
      } catch { /* optional */ }
    }
    try {
      await checkoutPage.select("#billingAdministrativeArea", "NY");
    } catch { /* optional */ }

    // Card fields.
    await checkoutPage.waitForSelector("#cardNumber", { timeout: 10_000 });
    await typeSlowly(checkoutPage, "#cardNumber",  "4242424242424242");
    await typeSlowly(checkoutPage, "#cardExpiry",  "12/30");
    await typeSlowly(checkoutPage, "#cardCvc",     "123");
    await typeSlowly(checkoutPage, "#billingName", "Test Buyer");

    // Email field (one-time payment pages show it).
    try {
      const emailField = await checkoutPage.$("#email");
      if (emailField) {
        await checkoutPage.$eval("#email", (el) => { el.value = ""; });
        await typeSlowly(checkoutPage, "#email", "test@example.com");
      }
    } catch { /* none */ }

    // Uncheck Link "Save my info" if present.
    try {
      const linkCb = await checkoutPage.$("#enableStripePass");
      if (linkCb) {
        const checked = await checkoutPage.$eval("#enableStripePass", (el) => el.checked);
        if (checked) await linkCb.click();
      }
    } catch { /* none */ }

    await new Promise((r) => setTimeout(r, 700)); // let validation settle

    const out2 = path.join(OUT_DIR, "journey-2-checkout.png");
    await checkoutPage.screenshot({ path: out2 });
    save(out2, "journey-2-checkout.png");

    // ── Journey 3: success page with license key ───────────────────────────
    console.log("\n[3/5] Submitting and waiting for success page…");
    await Promise.all([
      checkoutPage.waitForNavigation({ waitUntil: "networkidle0", timeout: 90_000 }),
      checkoutPage.click('[data-testid="hosted-payment-submit-button"]'),
    ]);

    const finalUrl = checkoutPage.url();
    console.log(`  landed on: ${finalUrl}`);
    if (!finalUrl.includes("/davos-kit/success")) {
      throw new Error(`Expected /davos-kit/success but landed on: ${finalUrl}`);
    }

    // Extract the license key from the page.
    const html = await checkoutPage.content();
    const km = html.match(/\b(DK1-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4})\b/);
    if (!km) throw new Error("Success page did not contain a DK1-... key");
    licenseKey = km[1];
    console.log(`  ✓ license key: ${licenseKey}`);

    await new Promise((r) => setTimeout(r, 600));
    const out3 = path.join(OUT_DIR, "journey-3-success-key.png");
    await checkoutPage.screenshot({ path: out3 });
    save(out3, "journey-3-success-key.png");

    await checkoutPage.close();
  }

  // ── Journey 4: kit file listing (download contents) ──────────────────────
  console.log("\n[4/5] Kit download contents listing…");
  {
    // Read the zip entry list and render as a styled "what's inside" page.
    let entries = [];
    try {
      const zipPath = path.join(__dirname, "private", "davos-decision-kit.zip");
      const raw = execSync(`unzip -l "${zipPath}"`, { encoding: "utf8" });
      // Parse lines like: "   1234  2025-01-01 00:00   davos-decision-kit/README.md"
      for (const line of raw.split("\n")) {
        const m = line.match(/^\s+(\d+)\s+[\d-]+\s+[\d:]+\s+(.+)$/);
        if (m && !m[2].endsWith("/")) {
          entries.push({ size: parseInt(m[1], 10), name: m[2] });
        }
      }
    } catch {
      entries = [
        { name: "davos-decision-kit/README.md",                   size: 1200 },
        { name: "davos-decision-kit/go-no-go-scorecard.md",       size: 3400 },
        { name: "davos-decision-kit/budget-calculator.md",        size: 2800 },
        { name: "davos-decision-kit/twelve-month-runway.md",      size: 2600 },
        { name: "davos-decision-kit/visibility-plan-templates.md",size: 3100 },
        { name: "davos-decision-kit/worked-example.md",           size: 2200 },
        { name: "davos-decision-kit/start-here-ai-prompts.md",    size: 1800 },
      ];
    }

    const FILE_ICONS = {
      ".md":  "📄",
      ".pdf": "📕",
      ".csv": "📊",
      ".xlsx":"📊",
      ".txt": "📝",
    };
    function iconFor(name) {
      const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
      return FILE_ICONS[ext] || "📄";
    }
    function fmtSize(bytes) {
      if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
      return bytes + " B";
    }
    function baseName(p) {
      return p.split("/").pop();
    }

    const rows = entries.map((e) => `
      <tr>
        <td class="icon">${iconFor(e.name)}</td>
        <td class="fname">${baseName(e.name)}</td>
        <td class="size">${fmtSize(e.size)}</td>
      </tr>`).join("");

    const contentsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Davos Decision Kit — Contents</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #fafaf8;
    color: #1a1a1a;
    padding: 64px 80px;
    max-width: 860px;
    margin: 0 auto;
  }
  .badge {
    display: inline-block;
    background: #f0a500;
    color: #fff;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 4px;
    margin-bottom: 20px;
  }
  h1 { font-size: 1.8rem; font-weight: 700; margin-bottom: 8px; }
  .sub { color: #666; font-size: .95rem; margin-bottom: 36px; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left;
    font-size: .72rem;
    font-weight: 600;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: #888;
    padding: 0 12px 10px;
    border-bottom: 1px solid #e2e2e0;
  }
  td { padding: 13px 12px; border-bottom: 1px solid #f0ede8; vertical-align: middle; }
  .icon { width: 32px; font-size: 1.15rem; }
  .fname { font-size: .95rem; color: #1a1a1a; }
  .size { width: 80px; text-align: right; font-size: .85rem; color: #888; }
  tbody tr:hover { background: #f5f2ed; }
</style>
</head>
<body>
<span class="badge">Davos Decision Kit</span>
<h1>What's inside your download</h1>
<p class="sub">davos-decision-kit.zip · ${entries.length} files</p>
<table>
  <thead><tr><th></th><th>File</th><th style="text-align:right">Size</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`;

    const encoded = "data:text/html;charset=utf-8," + encodeURIComponent(contentsHtml);
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.goto(encoded, { waitUntil: "load", timeout: 15_000 });
    await new Promise((r) => setTimeout(r, 400));
    const out4 = path.join(OUT_DIR, "journey-4-download.png");
    await page.screenshot({ path: out4 });
    save(out4, "journey-4-download.png");
    await page.close();
  }

  // ── Journey 5: rendered kit document (README) ────────────────────────────
  console.log("\n[5/5] Kit document preview (README.md)…");
  {
    // Read README.md from the zip without extracting to disk.
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    let readme = "";
    try {
      // Use JSZip if available, otherwise fall back to the python approach.
      const AdmZip = require("adm-zip");
      const zipPath = path.join(__dirname, "private", "davos-decision-kit.zip");
      const zip = new AdmZip(zipPath);
      const entry = zip.getEntries().find((e) => e.entryName.endsWith("README.md"));
      if (entry) readme = zip.readAsText(entry);
    } catch {
      // Fall back: extract with unzip CLI and read.
      try {
        const zipPath = path.join(__dirname, "private", "davos-decision-kit.zip");
        readme = execSync(
          `unzip -p "${zipPath}" "davos-decision-kit/README.md"`,
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
        );
      } catch {
        readme = "# Davos Decision Kit\n\nThis kit contains the go-no-go scorecard, budget calculator, twelve-month runway, and visibility plan templates — ready to use with Claude's Davos Decision Advisor skill.";
      }
    }

    // Convert markdown to simple styled HTML (no external deps needed).
    const lines = readme.split("\n");
    let htmlBody = "";
    let inList = false;
    for (const raw of lines) {
      const line = raw.trimEnd();
      if (line.startsWith("### ")) {
        if (inList) { htmlBody += "</ul>"; inList = false; }
        htmlBody += `<h3>${line.slice(4)}</h3>`;
      } else if (line.startsWith("## ")) {
        if (inList) { htmlBody += "</ul>"; inList = false; }
        htmlBody += `<h2>${line.slice(3)}</h2>`;
      } else if (line.startsWith("# ")) {
        if (inList) { htmlBody += "</ul>"; inList = false; }
        htmlBody += `<h1>${line.slice(2)}</h1>`;
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        if (!inList) { htmlBody += "<ul>"; inList = true; }
        htmlBody += `<li>${line.slice(2)}</li>`;
      } else if (line === "") {
        if (inList) { htmlBody += "</ul>"; inList = false; }
        htmlBody += "<br>";
      } else {
        if (inList) { htmlBody += "</ul>"; inList = false; }
        htmlBody += `<p>${line}</p>`;
      }
    }
    if (inList) htmlBody += "</ul>";

    const docHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Davos Decision Kit — README</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #fafaf8;
    color: #1a1a1a;
    padding: 64px 80px;
    max-width: 860px;
    margin: 0 auto;
    line-height: 1.65;
  }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 20px; color: #111; }
  h2 { font-size: 1.35rem; font-weight: 600; margin: 32px 0 12px; color: #1a1a1a; border-bottom: 1px solid #e2e2e0; padding-bottom: 6px; }
  h3 { font-size: 1.05rem; font-weight: 600; margin: 24px 0 8px; color: #333; }
  p  { margin: 10px 0; color: #333; }
  ul { margin: 8px 0 8px 24px; }
  li { margin: 5px 0; color: #333; }
  br { display: block; content: ""; margin: 4px 0; }
  .badge {
    display: inline-block;
    background: #f0a500;
    color: #fff;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 4px;
    margin-bottom: 20px;
  }
</style>
</head>
<body>
<span class="badge">Davos Decision Kit</span>
${htmlBody}
</body>
</html>`;

    const encoded = "data:text/html;charset=utf-8," + encodeURIComponent(docHtml);
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    await page.goto(encoded, { waitUntil: "load", timeout: 15_000 });
    await new Promise((r) => setTimeout(r, 500));
    const out5 = path.join(OUT_DIR, "journey-5-documents.png");
    await page.screenshot({ path: out5 });
    save(out5, "journey-5-documents.png");
    await page.close();
  }

} finally {
  await browser.close();
}

console.log("\n✅ All five journey screenshots captured.");
console.log("   Run `node site/build.mjs` to pick up the new files in dist/.");
