#!/usr/bin/env node
/**
 * site/setup-marcom-test-prices.mjs
 *
 * Creates Stripe test-mode products and prices for all 7 MarCom OS tiers and
 * prints a shell-env block + JSON summary. Idempotent: looks up products by
 * metadata tag before creating, so re-running it never duplicates.
 *
 * Usage:
 *   node site/setup-marcom-test-prices.mjs
 *
 * Requires: STRIPE_SECRET_KEY or STRIPE_TEST_API_KEY in the environment.
 */

import Stripe from "stripe";

const KEY =
  (process.env.STRIPE_SECRET_KEY || "").trim() ||
  (process.env.STRIPE_TEST_API_KEY || "").trim();

if (!KEY) {
  console.error(
    "ERROR: Set STRIPE_SECRET_KEY or STRIPE_TEST_API_KEY before running.",
  );
  process.exit(1);
}
if (!KEY.startsWith("sk_test_")) {
  console.error(
    "ERROR: This script requires a TEST-mode key (sk_test_...). Refusing to run with a live key.",
  );
  process.exit(1);
}

const stripe = new Stripe(KEY, { appInfo: { name: "fdi-marcom-setup" } });

/**
 * Each entry describes one Stripe product + price to create.
 * envKey   — the env var the site reads
 * name     — Stripe product name (also used as lookup tag)
 * mode     — "payment" or "subscription"
 * amount   — in cents
 * currency — ISO code
 * interval — only for subscriptions: "month" or "year"
 */
const TIERS = [
  {
    envKey: "MARCOMKIT_TIER1_PRICE_ID",
    id: "mk1",
    name: "MarCom OS — Foundation Playbook (test)",
    mode: "payment",
    amount: 9900,
    currency: "usd",
  },
  {
    envKey: "MARCOMKIT_TIER2_MONTHLY_PRICE_ID",
    id: "mk2",
    name: "MarCom OS — Living Architecture monthly (test)",
    mode: "subscription",
    amount: 14900,
    currency: "usd",
    interval: "month",
  },
  {
    envKey: "MARCOMKIT_TIER2_ANNUAL_PRICE_ID",
    id: "mk2-annual",
    name: "MarCom OS — Living Architecture annual (test)",
    mode: "subscription",
    amount: 150000,
    currency: "usd",
    interval: "year",
  },
  {
    envKey: "MARCOMKIT_TIER2_AGENCY_PRICE_ID",
    id: "mk2-agency",
    name: "MarCom OS — Agency Team (test)",
    mode: "subscription",
    amount: 39900,
    currency: "usd",
    interval: "month",
  },
  {
    envKey: "MARCOMKIT_TIER3_PRICE_ID",
    id: "mk3",
    name: "MarCom OS — Architecture Partner retainer (test)",
    mode: "subscription",
    amount: 500000,
    currency: "usd",
    interval: "month",
  },
  {
    envKey: "MARCOMKIT_SPRINT_PRICE_ID",
    id: "mk-sprint",
    name: "MarCom OS — Transformation Sprint (test)",
    mode: "payment",
    amount: 1000000,
    currency: "usd",
  },
  {
    envKey: "MARCOMKIT_AUDIT_PRICE_ID",
    id: "mk-audit",
    name: "MarCom OS — Governance Risk Audit (test)",
    mode: "payment",
    amount: 150000,
    currency: "usd",
  },
];

async function findOrCreateProduct(tier) {
  // Look for a product tagged with our internal id.
  const existing = await stripe.products.search({
    query: `metadata['marcom_tier']:'${tier.id}'`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`  product exists: ${existing.data[0].id} (${tier.name})`);
    return existing.data[0].id;
  }
  const product = await stripe.products.create({
    name: tier.name,
    metadata: { marcom_tier: tier.id, env: "test" },
  });
  console.log(`  product created: ${product.id} (${tier.name})`);
  return product.id;
}

async function findOrCreatePrice(productId, tier) {
  // Look for an existing test price on this product that matches our params.
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 10,
  });
  const match = prices.data.find((p) => {
    if (p.currency !== tier.currency) return false;
    if (p.unit_amount !== tier.amount) return false;
    if (tier.mode === "subscription") {
      return (
        p.type === "recurring" && p.recurring?.interval === tier.interval
      );
    }
    return p.type === "one_time";
  });
  if (match) {
    console.log(`  price exists: ${match.id}`);
    return match.id;
  }
  const params = {
    product: productId,
    unit_amount: tier.amount,
    currency: tier.currency,
    metadata: { marcom_tier: tier.id },
  };
  if (tier.mode === "subscription") {
    params.recurring = { interval: tier.interval };
  }
  const price = await stripe.prices.create(params);
  console.log(`  price created: ${price.id}`);
  return price.id;
}

const results = {};

for (const tier of TIERS) {
  console.log(`\n[${tier.id}] ${tier.name}`);
  try {
    const productId = await findOrCreateProduct(tier);
    const priceId = await findOrCreatePrice(productId, tier);
    results[tier.envKey] = priceId;
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    process.exit(1);
  }
}

console.log("\n\n=== Price IDs ===");
console.log(JSON.stringify(results, null, 2));

console.log("\n=== Shell env block (paste into your .env or run with eval) ===");
for (const [k, v] of Object.entries(results)) {
  console.log(`export ${k}="${v}"`);
}

// Write a JSON sidecar so the test script can consume them without re-running.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "marcom-test-price-ids.json");
writeFileSync(OUT, JSON.stringify(results, null, 2) + "\n");
console.log(`\nPrice IDs written to ${OUT}`);
