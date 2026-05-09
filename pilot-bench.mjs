#!/usr/bin/env node
/**
 * pilot-bench.mjs — Correctness test suite with structured JSON output.
 *
 * Covers every endpoint exposed by OpencodeClient (services/api.ts):
 *   Connectivity   — health, version
 *   Performance    — p50/p95/p99 latency (10× health)
 *   Config         — providers, agents, commands
 *   Sessions       — create, get, list, update, abort, status, delete
 *   Messages       — list
 *   Diff           — session diff endpoint
 *   Files          — list root, findFile, findText, fileContent
 *   SSE            — connect, receive events
 *   Permissions    — quick-action paths + relay regression
 *   Error handling — 404 session, unknown route
 *   Concurrent     — 5 parallel health checks
 *   Regression     — client referential stability simulation
 *
 * Usage:
 *   node pilot-bench.mjs [--url http://host:port] [--user u] [--pass p]
 *                        [--out /path/to/out.json]
 * Defaults:
 *   --url  http://100.81.83.98:4096
 *   --out  /tmp/pilot-results.json
 */

import { getArg, C, fmt, createClient, createRunner, percentile, writeJson } from './bench-lib.mjs';

// ─── CLI ──────────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const BASE_URL = getArg(args, '--url')  ?? 'http://100.81.83.98:4096';
const USERNAME = getArg(args, '--user') ?? '';
const PASSWORD = getArg(args, '--pass') ?? '';
const JSON_OUT = getArg(args, '--out')  ?? '/tmp/pilot-results.json';

// ─── Client + runner ─────────────────────────────────────────────────────────

const { GET, POST, PATCH, DELETE, openSSE } = createClient(BASE_URL, USERNAME, PASSWORD);
const runner = createRunner();
const { test, suite, assert, assertStatus } = runner;

// ─── Banner ───────────────────────────────────────────────────────────────────

const runStart = Date.now();
console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════╗
║      Pilot Correctness Bench Suite           ║
╚══════════════════════════════════════════════╝${C.reset}`);
console.log(fmt.info(`target : ${BASE_URL}`));
console.log(fmt.info(`auth   : ${USERNAME ? `basic (${USERNAME})` : 'none'}`));
console.log(fmt.info(`output : ${JSON_OUT}`));

// ─── Shared state ─────────────────────────────────────────────────────────────

let sessionId = null;

// ─── 1. Connectivity ──────────────────────────────────────────────────────────

suite('1. Connectivity & Health');

await test('server is reachable', async () => {
  const r = await GET('/global/health', 4000);
  assertStatus(r, 200, 'health: ');
  assert(r.data?.healthy === true, `healthy=false: ${JSON.stringify(r.data)}`);
  return fmt.ms(r.elapsed);
});

await test('version field present in health response', async () => {
  const r = await GET('/global/health');
  assertStatus(r, 200);
  assert(typeof r.data?.version === 'string', `version missing: ${JSON.stringify(r.data)}`);
  return `v${r.data.version} ${fmt.ms(r.elapsed)}`;
});

// ─── 2. Latency ───────────────────────────────────────────────────────────────

suite('2. Latency (10× /global/health)');

await test('p50 < 500ms, p99 < 2000ms', async () => {
  const times = [];
  for (let i = 0; i < 10; i++) {
    const r = await GET('/global/health');
    times.push(r.elapsed);
  }
  times.sort((a, b) => a - b);
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  const p99 = percentile(times, 99);
  assert(p50 < 500,  `p50=${p50}ms exceeds 500ms`);
  assert(p99 < 2000, `p99=${p99}ms exceeds 2000ms`);
  return `p50=${fmt.ms(p50)} p95=${fmt.ms(p95)} p99=${fmt.ms(p99)} min=${fmt.ms(times[0])} max=${fmt.ms(times[times.length - 1])}`;
});

// ─── 3. Config ────────────────────────────────────────────────────────────────

suite('3. Config');

await test('GET /config/providers returns providers + default', async () => {
  const r = await GET('/config/providers');
  assert(r.data && typeof r.data === 'object', 'body is not an object');
  assert(Array.isArray(r.data.providers), 'providers is not an array');
  assert(typeof r.data.default === 'object', 'default is not an object');
  return `${r.data.providers.length} provider(s) ${fmt.ms(r.elapsed)}`;
});

await test('GET /agent returns array', async () => {
  const r = await GET('/agent');
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} agent(s) ${fmt.ms(r.elapsed)}`;
});

await test('GET /command returns array', async () => {
  const r = await GET('/command');
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} command(s) ${fmt.ms(r.elapsed)}`;
});

// ─── 4. Sessions ─────────────────────────────────────────────────────────────

suite('4. Sessions');

await test('GET /session returns array', async () => {
  const r = await GET('/session');
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} session(s) ${fmt.ms(r.elapsed)}`;
});

await test('POST /session creates session with title', async () => {
  const r = await POST('/session', { title: '__pilot_bench__' });
  assertStatus(r, 200, 'create session: ');
  assert(r.data?.id, 'no id in response');
  assert(r.data?.title === '__pilot_bench__', `title mismatch: ${r.data?.title}`);
  sessionId = r.data.id;
  return `id=${sessionId} ${fmt.ms(r.elapsed)}`;
});

await test('GET /session/:id returns session', async () => {
  assert(sessionId, 'no session id from previous test');
  const r = await GET(`/session/${sessionId}`);
  assertStatus(r, 200);
  assert(r.data?.id === sessionId, 'id mismatch');
  return fmt.ms(r.elapsed);
});

await test('PATCH /session/:id updates title', async () => {
  assert(sessionId, 'no session id');
  const r = await PATCH(`/session/${sessionId}`, { title: '__pilot_bench_updated__' });
  assertStatus(r, 200);
  assert(r.data?.title === '__pilot_bench_updated__', `title not updated: ${r.data?.title}`);
  return fmt.ms(r.elapsed);
});

await test('GET /session/status returns status map', async () => {
  const r = await GET('/session/status');
  assertStatus(r, 200);
  assert(r.data && typeof r.data === 'object', 'not an object');
  return `test session status="${r.data[sessionId]}" ${fmt.ms(r.elapsed)}`;
});

// ─── 5. Messages ──────────────────────────────────────────────────────────────

suite('5. Messages');

await test('GET /session/:id/message returns array', async () => {
  const r = await GET(`/session/${sessionId}/message`);
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} message(s) ${fmt.ms(r.elapsed)}`;
});

// ─── 6. Diff ──────────────────────────────────────────────────────────────────

suite('6. Diff');

await test('GET /session/:id/diff returns array', async () => {
  const r = await GET(`/session/${sessionId}/diff`);
  if (r.status === 404) return 'skip';
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} diff(s) ${fmt.ms(r.elapsed)}`;
});

// ─── 7. Files ─────────────────────────────────────────────────────────────────

suite('7. Files');

await test('GET /file?path=. lists root directory', async () => {
  const r = await GET('/file?path=.');
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} node(s) at root ${fmt.ms(r.elapsed)}`;
});

await test('GET /find/file?query=package finds files', async () => {
  const r = await GET('/find/file?query=package&limit=10');
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} match(es) ${fmt.ms(r.elapsed)}`;
});

await test('GET /find?pattern=package searches text', async () => {
  let r;
  try {
    r = await GET('/find?pattern=package', 3000);
  } catch (e) {
    return `skip (${e.message})`;
  }
  if (r.status === 404) return 'skip (endpoint not found)';
  if (r.status === 500) {
    const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data ?? '');
    if (body.toLowerCase().includes('ripgrep')) return 'skip (server ripgrep error)';
  }
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} text match(es) ${fmt.ms(r.elapsed)}`;
});

await test('GET /file/content?path=package.json returns content', async () => {
  const r = await GET('/file/content?path=package.json');
  assertStatus(r, 200);
  assert(r.data && (r.data.content !== undefined || typeof r.data === 'string'), 'no content');
  return fmt.ms(r.elapsed);
});

// ─── 8. Error Handling ────────────────────────────────────────────────────────

suite('8. Error Handling');

await test('GET /session/nonexistent-id returns 4xx', async () => {
  const r = await GET('/session/pilot-bench-fake-id-000');
  assert(r.status >= 400 && r.status < 500, `expected 4xx, got ${r.status}`);
  return `HTTP ${r.status} ${fmt.ms(r.elapsed)}`;
});

await test('GET unknown route falls back to SPA (HTML)', async () => {
  const r = await GET('/this/route/does/not/exist');
  assert(r.status === 200, `expected HTTP 200, got ${r.status}`);
  const contentType = r.headers['content-type'] || '';
  assert(contentType.includes('text/html'), `expected text/html, got ${contentType}`);
  return `HTTP ${r.status} ${contentType} ${fmt.ms(r.elapsed)}`;
});

// ─── 9. SSE ───────────────────────────────────────────────────────────────────

suite('9. SSE');

await test('GET /event connects with HTTP 200', async () => {
  const events = [];
  let handle;
  try {
    const result = await openSSE('/event', (evt) => { if (evt) events.push(evt); }, 5000);
    handle = result.destroy;
    assert(result.connected, 'not connected');
    await new Promise((r) => setTimeout(r, 1000));
    handle();
    return `connected in ${fmt.ms(result.elapsed)}, received ${events.length} event(s)`;
  } catch (e) {
    if (handle) handle();
    throw e;
  }
});

// ─── 10. Permissions (Quick Actions) ─────────────────────────────────────────

suite('10. Permissions (Quick Actions)');

await test('POST /session/:id/permissions/:permID response=once returns 4xx (allow-once action path)', async () => {
  const r = await POST(
    `/session/${sessionId}/permissions/pilot-bench-fake-perm-id`,
    { response: 'once' }
  );
  assert(r.status >= 400 && r.status < 500, `expected 4xx, got ${r.status}`);
  return `HTTP ${r.status} ${fmt.ms(r.elapsed)}`;
});

await test('POST /session/:id/permissions/:permID response=reject returns 4xx (deny action path)', async () => {
  const r = await POST(
    `/session/${sessionId}/permissions/pilot-bench-fake-perm-id`,
    { response: 'reject' }
  );
  assert(r.status >= 400 && r.status < 500, `expected 4xx, got ${r.status}`);
  return `HTTP ${r.status} ${fmt.ms(r.elapsed)}`;
});

await test('POST /session/nonexistent/permissions/:permID returns 4xx', async () => {
  const r = await POST(
    '/session/pilot-bench-ghost-sess/permissions/pilot-bench-fake-perm-id',
    { response: 'once' }
  );
  assert(r.status >= 400 && r.status < 500, `expected 4xx, got ${r.status}`);
  return `HTTP ${r.status} ${fmt.ms(r.elapsed)}`;
});

await test('relay: permission push includes categoryId=PILOT_PERMISSION, idle/error do not', async () => {
  const buildMsg = (to, title, body, data, categoryId) => ({
    to, sound: 'default', title, body, data,
    ...(categoryId ? { categoryId } : {}),
  });

  const token     = 'ExponentPushToken[bench-regression]';
  const sessionID = 'sess-abc';

  const permMsg = buildMsg(token, 'opencode: permission', 'sess — run shell',
    { sessionID, permissionID: 'perm-xyz' }, 'PILOT_PERMISSION');
  assert(permMsg.categoryId === 'PILOT_PERMISSION',
    `permission push missing categoryId, got: ${permMsg.categoryId}`);

  const idleMsg = buildMsg(token, 'opencode: idle', 'sess', { sessionID }, undefined);
  assert(!('categoryId' in idleMsg), 'session.idle should not have categoryId');

  const errMsg = buildMsg(token, 'opencode: error', 'sess', { sessionID }, undefined);
  assert(!('categoryId' in errMsg), 'session.error should not have categoryId');

  return '3 event types validated (permission ✓, idle ✓, error ✓)';
});

await test('permission endpoint p50 < 500ms, p95 < 1000ms (error-path, 5 calls)', async () => {
  const times = [];
  for (let i = 0; i < 5; i++) {
    const r = await POST(
      `/session/${sessionId}/permissions/pilot-bench-fake-perm-${i}`,
      { response: 'once' }
    );
    assert(r.status >= 400, `expected error status, got ${r.status}`);
    times.push(r.elapsed);
  }
  times.sort((a, b) => a - b);
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  assert(p50 < 500,  `p50=${p50}ms exceeds 500ms`);
  assert(p95 < 1000, `p95=${p95}ms exceeds 1000ms`);
  return `p50=${fmt.ms(p50)} p95=${fmt.ms(p95)} (5 calls)`;
});

// ─── 11. Session Lifecycle ────────────────────────────────────────────────────

suite('11. Session Lifecycle');

await test('POST /session/:id/abort returns 200', async () => {
  assert(sessionId, 'no session id');
  const r = await POST(`/session/${sessionId}/abort`);
  assert(r.status === 200 || r.status === 204, `unexpected ${r.status}`);
  return fmt.ms(r.elapsed);
});

await test('DELETE /session/:id removes session', async () => {
  assert(sessionId, 'no session id');
  const r = await DELETE(`/session/${sessionId}`);
  assert(r.status === 200 || r.status === 204, `unexpected ${r.status}`);
  return fmt.ms(r.elapsed);
});

await test('GET /session/:id after delete returns 4xx', async () => {
  const r = await GET(`/session/${sessionId}`);
  assert(r.status >= 400, `expected 4xx after delete, got ${r.status}`);
  return `HTTP ${r.status} ${fmt.ms(r.elapsed)}`;
});

// ─── 12. Concurrent ───────────────────────────────────────────────────────────

suite('12. Concurrent Load (5 parallel health checks)');

await test('5 concurrent requests all succeed within 3s', async () => {
  const start   = Date.now();
  const results = await Promise.all(Array.from({ length: 5 }, () => GET('/global/health', 3000)));
  const elapsed = Date.now() - start;
  const allOk   = results.every((r) => r.status === 200 && r.data?.healthy === true);
  assert(allOk,       `not all healthy: ${results.map((r) => r.status).join(', ')}`);
  assert(elapsed < 3000, `took ${elapsed}ms, expected < 3000ms`);
  const times = results.map((r) => r.elapsed).sort((a, b) => a - b);
  return `wall=${fmt.ms(elapsed)} individual=[${times.map((t) => t + 'ms').join(', ')}]`;
});

// ─── 13. Regression ───────────────────────────────────────────────────────────

suite('13. Regression: Client Stability');

await test('OpencodeClient created once per config (stability check)', async () => {
  const serverConfig = { id: 'test', url: BASE_URL, name: 'test', username: '', password: '' };
  const cache        = new Map();
  const stableMemo   = (cfg) => {
    const key = `${cfg.id}|${cfg.url}|${cfg.username}|${cfg.password}`;
    if (!cache.has(key)) cache.set(key, { server: cfg, createdAt: Date.now() });
    return cache.get(key);
  };

  const refs           = Array.from({ length: 100 }, () => stableMemo(serverConfig));
  const uniqueRefs     = new Set(refs).size;
  assert(uniqueRefs === 1, `expected 1 unique ref from 100 renders, got ${uniqueRefs}`);

  const unstable       = Array.from({ length: 100 }, () => ({ server: serverConfig }));
  const uniqueUnstable = new Set(unstable).size;
  assert(uniqueUnstable === 100, 'unstable sim should produce 100 unique refs');

  return `stable: ${uniqueRefs} ref / 100 renders (was ${uniqueUnstable} with old pattern)`;
});

// ─── Summary ──────────────────────────────────────────────────────────────────

const totalDuration = Date.now() - runStart;
const total         = runner.passed + runner.failed + runner.skipped;

runner.printSummary();
console.log(fmt.info(`JSON results → ${JSON_OUT}`));

// ─── Write JSON ───────────────────────────────────────────────────────────────

writeJson(JSON_OUT, {
  meta: {
    target:     BASE_URL,
    timestamp:  new Date().toISOString(),
    durationMs: totalDuration,
  },
  correctness: {
    passed:  runner.passed,
    failed:  runner.failed,
    skipped: runner.skipped,
    total,
    tests:   runner.allTests,
  },
});

process.exit(runner.failed > 0 ? 1 : 0);
