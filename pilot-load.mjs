#!/usr/bin/env node
/**
 * pilot-load.mjs — Ramping VU load test for the OpenCode API.
 *
 * Stages:
 *   warm-up      5s   1 VU       baseline
 *   ramp        10s   1→peak     gradual increase
 *   sustain     30s   peak VUs   steady state
 *   spike       10s   peak→2×    burst stress
 *   sustain-2   20s   2× peak    spike hold
 *   cool-down   10s   2×→0       recovery
 *
 * Endpoints (round-robin, evenly spread):
 *   GET /global/health
 *   GET /session
 *   GET /config/providers
 *   GET /agent
 *   GET /command
 *   GET /file?path=.
 *   GET /find/file?query=package&limit=5
 *
 * Usage:
 *   node pilot-load.mjs [--url http://host:port] [--user u] [--pass p]
 *                       [--vus 25] [--out /tmp/pilot-load.json]
 */

import http  from 'http';
import https from 'https';

import { getArg, C, fmt, percentile, writeJson } from './bench-lib.mjs';

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const BASE_URL = getArg(args, '--url')  ?? 'http://100.81.83.98:4096';
const USERNAME = getArg(args, '--user') ?? '';
const PASSWORD = getArg(args, '--pass') ?? '';
const PEAK_VUS = parseInt(getArg(args, '--vus') ?? '25', 10);
const JSON_OUT = getArg(args, '--out')  ?? '/tmp/pilot-results.json';

// ─── Lightweight fire-and-resolve HTTP client (no body parsing needed) ────────

function req(urlPath, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const url     = new URL(BASE_URL + urlPath);
    const lib     = url.protocol === 'https:' ? https : http;
    const headers = { Accept: 'application/json' };
    if (USERNAME) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    }

    const start = Date.now();
    const r = lib.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method:   'GET',
      headers,
      timeout:  timeoutMs,
    }, (res) => {
      res.resume(); // drain without parsing
      res.on('end', () => resolve({
        ok:      res.statusCode < 400,
        status:  res.statusCode,
        elapsed: Date.now() - start,
        path:    urlPath,
      }));
    });
    r.on('error',   () => resolve({ ok: false, status: 0, elapsed: Date.now() - start, path: urlPath }));
    r.on('timeout', () => { r.destroy(); resolve({ ok: false, status: 0, elapsed: Date.now() - start, path: urlPath }); });
    r.end();
  });
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

const ENDPOINTS = [
  '/global/health',
  '/session',
  '/config/providers',
  '/agent',
  '/command',
  '/file?path=.',
  '/find/file?query=package&limit=5',
];

// ─── Stage runner ─────────────────────────────────────────────────────────────

const runStartTs = Date.now();

async function runStage(label, durationMs, startVUs, endVUs, metrics, timeSeries) {
  const stageEnd = Date.now() + durationMs;

  console.log(
    `  ${C.cyan}◆${C.reset} ${label.padEnd(18)} ` +
    `${C.dim}${startVUs}→${endVUs} VUs  ${durationMs / 1000}s${C.reset}`
  );

  let windowReqs   = 0;
  let windowErrors = 0;
  let lastWindowTs = Date.now();
  let tickCount    = 0;

  const ticker = setInterval(() => {
    const snapshot = timeSeries[timeSeries.length - 1];
    const rps      = snapshot?.rps      ?? 0;
    const errs     = snapshot?.errorsPerSec ?? 0;
    const vu       = snapshot?.activeVUs ?? 0;
    process.stdout.write(
      `\r    ${C.dim}t+${String(tickCount).padStart(3)}s${C.reset}  ` +
      `${C.green}${String(Math.round(rps)).padStart(5)} req/s${C.reset}  ` +
      `${C.yellow}${String(Math.round(errs)).padStart(4)} err/s${C.reset}  ` +
      `${C.blue}${String(vu).padStart(3)} VUs${C.reset}   `
    );
    tickCount++;
  }, 1000);

  const tick = () => {
    const now     = Date.now();
    const elapsed = now - lastWindowTs;
    if (elapsed >= 1000) {
      const rps          = (windowReqs   / elapsed) * 1000;
      const errorsPerSec = (windowErrors / elapsed) * 1000;
      const progress     = Math.min(1, (now - (stageEnd - durationMs)) / durationMs);
      const activeVUs    = Math.round(startVUs + (endVUs - startVUs) * progress);
      timeSeries.push({ t: Math.round((now - runStartTs) / 1000), rps, errorsPerSec, activeVUs, stage: label });
      windowReqs   = 0;
      windowErrors = 0;
      lastWindowTs = now;
    }
  };

  const vuLoop = async (vuId) => {
    let epOff = vuId % ENDPOINTS.length;
    while (Date.now() < stageEnd) {
      const ep     = ENDPOINTS[epOff % ENDPOINTS.length];
      epOff++;
      const result = await req(ep);
      windowReqs++;
      if (!result.ok) windowErrors++;
      if (!metrics[ep]) metrics[ep] = { requests: 0, errors: 0, latencies: [] };
      metrics[ep].requests++;
      if (!result.ok) metrics[ep].errors++;
      metrics[ep].latencies.push(Math.max(0, result.elapsed));
      tick();
    }
  };

  const vuPromises = [];
  for (let i = 0; i < startVUs; i++) vuPromises.push(vuLoop(i));

  if (startVUs !== endVUs) {
    const delta    = endVUs - startVUs;
    const interval = durationMs / Math.abs(delta);
    let   added    = 0;
    const rampInt  = setInterval(() => {
      if (Date.now() >= stageEnd) { clearInterval(rampInt); return; }
      if (delta > 0 && added < delta) { vuPromises.push(vuLoop(startVUs + added)); added++; }
    }, interval);
    vuPromises.push(new Promise((res) => setTimeout(res, durationMs + 200)).then(() => clearInterval(rampInt)));
  }

  await Promise.allSettled(vuPromises);
  clearInterval(ticker);
  process.stdout.write('\n');
}

// ─── Banner ───────────────────────────────────────────────────────────────────

console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════╗
║         Pilot Load Test Suite                ║
╚══════════════════════════════════════════════╝${C.reset}`);
console.log(fmt.info(`target  : ${BASE_URL}`));
console.log(fmt.info(`peak    : ${PEAK_VUS} VUs`));
console.log(fmt.info(`spike   : ${PEAK_VUS * 2} VUs`));
console.log(fmt.info(`output  : ${JSON_OUT}`));

// ─── Run stages ───────────────────────────────────────────────────────────────

const metrics    = {};
const timeSeries = [];

const stages = [
  { label: 'warm-up',   durationMs: 5_000,  startVUs: 1,            endVUs: 1 },
  { label: 'ramp',      durationMs: 10_000, startVUs: 1,            endVUs: PEAK_VUS },
  { label: 'sustain',   durationMs: 30_000, startVUs: PEAK_VUS,     endVUs: PEAK_VUS },
  { label: 'spike',     durationMs: 10_000, startVUs: PEAK_VUS,     endVUs: PEAK_VUS * 2 },
  { label: 'sustain-2', durationMs: 20_000, startVUs: PEAK_VUS * 2, endVUs: PEAK_VUS * 2 },
  { label: 'cool-down', durationMs: 10_000, startVUs: PEAK_VUS * 2, endVUs: 0 },
];

console.log(fmt.hdr('Stages'));
for (const s of stages) {
  await runStage(s.label, s.durationMs, s.startVUs, s.endVUs, metrics, timeSeries);
}

const totalDuration = Date.now() - runStartTs;

// ─── Compute per-endpoint stats ───────────────────────────────────────────────

const endpointStats = {};
let   grandTotal    = 0;
let   grandErrors   = 0;

for (const [ep, m] of Object.entries(metrics)) {
  const sorted  = [...m.latencies].sort((a, b) => a - b);
  grandTotal   += m.requests;
  grandErrors  += m.errors;
  endpointStats[ep] = {
    requests:  m.requests,
    errors:    m.errors,
    errorRate: m.requests > 0 ? +((m.errors / m.requests) * 100).toFixed(2) : 0,
    p50:       percentile(sorted, 50),
    p95:       percentile(sorted, 95),
    p99:       percentile(sorted, 99),
    min:       sorted[0]                 ?? 0,
    max:       sorted[sorted.length - 1] ?? 0,
    avg:       sorted.length > 0
      ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length)
      : 0,
  };
}

const peakRps = timeSeries.length > 0 ? Math.max(...timeSeries.map((t) => t.rps)) : 0;

// ─── Terminal summary ─────────────────────────────────────────────────────────

console.log(fmt.hdr('Results'));

const colW = [34, 9, 7, 7, 7, 7, 8];
const row  = (cells) => cells.map((c, i) => String(c).padEnd(colW[i])).join('  ');

console.log(`  ${C.bold}${row(['Endpoint', 'Requests', 'Errors', 'p50ms', 'p95ms', 'p99ms', 'Err%'])}${C.reset}`);
console.log(`  ${'─'.repeat(70)}`);

for (const [ep, s] of Object.entries(endpointStats)) {
  const errCol = s.errors > 0 ? `${C.red}${s.errors}${C.reset}` : `${C.green}0${C.reset}`;
  const label  = ep.length > 33 ? ep.slice(0, 30) + '...' : ep;
  console.log(`  ${row([label, s.requests, '', s.p50, s.p95, s.p99, s.errorRate + '%'])}`.replace('', errCol));
}

console.log(`  ${'─'.repeat(70)}`);
console.log(
  `  ${C.bold}Total: ${grandTotal} requests  |  ${grandErrors} errors  |  ` +
  `${((grandErrors / grandTotal) * 100 || 0).toFixed(2)}% error rate  |  ` +
  `peak ${Math.round(peakRps)} req/s${C.reset}`
);
console.log(`  ${C.dim}Duration: ${(totalDuration / 1000).toFixed(1)}s${C.reset}`);

// ─── Write JSON ───────────────────────────────────────────────────────────────

console.log(`\n${fmt.info(`JSON results → ${JSON_OUT}`)}`);

writeJson(JSON_OUT, {
  load: {
    peakVUs:       PEAK_VUS,
    totalRequests: grandTotal,
    totalErrors:   grandErrors,
    errorRate:     +((grandErrors / grandTotal) * 100 || 0).toFixed(2),
    peakRps:       +peakRps.toFixed(1),
    durationMs:    totalDuration,
    stages:        stages.map((s) => ({
      label:      s.label,
      durationMs: s.durationMs,
      startVUs:   s.startVUs,
      endVUs:     s.endVUs,
    })),
    endpoints:  endpointStats,
    timeSeries,
  },
});
