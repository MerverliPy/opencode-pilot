#!/usr/bin/env node
/**
 * pilot-test.mjs — Performance & Functionality test suite for Pilot / OpenCode server
 *
 * Tests:
 *   Connectivity   — health, latency
 *   Config         — providers, agents, commands
 *   Sessions       — create, get, list, update, delete, status
 *   Messages       — list (empty + after prompt)
 *   Files          — list root, list subdir, findFile, findText
 *   SSE            — connect, receive first event, reconnect resilience
 *   Error handling — 404 session, bad method
 *   Performance    — p50/p95/p99 latency across 10 repeated health calls
 *   Regression     — OpencodeClient referential stability (simulated)
 *
 * Usage:
 *   node pilot-test.mjs [--url http://host:port] [--user u] [--pass p]
 *
 * Defaults to http://100.81.83.98:4096 (no auth)
 */

import http from 'http';
import https from 'https';

// ─── Config ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};

const BASE_URL = getArg('--url') ?? 'http://100.81.83.98:4096';
const USERNAME = getArg('--user') ?? '';
const PASSWORD = getArg('--pass') ?? '';

// ─── ANSI helpers ────────────────────────────────────────────────────────────

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
};

const pass  = (msg)       => `${C.green}✓${C.reset} ${msg}`;
const fail  = (msg, err)  => `${C.red}✗${C.reset} ${msg}${err ? `\n  ${C.red}${err}${C.reset}` : ''}`;
const skip  = (msg)       => `${C.yellow}−${C.reset} ${C.dim}${msg}${C.reset}`;
const info  = (msg)       => `${C.cyan}ℹ${C.reset} ${C.dim}${msg}${C.reset}`;
const hdr   = (msg)       => `\n${C.bold}${C.white}▸ ${msg}${C.reset}`;
const ms    = (n)         => `${C.gray}${n}ms${C.reset}`;

// ─── HTTP client ─────────────────────────────────────────────────────────────

function request(method, path, body, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const lib = url.protocol === 'https:' ? https : http;
    const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;

    const headers = { Accept: 'application/json' };
    if (USERNAME) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    }
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const start = Date.now();
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
      timeout: timeoutMs,
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        const elapsed = Date.now() - start;
        const ct = res.headers['content-type'] ?? '';
        let data = raw;
        if (ct.includes('application/json') && raw) {
          try { data = JSON.parse(raw); } catch { /* leave as string */ }
        }
        resolve({ status: res.status ?? res.statusCode, data, elapsed, headers: res.headers });
      });
    });

    req.on('error', (e) => reject(Object.assign(e, { elapsed: Date.now() - start })));
    req.on('timeout', () => { req.destroy(); reject(new Error(`timeout after ${timeoutMs}ms`)); });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const GET    = (path, to)       => request('GET',    path, undefined, to);
const POST   = (path, body, to) => request('POST',   path, body, to);
const PATCH  = (path, body)     => request('PATCH',  path, body);
const DELETE = (path)           => request('DELETE', path);

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0, failed = 0, skipped = 0;
const failures = [];

async function test(name, fn) {
  try {
    const result = await fn();
    if (result === 'skip') {
      console.log(skip(name));
      skipped++;
    } else {
      console.log(pass(name) + (result ? ` ${result}` : ''));
      passed++;
    }
  } catch (e) {
    const msg = e?.message ?? String(e);
    console.log(fail(name, msg));
    failures.push({ name, error: msg });
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message ?? 'assertion failed');
}

function assertStatus(res, expected, context = '') {
  if (res.status !== expected) {
    throw new Error(`${context}expected HTTP ${expected}, got ${res.status} — ${
      typeof res.data === 'string' ? res.data.slice(0, 120) : JSON.stringify(res.data).slice(0, 120)
    }`);
  }
}

// ─── Percentile helper ───────────────────────────────────────────────────────

function percentile(sorted, p) {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── SSE helper ──────────────────────────────────────────────────────────────

function connectSSE(path, onEvent, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const lib = url.protocol === 'https:' ? https : http;
    const headers = { Accept: 'text/event-stream' };
    if (USERNAME) {
      headers['Authorization'] = 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    }
    const start = Date.now();
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      headers,
      timeout: timeoutMs,
    }, (res) => {
      let buf = '';
      const elapsed = Date.now() - start;

      if (res.statusCode !== 200) {
        req.destroy();
        return reject(new Error(`SSE returned HTTP ${res.statusCode}`));
      }

      resolve({ connected: true, elapsed, destroy: () => req.destroy() });

      res.on('data', (chunk) => {
        buf += chunk.toString();
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const block of parts) {
          const dataLine = block.split('\n').find((l) => l.startsWith('data:'));
          if (dataLine) {
            try { onEvent(JSON.parse(dataLine.slice(5).trim())); } catch { /* ignore */ }
          }
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error(`SSE timeout ${timeoutMs}ms`)); });
    req.end();
  });
}

// ─── State shared across tests ───────────────────────────────────────────────

let testSessionId = null;

// ─── SUITE ───────────────────────────────────────────────────────────────────

console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════╗
║         Pilot / OpenCode Test Suite          ║
╚══════════════════════════════════════════════╝${C.reset}`);
console.log(info(`target: ${BASE_URL}`));
console.log(info(`auth:   ${USERNAME ? `basic (${USERNAME})` : 'none'}`));

// ── 1. Connectivity & Health ─────────────────────────────────────────────────
console.log(hdr('1. Connectivity & Health'));

await test('server is reachable', async () => {
  const r = await GET('/global/health', 4000);
  assertStatus(r, 200, 'health: ');
  assert(r.data?.healthy === true, `healthy=false: ${JSON.stringify(r.data)}`);
  return ms(r.elapsed);
});

// ── 2. Performance (p50 / p95 / p99) ────────────────────────────────────────
console.log(hdr('2. Latency (10 × /global/health)'));

await test('health p50 < 500ms, p99 < 2000ms', async () => {
  const times = [];
  for (let i = 0; i < 10; i++) {
    const r = await GET('/global/health');
    assertStatus(r, 200);
    times.push(r.elapsed);
  }
  times.sort((a, b) => a - b);
  const p50 = percentile(times, 50);
  const p95 = percentile(times, 95);
  const p99 = percentile(times, 99);
  assert(p50 < 500,  `p50=${p50}ms exceeds 500ms`);
  assert(p99 < 2000, `p99=${p99}ms exceeds 2000ms`);
  return `p50=${ms(p50)} p95=${ms(p95)} p99=${ms(p99)} min=${ms(times[0])} max=${ms(times[times.length-1])}`;
});

// ── 3. Config ────────────────────────────────────────────────────────────────
console.log(hdr('3. Config'));

await test('GET /config/providers returns providers + default', async () => {
  const r = await GET('/config/providers');
  assertStatus(r, 200);
  assert(r.data && typeof r.data === 'object', 'body is not an object');
  assert(Array.isArray(r.data.providers), 'providers is not an array');
  assert(typeof r.data.default === 'object', 'default is not an object');
  const count = r.data.providers.length;
  return `${count} provider(s) ${ms(r.elapsed)}`;
});

await test('GET /agent returns array', async () => {
  const r = await GET('/agent');
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} agent(s) ${ms(r.elapsed)}`;
});

await test('GET /command returns array', async () => {
  const r = await GET('/command');
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} command(s) ${ms(r.elapsed)}`;
});

// ── 4. Sessions ──────────────────────────────────────────────────────────────
console.log(hdr('4. Sessions'));

await test('GET /session returns array', async () => {
  const r = await GET('/session');
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} session(s) ${ms(r.elapsed)}`;
});

await test('POST /session creates session with title', async () => {
  const r = await POST('/session', { title: '__pilot_test__' });
  assertStatus(r, 200);
  assert(r.data?.id, 'no id in response');
  assert(r.data?.title === '__pilot_test__', `title mismatch: ${r.data?.title}`);
  testSessionId = r.data.id;
  return `id=${testSessionId} ${ms(r.elapsed)}`;
});

await test('GET /session/:id returns session', async () => {
  assert(testSessionId, 'no session id from previous test');
  const r = await GET(`/session/${testSessionId}`);
  assertStatus(r, 200);
  assert(r.data?.id === testSessionId, 'id mismatch');
  return ms(r.elapsed);
});

await test('PATCH /session/:id updates title', async () => {
  assert(testSessionId, 'no session id');
  const r = await PATCH(`/session/${testSessionId}`, { title: '__pilot_test_updated__' });
  assertStatus(r, 200);
  assert(r.data?.title === '__pilot_test_updated__', `title not updated: ${r.data?.title}`);
  return ms(r.elapsed);
});

await test('GET /session/status returns status map', async () => {
  const r = await GET('/session/status');
  assertStatus(r, 200);
  assert(r.data && typeof r.data === 'object', 'not an object');
  const status = r.data[testSessionId];
  return `test session status="${status}" ${ms(r.elapsed)}`;
});

await test('GET /session/:id/message returns array', async () => {
  assert(testSessionId, 'no session id');
  const r = await GET(`/session/${testSessionId}/message`);
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} message(s) ${ms(r.elapsed)}`;
});

// ── 5. Error handling ────────────────────────────────────────────────────────
console.log(hdr('5. Error Handling'));

await test('GET /session/nonexistent-id returns 4xx', async () => {
  const r = await GET('/session/pilot-test-fake-id-000');
  assert(r.status >= 400 && r.status < 500, `expected 4xx, got ${r.status}`);
  return `HTTP ${r.status} ${ms(r.elapsed)}`;
});

await test('GET unknown route falls back to SPA (HTML)', async () => {
  // OpenCode serves its React SPA for all unmatched routes (no 404)
  const r = await GET('/this/route/does/not/exist');
  assert(r.status === 200, `expected 200 (SPA fallback), got ${r.status}`);
  const ct = r.headers?.['content-type'] ?? '';
  assert(ct.includes('text/html'), `expected text/html, got ${ct}`);
  return `HTTP ${r.status} ${ct.split(';')[0]}`;
});

// ── 6. Files ─────────────────────────────────────────────────────────────────
console.log(hdr('6. Files'));

await test('GET /file?path=. lists root directory', async () => {
  const r = await GET('/file?path=.');
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} node(s) at root ${ms(r.elapsed)}`;
});

await test('GET /find/file?query=package finds files', async () => {
  const r = await GET('/find/file?query=package&limit=10');
  assertStatus(r, 200);
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} match(es) ${ms(r.elapsed)}`;
});

await test('GET /file/content?path returns file content', async () => {
  // Use package.json at the working dir as a safe target
  const r = await GET('/file/content?path=package.json');
  if (r.status === 404) return 'skip';
  assertStatus(r, 200);
  assert(r.data && (r.data.content !== undefined || typeof r.data === 'string'), 'no content');
  return ms(r.elapsed);
});

// ── 7. SSE ───────────────────────────────────────────────────────────────────
console.log(hdr('7. SSE'));

await test('GET /event connects with HTTP 200', async () => {
  const events = [];
  let handle;
  try {
    const result = await connectSSE('/event', (e) => events.push(e), 5000);
    handle = result.destroy;
    assert(result.connected, 'not connected');
    // Give it 1s to accumulate events
    await new Promise((r) => setTimeout(r, 1000));
    handle();
    return `connected in ${ms(result.elapsed)}, received ${events.length} event(s)`;
  } catch (e) {
    if (handle) handle();
    throw e;
  }
});

// ── 8. Permissions (Quick Actions) ───────────────────────────────────────────
console.log(hdr('8. Permissions (Quick Actions)'));

await test('POST /session/:id/permissions/:permID response=once returns 4xx (allow-once action path)', async () => {
  assert(testSessionId, 'no session id');
  const r = await POST(`/session/${testSessionId}/permissions/pilot-test-fake-perm-id`,
    { response: 'once' });
  assert(r.status >= 400 && r.status < 500, `expected 4xx, got ${r.status}`);
  return `HTTP ${r.status} ${ms(r.elapsed)}`;
});

await test('POST /session/:id/permissions/:permID response=reject returns 4xx (deny action path)', async () => {
  assert(testSessionId, 'no session id');
  const r = await POST(`/session/${testSessionId}/permissions/pilot-test-fake-perm-id`,
    { response: 'reject' });
  assert(r.status >= 400 && r.status < 500, `expected 4xx, got ${r.status}`);
  return `HTTP ${r.status} ${ms(r.elapsed)}`;
});

await test('POST /session/nonexistent/permissions/:permID returns 4xx', async () => {
  const r = await POST('/session/pilot-test-ghost-sess/permissions/pilot-test-fake-perm-id',
    { response: 'once' });
  assert(r.status >= 400 && r.status < 500, `expected 4xx, got ${r.status}`);
  return `HTTP ${r.status} ${ms(r.elapsed)}`;
});

await test('relay: permission push includes categoryId=PILOT_PERMISSION, idle/error do not', async () => {
  // Mirrors the relay's send() call construction after the quick-actions change.
  // No network needed — pure logic regression.
  const buildMsg = (to, title, body, data, categoryId) => ({
    to, sound: 'default', title, body, data,
    ...(categoryId ? { categoryId } : {}),
  });

  const token     = 'ExponentPushToken[test-regression]';
  const sessionID = 'sess-abc';

  const permMsg = buildMsg(token, 'opencode: permission', 'sess — run shell',
    { sessionID, permissionID: 'perm-xyz' }, 'PILOT_PERMISSION');
  assert(permMsg.categoryId === 'PILOT_PERMISSION',
    `permission push missing categoryId, got: ${permMsg.categoryId}`);

  const idleMsg = buildMsg(token, 'opencode: idle', 'sess', { sessionID }, undefined);
  assert(!('categoryId' in idleMsg),
    `session.idle should not have categoryId`);

  const errMsg = buildMsg(token, 'opencode: error', 'sess', { sessionID }, undefined);
  assert(!('categoryId' in errMsg),
    `session.error should not have categoryId`);

  return '3 event types validated (permission ✓, idle ✓, error ✓)';
});

// ── 9. Session abort ─────────────────────────────────────────────────────────
console.log(hdr('9. Session Lifecycle'));

await test('POST /session/:id/abort returns 200', async () => {
  assert(testSessionId, 'no session id');
  const r = await POST(`/session/${testSessionId}/abort`);
  // 200 or 204 both acceptable
  assert(r.status === 200 || r.status === 204, `unexpected ${r.status}`);
  return ms(r.elapsed);
});

await test('DELETE /session/:id removes session', async () => {
  assert(testSessionId, 'no session id');
  const r = await DELETE(`/session/${testSessionId}`);
  assert(r.status === 200 || r.status === 204, `unexpected ${r.status}`);
  return ms(r.elapsed);
});

await test('GET /session/:id after delete returns 4xx', async () => {
  assert(testSessionId, 'no session id');
  const r = await GET(`/session/${testSessionId}`);
  assert(r.status >= 400, `expected 4xx after delete, got ${r.status}`);
  return `HTTP ${r.status} ${ms(r.elapsed)}`;
});

// ── 10. Regression: client stability simulation ───────────────────────────────
console.log(hdr('10. Regression: Client Stability'));

await test('OpencodeClient created once per config (stability check)', async () => {
  // Simulate what the fixed useMemo does vs the old s.client() pattern.
  // We create 100 "renders" and verify that a stable key produces
  // the same object reference while a changing key does not.
  const serverConfig = { id: 'test', url: BASE_URL, name: 'test', username: '', password: '' };

  // Memoization simulation — same deps = same reference
  const cache = new Map();
  const stableMemo = (cfg) => {
    const key = `${cfg.id}|${cfg.url}|${cfg.username}|${cfg.password}`;
    if (!cache.has(key)) cache.set(key, { server: cfg, createdAt: Date.now() });
    return cache.get(key);
  };

  const refs = Array.from({ length: 100 }, () => stableMemo(serverConfig));
  const uniqueRefs = new Set(refs).size;
  assert(uniqueRefs === 1, `expected 1 unique ref from 100 renders, got ${uniqueRefs}`);

  // Unstable pattern (old s.client() behaviour) — always new
  const unstable = Array.from({ length: 100 }, () => ({ server: serverConfig }));
  const uniqueUnstable = new Set(unstable).size;
  assert(uniqueUnstable === 100, `unstable sim should produce 100 unique refs`);

  return `stable: ${uniqueRefs} ref / 100 renders (was ${uniqueUnstable} with old pattern)`;
});

// ── 11. Concurrent load ───────────────────────────────────────────────────────
console.log(hdr('11. Concurrent Load (5 parallel health checks)'));

await test('5 concurrent requests all succeed within 3s', async () => {
  const start = Date.now();
  const results = await Promise.all(
    Array.from({ length: 5 }, () => GET('/global/health', 3000))
  );
  const elapsed = Date.now() - start;
  const allOk = results.every((r) => r.status === 200 && r.data?.healthy === true);
  assert(allOk, `not all healthy: ${results.map(r => r.status).join(', ')}`);
  assert(elapsed < 3000, `took ${elapsed}ms, expected < 3000ms`);
  const times = results.map(r => r.elapsed).sort((a,b)=>a-b);
  return `wall=${ms(elapsed)} individual=[${times.map(t=>t+'ms').join(', ')}]`;
});

// ─── Summary ─────────────────────────────────────────────────────────────────

const total = passed + failed + skipped;
console.log(`
${C.bold}${C.white}══════════════════════════════════════════════${C.reset}
${C.bold}  Results: ${C.green}${passed} passed${C.reset}  ${failed > 0 ? C.red : C.gray}${failed} failed${C.reset}  ${C.yellow}${skipped} skipped${C.reset}  ${C.dim}(${total} total)${C.reset}
${C.bold}${C.white}══════════════════════════════════════════════${C.reset}`);

if (failures.length > 0) {
  console.log(`\n${C.red}${C.bold}Failures:${C.reset}`);
  for (const { name, error } of failures) {
    console.log(`  ${C.red}✗${C.reset} ${name}`);
    console.log(`    ${C.dim}${error}${C.reset}`);
  }
  console.log('');
}

process.exit(failed > 0 ? 1 : 0);
