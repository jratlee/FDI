/* System Dynamics Engine — client-side interactivity.
   Loaded only on /engine. Vanilla JS, no external deps.
   Mirrors the math from site/src/engine-math.mjs inline. */

(function () {
  "use strict";

  // ── Math (mirrored from engine-math.mjs) ───────────────────────────────────
  function retentionAt(t, r1, r7, r30) {
    if (t <= 0) return 1;
    if (t === 1) return r1;
    if (t === 7) return r7;
    if (t === 30) return r30;
    if (t <= 7) {
      var base = r1 > 0 ? r7 / r1 : 0;
      return r1 * Math.pow(Math.max(base, 0), (t - 1) / 6);
    }
    var base7 = r7 > 0 ? r30 / r7 : 0;
    return r7 * Math.pow(Math.max(base7, 0), (t - 7) / 23);
  }
  function retention(t, r1, r7, r30) {
    if (t <= 0) return 1;
    if (t > 30) {
      var base30 = r7 > 0 ? r30 / r7 : 0;
      var k = Math.log(Math.max(base30, 1e-9)) / 23;
      return Math.max(0, r30 * Math.exp(k * (t - 30)));
    }
    return Math.max(0, retentionAt(t, r1, r7, r30));
  }
  function sumRetention(horizon, r1, r7, r30) {
    var s = 0;
    for (var t = 0; t < horizon; t++) s += retention(t, r1, r7, r30);
    return s;
  }
  function cohortDauCurve(newPerDay, horizon, r1, r7, r30) {
    var dau = [];
    for (var day = 0; day < horizon; day++) {
      var total = 0;
      for (var c = 0; c <= day; c++) total += newPerDay * retention(day - c, r1, r7, r30);
      dau.push(total);
    }
    return dau;
  }
  function agedDauCurve(newPerDay, horizon, maturityDays, r1, r7, r30) {
    var aged = [];
    for (var day = 0; day < horizon; day++) {
      var total = 0;
      for (var c = 0; c <= day; c++) {
        var age = day - c;
        if (age >= maturityDays) total += newPerDay * retention(age, r1, r7, r30);
      }
      aged.push(total);
    }
    return aged;
  }
  function targetBackCalc(targetDau, timelineDays, costPerUnit, r1, r7, r30) {
    var retSum = sumRetention(Math.min(timelineDays, 365), r1, r7, r30);
    var reqNewPerDay = retSum > 0 ? targetDau / retSum : targetDau;
    var totalUnits = reqNewPerDay * timelineDays;
    var totalCapital = totalUnits * costPerUnit;
    return { reqNewPerDay: reqNewPerDay, totalUnits: totalUnits, totalCapital: totalCapital };
  }
  function volatilityComparison(basePerDay, spikeDay, horizon, r1, r7, r30) {
    var totalUnits = basePerDay * horizon;
    var stable = [], vol = [];
    for (var day = 0; day < horizon; day++) {
      var stA = 0;
      for (var c = 0; c <= day; c++) stA += basePerDay * retention(day - c, r1, r7, r30);
      stable.push(stA);
      // Zero before spikeDay; all units join on spikeDay and decay from there
      if (day < spikeDay) {
        vol.push(0);
      } else {
        vol.push(totalUnits * retention(day - spikeDay, r1, r7, r30));
      }
    }
    return { stable: stable, volatile: vol };
  }

  // ── Paradigm defaults ───────────────────────────────────────────────────────
  var PARADIGMS = {
    saas: {
      label: "Aggregated / SaaS",
      unitLabel: "DAU", unitLabelPlural: "Daily Active Users",
      acqLabel: "CAC", acqDesc: "Cost per Acquisition",
      valueLabel: "LTV", valueDesc: "Lifetime Value",
      r1: 0.82, r7: 0.55, r30: 0.32,
      defaultNewPerDay: 100, defaultTargetDau: 10000,
      defaultTimeline: 90, defaultCostPerUnit: 45,
      defaultMaturityDays: 30, defaultYieldRate: 0.12,
      defaultYieldValue: 49, defaultBasePerDay: 80,
      defaultSpikeDay: 0, defaultHorizon: 60,
    },
    web3: {
      label: "Decentralized / Web3",
      unitLabel: "DAN", unitLabelPlural: "Daily Active Nodes",
      acqLabel: "Token Bounty", acqDesc: "Token incentive per node",
      valueLabel: "Yield Spread", valueDesc: "Avg yield per active node",
      r1: 0.75, r7: 0.48, r30: 0.28,
      defaultNewPerDay: 40, defaultTargetDau: 5000,
      defaultTimeline: 120, defaultCostPerUnit: 120,
      defaultMaturityDays: 21, defaultYieldRate: 0.18,
      defaultYieldValue: 85, defaultBasePerDay: 30,
      defaultSpikeDay: 0, defaultHorizon: 90,
    },
    autonomous: {
      label: "Autonomous AI",
      unitLabel: "DAA", unitLabelPlural: "Daily Active Agents",
      acqLabel: "CPO", acqDesc: "Cost per Onboarded Agent",
      valueLabel: "Micro-tx Volume", valueDesc: "Avg micro-transaction/agent/day",
      r1: 0.88, r7: 0.70, r30: 0.52,
      defaultNewPerDay: 200, defaultTargetDau: 25000,
      defaultTimeline: 60, defaultCostPerUnit: 8,
      defaultMaturityDays: 14, defaultYieldRate: 0.25,
      defaultYieldValue: 0.15, defaultBasePerDay: 150,
      defaultSpikeDay: 0, defaultHorizon: 45,
    },
  };

  var currentParadigm = "saas";

  // ── SVG chart helpers ───────────────────────────────────────────────────────
  var AMBER = "#FFB12B", SIGNAL_ORANGE = "#FF5E00", FADED = "#A8997B", CREAM = "#F0E8D5";
  var HAIRLINE = "#3A2D1C", BASE = "#0D0B08", SC = "#231f14";

  function svgLine(points, color, strokeWidth) {
    if (points.length < 2) return "";
    var d = points.map(function (p, i) { return (i === 0 ? "M" : "L") + p[0] + " " + p[1]; }).join(" ");
    return '<path d="' + d + '" fill="none" stroke="' + (color || AMBER) + '" stroke-width="' + (strokeWidth || 2) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  function svgArea(points, color) {
    if (points.length < 2) return "";
    var h = points[0] ? points[0][1] : 300;
    // Use the last x for the baseline end, first x for baseline start
    var lastX = points[points.length - 1][0];
    var firstX = points[0][0];
    // find the "zero y" — which is the bottom of the chart area
    // We pass the bottom y explicitly
    var d = points.map(function (p, i) { return (i === 0 ? "M" : "L") + p[0] + " " + p[1]; }).join(" ");
    return "";
  }

  function drawLineChart(canvas, datasets, opts) {
    // datasets: [{values, color, label}]
    // opts: {w, h, xLabels}
    var W = opts.w || 600, H = opts.h || 200;
    var PAD = { t: 20, r: 20, b: 36, l: 52 };
    var chartW = W - PAD.l - PAD.r, chartH = H - PAD.t - PAD.b;

    var allValues = [];
    datasets.forEach(function (d) { allValues = allValues.concat(d.values); });
    var maxV = Math.max.apply(null, allValues.map(function (v) { return v || 0; }));
    if (maxV === 0) maxV = 1;

    var N = datasets[0] ? datasets[0].values.length : 0;
    if (N === 0) { canvas.innerHTML = ""; return; }

    function px(i) { return PAD.l + (i / (N - 1)) * chartW; }
    function py(v) { return PAD.t + chartH - (v / maxV) * chartH; }

    var fmtV = function (v) {
      if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
      if (v >= 1000) return (v / 1000).toFixed(0) + "K";
      return Math.round(v).toString();
    };

    // Y-axis labels
    var yTicks = [0, 0.25, 0.5, 0.75, 1];
    var yLines = yTicks.map(function (t) {
      var y = PAD.t + chartH - t * chartH;
      return '<line x1="' + PAD.l + '" y1="' + y + '" x2="' + (PAD.l + chartW) + '" y2="' + y + '" stroke="' + HAIRLINE + '" stroke-width="1"/>'
        + '<text x="' + (PAD.l - 6) + '" y="' + (y + 4) + '" fill="' + FADED + '" font-size="10" font-family="JetBrains Mono,monospace" text-anchor="end">' + fmtV(t * maxV) + "</text>";
    }).join("");

    // X-axis labels (up to 6 evenly spread)
    var xLabelCount = Math.min(6, N);
    var xTickIdxs = [];
    for (var ii = 0; ii < xLabelCount; ii++) xTickIdxs.push(Math.round(ii * (N - 1) / (xLabelCount - 1)));
    var xLabels = xTickIdxs.map(function (idx) {
      var x = px(idx);
      var label = opts.xLabels ? opts.xLabels[idx] : ("Day " + (idx + 1));
      return '<text x="' + x + '" y="' + (H - 8) + '" fill="' + FADED + '" font-size="10" font-family="JetBrains Mono,monospace" text-anchor="middle">' + label + "</text>";
    }).join("");

    var bottomY = PAD.t + chartH;

    var paths = datasets.map(function (ds) {
      var pts = ds.values.map(function (v, i) { return [px(i), py(v || 0)]; });
      // area fill
      var areaD = pts.map(function (p, i) { return (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ")
        + " L" + px(N - 1).toFixed(1) + " " + bottomY + " L" + PAD.l.toFixed(1) + " " + bottomY + " Z";
      var lineD = pts.map(function (p, i) { return (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
      var col = ds.color || AMBER;
      return '<path d="' + areaD + '" fill="' + col + '" opacity="0.12"/>'
        + '<path d="' + lineD + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    }).join("");

    // legend
    var legend = datasets.length > 1 ? datasets.map(function (ds, i) {
      var lx = PAD.l + i * 150;
      return '<rect x="' + lx + '" y="6" width="14" height="2" fill="' + (ds.color || AMBER) + '"/>'
        + '<text x="' + (lx + 20) + '" y="10" fill="' + FADED + '" font-size="10" font-family="JetBrains Mono,monospace">' + (ds.label || "") + "</text>";
    }).join("") : "";

    canvas.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;overflow:visible;">'
      + '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="transparent"/>'
      + yLines + paths + xLabels + legend
      + "</svg>";
  }

  // ── State ────────────────────────────────────────────────────────────────────
  function getInputVal(id, fallback) {
    var el = document.getElementById(id);
    if (!el) return fallback;
    var v = parseFloat(el.value);
    return Number.isFinite(v) ? v : fallback;
  }
  function setInputVal(id, val) {
    var el = document.getElementById(id);
    if (el) el.value = val;
  }
  function updateLinked(sliderId, numberId) {
    var slider = document.getElementById(sliderId);
    var number = document.getElementById(numberId);
    if (slider && number) {
      slider.addEventListener("input", function () { number.value = slider.value; recalcAll(); });
      number.addEventListener("input", function () { slider.value = number.value; recalcAll(); });
    }
  }

  // ── Tab 0: Network Liquidity Target ─────────────────────────────────────────
  function recalcTab0() {
    var pd = PARADIGMS[currentParadigm];
    var targetDau = getInputVal("t0-target-dau", pd.defaultTargetDau);
    var timelineDays = getInputVal("t0-timeline", pd.defaultTimeline);
    var costPerUnit = getInputVal("t0-cost", pd.defaultCostPerUnit);
    // Sliders hold percentage values (0–100); divide by 100 for math functions that expect fractions.
    var r1 = getInputVal("t0-r1", Math.round(pd.r1 * 100)) / 100;
    var r7 = getInputVal("t0-r7", Math.round(pd.r7 * 100)) / 100;
    var r30 = getInputVal("t0-r30", Math.round(pd.r30 * 100)) / 100;

    var result = targetBackCalc(targetDau, timelineDays, costPerUnit, r1, r7, r30);

    var outUnits = document.getElementById("t0-out-units");
    var outCapital = document.getElementById("t0-out-capital");
    var outNewPerDay = document.getElementById("t0-out-new-per-day");
    if (outUnits) outUnits.textContent = fmtN(result.totalUnits);
    if (outCapital) outCapital.textContent = fmtCur(result.totalCapital);
    if (outNewPerDay) outNewPerDay.textContent = fmtN(result.reqNewPerDay) + " / day";

    // mini chart: retention curve
    var chartEl = document.getElementById("t0-chart");
    if (chartEl) {
      var retVals = [];
      for (var t = 0; t < 60; t++) retVals.push(retention(t, r1, r7, r30) * 100);
      drawLineChart(chartEl, [{ values: retVals, color: AMBER, label: "Retention %" }], { w: 560, h: 160 });
    }
  }

  // ── Tab 1: Volatility vs. Stability ─────────────────────────────────────────
  function recalcTab1() {
    var pd = PARADIGMS[currentParadigm];
    var basePerDay = getInputVal("t1-base", pd.defaultBasePerDay);
    var spikeDay = getInputVal("t1-spike-day", pd.defaultSpikeDay);
    var horizon = getInputVal("t1-horizon", pd.defaultHorizon);
    // Sliders hold percentage values (0–100); divide by 100 for math functions that expect fractions.
    var r1 = getInputVal("t1-r1", Math.round(pd.r1 * 100)) / 100;
    var r7 = getInputVal("t1-r7", Math.round(pd.r7 * 100)) / 100;
    var r30 = getInputVal("t1-r30", Math.round(pd.r30 * 100)) / 100;

    var result = volatilityComparison(basePerDay, spikeDay, horizon, r1, r7, r30);
    var stableEnd = result.stable[result.stable.length - 1] || 0;
    var volEnd = result.volatile[result.volatile.length - 1] || 0;

    var outStable = document.getElementById("t1-out-stable");
    var outVol = document.getElementById("t1-out-vol");
    var outDelta = document.getElementById("t1-out-delta");
    if (outStable) outStable.textContent = fmtN(stableEnd);
    if (outVol) outVol.textContent = fmtN(volEnd);
    if (outDelta) {
      var delta = stableEnd - volEnd;
      outDelta.textContent = (delta >= 0 ? "+" : "") + fmtN(delta) + " steady vs. spike";
      outDelta.style.color = delta >= 0 ? AMBER : SIGNAL_ORANGE;
    }

    var chartEl = document.getElementById("t1-chart");
    if (chartEl) {
      drawLineChart(chartEl, [
        { values: result.stable, color: AMBER, label: "Steady drip" },
        { values: result.volatile, color: SIGNAL_ORANGE, label: "Spike event" },
      ], { w: 560, h: 200 });
    }
  }

  // ── Tab 2: Cohort Maturity & Value Extraction ────────────────────────────────
  function recalcTab2() {
    var pd = PARADIGMS[currentParadigm];
    var newPerDay = getInputVal("t2-new-per-day", pd.defaultNewPerDay);
    var maturityDays = getInputVal("t2-maturity", pd.defaultMaturityDays);
    var yieldRate = getInputVal("t2-yield-rate", pd.defaultYieldRate * 100) / 100;
    var yieldValue = getInputVal("t2-yield-value", pd.defaultYieldValue);
    var horizon = getInputVal("t2-horizon", pd.defaultTimeline);
    // Sliders hold percentage values (0–100); divide by 100 for math functions that expect fractions.
    var r1 = getInputVal("t2-r1", Math.round(pd.r1 * 100)) / 100;
    var r7 = getInputVal("t2-r7", Math.round(pd.r7 * 100)) / 100;
    var r30 = getInputVal("t2-r30", Math.round(pd.r30 * 100)) / 100;

    var agedVals = agedDauCurve(newPerDay, horizon, maturityDays, r1, r7, r30);
    var totalDauVals = cohortDauCurve(newPerDay, horizon, r1, r7, r30);
    var finalAged = agedVals[agedVals.length - 1] || 0;
    var totalRevenue = 0;
    var revenueVals = agedVals.map(function (a) {
      var r = a * yieldRate * yieldValue;
      totalRevenue += r;
      return r;
    });

    var outAged = document.getElementById("t2-out-aged");
    var outRevenue = document.getElementById("t2-out-revenue");
    var outDailyRev = document.getElementById("t2-out-daily-rev");
    if (outAged) outAged.textContent = fmtN(finalAged);
    if (outRevenue) outRevenue.textContent = fmtCur(totalRevenue);
    if (outDailyRev) outDailyRev.textContent = fmtCur(revenueVals[revenueVals.length - 1] || 0) + " / day";

    var chartEl = document.getElementById("t2-chart");
    if (chartEl) {
      drawLineChart(chartEl, [
        { values: totalDauVals, color: FADED, label: "Total " + PARADIGMS[currentParadigm].unitLabel },
        { values: agedVals, color: AMBER, label: "Matured " + PARADIGMS[currentParadigm].unitLabel },
      ], { w: 560, h: 200 });
    }
  }

  function recalcAll() {
    recalcTab0();
    recalcTab1();
    recalcTab2();
  }

  // ── Format helpers ──────────────────────────────────────────────────────────
  function fmtN(n) {
    var v = Math.round(n || 0);
    if (v >= 1000000) return (v / 1000000).toFixed(2) + "M";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K";
    return v.toLocaleString("en-US");
  }
  function fmtCur(n) {
    var v = n || 0;
    if (v >= 1000000) return "$" + (v / 1000000).toFixed(2) + "M";
    if (v >= 1000) return "$" + (v / 1000).toFixed(1) + "K";
    return "$" + v.toFixed(2);
  }

  // ── Paradigm switching ──────────────────────────────────────────────────────
  function applyParadigm(key) {
    var pd = PARADIGMS[key];
    if (!pd) return;
    currentParadigm = key;

    // Update all label spans
    document.querySelectorAll("[data-par-label]").forEach(function (el) {
      el.textContent = pd[el.getAttribute("data-par-label")] || "";
    });

    // Reset Tab 0 inputs
    setInputVal("t0-target-dau", pd.defaultTargetDau);
    setInputVal("t0-target-dau-num", pd.defaultTargetDau);
    setInputVal("t0-timeline", pd.defaultTimeline);
    setInputVal("t0-timeline-num", pd.defaultTimeline);
    setInputVal("t0-cost", pd.defaultCostPerUnit);
    setInputVal("t0-cost-num", pd.defaultCostPerUnit);
    setInputVal("t0-r1", Math.round(pd.r1 * 100));
    setInputVal("t0-r1-num", Math.round(pd.r1 * 100));
    setInputVal("t0-r7", Math.round(pd.r7 * 100));
    setInputVal("t0-r7-num", Math.round(pd.r7 * 100));
    setInputVal("t0-r30", Math.round(pd.r30 * 100));
    setInputVal("t0-r30-num", Math.round(pd.r30 * 100));

    // Reset Tab 1 inputs
    setInputVal("t1-base", pd.defaultBasePerDay);
    setInputVal("t1-base-num", pd.defaultBasePerDay);
    setInputVal("t1-spike-day", pd.defaultSpikeDay || 0);
    setInputVal("t1-spike-day-num", pd.defaultSpikeDay || 0);
    setInputVal("t1-horizon", pd.defaultHorizon);
    setInputVal("t1-horizon-num", pd.defaultHorizon);
    setInputVal("t1-r1", Math.round(pd.r1 * 100));
    setInputVal("t1-r1-num", Math.round(pd.r1 * 100));
    setInputVal("t1-r7", Math.round(pd.r7 * 100));
    setInputVal("t1-r7-num", Math.round(pd.r7 * 100));
    setInputVal("t1-r30", Math.round(pd.r30 * 100));
    setInputVal("t1-r30-num", Math.round(pd.r30 * 100));

    // Reset Tab 2 inputs
    setInputVal("t2-new-per-day", pd.defaultNewPerDay);
    setInputVal("t2-new-per-day-num", pd.defaultNewPerDay);
    setInputVal("t2-maturity", pd.defaultMaturityDays);
    setInputVal("t2-maturity-num", pd.defaultMaturityDays);
    setInputVal("t2-yield-rate", Math.round(pd.defaultYieldRate * 100));
    setInputVal("t2-yield-rate-num", Math.round(pd.defaultYieldRate * 100));
    setInputVal("t2-yield-value", pd.defaultYieldValue);
    setInputVal("t2-yield-value-num", pd.defaultYieldValue);
    setInputVal("t2-horizon", pd.defaultTimeline);
    setInputVal("t2-horizon-num", pd.defaultTimeline);
    setInputVal("t2-r1", Math.round(pd.r1 * 100));
    setInputVal("t2-r1-num", Math.round(pd.r1 * 100));
    setInputVal("t2-r7", Math.round(pd.r7 * 100));
    setInputVal("t2-r7-num", Math.round(pd.r7 * 100));
    setInputVal("t2-r30", Math.round(pd.r30 * 100));
    setInputVal("t2-r30-num", Math.round(pd.r30 * 100));

    recalcAll();
  }

  // ── Build meta payload for CTA form ────────────────────────────────────────
  function buildMeta() {
    var pd = PARADIGMS[currentParadigm];
    var goalEl = document.getElementById("eng-goal");
    return {
      paradigm: currentParadigm,
      goal: goalEl ? goalEl.value.trim() : "",
      // tab 0
      targetDau: getInputVal("t0-target-dau", pd.defaultTargetDau),
      timelineDays: getInputVal("t0-timeline", pd.defaultTimeline),
      costPerUnit: getInputVal("t0-cost", pd.defaultCostPerUnit),
      r1: getInputVal("t0-r1", Math.round(pd.r1 * 100)) / 100,
      r7: getInputVal("t0-r7", Math.round(pd.r7 * 100)) / 100,
      r30: getInputVal("t0-r30", Math.round(pd.r30 * 100)) / 100,
      // tab 1 — includes its own retention anchors so the report uses the
      // values the visitor actually configured in this tab, not Tab 0's.
      basePerDay: getInputVal("t1-base", pd.defaultBasePerDay),
      spikeDay: getInputVal("t1-spike-day", 0),
      horizon: getInputVal("t1-horizon", pd.defaultHorizon),
      t1r1: getInputVal("t1-r1", Math.round(pd.r1 * 100)) / 100,
      t1r7: getInputVal("t1-r7", Math.round(pd.r7 * 100)) / 100,
      t1r30: getInputVal("t1-r30", Math.round(pd.r30 * 100)) / 100,
      // tab 2 — same: carry its own retention anchors separately.
      newPerDay: getInputVal("t2-new-per-day", pd.defaultNewPerDay),
      maturityDays: getInputVal("t2-maturity", pd.defaultMaturityDays),
      yieldRate: getInputVal("t2-yield-rate", Math.round(pd.defaultYieldRate * 100)) / 100,
      yieldValue: getInputVal("t2-yield-value", pd.defaultYieldValue),
      revHorizon: getInputVal("t2-horizon", pd.defaultTimeline),
      t2r1: getInputVal("t2-r1", Math.round(pd.r1 * 100)) / 100,
      t2r7: getInputVal("t2-r7", Math.round(pd.r7 * 100)) / 100,
      t2r30: getInputVal("t2-r30", Math.round(pd.r30 * 100)) / 100,
    };
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    // Restore goal from sessionStorage
    var goalEl = document.getElementById("eng-goal");
    if (goalEl) {
      try {
        var saved = sessionStorage.getItem("eng-goal");
        if (saved) goalEl.value = saved;
      } catch (e) {}
      goalEl.addEventListener("input", function () {
        try { sessionStorage.setItem("eng-goal", goalEl.value); } catch (e) {}
      });
    }

    // Paradigm toggle
    document.querySelectorAll(".eng-par-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".eng-par-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        applyParadigm(btn.getAttribute("data-paradigm"));
      });
    });

    // Tabs
    document.querySelectorAll(".eng-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".eng-tab").forEach(function (t) { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
        document.querySelectorAll(".eng-panel").forEach(function (p) { p.hidden = true; p.classList.remove("active"); });
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        var panel = document.querySelector('.eng-panel[data-panel="' + tab.getAttribute("data-tab") + '"]');
        if (panel) { panel.hidden = false; panel.classList.add("active"); }
      });
    });

    // Wire slider ↔ number pairs
    var pairs = [
      ["t0-target-dau", "t0-target-dau-num"],
      ["t0-timeline", "t0-timeline-num"],
      ["t0-cost", "t0-cost-num"],
      ["t0-r1", "t0-r1-num"],
      ["t0-r7", "t0-r7-num"],
      ["t0-r30", "t0-r30-num"],
      ["t1-base", "t1-base-num"],
      ["t1-spike-day", "t1-spike-day-num"],
      ["t1-horizon", "t1-horizon-num"],
      ["t1-r1", "t1-r1-num"],
      ["t1-r7", "t1-r7-num"],
      ["t1-r30", "t1-r30-num"],
      ["t2-new-per-day", "t2-new-per-day-num"],
      ["t2-maturity", "t2-maturity-num"],
      ["t2-yield-rate", "t2-yield-rate-num"],
      ["t2-yield-value", "t2-yield-value-num"],
      ["t2-horizon", "t2-horizon-num"],
      ["t2-r1", "t2-r1-num"],
      ["t2-r7", "t2-r7-num"],
      ["t2-r30", "t2-r30-num"],
    ];
    pairs.forEach(function (p) { updateLinked(p[0], p[1]); });

    // Engine CTA form — fully custom handler (does not use js-capture).
    // Builds the meta payload from current inputs and POSTs to /api/waitlist.
    var EMAIL_RE_LOCAL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    document.querySelectorAll(".eng-cta-form").forEach(function (form) {
      var emailInput = form.querySelector("input[type=email]");
      var honeypotInput = form.querySelector("input[name=company]");
      var submitBtn = form.querySelector("button[type=submit]");
      var msgEl = form.closest(".eng-cta-form-wrap").querySelector(".eng-form-msg");

      function setMsg(text, ok) {
        if (!msgEl) return;
        msgEl.textContent = text;
        msgEl.style.color = ok ? "#FFCB6B" : "#FF5E00";
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = (emailInput ? emailInput.value : "").trim();
        if (!EMAIL_RE_LOCAL.test(email)) {
          setMsg("Please enter a valid email address.", false);
          if (emailInput) emailInput.focus();
          return;
        }
        if (submitBtn) submitBtn.disabled = true;
        setMsg("Building your report\u2026", true);

        fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email,
            source: "engine",
            company: honeypotInput ? honeypotInput.value : "",
            meta: buildMeta(),
          }),
        }).then(function (res) {
          return res.json().then(function (data) { return { status: res.status, data: data }; });
        }).then(function (r) {
          if (r.status === 200 && r.data && r.data.ok) {
            form.reset();
            setMsg(
              r.data.duplicate
                ? "You\u2019re already on the list. Check your inbox for your Growth Report."
                : "Almost there \u2014 check your inbox and click the confirmation link. Your personalised Growth Report will be attached to the welcome email.",
              true
            );
          } else if (r.status === 429) {
            setMsg((r.data && r.data.message) || "Too many attempts. Please try again later.", false);
          } else if (r.status === 422) {
            setMsg((r.data && r.data.message) || "Please enter a valid email address.", false);
            if (emailInput) emailInput.focus();
          } else {
            setMsg("Something went wrong. Please try again.", false);
          }
        }).catch(function () {
          setMsg("Couldn\u2019t reach the server. Please try again.", false);
        }).then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
      });
    });

    // Initial render
    applyParadigm("saas");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
