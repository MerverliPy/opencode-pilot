#!/usr/bin/env node
/**
 * audit-report.mjs — Self-contained HTML audit report generator
 *
 * Reads a pilot-results.json file and produces a single .html file with:
 *   - Summary cards (pass/fail/skip, requests, error rate)
 *   - Latency bar chart (SVG, inline, no CDN)
 *   - Load curve line chart (SVG, inline)
 *   - Color-coded correctness test table
 *   - SSE results (concurrency, reconnection, throughput)
 *   - App flow step-by-step results
 *   - Failures section
 *
 * Usage:
 *   node audit-report.mjs [--in /tmp/pilot-results.json]
 *                         [--out ./pilot-audit-YYYY-MM-DD-HH-MM.html]
 *
 * Prints the absolute path to the generated HTML file.
 */

import fs   from 'fs';
import path from 'path';

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const JSON_IN  = getArg('--in')  ?? '/tmp/pilot-results.json';
const nowStr   = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '-').replace(':', '-');
const HTML_OUT = getArg('--out') ?? path.join(process.cwd(), `pilot-audit-${nowStr}.html`);

// ─── Load data ────────────────────────────────────────────────────────────────

let data = {};
try {
  data = JSON.parse(fs.readFileSync(JSON_IN, 'utf8'));
} catch (e) {
  console.error(`audit-report: cannot read ${JSON_IN}: ${e.message}`);
  process.exit(1);
}

const meta        = data.meta        ?? {};
const correctness = data.correctness ?? { passed: 0, failed: 0, skipped: 0, tests: [] };
const load        = data.load        ?? null;
const sse         = data.sse         ?? null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Strip ANSI escape codes that the bench scripts embed in detail/error strings
const ANSI_RE = /\x1b\[[0-9;]*m/g;
function stripAnsi(s) { return String(s ?? '').replace(ANSI_RE, ''); }

function fmtMs(n) {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(2) + 's';
  return Math.round(n) + 'ms';
}

function pct(sorted, p) {
  if (!sorted || sorted.length === 0) return 0;
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

// ─── SVG: Latency bar chart ───────────────────────────────────────────────────

function latencyBarChart(endpointStats) {
  if (!endpointStats || Object.keys(endpointStats).length === 0) {
    return '<p style="color:#666;font-style:italic">No load test data</p>';
  }

  const entries    = Object.entries(endpointStats);
  const BAR_W      = 22;
  const GROUP_GAP  = 14;
  const GROUP_W    = BAR_W * 3 + GROUP_GAP;
  const CHART_H    = 180;
  const LABEL_H    = 52;
  const LEGEND_H   = 28;
  const PAD_LEFT   = 52;
  const PAD_RIGHT  = 16;
  const PAD_TOP    = 16;

  const totalW     = PAD_LEFT + entries.length * (GROUP_W + GROUP_GAP) + PAD_RIGHT;
  const totalH     = PAD_TOP + CHART_H + LABEL_H + LEGEND_H;

  const allP99     = entries.map(([, s]) => s.p99 ?? 0);
  const maxVal     = Math.max(...allP99, 1);
  const scale      = (v) => CHART_H - Math.round((v / maxVal) * CHART_H);

  // Y-axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y:   PAD_TOP + Math.round(CHART_H * (1 - f)),
    val: Math.round(maxVal * f),
  }));

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" style="font-family:monospace;overflow:visible">`;

  // Background
  svg += `<rect width="${totalW}" height="${totalH}" fill="#0d1117" rx="8"/>`;

  // Grid lines + Y-axis labels
  for (const t of ticks) {
    svg += `<line x1="${PAD_LEFT}" y1="${t.y}" x2="${totalW - PAD_RIGHT}" y2="${t.y}" stroke="#21262d" stroke-width="1"/>`;
    svg += `<text x="${PAD_LEFT - 6}" y="${t.y + 4}" text-anchor="end" font-size="10" fill="#8b949e">${t.val}ms</text>`;
  }

  // Bars
  entries.forEach(([ep, s], gi) => {
    const x0  = PAD_LEFT + gi * (GROUP_W + GROUP_GAP) + GROUP_GAP / 2;
    const bars = [
      { val: s.p50 ?? 0, color: '#3fb950', label: 'p50' },
      { val: s.p95 ?? 0, color: '#d29922', label: 'p95' },
      { val: s.p99 ?? 0, color: '#f85149', label: 'p99' },
    ];
    bars.forEach(({ val, color, label }, bi) => {
      const x  = x0 + bi * BAR_W;
      const h  = Math.max(2, Math.round((val / maxVal) * CHART_H));
      const y  = PAD_TOP + CHART_H - h;
      svg += `<rect x="${x}" y="${y}" width="${BAR_W - 3}" height="${h}" fill="${color}" rx="2" opacity="0.85">`;
      svg += `<title>${ep} ${label}: ${val}ms</title></rect>`;
      svg += `<text x="${x + (BAR_W - 3) / 2}" y="${y - 3}" text-anchor="middle" font-size="9" fill="${color}">${val}</text>`;
    });

    // X-axis endpoint label (rotated, trimmed)
    const shortEp = ep.replace('/find/file?query=package&limit=5', '/find/file').replace(/\?.*/, '…');
    const labelX  = x0 + GROUP_W / 2 - GROUP_GAP / 2;
    const labelY  = PAD_TOP + CHART_H + 14;
    svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="9.5" fill="#8b949e" transform="rotate(-28,${labelX},${labelY})">${esc(shortEp)}</text>`;
  });

  // Legend
  const lY = PAD_TOP + CHART_H + LABEL_H + 8;
  const legend = [
    { color: '#3fb950', label: 'p50 (median)' },
    { color: '#d29922', label: 'p95' },
    { color: '#f85149', label: 'p99' },
  ];
  legend.forEach(({ color, label }, i) => {
    const lx = PAD_LEFT + i * 120;
    svg += `<rect x="${lx}" y="${lY - 9}" width="12" height="12" fill="${color}" rx="2"/>`;
    svg += `<text x="${lx + 16}" y="${lY}" font-size="11" fill="#8b949e">${label}</text>`;
  });

  svg += '</svg>';
  return svg;
}

// ─── SVG: Load curve (req/s + VUs over time) ─────────────────────────────────

function loadCurveChart(timeSeries) {
  if (!timeSeries || timeSeries.length === 0) {
    return '<p style="color:#666;font-style:italic">No load test time series data</p>';
  }

  const W        = 720;
  const H        = 180;
  const PAD_L    = 52;
  const PAD_R    = 52;
  const PAD_T    = 16;
  const PAD_B    = 28;
  const innerW   = W - PAD_L - PAD_R;
  const innerH   = H - PAD_T - PAD_B;

  const times    = timeSeries.map((d) => d.t);
  const maxT     = Math.max(...times, 1);
  const maxRps   = Math.max(...timeSeries.map((d) => d.rps), 1);
  const maxVUs   = Math.max(...timeSeries.map((d) => d.activeVUs ?? 0), 1);

  const toX = (t)   => PAD_L + Math.round((t / maxT) * innerW);
  const toY = (v, mx) => PAD_T + innerH - Math.round((v / mx) * innerH);

  // Build polyline points
  const rpsPoints  = timeSeries.map((d) => `${toX(d.t)},${toY(d.rps, maxRps)}`).join(' ');
  const vuPoints   = timeSeries.map((d) => `${toX(d.t)},${toY(d.activeVUs ?? 0, maxVUs)}`).join(' ');

  // Error dots
  const errorDots  = timeSeries
    .filter((d) => d.errorsPerSec > 0)
    .map((d) => `<circle cx="${toX(d.t)}" cy="${toY(d.rps, maxRps)}" r="4" fill="#f85149" opacity="0.8"><title>t=${d.t}s  err/s=${d.errorsPerSec.toFixed(1)}</title></circle>`)
    .join('');

  // VU fill area
  const vuArea = `${PAD_L},${PAD_T + innerH} ` + vuPoints + ` ${toX(maxT)},${PAD_T + innerH}`;

  // Y-axis ticks (rps, left)
  const rTicks = [0, 0.5, 1].map((f) => ({
    y: PAD_T + Math.round(innerH * (1 - f)), val: Math.round(maxRps * f),
  }));
  // Y-axis ticks (VUs, right)
  const vTicks = [0, 0.5, 1].map((f) => ({
    y: PAD_T + Math.round(innerH * (1 - f)), val: Math.round(maxVUs * f),
  }));

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="font-family:monospace">`;
  svg += `<rect width="${W}" height="${H}" fill="#0d1117" rx="8"/>`;

  // Grid
  for (const t of rTicks) {
    svg += `<line x1="${PAD_L}" y1="${t.y}" x2="${W - PAD_R}" y2="${t.y}" stroke="#21262d" stroke-width="1"/>`;
    svg += `<text x="${PAD_L - 6}" y="${t.y + 4}" text-anchor="end" font-size="10" fill="#58a6ff">${t.val}</text>`;
  }
  for (const t of vTicks) {
    svg += `<text x="${W - PAD_R + 6}" y="${t.y + 4}" font-size="10" fill="#8b949e">${t.val}</text>`;
  }

  // VU fill
  svg += `<polygon points="${vuArea}" fill="#8b949e" opacity="0.12"/>`;
  svg += `<polyline points="${vuPoints}" fill="none" stroke="#8b949e" stroke-width="1.5" opacity="0.5" stroke-dasharray="4 2"/>`;

  // RPS line
  svg += `<polyline points="${rpsPoints}" fill="none" stroke="#58a6ff" stroke-width="2.5"/>`;

  // Error dots
  svg += errorDots;

  // X-axis labels
  const xTicks = [0, 0.25, 0.5, 0.75, 1];
  for (const f of xTicks) {
    const x  = PAD_L + Math.round(f * innerW);
    const tv = Math.round(f * maxT);
    svg += `<text x="${x}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#8b949e">${tv}s</text>`;
  }

  // Axis labels
  svg += `<text x="${PAD_L - 36}" y="${PAD_T + innerH / 2}" text-anchor="middle" font-size="10" fill="#58a6ff" transform="rotate(-90,${PAD_L - 36},${PAD_T + innerH / 2})">req/s</text>`;
  svg += `<text x="${W - PAD_R + 36}" y="${PAD_T + innerH / 2}" text-anchor="middle" font-size="10" fill="#8b949e" transform="rotate(90,${W - PAD_R + 36},${PAD_T + innerH / 2})">VUs</text>`;

  // Legend
  svg += `<rect x="${PAD_L}" y="4" width="10" height="10" fill="#58a6ff" rx="2"/>`;
  svg += `<text x="${PAD_L + 14}" y="13" font-size="10" fill="#8b949e">req/s</text>`;
  svg += `<rect x="${PAD_L + 70}" y="4" width="10" height="10" fill="#8b949e" rx="2" opacity="0.5"/>`;
  svg += `<text x="${PAD_L + 84}" y="13" font-size="10" fill="#8b949e">active VUs</text>`;
  svg += `<circle cx="${PAD_L + 178}" cy="9" r="4" fill="#f85149"/>`;
  svg += `<text x="${PAD_L + 186}" y="13" font-size="10" fill="#8b949e">errors</text>`;

  svg += '</svg>';
  return svg;
}

// ─── HTML sections ────────────────────────────────────────────────────────────

function statusBadge(status) {
  if (status === 'pass') return '<span class="badge pass">PASS</span>';
  if (status === 'fail') return '<span class="badge fail">FAIL</span>';
  return '<span class="badge skip">SKIP</span>';
}

function correctnessTable(tests) {
  if (!tests || tests.length === 0) return '<p>No correctness data.</p>';
  const rows = tests.map((t) => `
    <tr class="row-${t.status}">
      <td class="td-suite">${esc(t.suite)}</td>
      <td>${esc(t.name)}</td>
      <td class="td-center">${statusBadge(t.status)}</td>
      <td class="td-right">${fmtMs(t.durationMs)}</td>
      <td class="td-detail">${esc(stripAnsi(t.detail ?? t.error ?? ''))}</td>
    </tr>`).join('');
  return `
    <table>
      <thead>
        <tr>
          <th>Suite</th><th>Test</th><th class="td-center">Status</th>
          <th class="td-right">Duration</th><th>Detail / Error</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function endpointTable(endpoints) {
  if (!endpoints) return '<p>No load data.</p>';
  const rows = Object.entries(endpoints).map(([ep, s]) => `
    <tr>
      <td class="mono">${esc(ep)}</td>
      <td class="td-right">${s.requests}</td>
      <td class="td-right ${s.errors > 0 ? 'text-red' : 'text-green'}">${s.errors}</td>
      <td class="td-right">${s.p50}ms</td>
      <td class="td-right">${s.p95}ms</td>
      <td class="td-right ${s.p99 > 1000 ? 'text-yellow' : ''}">${s.p99}ms</td>
      <td class="td-right">${s.avg}ms</td>
      <td class="td-right ${s.errorRate > 5 ? 'text-red' : s.errorRate > 1 ? 'text-yellow' : ''}">${s.errorRate}%</td>
    </tr>`).join('');
  return `
    <table>
      <thead>
        <tr>
          <th>Endpoint</th><th class="td-right">Requests</th><th class="td-right">Errors</th>
          <th class="td-right">p50</th><th class="td-right">p95</th><th class="td-right">p99</th>
          <th class="td-right">Avg</th><th class="td-right">Err%</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function sseSection(sse) {
  if (!sse) return '<p>No SSE data.</p>';

  // Concurrency table
  const concRows = (sse.concurrency ?? []).map((c) => `
    <tr>
      <td>${c.vus}</td>
      <td class="${c.failed > 0 ? 'text-red' : 'text-green'}">${c.connected}/${c.vus}</td>
      <td>${c.failed}</td>
      <td>${c.avgConnectMs}ms</td>
    </tr>`).join('');

  // Flow steps
  const flowSteps = (sse.flow?.steps ?? []).map((s) => `
    <tr class="row-${s.status}">
      <td>${esc(s.step)}</td>
      <td class="td-center">${statusBadge(s.status)}</td>
      <td class="td-right">${fmtMs(s.durationMs)}</td>
      <td class="td-detail">${esc(stripAnsi(s.detail ?? s.error ?? ''))}</td>
    </tr>`).join('');

  const recon   = sse.reconnect ?? {};
  const through = sse.throughput ?? {};

  return `
    <h3>A. Concurrent Connections</h3>
    <table>
      <thead><tr><th>VUs</th><th>Connected</th><th>Failed</th><th>Avg Connect</th></tr></thead>
      <tbody>${concRows}</tbody>
    </table>

    <h3>B. Reconnection Resilience</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-val">${recon.succeeded ?? 0}/${recon.cycles ?? 0}</div><div class="stat-lbl">Cycles Succeeded</div></div>
      <div class="stat-card"><div class="stat-val">${fmtMs(recon.avgRecoveryMs)}</div><div class="stat-lbl">Avg Recovery</div></div>
      <div class="stat-card"><div class="stat-val">${fmtMs(recon.maxRecoveryMs)}</div><div class="stat-lbl">Max Recovery</div></div>
    </div>

    <h3>C. Event Throughput (10s)</h3>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-val">${through.events ?? 0}</div><div class="stat-lbl">Events Received</div></div>
      <div class="stat-card"><div class="stat-val">${through.eventsPerSec ?? 0}/s</div><div class="stat-lbl">Events / Sec</div></div>
      <div class="stat-card"><div class="stat-val ${(through.parseErrors ?? 0) > 0 ? 'text-red' : 'text-green'}">${through.parseErrors ?? 0}</div><div class="stat-lbl">Parse Errors</div></div>
    </div>

    <h3>D. Full App Session Flow — ${sse.flow?.passed ? '<span class="text-green">PASSED</span>' : '<span class="text-red">FAILED</span>'}</h3>
    <table>
      <thead><tr><th>Step</th><th class="td-center">Status</th><th class="td-right">Duration</th><th>Detail</th></tr></thead>
      <tbody>${flowSteps}</tbody>
    </table>`;
}

function failuresSection(tests) {
  const fails = (tests ?? []).filter((t) => t.status === 'fail');
  if (fails.length === 0) return '';
  const items = fails.map((f) => `
    <div class="failure-item">
      <div class="failure-name">${esc(stripAnsi(f.suite))} — ${esc(stripAnsi(f.name))}</div>
      <div class="failure-error">${esc(stripAnsi(f.error))}</div>
    </div>`).join('');
  return `<section><h2 class="section-title text-red">Failures</h2>${items}</section>`;
}

// ─── Summary stats ────────────────────────────────────────────────────────────

const totalReqs  = (load?.totalRequests ?? 0) + (sse?.throughput?.events ?? 0);
const errorRate  = load?.errorRate ?? 0;
const allTests   = [
  ...(correctness.tests ?? []),
  ...(sse?.tests ?? []),
];

const ts         = meta.timestamp ? new Date(meta.timestamp).toLocaleString() : 'unknown';
const runDurMs   = (correctness.tests ?? []).reduce((a, t) => a + (t.durationMs ?? 0), 0)
                 + (load?.durationMs ?? 0)
                 + (sse?.durationMs ?? 0);

// ─── Full HTML ────────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Pilot Audit — ${esc(ts)}</title>
<style>
  :root {
    --bg:       #0d1117;
    --surface:  #161b22;
    --border:   #21262d;
    --text:     #c9d1d9;
    --muted:    #8b949e;
    --green:    #3fb950;
    --red:      #f85149;
    --yellow:   #d29922;
    --blue:     #58a6ff;
    --cyan:     #39d353;
    --pass-bg:  #0d2818;
    --fail-bg:  #2d1117;
    --skip-bg:  #1c1c0d;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
    font-size: 13px;
    line-height: 1.6;
    padding: 0 0 48px;
  }

  /* ── Header ── */
  .header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 20px 32px;
    display: flex;
    align-items: baseline;
    gap: 24px;
    flex-wrap: wrap;
  }
  .header-title { font-size: 18px; font-weight: 700; color: var(--blue); letter-spacing: -0.5px; }
  .header-meta  { color: var(--muted); font-size: 12px; }
  .header-meta span { margin-right: 20px; }

  /* ── Summary cards ── */
  .summary-row {
    display: flex;
    gap: 16px;
    padding: 24px 32px 8px;
    flex-wrap: wrap;
  }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px 24px;
    min-width: 140px;
    flex: 1;
  }
  .card-val  { font-size: 28px; font-weight: 700; line-height: 1.2; }
  .card-lbl  { color: var(--muted); font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .card.pass { border-color: var(--green); }
  .card.fail { border-color: var(--red);   }
  .card-val.green { color: var(--green); }
  .card-val.red   { color: var(--red);   }
  .card-val.blue  { color: var(--blue);  }
  .card-val.muted { color: var(--muted); }

  /* ── Sections ── */
  section { padding: 24px 32px 0; }
  .section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
  }
  h3 { font-size: 13px; color: var(--muted); margin: 20px 0 10px; text-transform: uppercase; letter-spacing: 0.06em; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 12px; }
  th {
    text-align: left;
    padding: 8px 10px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  tr:hover td { background: #1c2128; }
  .row-pass td { background: var(--pass-bg); }
  .row-fail td { background: var(--fail-bg); }
  .row-skip td { background: var(--skip-bg); color: var(--muted); }
  .td-center { text-align: center; }
  .td-right  { text-align: right;  white-space: nowrap; }
  .td-suite  { color: var(--muted); font-size: 11px; white-space: nowrap; }
  .td-detail { color: var(--muted); font-size: 11px; max-width: 340px; overflow-wrap: break-word; }
  .mono { font-family: inherit; }

  /* ── Badges ── */
  .badge {
    display: inline-block;
    padding: 1px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .badge.pass { background: #0d2818; color: var(--green); border: 1px solid var(--green); }
  .badge.fail { background: #2d1117; color: var(--red);   border: 1px solid var(--red);   }
  .badge.skip { background: #1c1c0d; color: var(--yellow);border: 1px solid var(--yellow); }

  /* ── Stat grid ── */
  .stat-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 12px 18px;
    min-width: 120px;
  }
  .stat-val { font-size: 20px; font-weight: 700; color: var(--text); }
  .stat-lbl { font-size: 10px; color: var(--muted); text-transform: uppercase; margin-top: 2px; }

  /* ── Colours ── */
  .text-green  { color: var(--green);  }
  .text-red    { color: var(--red);    }
  .text-yellow { color: var(--yellow); }
  .text-blue   { color: var(--blue);   }

  /* ── Charts ── */
  .chart-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;
    margin-bottom: 8px;
  }

  /* ── Failures ── */
  .failure-item  { background: var(--fail-bg); border: 1px solid var(--red); border-radius: 6px; padding: 12px 16px; margin-bottom: 10px; }
  .failure-name  { font-weight: 700; color: var(--red); margin-bottom: 4px; }
  .failure-error { color: var(--muted); white-space: pre-wrap; font-size: 12px; }

  /* ── Divider ── */
  .divider { border: none; border-top: 1px solid var(--border); margin: 0 32px; }

  /* ── Stage pills ── */
  .stage-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .stage-pill  {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 3px 12px;
    font-size: 11px;
    color: var(--muted);
  }
  .stage-pill b { color: var(--text); }
</style>
</head>
<body>

<!-- ── Header ──────────────────────────────────────────────────────────── -->
<div class="header">
  <div class="header-title">Pilot Audit Report</div>
  <div class="header-meta">
    <span>&#x1f4c5; ${esc(ts)}</span>
    <span>&#x1f3af; ${esc(meta.target ?? 'unknown')}</span>
    <span>&#x23f1; ${fmtMs(runDurMs)} total</span>
  </div>
</div>

<!-- ── Summary cards ────────────────────────────────────────────────────── -->
<div class="summary-row">
  <div class="card pass">
    <div class="card-val green">${correctness.passed}</div>
    <div class="card-lbl">Tests Passed</div>
  </div>
  <div class="card ${correctness.failed > 0 ? 'fail' : ''}">
    <div class="card-val ${correctness.failed > 0 ? 'red' : 'muted'}">${correctness.failed}</div>
    <div class="card-lbl">Tests Failed</div>
  </div>
  <div class="card">
    <div class="card-val muted">${correctness.skipped ?? 0}</div>
    <div class="card-lbl">Skipped</div>
  </div>
  <div class="card">
    <div class="card-val blue">${load?.totalRequests?.toLocaleString() ?? '—'}</div>
    <div class="card-lbl">Load Requests</div>
  </div>
  <div class="card ${errorRate > 5 ? 'fail' : ''}">
    <div class="card-val ${errorRate > 5 ? 'red' : errorRate > 1 ? 'text-yellow' : 'green'}">${errorRate}%</div>
    <div class="card-lbl">Error Rate</div>
  </div>
  <div class="card">
    <div class="card-val blue">${load?.peakRps != null ? Math.round(load.peakRps) + '/s' : '—'}</div>
    <div class="card-lbl">Peak req/s</div>
  </div>
</div>

<hr class="divider"/>

<!-- ── Correctness Results ───────────────────────────────────────────────── -->
<section>
  <h2 class="section-title">Correctness Tests</h2>
  ${correctnessTable(correctness.tests)}
</section>

<hr class="divider"/>

<!-- ── Load Test ────────────────────────────────────────────────────────── -->
<section>
  <h2 class="section-title">Load Test</h2>
  ${load ? `
  <div class="stage-pills">
    ${(load.stages ?? []).map((s) =>
      `<div class="stage-pill">${esc(s.label)} <b>${s.startVUs}→${s.endVUs} VUs</b> ${s.durationMs / 1000}s</div>`
    ).join('')}
  </div>
  <h3>Load Curve — req/s over time</h3>
  <div class="chart-wrap">${loadCurveChart(load.timeSeries)}</div>
  <h3>Per-Endpoint Latency (p50 / p95 / p99)</h3>
  <div class="chart-wrap">${latencyBarChart(load.endpoints)}</div>
  <h3>Endpoint Breakdown</h3>
  ${endpointTable(load.endpoints)}
  <div style="padding:8px 0;color:var(--muted);font-size:12px">
    Peak: <b style="color:var(--blue)">${Math.round(load.peakRps)} req/s</b>
    &nbsp;|&nbsp; Total: <b>${load.totalRequests?.toLocaleString()}</b> requests
    &nbsp;|&nbsp; Errors: <b class="${load.totalErrors > 0 ? 'text-red' : 'text-green'}">${load.totalErrors}</b>
    &nbsp;|&nbsp; Duration: <b>${fmtMs(load.durationMs)}</b>
  </div>
  ` : '<p style="color:var(--muted)">No load test data — run pilot-load.mjs first.</p>'}
</section>

<hr class="divider"/>

<!-- ── SSE & App Flow ────────────────────────────────────────────────────── -->
<section>
  <h2 class="section-title">SSE &amp; Frontend Network Layer</h2>
  ${sseSection(sse)}
</section>

<hr class="divider"/>

<!-- ── Failures ─────────────────────────────────────────────────────────── -->
${failuresSection(allTests)}

<!-- ── Footer ───────────────────────────────────────────────────────────── -->
<section style="padding-top:32px;color:var(--muted);font-size:11px">
  Generated by audit-report.mjs &nbsp;·&nbsp; ${esc(new Date().toISOString())}
  &nbsp;·&nbsp; Source: ${esc(JSON_IN)}
</section>

</body>
</html>`;

// ─── Write output ─────────────────────────────────────────────────────────────

fs.mkdirSync(path.dirname(path.resolve(HTML_OUT)), { recursive: true });
fs.writeFileSync(HTML_OUT, html, 'utf8');

const absPath = path.resolve(HTML_OUT);
console.log(absPath);
