#!/usr/bin/env node
/**
 * site/test-marcom-purchases.mjs
 *
 * Headless end-to-end test for all 7 MarCom OS Stripe purchase flows.
 *
 * Prerequisites:
 *  - The dev server must already be running (node site/build.mjs && node site/serve.mjs)
 *  - STRIPE_SECRET_KEY or STRIPE_TEST_API_KEY must be set
 *  - All MARCOMKIT_*_PRICE_ID env vars must be set (run setup-marcom-test-prices.mjs first)
 *
 * Usage:
 *   BASE_URL=https://... node site/test-marcom-purchases.mjs
 *   BASE_URL defaults to http://localhost:5000
 *
 * For each tier the script:
 *  1. POSTs to /api/checkout to get a Stripe Checkout URL
 *  2. Navigates to the checkout page with puppeteer
 *  3. Fills in a test card (4242 4242 4242 4242) + billing address
 *  4. Submits and waits for the redirect to /marcom-kit/success
 *  5. Verifies the success page shows a key (MK1-... or MKS-...)
 *  6. For download tiers (mk1, mk2, mk2-annual, mk2-agency): GETs the
 *     download endpoint and confirms 200 + Content-Type: application/zip
 *  7. For subscription tiers: clicks "Manage subscription" and confirms
 *     the portal redirect opens
 *  8. For manual-fulfillment tiers (mk3, mk-sprint, mk-audit): confirms
 *     "We will reach out shortly" text appears on success page
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

// Load price IDs from the sidecar written by setup script (if present),
// falling back to the environment.
const SIDECAR = path.join(__dirname, "marcom-test-price-ids.json");
if (existsSync(SIDECAR)) {
  const ids = JSON.parse(readFileSync(SIDECAR, "utf8"));
  for (const [k, v] of Object.entries(ids)) {
    if (!process.env[k]) process.env[k] = v;
  }
}

const TIERS = [
  { id: "mk1",        label: "Foundation Playbook",            hasDownload: true,  manualFulfillment: false, isSub: false },
  { id: "mk2",        label: "Living Architecture (monthly)",  hasDownload: true,  manualFulfillment: false, isSub: true  },
  { id: "mk2-annual", label: "Living Architecture (annual)",   hasDownload: true,  manualFulfillment: false, isSub: true  },
  { id: "mk2-agency", label: "Agency Team",                    hasDownload: true,  manualFulfillment: false, isSub: true  },
  { id: "mk3",        label: "Architecture Partner",           hasDownload: false, manualFulfillment: true,  isSub: true  },
  { id: "mk-sprint",  label: "Transformation Sprint",          hasDownload: false, manualFulfillment: true,  isSub: false },
  { id: "mk-audit",   label: "Governance Risk Audit",          hasDownload: false, manualFulfillment: true,  isSub: false },
];

// Test card from Stripe docs: succeeds always, no 3DS.
const TEST_CARD = {
  number: "4242424242424242",
  expiry: "12/30",
  cvc:    "123",
  name:   "Test Buyer",
  // Billing address — needed because automatic_tax is enabled.
  line1:  "123 Main St",
  city:   "Brooklyn",
  zip:    "11201",
  state:  "NY",
  country: "US",
};

function chromiumPath() {
  try {
    return execSync("which chromium || which chromium-browser", { encoding: "utf8" }).trim();
  } catch {
    console.error("chromium not found on PATH. Make sure Nix chromium is installed.");
    process.exit(1);
  }
}

async function createCheckoutSession(tierId) {
  const res = await fetch(`${BASE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier: tierId }),
  });
  const json = await res.json();
  if (!json.ok || !json.url) {
    throw new Error(`checkout API returned ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.url;
}

async function typeSlowly(page, selector, text, delay = 80) {
  await page.focus(selector);
  await page.type(selector, text, { delay });
}

async function runPurchase(browser, tier) {
  console.log(`\n  → creating checkout session…`);
  const checkoutUrl = await createCheckoutSession(tier.id);
  console.log(`    session: ${checkoutUrl.slice(0, 70)}…`);

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  try {
    console.log(`  → navigating to Stripe checkout…`);
    await page.goto(checkoutUrl, { waitUntil: "networkidle0", timeout: 60000 });

    // Accept cookies if a banner appears (sometimes shown in test mode).
    try {
      await page.click('[data-testid="accept-cookies-button"]', { timeout: 3000 });
    } catch { /* no banner */ }

    // Expand the card payment method accordion if it isn't already open.
    // The selector varies; try the most common one first.
    try {
      const cardAccordion = await page.$('[data-testid="card-accordion-item"]') ||
                            await page.$('[id*="card"][role="radio"]');
      if (cardAccordion) {
        await cardAccordion.click();
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch { /* already expanded */ }

    console.log(`  → filling billing address…`);
    // Country first (triggers state/province field).
    await page.select("#billingCountry", TEST_CARD.country);
    await new Promise((r) => setTimeout(r, 500));

    // "Enter address manually" link appears once country is chosen.
    try {
      const manualLink = await page.waitForSelector(
        'a[data-testid="manual-address-link"], button[data-testid="manual-address-link"]',
        { timeout: 4000 },
      );
      await manualLink.click();
      await new Promise((r) => setTimeout(r, 400));
    } catch { /* already in manual mode */ }

    // Fill address fields.
    for (const [sel, val] of [
      ["#billingAddressLine1", TEST_CARD.line1],
      ["#billingLocality",     TEST_CARD.city],
      ["#billingPostalCode",   TEST_CARD.zip],
    ]) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        await page.$eval(sel, (el) => { el.value = ""; });
        await typeSlowly(page, sel, val);
      } catch { /* field may not exist for all countries */ }
    }
    // State dropdown.
    try {
      await page.select("#billingAdministrativeArea", TEST_CARD.state);
    } catch { /* not always present */ }

    console.log(`  → filling card details…`);
    await page.waitForSelector("#cardNumber", { timeout: 10000 });
    await typeSlowly(page, "#cardNumber", TEST_CARD.number);
    await typeSlowly(page, "#cardExpiry", TEST_CARD.expiry);
    await typeSlowly(page, "#cardCvc",    TEST_CARD.cvc);
    await typeSlowly(page, "#billingName", TEST_CARD.name);

    // Uncheck "Save my info" / Link if visible.
    try {
      const linkCheckbox = await page.$("#enableStripePass");
      if (linkCheckbox) {
        const checked = await page.$eval("#enableStripePass", (el) => el.checked);
        if (checked) await linkCheckbox.click();
      }
    } catch { /* no Link checkbox */ }

    // Email field — required on one-time payment pages.
    try {
      const emailField = await page.$("#email");
      if (emailField) {
        await page.$eval("#email", (el) => { el.value = ""; });
        await typeSlowly(page, "#email", "test@example.com");
      }
    } catch { /* no email field */ }

    await new Promise((r) => setTimeout(r, 600));

    console.log(`  → submitting…`);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 90000 }),
      page.click('[data-testid="hosted-payment-submit-button"]'),
    ]);

    const finalUrl = page.url();
    console.log(`  → landed on: ${finalUrl}`);
    if (!finalUrl.includes("/marcom-kit/success")) {
      throw new Error(`Expected /marcom-kit/success but got: ${finalUrl}`);
    }

    // Verify the key is shown.
    const html = await page.content();
    const keyMatch = html.match(/\b(MK[1S]-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4})\b/);
    if (!keyMatch) {
      throw new Error("Success page did not contain a recognisable key (MK1-... or MKS-...)");
    }
    const key = keyMatch[1];
    console.log(`  ✓ key: ${key}`);

    // Verify onboarding notice for manual-fulfillment tiers.
    if (tier.manualFulfillment) {
      if (!html.includes("reach out")) {
        throw new Error("Manual-fulfillment tier: expected 'reach out' onboarding copy");
      }
      console.log(`  ✓ manual-fulfillment copy present`);
    }

    // Verify download endpoint for download tiers.
    if (tier.hasDownload) {
      console.log(`  → checking download gate…`);
      const dlRes = await fetch(
        `${BASE}/api/marcom-kit/download?key=${encodeURIComponent(key)}`,
        { redirect: "follow" },
      );
      if (dlRes.status !== 200) {
        throw new Error(`Download returned HTTP ${dlRes.status} for key ${key}`);
      }
      const ct = dlRes.headers.get("content-type") || "";
      if (!ct.includes("zip")) {
        throw new Error(`Download content-type unexpected: ${ct}`);
      }
      console.log(`  ✓ download gate: 200 application/zip`);
    }

    // Verify portal for subscription tiers.
    if (tier.isSub) {
      console.log(`  → checking portal endpoint…`);
      const portalRes = await fetch(`${BASE}/api/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const portalJson = await portalRes.json();
      if (!portalJson.ok || !portalJson.url) {
        throw new Error(`Portal API returned: ${JSON.stringify(portalJson)}`);
      }
      console.log(`  ✓ portal URL: ${portalJson.url.slice(0, 60)}…`);
    }

    return { ok: true, key };
  } finally {
    await page.close();
  }
}

// ── main ────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`MarCom OS — headless purchase test`);
console.log(`Base URL: ${BASE}`);
console.log("═".repeat(60));

// Preflight: check that price IDs are set.
const PRICE_ENV_KEYS = [
  "MARCOMKIT_TIER1_PRICE_ID",
  "MARCOMKIT_TIER2_MONTHLY_PRICE_ID",
  "MARCOMKIT_TIER2_ANNUAL_PRICE_ID",
  "MARCOMKIT_TIER2_AGENCY_PRICE_ID",
  "MARCOMKIT_TIER3_PRICE_ID",
  "MARCOMKIT_SPRINT_PRICE_ID",
  "MARCOMKIT_AUDIT_PRICE_ID",
];
const missing = PRICE_ENV_KEYS.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\nMissing price ID env vars:\n  ${missing.join("\n  ")}`);
  console.error("Run: node site/setup-marcom-test-prices.mjs first.");
  process.exit(1);
}

// Preflight: check the server is reachable.
try {
  const ping = await fetch(`${BASE}/`);
  if (!ping.ok && ping.status !== 301 && ping.status !== 302) {
    throw new Error(`Server returned ${ping.status}`);
  }
  console.log(`\nServer reachable (${ping.status}).`);
} catch (err) {
  console.error(`\nServer not reachable at ${BASE}: ${err.message}`);
  console.error("Start it with: node site/build.mjs && node site/serve.mjs");
  process.exit(1);
}

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

const results = [];
try {
  for (const tier of TIERS) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`[${tier.id}] ${tier.label}`);
    try {
      const r = await runPurchase(browser, tier);
      results.push({ tier: tier.id, ok: true, key: r.key });
      console.log(`  ✅ PASSED`);
    } catch (err) {
      results.push({ tier: tier.id, ok: false, error: err.message });
      console.error(`  ❌ FAILED: ${err.message}`);
    }
  }
} finally {
  await browser.close();
}

console.log(`\n${"═".repeat(60)}`);
console.log("RESULTS");
console.log("═".repeat(60));
const passed = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);
for (const r of results) {
  const icon = r.ok ? "✅" : "❌";
  const detail = r.ok ? r.key : r.error;
  console.log(`${icon} ${r.tier.padEnd(14)} ${detail}`);
}
console.log(`\n${passed.length}/${results.length} tiers passed.`);

if (failed.length > 0) {
  console.error(`\n${failed.length} tier(s) failed. Fix and re-run before flipping KIT_CHECKOUT_LIVE.`);
  process.exit(1);
}

console.log("\nAll tiers passed ✅ — safe to flip KIT_CHECKOUT_LIVE to true.");
