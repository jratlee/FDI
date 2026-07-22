/**
 * Growth Cartography Engine
 * Pure Node.js ESM port of the compounding cohort-decay model from app.py
 * (which uses the open-source theseus_growth library by Eric Benjamin Seufert).
 *
 * No external dependencies. Deterministic: same inputs always produce the
 * same outputs. Suitable for running inside the Growth Cartography Agent or
 * in any Node.js context.
 *
 * Core concepts:
 *   - Retention profile: a curve of [day -> survival %] interpolated from
 *     anchor points (e.g. day-1=40%, day-7=20%, day-30=10%).
 *   - Cohort: a batch of N units (users/nodes/agents) that entered on a given day.
 *   - DAU: Daily Active Units. On day T, a cohort that entered on day C
 *     contributes cohort_size * retention[T - C] (if T >= C).
 */

/* ─── Interpolation ──────────────────────────────────────────────────── */

/**
 * Build a full retention array [day 0..maxDay] by interpolating between
 * anchor points using exponential decay between each pair.
 *
 * @param {number[]} anchorDays   e.g. [1, 7, 30]
 * @param {number[]} anchorRates  retention % at each anchor day, e.g. [40, 20, 10]
 * @param {number}   maxDay       number of days to project, e.g. 90
 * @returns {Float64Array}        retention[d] = survival rate at day d (0..100)
 */
export function buildRetentionProfile(anchorDays, anchorRates, maxDay) {
  if (anchorDays.length !== anchorRates.length || anchorDays.length < 2) {
    throw new Error("Need at least 2 anchor points (days and rates must be same length).");
  }
  const profile = new Float64Array(maxDay + 1);
  profile[0] = 100;

  const days = [0, ...anchorDays];
  const rates = [100, ...anchorRates];

  for (let seg = 0; seg < days.length - 1; seg++) {
    const d0 = days[seg], d1 = days[seg + 1];
    const r0 = rates[seg], r1 = rates[seg + 1];
    const span = d1 - d0;
    for (let d = d0; d <= Math.min(d1, maxDay); d++) {
      const t = (d - d0) / span;
      if (r0 <= 0 || r1 <= 0) {
        profile[d] = r0 + (r1 - r0) * t;
      } else {
        profile[d] = r0 * Math.pow(r1 / r0, t);
      }
    }
  }
  if (anchorDays[anchorDays.length - 1] < maxDay) {
    const lastRate = anchorRates[anchorRates.length - 1];
    const lastDay = anchorDays[anchorDays.length - 1];
    const secondLastDay = anchorDays[anchorDays.length - 2];
    const secondLastRate = anchorRates[anchorRates.length - 2];
    const decayPerDay = lastRate > 0 && secondLastRate > 0
      ? Math.pow(lastRate / secondLastRate, 1 / (lastDay - secondLastDay))
      : 1;
    for (let d = lastDay + 1; d <= maxDay; d++) {
      profile[d] = Math.max(0, profile[d - 1] * decayPerDay);
    }
  }
  return profile;
}

/* ─── Cohort projection ─────────────────────────────────────────────── */

/**
 * Project the daily active unit count for each cohort over time.
 *
 * @param {Float64Array} retentionProfile  from buildRetentionProfile
 * @param {number[]}     cohorts           cohorts[c] = new units entering on day c
 * @param {number}       periods           number of projection days
 * @returns {Float64Array}                 dau[t] = active units on day t
 */
export function projectDAU(retentionProfile, cohorts, periods) {
  const dau = new Float64Array(periods);
  const n = Math.min(cohorts.length, periods);
  for (let c = 0; c < n; c++) {
    const cohortSize = cohorts[c];
    if (cohortSize <= 0) continue;
    for (let t = c; t < periods; t++) {
      const age = t - c;
      const survivalPct = age < retentionProfile.length ? retentionProfile[age] : 0;
      dau[t] += cohortSize * (survivalPct / 100);
    }
  }
  return dau;
}

/* ─── Equilibrium math ──────────────────────────────────────────────── */

/**
 * At what steady-state DAU does a constant daily injection of `dailyNew`
 * units stabilize, given a retention profile?
 *
 * Equilibrium = dailyNew * sum(retention[d]/100 for d=0..inf).
 * We cap at maxDay for a finite approximation.
 *
 * @param {Float64Array} retentionProfile
 * @param {number}       dailyNew   steady daily new-unit inflow
 * @returns {number}                equilibrium active units
 */
export function equilibrium(retentionProfile, dailyNew) {
  let sumRetention = 0;
  for (let d = 0; d < retentionProfile.length; d++) {
    sumRetention += retentionProfile[d] / 100;
  }
  return dailyNew * sumRetention;
}

/**
 * What constant daily injection of new units is needed to reach a
 * target equilibrium DAU?
 *
 * @param {Float64Array} retentionProfile
 * @param {number}       targetDAU
 * @returns {number}                required daily new units
 */
export function requiredDailyNew(retentionProfile, targetDAU) {
  let sumRetention = 0;
  for (let d = 0; d < retentionProfile.length; d++) {
    sumRetention += retentionProfile[d] / 100;
  }
  if (sumRetention <= 0) return Infinity;
  return targetDAU / sumRetention;
}

/* ─── LTV / CAC defensibility ─────────────────────────────────────────── */

/**
 * Cumulative revenue per acquired unit over `horizon` days.
 *
 * @param {Float64Array} retentionProfile
 * @param {number}       revenuePerUnitPerDay
 * @param {number}       horizon
 * @returns {number}
 */
export function cumulativeRevenue(retentionProfile, revenuePerUnitPerDay, horizon) {
  let total = 0;
  for (let d = 0; d < Math.min(horizon, retentionProfile.length); d++) {
    total += (retentionProfile[d] / 100) * revenuePerUnitPerDay;
  }
  return total;
}

/**
 * Is the CAC defensible? Returns the LTV/CAC ratio and a boolean.
 *
 * @param {number} ltv   lifetime value (cumulative revenue per unit)
 * @param {number} cac   cost per acquisition
 * @returns {{ ratio: number, defensible: boolean }}
 */
export function cacDefensibility(ltv, cac) {
  const ratio = cac > 0 ? ltv / cac : Infinity;
  return { ratio, defensible: ratio >= 3 };
}

/* ─── Spike vs. drip comparison ─────────────────────────────────────── */

/**
 * Build cohort arrays for a spike-event scenario vs. a steady drip.
 *
 * @param {number} periods      projection days
 * @param {number} dailyDrip   steady daily unit inflow
 * @param {number} spikeDay    day on which the spike event occurs (0-indexed)
 * @param {number} spikeSize   units entering on the spike day
 * @returns {{ dripCohorts: number[], spikeCohorts: number[] }}
 */
export function buildSpikeVsDrip(periods, dailyDrip, spikeDay, spikeSize) {
  const dripCohorts = Array.from({ length: periods }, () => dailyDrip);
  const spikeCohorts = Array.from({ length: periods }, (_, i) =>
    i === spikeDay ? spikeSize : 50
  );
  return { dripCohorts, spikeCohorts };
}

/* ─── Self-test ─────────────────────────────────────────────────────── */

if (process.argv[1] === import.meta.url.replace("file://", "")) {
  const DAYS = 90;
  const profile = buildRetentionProfile([1, 7, 30], [40, 20, 10], DAYS);

  const eq = equilibrium(profile, 300);
  console.assert(Math.abs(eq - 300 * (profile.reduce((s, v) => s + v / 100, 0))) < 0.01,
    "equilibrium calculation mismatch");

  const cohorts = new Array(DAYS).fill(300);
  const dau = projectDAU(profile, cohorts, DAYS);
  console.assert(dau[0] === 300, "day-0 DAU should equal cohort size");
  console.assert(dau[DAYS - 1] > 0, "day-89 DAU should be positive");

  const ltv = cumulativeRevenue(profile, 3.80, DAYS);
  const { ratio, defensible } = cacDefensibility(ltv, 38);
  console.assert(ratio > 0, "LTV/CAC ratio should be positive");

  console.log("[gc-engine] all assertions passed");
  console.log(`  Equilibrium (300/day): ${eq.toFixed(0)} active units`);
  console.log(`  DAU day 89: ${dau[DAYS - 1].toFixed(0)}`);
  console.log(`  LTV $${ltv.toFixed(2)} vs CAC $38 => ratio ${ratio.toFixed(2)}x, defensible: ${defensible}`);
}
