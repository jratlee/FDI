/**
 * Growth Cartography Chart Renderer
 *
 * Generates a pure SVG chart of the retention curve and DAU projection
 * for a modeled scenario. No external dependencies. Returns an SVG string
 * suitable for saving as a .svg file, serving from HTTP, or base64-encoding
 * for inline use.
 *
 * FDI brand system: near-black base, amber accent, cream labels, no teal/red.
 */

import { buildRetentionProfile, projectDAU, buildSpikeVsDrip } from "./gc-engine.mjs";

/* ─── Brand tokens ─────────────────────────────────────────────────── */

const BRAND = {
  base: "#0D0B08",
  surface: "#141009",
  border: "#2A2015",
  hairline: "#3A2D1C",
  cream: "#F0E8D5",
  faded: "#A8997B",
  muted: "#7A6A50",
  amber: "#FFB12B",
  amber_press: "#E0920C",
};

/* ─── SVG helpers ──────────────────────────────────────────────────── */

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Map a data array to SVG polyline points within a chart area.
 *
 * @param {ArrayLike<number>} data
 * @param {number} x0   left edge of chart area (px)
 * @param {number} y0   top edge of chart area (px)
 * @param {number} w    chart area width (px)
 * @param {number} h    chart area height (px)
 * @param {number} maxVal  data maximum (for Y scaling)
 * @returns {string}  SVG points string "x,y x,y ..."
 */
function dataToPoints(data, x0, y0, w, h, maxVal) {
  const pts = [];
  const n = data.length;
  for (let i = 0; i < n; i++) {
    const x = x0 + (i / Math.max(n - 1, 1)) * w;
    const y = y0 + h - (data[i] / (maxVal || 1)) * h;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

/**
 * Build a closed fill-area SVG polygon path (fill under a line).
 *
 * @param {ArrayLike<number>} data
 * @param {number} x0 y0 w h maxVal  same as dataToPoints
 * @returns {string}  SVG polygon points string
 */
function fillPoints(data, x0, y0, w, h, maxVal) {
  const line = dataToPoints(data, x0, y0, w, h, maxVal).split(" ");
  const baseline = `${(x0 + w).toFixed(1)},${(y0 + h).toFixed(1)} ${x0.toFixed(1)},${(y0 + h).toFixed(1)}`;
  return line.join(" ") + " " + baseline;
}

/* ─── Dual-panel chart ─────────────────────────────────────────────── */

/**
 * Render a two-panel SVG chart:
 *   Left panel  — Retention curve (% survival by day)
 *   Right panel — DAU projection (active units over time)
 *
 * @param {object} opts
 * @param {number[]}  opts.anchorDays      e.g. [1, 7, 30]
 * @param {number[]}  opts.anchorRates     e.g. [40, 20, 10]
 * @param {number}    opts.periods         projection days, e.g. 90
 * @param {number}    [opts.dailyNew]      steady daily inflow
 * @param {number}    [opts.spikeDay]      day of spike event (0-indexed)
 * @param {number}    [opts.spikeSize]     spike inflow volume
 * @param {string}    [opts.unit]          label string, e.g. "users"
 * @returns {string}  SVG markup string
 */
export function renderCurve({
  anchorDays,
  anchorRates,
  periods = 90,
  dailyNew = null,
  spikeDay = null,
  spikeSize = null,
  unit = "units",
}) {
  const W = 800;
  const H = 380;
  const PAD = { top: 48, right: 24, bottom: 54, left: 60 };
  const GAP = 32; // gap between panels
  const panelW = Math.floor((W - PAD.left - PAD.right - GAP) / 2);
  const panelH = H - PAD.top - PAD.bottom;

  const profile = buildRetentionProfile(anchorDays, anchorRates, periods);

  // Panel 1: retention curve (day 0..periods)
  const retentionData = Array.from(profile);
  const retMax = 100;

  // Panel 2: DAU curves
  let dauLines = [];
  if (dailyNew != null) {
    const cohorts = Array.from({ length: periods }, () => dailyNew);
    const dau = projectDAU(profile, cohorts, periods);
    dauLines.push({ label: `${dailyNew.toLocaleString()}/day (drip)`, data: Array.from(dau), color: BRAND.amber });

    if (spikeDay != null && spikeSize != null) {
      const { spikeCohorts } = buildSpikeVsDrip(periods, dailyNew, spikeDay, spikeSize);
      const spikeDau = projectDAU(profile, spikeCohorts, periods);
      dauLines.push({ label: `spike day ${spikeDay}`, data: Array.from(spikeDau), color: BRAND.faded });
    }
  }

  const dauMax = dauLines.length
    ? Math.max(...dauLines.flatMap((l) => l.data)) * 1.1
    : 1;

  // Chart area origins
  const rx = PAD.left;
  const lx = PAD.left + panelW + GAP;
  const topY = PAD.top;

  /* ── Y-axis tick helpers ── */
  function yTicks(maxVal, count = 4) {
    const step = maxVal / count;
    return Array.from({ length: count + 1 }, (_, i) => i * step);
  }

  function yPos(val, maxVal, originY) {
    return originY + panelH - (val / maxVal) * panelH;
  }

  const retTicks = yTicks(retMax, 4);
  const dauTicks = yTicks(dauMax || 1, 4);

  /* ── Build SVG ── */
  const lines = [];

  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Growth Cartography model output">`);

  // Background
  lines.push(`<rect width="${W}" height="${H}" fill="${BRAND.base}" rx="6"/>`);

  // Panel 1 background
  lines.push(`<rect x="${rx}" y="${topY}" width="${panelW}" height="${panelH}" fill="${BRAND.surface}" rx="3"/>`);
  // Panel 2 background
  lines.push(`<rect x="${lx}" y="${topY}" width="${panelW}" height="${panelH}" fill="${BRAND.surface}" rx="3"/>`);

  /* ── Panel titles ── */
  const titleY = PAD.top - 16;
  lines.push(`<text x="${rx + panelW / 2}" y="${titleY}" text-anchor="middle" fill="${BRAND.faded}" font-family="monospace" font-size="11" letter-spacing="1">RETENTION CURVE</text>`);
  lines.push(`<text x="${lx + panelW / 2}" y="${titleY}" text-anchor="middle" fill="${BRAND.faded}" font-family="monospace" font-size="11" letter-spacing="1">DAU PROJECTION (${escapeXml(unit.toUpperCase())})</text>`);

  /* ── Gridlines + Y axis labels ── */
  function drawGrid(originX, originY, w, h, ticks, maxVal, fmtFn) {
    const out = [];
    for (const t of ticks) {
      const y = yPos(t, maxVal, originY);
      out.push(`<line x1="${originX}" y1="${y.toFixed(1)}" x2="${originX + w}" y2="${y.toFixed(1)}" stroke="${BRAND.hairline}" stroke-width="0.8"/>`);
      out.push(`<text x="${originX - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="${BRAND.muted}" font-family="monospace" font-size="10">${escapeXml(fmtFn(t))}</text>`);
    }
    return out.join("\n");
  }

  function fmtPct(v) { return `${Math.round(v)}%`; }
  function fmtK(v) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return String(Math.round(v));
  }

  lines.push(drawGrid(rx, topY, panelW, panelH, retTicks, retMax, fmtPct));
  if (dauLines.length) lines.push(drawGrid(lx, topY, panelW, panelH, dauTicks, dauMax, fmtK));

  /* ── X axis labels ── */
  function drawXAxis(originX, originY, w, h, periods) {
    const out = [];
    const labelDays = [0, Math.round(periods / 4), Math.round(periods / 2), Math.round(3 * periods / 4), periods - 1];
    for (const d of labelDays) {
      const x = originX + (d / Math.max(periods - 1, 1)) * w;
      out.push(`<text x="${x.toFixed(1)}" y="${(originY + h + 18).toFixed(1)}" text-anchor="middle" fill="${BRAND.muted}" font-family="monospace" font-size="10">d${d}</text>`);
    }
    out.push(`<text x="${(originX + w / 2).toFixed(1)}" y="${(originY + h + 36).toFixed(1)}" text-anchor="middle" fill="${BRAND.faded}" font-family="monospace" font-size="10" letter-spacing="0.5">day</text>`);
    return out.join("\n");
  }

  lines.push(drawXAxis(rx, topY, panelW, panelH, retentionData.length));
  lines.push(drawXAxis(lx, topY, panelW, panelH, periods));

  /* ── Retention fill + line ── */
  lines.push(`<polygon points="${fillPoints(retentionData, rx, topY, panelW, panelH, retMax)}" fill="${BRAND.amber}" fill-opacity="0.10"/>`);
  lines.push(`<polyline points="${dataToPoints(retentionData, rx, topY, panelW, panelH, retMax)}" fill="none" stroke="${BRAND.amber}" stroke-width="2" stroke-linejoin="round"/>`);

  // Anchor dots
  for (let i = 0; i < anchorDays.length; i++) {
    const d = anchorDays[i];
    if (d >= retentionData.length) continue;
    const x = rx + (d / Math.max(retentionData.length - 1, 1)) * panelW;
    const y = topY + panelH - (retentionData[d] / retMax) * panelH;
    lines.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${BRAND.amber}" stroke="${BRAND.base}" stroke-width="1.5"/>`);
    lines.push(`<text x="${(x + 6).toFixed(1)}" y="${(y - 6).toFixed(1)}" fill="${BRAND.cream}" font-family="monospace" font-size="9">${anchorRates[i].toFixed(1)}%</text>`);
  }

  /* ── DAU lines ── */
  const STYLES = [
    { dasharray: "none", width: 2.0 },
    { dasharray: "5,4", width: 1.6 },
  ];
  for (let li = 0; li < dauLines.length; li++) {
    const { data, color, label } = dauLines[li];
    const style = STYLES[li] || STYLES[1];
    lines.push(`<polygon points="${fillPoints(data, lx, topY, panelW, panelH, dauMax)}" fill="${color}" fill-opacity="${li === 0 ? 0.14 : 0.07}"/>`);
    lines.push(`<polyline points="${dataToPoints(data, lx, topY, panelW, panelH, dauMax)}" fill="none" stroke="${color}" stroke-width="${style.width}" stroke-dasharray="${style.dasharray}" stroke-linejoin="round"/>`);
    // Legend
    const legendY = PAD.top + 12 + li * 20;
    const legendX = lx + panelW - 120;
    lines.push(`<line x1="${legendX}" y1="${legendY}" x2="${legendX + 18}" y2="${legendY}" stroke="${color}" stroke-width="${style.width}" stroke-dasharray="${style.dasharray}"/>`);
    lines.push(`<text x="${legendX + 24}" y="${(legendY + 4).toFixed(1)}" fill="${BRAND.faded}" font-family="monospace" font-size="9">${escapeXml(label)}</text>`);
  }

  /* ── FDI footer ── */
  lines.push(`<text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="${BRAND.muted}" font-family="monospace" font-size="9" letter-spacing="0.5">FALSE DAWN INDUSTRIES -- GROWTH CARTOGRAPHY MODEL OUTPUT</text>`);

  lines.push("</svg>");

  return lines.join("\n");
}
