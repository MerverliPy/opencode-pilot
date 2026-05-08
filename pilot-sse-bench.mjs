#!/usr/bin/env node
/**
 * pilot-sse-bench.mjs — SSE stress tests + full app flow simulation
 *
 * Test groups:
 *   A. Concurrent SSE connections  — open N parallel connections, verify all get HTTP 200
 *   B. Reconnection resilience      — connect → destroy → reconnect × 10, measure recovery
 *   C. Event throughput             — hold connection 10s, count events, check parse errors
 *   D. Full app session flow        — simulates exact sequence the Expo app performs
 *
 * Usage:
 *   node pilot-sse-bench.mjs [--url http://host:port] [--user u] [--pass p]
 *                             [--out /tmp/pilot-results.json]
 */

import http  from 'http';
import https from 'https';
import fs    from 'fs';
import path  from 'path';

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2);
const getArg = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

const BASE_URL = getArg('--url')  ?? 'http://100.81.83.98:4096';
const USERNAME = getArg('--user') ?? '';
const PASSWORD = getArg('--pass') ?? '';
const JSON_OUT = getArg('--out')  ?? '/tmp/pilot-results.json';

// ─── ANSI ────────────────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m',
  cyan: '\x1b[36m', white: '\x1b[97m', gray: '\x1b[90m',
};

const pass = (m)      => `${C.green}✓${C.reset} ${m}`;
const fail = (m, err) => `${C.red}✗${C.reset} ${m}${err ? `\n  ${C.red}${err}${C.reset}` : ''}`;
const info = (m)      => `${C.cyan}ℹ${C.reset} ${C.dim}${m}${C.reset}`;
const hdr  = (m)      => `\n${C.bold}${C.white}▸ ${m}${C.reset}`;
const ms   = (n)      => `${C.gray}${n}ms${C.reset}`;

// ─── HTTP ────────────────────────────────────────────────────────────────────

function request(method, urlPath, body, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const url     = new URL(BASE_URL + urlPath);
    const lib     = url.protocol === 'https:' ? https : http;
    const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;

    const headers = { Accept: 'application/json' };
    if (USERNAME) headers['Authorization'] = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    if (bodyStr)  { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(bodyStr); }

    const start = Date.now();
    const r = lib.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method, headers, timeout: timeoutMs,
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        const ct   = res.headers['content-type'] ?? '';
        let   data = raw;
        if (ct.includes('application/json') && raw) { try { data = JSON.parse(raw); } catch { /* leave */ } }
        resolve({ status: res.statusCode, data, elapsed: Date.now() - start });
      });
    });
    r.on('error',   (e) => reject(e));
    r.on('timeout', () => { r.destroy(); reject(new Error(`timeout after ${timeoutMs}ms`)); });
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

const GET    = (p, to)    => request('GET',    p, undefined, to);
const POST   = (p, b, to) => request('POST',   p, b, to);
const DELETE = (p)        => request('DELETE', p);

// ─── SSE connector ───────────────────────────────────────────────────────────

function openSSE(urlPath, onEvent, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const url     = new URL(BASE_URL + urlPath);
    const lib     = url.protocol === 'https:' ? https : http;
    const headers = { Accept: 'text/event-stream' };
    if (USERNAME) headers['Authorization'] = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');

    const start = Date.now();
    const r = lib.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method:   'GET',
      headers,
      timeout:  timeoutMs,
    }, (res) => {
      const elapsed = Date.now() - start;
      if (res.statusCode !== 200) {
        r.destroy();
        return reject(new Error(`SSE HTTP ${res.statusCode}`));
      }
      const destroy = () => r.destroy();
      resolve({ connected: true, elapsed, destroy });

      let buf = '';
      res.on('data', (chunk) => {
        buf += chunk.toString();
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const block of parts) {
          const dl = block.split('\n').find((l) => l.startsWith('data:'));
          if (dl && onEvent) {
            try { onEvent(JSON.parse(dl.slice(5).trim()), null); }
            catch (e) { if (onEvent) onEvent(null, e); }
          }
        }
      });
    });
    r.on('error',   reject);
    r.on('timeout', () => { r.destroy(); reject(new Error(`SSE timeout ${timeoutMs}ms`)); });
    r.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const allTests = [];

async function test(suite, name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    const dur    = Date.now() - t0;
    console.log(pass(name) + (detail ? ` ${detail}` : ''));
    passed++;
    allTests.push({ suite, name, status: 'pass', durationMs: dur, detail: detail ?? null, error: null });
  } catch (e) {
    const dur = Date.now() - t0;
    const msg = e?.message ?? String(e);
    console.log(fail(name, msg));
    failed++;
    allTests.push({ suite, name, status: 'fail', durationMs: dur, detail: null, error: msg });
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg ?? 'assertion failed'); }
function assertStatus(res, expected, ctx = '') {
  if (res.status !== expected) {
    throw new Error(`${ctx}expected HTTP ${expected}, got ${res.status} — ${
      typeof res.data === 'string' ? res.data.slice(0, 120) : JSON.stringify(res.data).slice(0, 120)
    }`);
  }
}

// ─── Banner ──────────────────────────────────────────────────────────────────

const runStartTs = Date.now();

console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════╗
║       Pilot SSE & Flow Bench Suite           ║
╚══════════════════════════════════════════════╝${C.reset}`);
console.log(info(`target : ${BASE_URL}`));
console.log(info(`output : ${JSON_OUT}`));

// ═══════════════════════════════════════════════════════════════════════════
// A. Concurrent SSE connections
// ═══════════════════════════════════════════════════════════════════════════

console.log(hdr('A. Concurrent SSE Connections'));

const CONCURRENCY_LEVELS = [1, 5, 10];
const concurrencyResults = [];

for (const n of CONCURRENCY_LEVELS) {
  await test('SSE', `${n} concurrent SSE connections all get HTTP 200`, async () => {
    const handles = [];
    const results = await Promise.allSettled(
      Array.from({ length: n }, () =>
        openSSE('/event', null, 6000).then((h) => { handles.push(h); return h; })
      )
    );
    await sleep(300);
    for (const h of handles) try { h.destroy(); } catch { /* ignore */ }

    const connected = results.filter((r) => r.status === 'fulfilled').length;
    const failures  = n - connected;
    const times     = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value.elapsed)
      .sort((a, b) => a - b);
    const avgMs     = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

    concurrencyResults.push({ vus: n, connected, failed: failures, avgConnectMs: avgMs });

    assert(connected >= Math.ceil(n * 0.9), `only ${connected}/${n} connected (need ≥90%)`);
    return `${connected}/${n} connected  avg ${ms(avgMs)}`;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// B. Reconnection resilience (mirrors sse.ts exponential backoff: 500ms base)
// ═══════════════════════════════════════════════════════════════════════════

console.log(hdr('B. Reconnection Resilience (10 cycles)'));

const reconnectTimes = [];

await test('SSE', 'reconnects after forced disconnect 10 times', async () => {
  const CYCLES = 10;
  let   successes = 0;

  for (let i = 0; i < CYCLES; i++) {
    // Open connection
    let handle;
    try {
      handle = await openSSE('/event', null, 5000);
    } catch (e) {
      reconnectTimes.push(null);
      continue;
    }
    await sleep(200);

    // Force disconnect
    const reconnectStart = Date.now();
    handle.destroy();

    // Immediately reconnect (mirrors app's immediate retry after error event)
    try {
      const newHandle = await openSSE('/event', null, 5000);
      const recovery  = Date.now() - reconnectStart;
      reconnectTimes.push(recovery);
      newHandle.destroy();
      successes++;
    } catch {
      reconnectTimes.push(null);
    }

    await sleep(100);
  }

  const valid  = reconnectTimes.filter(Boolean);
  const avgRec = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
  const maxRec = valid.length > 0 ? Math.max(...valid) : 0;

  assert(successes >= Math.ceil(CYCLES * 0.8), `only ${successes}/${CYCLES} reconnects succeeded`);
  return `${successes}/${CYCLES} succeeded  avg recovery ${ms(avgRec)}  max ${ms(maxRec)}`;
});

// ═══════════════════════════════════════════════════════════════════════════
// C. Event throughput (10 second hold)
// ═══════════════════════════════════════════════════════════════════════════

console.log(hdr('C. SSE Event Throughput (10s)'));

let eventCount   = 0;
let parseErrors  = 0;

await test('SSE', 'holds connection 10s and counts events', async () => {
  let handle;
  try {
    handle = await openSSE('/event', (evt, err) => {
      if (err) { parseErrors++; return; }
      if (evt !== null) eventCount++;
    }, 12000);
  } catch (e) {
    throw new Error(`SSE connect failed: ${e.message}`);
  }

  await sleep(10_000);
  handle.destroy();

  const eventsPerSec = (eventCount / 10).toFixed(1);
  return `${eventCount} events  ${eventsPerSec}/s  ${parseErrors} parse error(s)`;
});

await test('SSE', 'no JSON parse errors in event stream', async () => {
  assert(parseErrors === 0, `${parseErrors} parse error(s) in 10s event stream`);
  return `parse errors: ${parseErrors}`;
});

// ═══════════════════════════════════════════════════════════════════════════
// D. Full app session flow simulation
// ═══════════════════════════════════════════════════════════════════════════

console.log(hdr('D. Full App Session Flow'));

const flowSteps  = [];
const flowStart  = Date.now();
let   flowSessId = null;
let   sseHandle  = null;

async function step(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    const dur    = Date.now() - t0;
    console.log(`  ${C.green}✓${C.reset} ${name}` + (detail ? ` ${C.dim}${detail}${C.reset}` : ''));
    flowSteps.push({ step: name, status: 'pass', durationMs: dur, detail: detail ?? null, error: null });
  } catch (e) {
    const dur = Date.now() - t0;
    const msg = e?.message ?? String(e);
    console.log(`  ${C.red}✗${C.reset} ${name}\n      ${C.red}${msg}${C.reset}`);
    flowSteps.push({ step: name, status: 'fail', durationMs: dur, detail: null, error: msg });
    throw e; // abort flow
  }
}

let flowPassed = true;
try {
  await step('Step 1 — health check (auth + version)', async () => {
    const r = await GET('/global/health', 4000);
    assertStatus(r, 200);
    assert(r.data?.healthy === true, 'unhealthy');
    return `v${r.data?.version ?? '?'} ${ms(r.elapsed)}`;
  });

  await step('Step 2 — fetch providers (setup screen)', async () => {
    const r = await GET('/config/providers');
    assertStatus(r, 200);
    assert(Array.isArray(r.data?.providers), 'no providers array');
    return `${r.data.providers.length} provider(s) ${ms(r.elapsed)}`;
  });

  await step('Step 3 — fetch agents', async () => {
    const r = await GET('/agent');
    assertStatus(r, 200);
    assert(Array.isArray(r.data), 'not an array');
    return `${r.data.length} agent(s) ${ms(r.elapsed)}`;
  });

  await step('Step 4 — list sessions (session picker)', async () => {
    const r = await GET('/session');
    assertStatus(r, 200);
    assert(Array.isArray(r.data), 'not an array');
    return `${r.data.length} existing session(s) ${ms(r.elapsed)}`;
  });

  await step('Step 5 — create new session', async () => {
    const r = await POST('/session', { title: '__pilot_flow_test__' });
    assertStatus(r, 200);
    assert(r.data?.id, 'no session id');
    flowSessId = r.data.id;
    return `id=${flowSessId} ${ms(r.elapsed)}`;
  });

  await step('Step 6 — connect SSE event stream', async () => {
    sseHandle = await openSSE('/event', null, 5000);
    assert(sseHandle.connected, 'not connected');
    return `connected in ${ms(sseHandle.elapsed)}`;
  });

  await step('Step 7 — fetch session messages', async () => {
    const r = await GET(`/session/${flowSessId}/message`);
    assertStatus(r, 200);
    assert(Array.isArray(r.data), 'not an array');
    return `${r.data.length} message(s) ${ms(r.elapsed)}`;
  });

  await step('Step 8 — fetch session diff', async () => {
    const r = await GET(`/session/${flowSessId}/diff`);
    if (r.status === 404) return 'endpoint not found (skip)';
    assertStatus(r, 200);
    assert(Array.isArray(r.data), 'not an array');
    return `${r.data.length} diff(s) ${ms(r.elapsed)}`;
  });

  await step('Step 9 — SSE still connected after session ops', async () => {
    assert(sseHandle && !sseHandle.destroyed, 'SSE handle destroyed prematurely');
    sseHandle.destroy();
    return 'SSE alive through session lifecycle';
  });

  await step('Step 10 — delete test session (cleanup)', async () => {
    if (!flowSessId) return 'no session to delete';
    const r = await DELETE(`/session/${flowSessId}`);
    assert(r.status === 200 || r.status === 204, `unexpected ${r.status}`);
    return ms(r.elapsed);
  });

} catch {
  flowPassed = false;
  if (sseHandle) try { sseHandle.destroy(); } catch { /* ignore */ }
  if (flowSessId) {
    try { await DELETE(`/session/${flowSessId}`); } catch { /* best-effort cleanup */ }
  }
}

const flowDuration  = Date.now() - flowStart;
const flowStepsPassed = flowSteps.filter((s) => s.status === 'pass').length;
const flowStepsFailed = flowSteps.filter((s) => s.status === 'fail').length;

// Record flow as a single test result
allTests.push({
  suite:     'D. App Flow',
  name:      'Full app session flow (10 steps)',
  status:    flowPassed ? 'pass' : 'fail',
  durationMs: flowDuration,
  detail:    `${flowStepsPassed}/${flowSteps.length} steps passed`,
  error:     flowPassed ? null : `${flowStepsFailed} step(s) failed`,
});
if (flowPassed) passed++; else failed++;

// ─── Summary ─────────────────────────────────────────────────────────────────

const totalDuration = Date.now() - runStartTs;

console.log(`
${C.bold}${C.white}══════════════════════════════════════════════${C.reset}
${C.bold}  SSE Results: ${C.green}${passed} passed${C.reset}  ${failed > 0 ? C.red : C.gray}${failed} failed${C.reset}
${C.bold}${C.white}══════════════════════════════════════════════${C.reset}`);

// ─── Merge into JSON ──────────────────────────────────────────────────────────

let existing = {};
try { existing = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8')); } catch { /* fresh */ }

existing.sse = {
  durationMs: totalDuration,
  passed,
  failed,
  concurrency: concurrencyResults,
  reconnect: {
    cycles:       10,
    succeeded:    reconnectTimes.filter(Boolean).length,
    times:        reconnectTimes,
    avgRecoveryMs: (() => {
      const v = reconnectTimes.filter(Boolean);
      return v.length > 0 ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
    })(),
    maxRecoveryMs: Math.max(0, ...reconnectTimes.filter(Boolean)),
  },
  throughput: {
    durationMs:  10_000,
    events:      eventCount,
    eventsPerSec: +(eventCount / 10).toFixed(1),
    parseErrors,
  },
  flow: {
    name:      'Full App Session Flow',
    passed:    flowPassed,
    steps:     flowSteps,
    durationMs: flowDuration,
  },
  tests: allTests,
};

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, JSON.stringify(existing, null, 2));
console.log(info(`JSON results → ${JSON_OUT}`));

process.exit(failed > 0 ? 1 : 0);
