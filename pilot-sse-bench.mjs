#!/usr/bin/env node
/**
 * pilot-sse-bench.mjs — SSE stress tests + full app flow simulation
 *
 * Test groups:
 *   A. Concurrent SSE connections  — open N parallel connections, verify all get HTTP 200
 *   B. Reconnection resilience      — connect → destroy → reconnect × 10, measure recovery
 *   C. Event throughput             — hold connection 5s, count events, check parse errors
 *   D. Full app session flow        — simulates exact sequence the Expo app performs
 *
 * Usage:
 *   node pilot-sse-bench.mjs [--url http://host:port] [--user u] [--pass p]
 *                             [--out /tmp/pilot-sse.json]
 */

import { getArg, C, fmt, createClient, createRunner, writeJson, sleep } from './bench-lib.mjs';

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const BASE_URL = getArg(args, '--url')  ?? 'http://100.81.83.98:4096';
const USERNAME = getArg(args, '--user') ?? '';
const PASSWORD = getArg(args, '--pass') ?? '';
const JSON_OUT = getArg(args, '--out')  ?? '/tmp/pilot-sse.json';

// ─── Client + runner ─────────────────────────────────────────────────────────

const { GET, POST, DELETE, openSSE } = createClient(BASE_URL, USERNAME, PASSWORD);
const runner = createRunner();
const { test, suite, assert, assertStatus } = runner;

// ─── Banner ──────────────────────────────────────────────────────────────────

const runStart = Date.now();

console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════╗
║       Pilot SSE & Flow Bench Suite           ║
╚══════════════════════════════════════════════╝${C.reset}`);
console.log(fmt.info(`target : ${BASE_URL}`));
console.log(fmt.info(`output : ${JSON_OUT}`));

// ═══════════════════════════════════════════════════════════════════════════
// A. Concurrent SSE connections
// ═══════════════════════════════════════════════════════════════════════════

suite('A. Concurrent SSE Connections');

const CONCURRENCY_LEVELS = [1, 5, 10];
const concurrencyResults = [];

for (const n of CONCURRENCY_LEVELS) {
  await test(`${n} concurrent SSE connections all get HTTP 200`, async () => {
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
    const avgMs = times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;

    concurrencyResults.push({ vus: n, connected, failed: failures, avgConnectMs: avgMs });

    assert(connected >= Math.ceil(n * 0.9), `only ${connected}/${n} connected (need ≥90%)`);
    return `${connected}/${n} connected  avg ${fmt.ms(avgMs)}`;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// B. Reconnection resilience (mirrors sse.ts exponential backoff: 500ms base)
// ═══════════════════════════════════════════════════════════════════════════

suite('B. Reconnection Resilience (10 cycles)');

const reconnectTimes = [];

await test('reconnects after forced disconnect 10 times', async () => {
  const CYCLES = 10;
  let   successes = 0;

  for (let i = 0; i < CYCLES; i++) {
    let handle;
    try {
      handle = await openSSE('/event', null, 5000);
    } catch {
      reconnectTimes.push(null);
      continue;
    }
    await sleep(200);

    const reconnectStart = Date.now();
    handle.destroy();

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
  return `${successes}/${CYCLES} succeeded  avg recovery ${fmt.ms(avgRec)}  max ${fmt.ms(maxRec)}`;
});

// ═══════════════════════════════════════════════════════════════════════════
// C. Event throughput (5 second hold — reduced from 10s)
// ═══════════════════════════════════════════════════════════════════════════

suite('C. SSE Event Throughput (5s)');

let eventCount  = 0;
let parseErrors = 0;

await test('holds connection 5s and counts events', async () => {
  let handle;
  try {
    handle = await openSSE('/event', (evt, err) => {
      if (err) { parseErrors++; return; }
      if (evt !== null) eventCount++;
    }, 8000);
  } catch (e) {
    throw new Error(`SSE connect failed: ${e.message}`);
  }

  await sleep(5_000);
  handle.destroy();

  const eventsPerSec = (eventCount / 5).toFixed(1);
  return `${eventCount} events  ${eventsPerSec}/s  ${parseErrors} parse error(s)`;
});

await test('no JSON parse errors in event stream', async () => {
  assert(parseErrors === 0, `${parseErrors} parse error(s) in 5s event stream`);
  return `parse errors: ${parseErrors}`;
});

// ═══════════════════════════════════════════════════════════════════════════
// D. Full app session flow simulation
// ═══════════════════════════════════════════════════════════════════════════

suite('D. Full App Session Flow');

await test('Full app session flow (10 steps)', async () => {
  const flowSteps = [];
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
      throw e;
    }
  }

  try {
    await step('Step 1 — health check (auth + version)', async () => {
      const r = await GET('/global/health', 4000);
      assertStatus(r, 200);
      assert(r.data?.healthy === true, 'unhealthy');
      return `v${r.data?.version ?? '?'} ${fmt.ms(r.elapsed)}`;
    });

    await step('Step 2 — fetch providers (setup screen)', async () => {
      const r = await GET('/config/providers');
      assertStatus(r, 200);
      assert(Array.isArray(r.data?.providers), 'no providers array');
      return `${r.data.providers.length} provider(s) ${fmt.ms(r.elapsed)}`;
    });

    await step('Step 3 — fetch agents', async () => {
      const r = await GET('/agent');
      assertStatus(r, 200);
      assert(Array.isArray(r.data), 'not an array');
      return `${r.data.length} agent(s) ${fmt.ms(r.elapsed)}`;
    });

    await step('Step 4 — list sessions (session picker)', async () => {
      const r = await GET('/session');
      assertStatus(r, 200);
      assert(Array.isArray(r.data), 'not an array');
      return `${r.data.length} existing session(s) ${fmt.ms(r.elapsed)}`;
    });

    await step('Step 5 — create new session', async () => {
      const r = await POST('/session', { title: '__pilot_flow_test__' });
      assertStatus(r, 200);
      assert(r.data?.id, 'no session id');
      flowSessId = r.data.id;
      return `id=${flowSessId} ${fmt.ms(r.elapsed)}`;
    });

    await step('Step 6 — connect SSE event stream', async () => {
      sseHandle = await openSSE('/event', null, 5000);
      assert(sseHandle.connected, 'not connected');
      return `connected in ${fmt.ms(sseHandle.elapsed)}`;
    });

    await step('Step 7 — fetch session messages', async () => {
      const r = await GET(`/session/${flowSessId}/message`);
      assertStatus(r, 200);
      assert(Array.isArray(r.data), 'not an array');
      return `${r.data.length} message(s) ${fmt.ms(r.elapsed)}`;
    });

    await step('Step 8 — fetch session diff', async () => {
      const r = await GET(`/session/${flowSessId}/diff`);
      if (r.status === 404) return 'endpoint not found (skip)';
      assertStatus(r, 200);
      assert(Array.isArray(r.data), 'not an array');
      return `${r.data.length} diff(s) ${fmt.ms(r.elapsed)}`;
    });

    await step('Step 9 — SSE still connected after session ops', async () => {
      assert(sseHandle && !sseHandle.destroyed, 'SSE handle destroyed prematurely');
      sseHandle.destroy();
      sseHandle = null;
      return 'SSE alive through session lifecycle';
    });

    await step('Step 10 — delete test session (cleanup)', async () => {
      if (!flowSessId) return 'no session to delete';
      const r = await DELETE(`/session/${flowSessId}`);
      assert(r.status === 200 || r.status === 204, `unexpected ${r.status}`);
      flowSessId = null;
      return fmt.ms(r.elapsed);
    });

  } finally {
    if (sseHandle) try { sseHandle.destroy(); } catch { /* ignore */ }
    if (flowSessId) try { await DELETE(`/session/${flowSessId}`); } catch { /* best-effort */ }
  }

  const stepsPassed = flowSteps.filter((s) => s.status === 'pass').length;
  return `${stepsPassed}/${flowSteps.length} steps passed`;
});

// ─── Summary ─────────────────────────────────────────────────────────────────

const totalDuration = Date.now() - runStart;

runner.printSummary('SSE Results');
console.log(fmt.info(`JSON results → ${JSON_OUT}`));

// ─── Write JSON ───────────────────────────────────────────────────────────────

const validReconn = reconnectTimes.filter(Boolean);

writeJson(JSON_OUT, {
  sse: {
    durationMs:  totalDuration,
    passed:      runner.passed,
    failed:      runner.failed,
    concurrency: concurrencyResults,
    reconnect: {
      cycles:        10,
      succeeded:     validReconn.length,
      times:         reconnectTimes,
      avgRecoveryMs: validReconn.length > 0
        ? Math.round(validReconn.reduce((a, b) => a + b, 0) / validReconn.length)
        : 0,
      maxRecoveryMs: Math.max(0, ...validReconn),
    },
    throughput: {
      durationMs:   5_000,
      events:       eventCount,
      eventsPerSec: +(eventCount / 5).toFixed(1),
      parseErrors,
    },
    tests: runner.allTests,
  },
});

process.exit(runner.failed > 0 ? 1 : 0);
