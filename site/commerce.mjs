// Skillfoundry commerce + entitlement layer.
//
// This module is deliberately self-contained (its own Postgres pool + Stripe
// client) so it can later be lifted out of the marketing site into a standalone
// secure backend without touching call sites. It owns:
//   - the three-tier product/price config (read from env, never hardcoded)
//   - the entitlement store (license + subscription keys) in Postgres
//   - a DB-enforced idempotency ledger for Stripe webhook delivery
//   - checkout-session creation (one-time for Tier 1, subscription for 2/3)
//   - idempotent post-purchase provisioning of keys
//   - signature-verified webhook handling for the subscription lifecycle
//   - active-status validation for the Tier 2 entitlement gate
//   - Stripe hosted customer-portal sessions
//
// Design invariant (the Pile lesson): idempotency lives in the database as a
// constraint, not only in an application `if`. The `if` loses the race; the
// unique index does not. Provisioning is guarded by a unique index on the
// Stripe checkout session id (and on the subscription id), and every webhook
// event is claimed in a ledger table before it is applied.

import crypto from "node:crypto";
import Stripe from "stripe";
import pg from "pg";
import { sendEntitlementEmail, sendPurchaseNotification } from "./email.mjs";

/* ---------------- tier configuration (from env) ---------------- */
// The more valuable/updatable the IP, the more it stays server-side:
//   Tier 1 · Perpetual  — one-time payment → perpetual LICENSE key + download.
//   Tier 2 · Living Brain— subscription    → SUBSCRIPTION key (server-validated).
//   Tier 3 · Advisory    — subscription    → SUBSCRIPTION key + manual onboarding.
// Two product families share one entitlement store. `product` scopes each
// entitlement (gates, downloads, and portal return URLs are per-product);
// `manualFulfillment` flags purchases the founder must action by hand (the
// team gets an email notification for those).
export const PRODUCT_META = {
  skillfoundry: {
    name: "SkillFoundry",
    successPath: "/skillfoundry/success",
    cancelPath: "/skillfoundry#pricing",
    returnPath: "/skillfoundry",
    licensePrefix: "SF1",
    subscriptionPrefix: "SFS",
  },
  "marcom-kit": {
    name: "MarCom OS",
    successPath: "/marcom-kit/success",
    cancelPath: "/marcom-kit#pricing",
    returnPath: "/marcom-kit",
    licensePrefix: "MK1",
    subscriptionPrefix: "MKS",
  },
  // Davos Decision Kit: the client-demo product family (feature-flagged demo
  // page, never in public nav). One tier, one-time purchase, gated download.
  davoskit: {
    name: "Davos Decision Kit",
    successPath: "/davos-kit/success",
    cancelPath: "/davos-kit-demo",
    returnPath: "/davos-kit-demo",
    licensePrefix: "DK1",
    subscriptionPrefix: "DKS",
  },
};

export const TIERS = {
  tier1: {
    id: "tier1",
    product: "skillfoundry",
    label: "Perpetual License",
    priceEnv: "SKILLFOUNDRY_TIER1_PRICE_ID",
    mode: "payment",
    keyType: "license",
    hasDownload: true,
    needsOnboarding: false,
    manualFulfillment: false,
    whiteLabel: false,
  },
  tier2: {
    id: "tier2",
    product: "skillfoundry",
    label: "Living Brain",
    priceEnv: "SKILLFOUNDRY_TIER2_PRICE_ID",
    mode: "subscription",
    keyType: "subscription",
    hasDownload: false,
    needsOnboarding: false,
    manualFulfillment: false,
    whiteLabel: false,
  },
  tier3: {
    id: "tier3",
    product: "skillfoundry",
    label: "Advisory Retainer",
    priceEnv: "SKILLFOUNDRY_TIER3_PRICE_ID",
    mode: "subscription",
    keyType: "subscription",
    hasDownload: false,
    needsOnboarding: true,
    manualFulfillment: false,
    whiteLabel: false,
  },
  /* ---- MarCom OS ("Structure as code") ---- */
  mk1: {
    id: "mk1",
    product: "marcom-kit",
    label: "MarCom OS Foundation Playbook",
    priceEnv: "MARCOMKIT_TIER1_PRICE_ID",
    mode: "payment",
    keyType: "license",
    hasDownload: true,
    needsOnboarding: false,
    manualFulfillment: false,
    whiteLabel: false,
  },
  mk2: {
    id: "mk2",
    product: "marcom-kit",
    label: "Living Architecture (monthly)",
    priceEnv: "MARCOMKIT_TIER2_MONTHLY_PRICE_ID",
    mode: "subscription",
    keyType: "subscription",
    hasDownload: true,
    needsOnboarding: false,
    manualFulfillment: false,
    whiteLabel: false,
  },
  "mk2-annual": {
    id: "mk2-annual",
    product: "marcom-kit",
    label: "Living Architecture (annual)",
    priceEnv: "MARCOMKIT_TIER2_ANNUAL_PRICE_ID",
    mode: "subscription",
    keyType: "subscription",
    hasDownload: true,
    needsOnboarding: false,
    manualFulfillment: false,
    whiteLabel: false,
  },
  "mk2-agency": {
    id: "mk2-agency",
    product: "marcom-kit",
    label: "Living Architecture (Agency Team)",
    priceEnv: "MARCOMKIT_TIER2_AGENCY_PRICE_ID",
    mode: "subscription",
    keyType: "subscription",
    hasDownload: true,
    needsOnboarding: false,
    manualFulfillment: false,
    // White-label rights are gated to the Agency tier ONLY (locked copy rule).
    whiteLabel: true,
  },
  mk3: {
    id: "mk3",
    product: "marcom-kit",
    label: "Architecture Partner (retainer)",
    priceEnv: "MARCOMKIT_TIER3_PRICE_ID",
    mode: "subscription",
    keyType: "subscription",
    hasDownload: false,
    needsOnboarding: true,
    manualFulfillment: true,
    whiteLabel: false,
  },
  "mk-sprint": {
    id: "mk-sprint",
    product: "marcom-kit",
    label: "Transformation Sprint (fixed four weeks)",
    priceEnv: "MARCOMKIT_SPRINT_PRICE_ID",
    mode: "payment",
    keyType: "license",
    hasDownload: false,
    needsOnboarding: true,
    manualFulfillment: true,
    whiteLabel: false,
  },
  /* ---- Davos Decision Kit (client commerce demo) ---- */
  dk1: {
    id: "dk1",
    product: "davoskit",
    label: "Davos Decision Kit",
    priceEnv: "DAVOSKIT_TIER1_PRICE_ID",
    mode: "payment",
    keyType: "license",
    hasDownload: true,
    needsOnboarding: false,
    manualFulfillment: false,
    whiteLabel: false,
  },
  "mk-audit": {
    id: "mk-audit",
    product: "marcom-kit",
    label: "Governance Risk Audit",
    priceEnv: "MARCOMKIT_AUDIT_PRICE_ID",
    mode: "payment",
    keyType: "license",
    hasDownload: false,
    needsOnboarding: true,
    manualFulfillment: true,
    whiteLabel: false,
  },
};

export function priceIdFor(tierId) {
  const t = TIERS[tierId];
  if (!t) return "";
  return (process.env[t.priceEnv] || "").trim();
}

// A tier is purchasable only when its Stripe price id is configured.
export function tierIsConfigured(tierId) {
  return Boolean(priceIdFor(tierId));
}

/* ---------------- Stripe client (lazy, env-driven) ---------------- */
let _stripe = null;
export function stripeConfigured() {
  return Boolean((process.env.STRIPE_SECRET_KEY || "").trim());
}
function getStripe() {
  if (!stripeConfigured()) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
      // Pin nothing exotic — use the SDK's bundled apiVersion.
      appInfo: { name: "fdi-skillfoundry", version: "1.0.0" },
    });
  }
  return _stripe;
}

/* ---------------- Postgres (own pool) ---------------- */
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
  : null;

export function storageConfigured() {
  return Boolean(pool);
}

let schemaReady = null;
function ensureSchema() {
  if (!pool) return Promise.resolve(false);
  if (!schemaReady) {
    schemaReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS skillfoundry_entitlements (
           id BIGSERIAL PRIMARY KEY,
           key_value TEXT NOT NULL UNIQUE,
           key_type TEXT NOT NULL,
           tier TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'active',
           email TEXT,
           stripe_customer_id TEXT,
           stripe_subscription_id TEXT,
           stripe_payment_intent_id TEXT,
           stripe_checkout_session_id TEXT NOT NULL,
           needs_onboarding BOOLEAN NOT NULL DEFAULT false,
           created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
           updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
         );
         CREATE UNIQUE INDEX IF NOT EXISTS skillfoundry_entitlements_session_uniq
           ON skillfoundry_entitlements (stripe_checkout_session_id);
         CREATE UNIQUE INDEX IF NOT EXISTS skillfoundry_entitlements_sub_uniq
           ON skillfoundry_entitlements (stripe_subscription_id)
           WHERE stripe_subscription_id IS NOT NULL;
         ALTER TABLE skillfoundry_entitlements
           ADD COLUMN IF NOT EXISTS product TEXT NOT NULL DEFAULT 'skillfoundry';
         ALTER TABLE skillfoundry_entitlements
           ADD COLUMN IF NOT EXISTS white_label BOOLEAN NOT NULL DEFAULT false;
         CREATE TABLE IF NOT EXISTS stripe_processed_events (
           event_id TEXT PRIMARY KEY,
           event_type TEXT,
           processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
         );`,
      )
      .then(() => true)
      .catch((err) => {
        console.error("[commerce] schema init failed:", err.message);
        schemaReady = null; // allow retry
        throw err;
      });
  }
  return schemaReady;
}

/* ---------------- key generation ---------------- */
// Human-legible, unguessable keys. Prefix encodes what the key unlocks:
//   SF1 → Tier 1 perpetual license, SFS → subscription (Tier 2/3).
function keyGroup() {
  // 4 uppercase base32-ish chars (Crockford, no ambiguous chars).
  const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.randomBytes(4);
  let out = "";
  for (let i = 0; i < 4; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
function generateKey(tier) {
  const meta = PRODUCT_META[tier.product] || PRODUCT_META.skillfoundry;
  const prefix =
    tier.keyType === "license" ? meta.licensePrefix : meta.subscriptionPrefix;
  return `${prefix}-${keyGroup()}-${keyGroup()}-${keyGroup()}-${keyGroup()}`;
}

/* ---------------- checkout ---------------- */
// Create a Stripe Checkout session for a tier and return { url }.
// Stripe Tax is enabled so tax is calculated and collected at checkout.
export async function createCheckoutSession({ tierId, origin }) {
  const stripe = getStripe();
  if (!stripe) throw new CommerceError("stripe_unconfigured", 503);
  const tier = TIERS[tierId];
  if (!tier) throw new CommerceError("unknown_tier", 400);
  const price = priceIdFor(tierId);
  if (!price) throw new CommerceError("tier_unconfigured", 503);

  const meta = PRODUCT_META[tier.product];
  const base = (origin || "").replace(/\/+$/, "");
  const params = {
    mode: tier.mode,
    line_items: [{ price, quantity: 1 }],
    automatic_tax: { enabled: true },
    billing_address_collection: "required",
    allow_promotion_codes: true,
    metadata: { product: tier.product, tier: tierId },
    success_url: `${base}${meta.successPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}${meta.cancelPath}`,
  };
  if (tier.mode === "payment") {
    // Need a customer + a captured payment_intent so refunds can be mapped back
    // to the license for deactivation.
    params.customer_creation = "always";
    params.payment_intent_data = { metadata: { product: tier.product, tier: tierId } };
  } else {
    params.subscription_data = { metadata: { product: tier.product, tier: tierId } };
  }
  const session = await stripe.checkout.sessions.create(params);
  return { url: session.url, id: session.id };
}

/* ---------------- provisioning (idempotent) ---------------- */
function tierFromSession(session) {
  const tierId = session?.metadata?.tier;
  return TIERS[tierId] ? tierId : null;
}

// Provision (or fetch the already-provisioned) entitlement for a completed
// checkout session. Idempotent: the unique index on the checkout session id
// guarantees a single key per purchase even under a webhook/success-page race.
export async function provisionFromSession(session) {
  await ensureSchema();
  const tierId = tierFromSession(session);
  if (!tierId) {
    // Not one of our products (or metadata missing) — ignore.
    return null;
  }
  const tier = TIERS[tierId];
  const email =
    session.customer_details?.email || session.customer_email || null;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id || null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id || null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  const key = generateKey(tier);
  const inserted = await pool.query(
    `INSERT INTO skillfoundry_entitlements
       (key_value, key_type, tier, status, email, stripe_customer_id,
        stripe_subscription_id, stripe_payment_intent_id,
        stripe_checkout_session_id, needs_onboarding, product, white_label)
     VALUES ($1,$2,$3,'active',$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (stripe_checkout_session_id) DO NOTHING
     RETURNING *`,
    [
      key,
      tier.keyType,
      tierId,
      email,
      customerId,
      subscriptionId,
      paymentIntentId,
      session.id,
      tier.needsOnboarding,
      tier.product,
      tier.whiteLabel,
    ],
  );

  let row;
  if (inserted.rowCount > 0) {
    row = inserted.rows[0];
    // Best-effort: email the key/download to the buyer. Never blocks or throws.
    if (email) {
      sendEntitlementEmail({
        email,
        tier: tierId,
        keyType: tier.keyType,
        key: row.key_value,
        hasDownload: tier.hasDownload,
        needsOnboarding: tier.needsOnboarding,
      }).catch((err) =>
        console.error("[commerce] entitlement email failed:", err.message),
      );
    }
    // Manual-fulfillment purchases (retainer, sprint, audit) notify the team so
    // the founder can start onboarding. Best-effort, never blocks provisioning.
    if (tier.manualFulfillment) {
      sendPurchaseNotification({
        email,
        tierLabel: tier.label,
        product: tier.product,
        key: row.key_value,
      }).catch((err) =>
        console.error("[commerce] purchase notification failed:", err.message),
      );
    }
  } else {
    const existing = await pool.query(
      `SELECT * FROM skillfoundry_entitlements
        WHERE stripe_checkout_session_id = $1`,
      [session.id],
    );
    row = existing.rows[0] || null;
  }
  return row;
}

export async function getEntitlementBySession(sessionId) {
  if (!pool) return null;
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT * FROM skillfoundry_entitlements
      WHERE stripe_checkout_session_id = $1`,
    [sessionId],
  );
  return rows[0] || null;
}

// Retrieve the checkout session from Stripe and provision from it. Used by the
// success page so the buyer sees their key immediately, even if the webhook has
// not yet arrived.
export async function fulfillSession(sessionId) {
  const stripe = getStripe();
  if (!stripe) throw new CommerceError("stripe_unconfigured", 503);
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required" ||
    session.status === "complete";
  if (!paid) return { paid: false, entitlement: null, session };
  const entitlement = await provisionFromSession(session);
  return { paid: true, entitlement, session };
}

/* ---------------- webhook lifecycle ---------------- */
export function constructEvent(rawBody, signature) {
  const stripe = getStripe();
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!stripe || !secret) throw new CommerceError("webhook_unconfigured", 503);
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

async function setStatusBySubscription(subscriptionId, status) {
  if (!subscriptionId) return;
  await pool.query(
    `UPDATE skillfoundry_entitlements
        SET status = $2, updated_at = now()
      WHERE stripe_subscription_id = $1`,
    [subscriptionId, status],
  );
}

async function setStatusByPaymentIntent(paymentIntentId, status) {
  if (!paymentIntentId) return;
  await pool.query(
    `UPDATE skillfoundry_entitlements
        SET status = $2, updated_at = now()
      WHERE stripe_payment_intent_id = $1`,
    [paymentIntentId, status],
  );
}

// Apply a verified Stripe event. Claims the event id in the ledger first so a
// redelivery is a no-op; on failure the claim is released so Stripe can retry.
export async function handleEvent(event) {
  await ensureSchema();
  const claim = await pool.query(
    `INSERT INTO stripe_processed_events (event_id, event_type)
     VALUES ($1, $2)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [event.id, event.type],
  );
  if (claim.rowCount === 0) {
    // Already processed — idempotent no-op.
    return { duplicate: true };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Only act on paid/complete sessions.
        if (
          session.payment_status === "paid" ||
          session.payment_status === "no_payment_required" ||
          session.status === "complete"
        ) {
          await provisionFromSession(session);
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        // Renewal (or first charge) — keep the subscription key active.
        const sub = event.data.object.subscription;
        await setStatusBySubscription(
          typeof sub === "string" ? sub : sub?.id,
          "active",
        );
        break;
      }
      case "invoice.payment_failed": {
        const sub = event.data.object.subscription;
        await setStatusBySubscription(
          typeof sub === "string" ? sub : sub?.id,
          "inactive",
        );
        break;
      }
      case "customer.subscription.updated": {
        const s = event.data.object;
        const active = s.status === "active" || s.status === "trialing";
        await setStatusBySubscription(s.id, active ? "active" : "inactive");
        break;
      }
      case "customer.subscription.deleted": {
        await setStatusBySubscription(event.data.object.id, "inactive");
        break;
      }
      case "charge.refunded": {
        // One-time (Tier 1) refund → revoke the perpetual license.
        const pi = event.data.object.payment_intent;
        await setStatusByPaymentIntent(
          typeof pi === "string" ? pi : pi?.id,
          "inactive",
        );
        break;
      }
      default:
        // Unhandled event types are acknowledged (claimed) and ignored.
        break;
    }
    return { duplicate: false, handled: true };
  } catch (err) {
    // Release the claim so a retry can reprocess.
    await pool
      .query(`DELETE FROM stripe_processed_events WHERE event_id = $1`, [
        event.id,
      ])
      .catch(() => {});
    throw err;
  }
}

/* ---------------- entitlement gate + portal + download ---------------- */
export async function getEntitlementByKey(key) {
  if (!pool || !key) return null;
  await ensureSchema();
  const { rows } = await pool.query(
    `SELECT * FROM skillfoundry_entitlements WHERE key_value = $1`,
    [String(key).trim()],
  );
  return rows[0] || null;
}

// Validate a subscription key for the Tier 2 gate. Returns a plain shape the
// thin client can act on: active only when the key exists AND status = active.
export async function validateKey(key) {
  const row = await getEntitlementByKey(key);
  if (!row) return { found: false, active: false };
  return {
    found: true,
    active: row.status === "active",
    tier: row.tier,
    keyType: row.key_type,
    product: row.product || "skillfoundry",
    whiteLabel: Boolean(row.white_label),
    needsOnboarding: row.needs_onboarding,
    status: row.status,
  };
}

export async function createPortalSession({ key, origin }) {
  const stripe = getStripe();
  if (!stripe) throw new CommerceError("stripe_unconfigured", 503);
  const row = await getEntitlementByKey(key);
  if (!row) throw new CommerceError("unknown_key", 404);
  if (!row.stripe_customer_id)
    throw new CommerceError("no_customer", 400);
  const base = (origin || "").replace(/\/+$/, "");
  const meta = PRODUCT_META[row.product] || PRODUCT_META.skillfoundry;
  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${base}${meta.returnPath}`,
  });
  return { url: session.url };
}

/* ---------------- error type ---------------- */
export class CommerceError extends Error {
  constructor(code, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
