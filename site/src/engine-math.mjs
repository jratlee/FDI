// System Dynamics Engine — pure cohort math for the FDI growth modelling tool.
// All functions are pure: no side effects, no external dependencies.
// Used server-side for report generation; mirrored inline in engine.js for client-side.

// ── Retention curves ──────────────────────────────────────────────────────────
// Fit an exponential decay curve from three observed retention points:
// r1 = retention at day 1 (fraction, e.g. 0.85)
// r7 = retention at day 7
// r30 = retention at day 30
// Returns retention fraction at an arbitrary day t.
export function retentionAt(t, r1, r7, r30) {
  if (t <= 0) return 1;
  if (t === 1) return r1;
  if (t === 7) return r7;
  if (t === 30) return r30;
  // Fit two-segment exponential: [0,7] and [7,30]
  // We fit: r(t) = a * exp(-b * t) from the anchor points
  // Segment 1: day 1 to day 7
  if (t <= 7) {
    // r(t) = r1 * (r7/r1)^((t-1)/6)
    const base = r1 > 0 ? r7 / r1 : 0;
    return r1 * Math.pow(Math.max(base, 0), (t - 1) / 6);
  }
  // Segment 2: day 7 to day 30
  {
    const base = r7 > 0 ? r30 / r7 : 0;
    return r7 * Math.pow(Math.max(base, 0), (t - 7) / 23);
  }
}

// Extrapolate beyond day 30 using the day-7→day-30 decay rate
export function retentionBeyond30(t, r7, r30) {
  if (t <= 0) return 1;
  const base = r7 > 0 ? r30 / r7 : 0;
  // decay rate per day from the 7→30 segment
  const k = Math.log(Math.max(base, 1e-9)) / 23;
  return r30 * Math.exp(k * (t - 30));
}

// Unified: retention fraction at day t using all anchors
export function retention(t, r1, r7, r30) {
  if (t <= 0) return 1;
  if (t > 30) return Math.max(0, retentionBeyond30(t, r7, r30));
  return Math.max(0, retentionAt(t, r1, r7, r30));
}

// ── Cohort DAU projection ─────────────────────────────────────────────────────
// Given `newPerDay` new users joining each day, project total active users
// (sum of retained users from all cohorts) at each day over `horizon` days.
// Returns an array of length `horizon` where each value is the DAU on that day.
export function cohortDauCurve(newPerDay, horizon, r1, r7, r30) {
  const dau = new Array(horizon).fill(0);
  for (let day = 0; day < horizon; day++) {
    let total = 0;
    // Sum contributions from each prior cohort that has started
    for (let cohortStart = 0; cohortStart <= day; cohortStart++) {
      const age = day - cohortStart; // days since cohort joined
      total += newPerDay * retention(age, r1, r7, r30);
    }
    dau[day] = total;
  }
  return dau;
}

// ── Aged DAU (cohort maturity) ────────────────────────────────────────────────
// Users who have been in the network for at least `maturityDays` days.
// Returns a daily count over the horizon.
export function agedDauCurve(newPerDay, horizon, maturityDays, r1, r7, r30) {
  const aged = new Array(horizon).fill(0);
  for (let day = 0; day < horizon; day++) {
    let total = 0;
    for (let cohortStart = 0; cohortStart <= day; cohortStart++) {
      const age = day - cohortStart;
      if (age >= maturityDays) {
        total += newPerDay * retention(age, r1, r7, r30);
      }
    }
    aged[day] = total;
  }
  return aged;
}

// ── Target back-calculation ───────────────────────────────────────────────────
// Given a target DAU, a timeline (days), and a cost-per-unit, estimate
// how many new units per day are required and the total capital needed.
// Uses a simplified steady-state approximation: at steady state with N
// new users/day, DAU ≈ N * sum(retention[0..inf]). We approximate the
// infinite sum by summing over a long window (365 days).
export function targetBackCalc({ targetDau, timelineDays, costPerUnit, r1, r7, r30 }) {
  // Sum of retention over the horizon (capped at timelineDays for a
  // realistic window) — gives avg "unit-days" contributed per cohort member
  const retSum = sumRetention(Math.min(timelineDays, 365), r1, r7, r30);
  const requiredNewPerDay = retSum > 0 ? targetDau / retSum : targetDau;
  const totalUnits = requiredNewPerDay * timelineDays;
  const totalCapital = totalUnits * costPerUnit;
  return { requiredNewPerDay, totalUnits, totalCapital };
}

// Sum retention over days 0..horizon-1 (the "effective unit value" sum)
export function sumRetention(horizon, r1, r7, r30) {
  let s = 0;
  for (let t = 0; t < horizon; t++) {
    s += retention(t, r1, r7, r30);
  }
  return s;
}

// ── Volatile vs. stable curves ────────────────────────────────────────────────
// Stable: a steady drip of `basePerDay` new users each day.
// Volatile: all `totalUnits` join on a single spike day (day 0 or spikeDay),
//           nothing before or after.
// Returns { stable: number[], volatile: number[] } cumulative network size arrays.
export function volatilityComparison({ basePerDay, spikeMultiple, spikeDay, horizon, r1, r7, r30 }) {
  const totalUnits = basePerDay * horizon;
  const spikeUnits = totalUnits; // same total supply, concentrated

  const stable = new Array(horizon).fill(0);
  const volatile_ = new Array(horizon).fill(0);

  for (let day = 0; day < horizon; day++) {
    // Stable: cumulative active from steady drip
    let stableActive = 0;
    for (let c = 0; c <= day; c++) {
      stableActive += basePerDay * retention(day - c, r1, r7, r30);
    }
    stable[day] = stableActive;

    // Volatile: zero units before spikeDay; all units join on spikeDay and decay from there
    if (day < spikeDay) {
      volatile_[day] = 0;
    } else {
      volatile_[day] = spikeUnits * retention(day - spikeDay, r1, r7, r30);
    }
  }
  return { stable, volatile: volatile_ };
}

// ── Revenue projection ────────────────────────────────────────────────────────
// Aged DAU * yieldRate * yieldValue per day, accumulated to a total.
export function revenueProjection({ newPerDay, horizon, maturityDays, yieldRate, yieldValue, r1, r7, r30 }) {
  const aged = agedDauCurve(newPerDay, horizon, maturityDays, r1, r7, r30);
  let totalRevenue = 0;
  const daily = aged.map((a) => {
    const rev = a * yieldRate * yieldValue;
    totalRevenue += rev;
    return rev;
  });
  return { daily, totalRevenue, finalAgedDau: aged[aged.length - 1] || 0 };
}

// ── Paradigm defaults ─────────────────────────────────────────────────────────
export const PARADIGM_DEFAULTS = {
  saas: {
    label: "Aggregated Consumer / SaaS",
    unitLabel: "DAU",
    unitLabelPlural: "Daily Active Users",
    acqLabel: "CAC",
    acqDesc: "Cost per Acquisition",
    valueLabel: "LTV",
    valueDesc: "Lifetime Value",
    r1: 0.82, r7: 0.55, r30: 0.32,
    defaultNewPerDay: 100,
    defaultTargetDau: 10000,
    defaultTimeline: 90,
    defaultCostPerUnit: 45,
    defaultMaturityDays: 30,
    defaultYieldRate: 0.12,
    defaultYieldValue: 49,
    defaultBasePerDay: 80,
    defaultSpikeMultiple: 20,
    defaultHorizon: 60,
  },
  web3: {
    label: "Decentralized Compute / Web3",
    unitLabel: "DAN",
    unitLabelPlural: "Daily Active Nodes",
    acqLabel: "Token Bounty",
    acqDesc: "Token incentive per node",
    valueLabel: "Yield Spread",
    valueDesc: "Average yield per active node",
    r1: 0.75, r7: 0.48, r30: 0.28,
    defaultNewPerDay: 40,
    defaultTargetDau: 5000,
    defaultTimeline: 120,
    defaultCostPerUnit: 120,
    defaultMaturityDays: 21,
    defaultYieldRate: 0.18,
    defaultYieldValue: 85,
    defaultBasePerDay: 30,
    defaultSpikeMultiple: 25,
    defaultHorizon: 90,
  },
  autonomous: {
    label: "Autonomous AI Economy",
    unitLabel: "DAA",
    unitLabelPlural: "Daily Active Agents",
    acqLabel: "CPO",
    acqDesc: "Cost per Onboarded Agent",
    valueLabel: "Micro-transaction Volume",
    valueDesc: "Avg micro-transaction per agent per day",
    r1: 0.88, r7: 0.70, r30: 0.52,
    defaultNewPerDay: 200,
    defaultTargetDau: 25000,
    defaultTimeline: 60,
    defaultCostPerUnit: 8,
    defaultMaturityDays: 14,
    defaultYieldRate: 0.25,
    defaultYieldValue: 0.15,
    defaultBasePerDay: 150,
    defaultSpikeMultiple: 30,
    defaultHorizon: 45,
  },
};
