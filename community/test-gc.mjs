/**
 * Growth Cartography Engine Unit Tests
 *
 * Deterministic: same inputs always produce the same outputs.
 * Run: node community/test-gc.mjs
 *
 * Exits 0 on pass, 1 on failure.
 */

import {
  buildRetentionProfile,
  projectDAU,
  equilibrium,
  requiredDailyNew,
  cumulativeRevenue,
  cacDefensibility,
  buildSpikeVsDrip,
} from "./gc-engine.mjs";

import { renderCurve } from "./gc-render.mjs";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ok  ${message}`);
    passed++;
  } else {
    console.error(`  FAIL  ${message}`);
    failed++;
  }
}

function assertClose(a, b, tol, message) {
  assert(Math.abs(a - b) <= tol, `${message} (got ${a.toFixed(4)}, expected ~${b.toFixed(4)}, tol=${tol})`);
}

/* ─── 1. Retention profile ─────────────────────────────────────────── */

console.log("\n1. buildRetentionProfile");

const ANCHORS = { days: [1, 7, 30], rates: [40, 20, 10] };
const DAYS = 90;

const profile = buildRetentionProfile(ANCHORS.days, ANCHORS.rates, DAYS);

assert(profile[0] === 100, "day 0 is always 100%");
assertClose(profile[1], 40, 0.01, "day 1 retention matches anchor");
assertClose(profile[7], 20, 0.01, "day 7 retention matches anchor");
assertClose(profile[30], 10, 0.01, "day 30 retention matches anchor");
assert(profile[DAYS] >= 0, "retention is non-negative at max day");
assert(profile[DAYS] < profile[30], "retention continues to decay after last anchor");

// Determinism: same call returns same values
const profile2 = buildRetentionProfile(ANCHORS.days, ANCHORS.rates, DAYS);
assert(
  Array.from(profile).every((v, i) => v === profile2[i]),
  "buildRetentionProfile is deterministic across calls"
);

/* ─── 2. DAU projection ────────────────────────────────────────────── */

console.log("\n2. projectDAU");

const DAILY_NEW = 300;
const cohorts = new Array(DAYS).fill(DAILY_NEW);
const dau = projectDAU(profile, cohorts, DAYS);

assert(dau[0] === DAILY_NEW, "day 0 DAU equals first cohort at 100% retention");
assert(dau[DAYS - 1] > 0, "DAU remains positive at the end of the horizon");
assert(dau[DAYS - 1] > dau[1], "DAU grows as cohorts accumulate");

// Determinism
const dau2 = projectDAU(profile, cohorts, DAYS);
assert(
  Array.from(dau).every((v, i) => v === dau2[i]),
  "projectDAU is deterministic across calls"
);

// Empty cohorts produce zero DAU
const zeroDau = projectDAU(profile, new Array(DAYS).fill(0), DAYS);
assert(zeroDau.every((v) => v === 0), "zero cohort inflow yields zero DAU");

/* ─── 3. Equilibrium ─────────────────────────────────────────────── */

console.log("\n3. equilibrium + requiredDailyNew");

const eq = equilibrium(profile, DAILY_NEW);
assert(eq > 0, "equilibrium is positive");
assert(eq > DAILY_NEW, "equilibrium exceeds daily inflow at realistic retention");

// requiredDailyNew is the inverse of equilibrium
const targetDAU = eq * 2;
const req = requiredDailyNew(profile, targetDAU);
const backCheck = equilibrium(profile, req);
assertClose(backCheck, targetDAU, 0.01, "requiredDailyNew inverts equilibrium");

/* ─── 4. LTV / CAC defensibility ─────────────────────────────────── */

console.log("\n4. cumulativeRevenue + cacDefensibility");

const ARPU_PER_DAY = 3.80;
const CAC = 38;
const ltv = cumulativeRevenue(profile, ARPU_PER_DAY, DAYS);
assert(ltv > 0, "cumulative revenue is positive");
assert(ltv < ARPU_PER_DAY * DAYS, "cumulative revenue is bounded by perfect retention ceiling");

const { ratio, defensible: def90 } = cacDefensibility(ltv, CAC);
assert(ratio > 0, "LTV/CAC ratio is positive");
assert(typeof def90 === "boolean", "cacDefensibility returns a boolean");

// A very high LTV should always be defensible
const { defensible: highDef } = cacDefensibility(1000, 1);
assert(highDef === true, "LTV/CAC >= 3 is defensible");

// LTV/CAC < 3 is not defensible
const { defensible: lowDef } = cacDefensibility(5, 100);
assert(lowDef === false, "LTV/CAC < 3 is not defensible");

/* ─── 5. Spike vs. drip ─────────────────────────────────────────── */

console.log("\n5. buildSpikeVsDrip");

const { dripCohorts, spikeCohorts } = buildSpikeVsDrip(DAYS, DAILY_NEW, 14, 50000);
assert(dripCohorts.length === DAYS, "drip cohort array has correct length");
assert(spikeCohorts.length === DAYS, "spike cohort array has correct length");
assert(dripCohorts.every((v) => v === DAILY_NEW), "drip cohorts are all dailyNew");
assert(spikeCohorts[14] === 50000, "spike cohort on spike day is spikeSize");
assert(spikeCohorts[13] === 50, "spike cohort off spike day is baseline (50)");

const dripDAU = projectDAU(profile, dripCohorts, DAYS);
const spikeDAU = projectDAU(profile, spikeCohorts, DAYS);
// Spike is front-loaded; at the very end drip tends to outperform
// (this depends on parameters, so we test structural invariants only)
assert(dripDAU[DAYS - 1] > 0 && spikeDAU[DAYS - 1] > 0, "both scenarios produce positive DAU at day 89");

/* ─── 6. SVG renderer ────────────────────────────────────────────── */

console.log("\n6. renderCurve");

const svg = renderCurve({
  anchorDays: ANCHORS.days,
  anchorRates: ANCHORS.rates,
  periods: DAYS,
  dailyNew: DAILY_NEW,
  unit: "users",
});

assert(typeof svg === "string" && svg.length > 0, "renderCurve returns a non-empty string");
assert(svg.startsWith("<svg"), "renderCurve output starts with <svg");
assert(svg.includes("RETENTION CURVE"), "SVG includes retention panel label");
assert(svg.includes("DAU PROJECTION"), "SVG includes DAU panel label");
assert(svg.includes("FALSE DAWN INDUSTRIES"), "SVG includes FDI attribution");

// Determinism
const svg2 = renderCurve({ anchorDays: ANCHORS.days, anchorRates: ANCHORS.rates, periods: DAYS, dailyNew: DAILY_NEW, unit: "users" });
assert(svg === svg2, "renderCurve is deterministic across calls");

// Spike scenario included
const svgSpike = renderCurve({
  anchorDays: ANCHORS.days,
  anchorRates: ANCHORS.rates,
  periods: DAYS,
  dailyNew: DAILY_NEW,
  spikeDay: 14,
  spikeSize: 50000,
  unit: "users",
});
assert(svgSpike.includes("spike"), "spike scenario SVG includes spike legend label");

/* ─── 7. Edge cases ──────────────────────────────────────────────── */

console.log("\n7. Edge cases");

// Single-day projection
const tiny = buildRetentionProfile([1, 7], [50, 25], 7);
assert(tiny[0] === 100, "tiny profile: day 0 is 100%");
assert(tiny[7] === 25, "tiny profile: day 7 matches anchor");

// Zero daily new (zero equilibrium)
const eqZero = equilibrium(profile, 0);
assert(eqZero === 0, "equilibrium of zero inflow is zero");

// CAC of zero (should return Infinity ratio)
const { ratio: infRatio } = cacDefensibility(100, 0);
assert(!isFinite(infRatio) || infRatio > 1000, "zero CAC yields very high ratio");

/* ─── Summary ─────────────────────────────────────────────────────── */

console.log(`\n${"─".repeat(50)}`);
if (failed === 0) {
  console.log(`[test-gc] all ${passed} assertions passed`);
  process.exit(0);
} else {
  console.error(`[test-gc] ${failed} FAILED, ${passed} passed`);
  process.exit(1);
}
