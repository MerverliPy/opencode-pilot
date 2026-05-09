#!/usr/bin/env node
/**
 * bench-lib.mjs — Shared utilities for the Pilot benchmark suite.
 *
 * Exports:
 *   getArg(args, flag)              CLI flag parser
 *   C                               ANSI colour map
 *   fmt                             Terminal formatters: pass, fail, skip, info, hdr, ms
 *   createClient(url, user, pass)   HTTP + SSE client factory
 *   createRunner()                  Test runner factory
 *   percentile(sorted, p)           p-th percentile of a sorted numeric array
 *   writeJson(outFile, data)        Write JSON result file (overwrite)
 *   sleep(ms)                       Promise-based delay
 */

import http  from 'http';
import https from 'https';
import fs    from 'fs';
import path  from 'path';

// ─── CLI arg parser ───────────────────────────────────────────────────────────

export function getArg(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
}

// ─── ANSI colour map ──────────────────────────────────────────────────────────

export const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
  blue:   '\x1b[34m',
};

// ─── Terminal formatters ──────────────────────────────────────────────────────

export const fmt = {
  pass: (msg)      => `${C.green}✓${C.reset} ${msg}`,
  fail: (msg, err) => `${C.red}✗${C.reset} ${msg}${err ? `\n  ${C.red}${err}${C.reset}` : ''}`,
  skip: (msg, why) => `${C.yellow}−${C.reset} ${C.dim}${msg}${why ? ` (${why})` : ''}${C.reset}`,
  info: (msg)      => `${C.cyan}ℹ${C.reset} ${C.dim}${msg}${C.reset}`,
  hdr:  (msg)      => `\n${C.bold}${C.white}▸ ${msg}${C.reset}`,
  ms:   (n)        => `${C.gray}${n}ms${C.reset}`,
};

// ─── HTTP + SSE client factory ────────────────────────────────────────────────

export function createClient(baseUrl, username = '', password = '') {
  function authHeader() {
    return username
      ? { Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64') }
      : {};
  }

  function request(method, urlPath, body, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const url     = new URL(baseUrl + urlPath);
      const lib     = url.protocol === 'https:' ? https : http;
      const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;
      const headers = {
        Accept: 'application/json',
        ...authHeader(),
        ...(bodyStr ? {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        } : {}),
      };

      const start = Date.now();
      const req = lib.request({
        hostname: url.hostname,
        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
        path:     url.pathname + url.search,
        method, headers, timeout: timeoutMs,
      }, (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end',  () => {
          const elapsed = Date.now() - start;
          const ct      = res.headers['content-type'] ?? '';
          let   data    = raw;
          if (ct.includes('application/json') && raw) {
            try { data = JSON.parse(raw); } catch { /* leave as string */ }
          }
          resolve({ status: res.statusCode, data, elapsed, headers: res.headers });
        });
      });

      req.on('error',   (e) => reject(Object.assign(e, { elapsed: Date.now() - start })));
      req.on('timeout', () => { req.destroy(); reject(new Error(`timeout after ${timeoutMs}ms`)); });
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  function openSSE(urlPath, onEvent, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const url     = new URL(baseUrl + urlPath);
      const lib     = url.protocol === 'https:' ? https : http;
      const headers = { Accept: 'text/event-stream', ...authHeader() };
      const start   = Date.now();

      const req = lib.request({
        hostname: url.hostname,
        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
        path:     url.pathname,
        method:   'GET',
        headers,
        timeout:  timeoutMs,
      }, (res) => {
        const elapsed = Date.now() - start;
        if (res.statusCode !== 200) {
          req.destroy();
          return reject(new Error(`SSE returned HTTP ${res.statusCode}`));
        }
        resolve({ connected: true, elapsed, destroy: () => req.destroy() });

        let buf = '';
        res.on('data', (chunk) => {
          buf += chunk.toString();
          const parts = buf.split('\n\n');
          buf = parts.pop();
          for (const block of parts) {
            const dl = block.split('\n').find((l) => l.startsWith('data:'));
            if (dl && onEvent) {
              try   { onEvent(JSON.parse(dl.slice(5).trim()), null); }
              catch (e) { if (onEvent) onEvent(null, e); }
            }
          }
        });
      });

      req.on('error',   reject);
      req.on('timeout', () => { req.destroy(); reject(new Error(`SSE timeout ${timeoutMs}ms`)); });
      req.end();
    });
  }

  return {
    request,
    openSSE,
    GET:    (p, to)    => request('GET',    p, undefined, to),
    POST:   (p, b, to) => request('POST',   p, b, to),
    PATCH:  (p, b)     => request('PATCH',  p, b),
    DELETE: (p)        => request('DELETE', p),
  };
}

// ─── Test runner factory ──────────────────────────────────────────────────────

export function createRunner() {
  let passed  = 0;
  let failed  = 0;
  let skipped = 0;
  const failures = [];
  const allTests = [];
  let   suiteName = '';

  function assert(cond, msg) {
    if (!cond) throw new Error(msg ?? 'assertion failed');
  }

  function assertStatus(res, expected, ctx = '') {
    if (res.status !== expected) {
      throw new Error(
        `${ctx}expected HTTP ${expected}, got ${res.status} — ` +
        (typeof res.data === 'string'
          ? res.data.slice(0, 120)
          : JSON.stringify(res.data).slice(0, 120))
      );
    }
  }

  async function test(name, fn) {
    const t0 = Date.now();
    try {
      const result = await fn();
      const dur    = Date.now() - t0;
      if (typeof result === 'string' && result.startsWith('skip')) {
        const why = result !== 'skip' ? result.replace(/^skip[:\s]*/, '') : '';
        console.log(fmt.skip(name) + (why ? ` ${C.dim}${why}${C.reset}` : ''));
        skipped++;
        allTests.push({ suite: suiteName, name, status: 'skip', durationMs: dur, detail: result, error: null });
      } else {
        console.log(fmt.pass(name) + (result ? ` ${result}` : ''));
        passed++;
        allTests.push({ suite: suiteName, name, status: 'pass', durationMs: dur, detail: result ?? null, error: null });
      }
    } catch (e) {
      const dur = Date.now() - t0;
      const msg = e?.message ?? String(e);
      console.log(fmt.fail(name, msg));
      failures.push({ suite: suiteName, name, error: msg });
      failed++;
      allTests.push({ suite: suiteName, name, status: 'fail', durationMs: dur, detail: null, error: msg });
    }
  }

  function suite(name) {
    suiteName = name;
    console.log(fmt.hdr(name));
  }

  function printSummary(label = 'Results') {
    const total = passed + failed + skipped;
    console.log(`\n${C.bold}${C.white}══════════════════════════════════════════════${C.reset}`);
    console.log(
      `${C.bold}  ${label}: ${C.green}${passed} passed${C.reset}  ` +
      `${failed > 0 ? C.red : C.gray}${failed} failed${C.reset}  ` +
      `${C.yellow}${skipped} skipped${C.reset}  ${C.dim}(${total} total)${C.reset}`
    );
    console.log(`${C.bold}${C.white}══════════════════════════════════════════════${C.reset}`);
    if (failures.length > 0) {
      console.log(`\n${C.red}${C.bold}Failures:${C.reset}`);
      for (const { suite: s, name, error } of failures) {
        console.log(`  ${C.red}✗${C.reset} ${s ? `${s} — ` : ''}${name}`);
        console.log(`    ${C.dim}${error}${C.reset}`);
      }
      console.log('');
    }
  }

  return {
    test,
    suite,
    assert,
    assertStatus,
    printSummary,
    get passed()   { return passed;   },
    get failed()   { return failed;   },
    get skipped()  { return skipped;  },
    get failures() { return failures; },
    get allTests() { return allTests; },
  };
}

// ─── Percentile ───────────────────────────────────────────────────────────────

export function percentile(sorted, p) {
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
}

// ─── JSON output ──────────────────────────────────────────────────────────────

export function writeJson(outFile, data) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
}

// ─── sleep ────────────────────────────────────────────────────────────────────

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
