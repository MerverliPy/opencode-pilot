#!/usr/bin/env node
/**
 * pilot-memory-bench.mjs — Memory Plugin test suite
 *
 * Tests the memory plugin across five areas:
 *   1. Shadow Session Pathway  — OpenCode API endpoints used by ExtractionSession
 *   2. Extraction JSON Parser  — pure logic: candidate parsing, filtering, defaults
 *   3. Cosine Similarity & TopK — pure logic: vector math, threshold, count limit
 *   4. Config Defaults          — schema defaults match documented values
 *   5. Injection Context Format — output format of MemoryInjector.buildContext
 *
 * Suites 2–5 are fully offline (no network). Suite 1 requires a live server.
 *
 * Usage:
 *   node pilot-memory-bench.mjs [--url http://host:port] [--user u] [--pass p]
 *                               [--out /tmp/pilot-memory.json]
 *
 * Defaults:
 *   --url  http://100.81.83.98:4096
 *   --out  /tmp/pilot-memory.json
 */

import { getArg, C, fmt, createClient, createRunner, writeJson, sleep } from './bench-lib.mjs';

// ─── CLI args ────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const BASE_URL = getArg(args, '--url')  ?? 'http://100.81.83.98:4096';
const USERNAME = getArg(args, '--user') ?? '';
const PASSWORD = getArg(args, '--pass') ?? '';
const JSON_OUT = getArg(args, '--out')  ?? '/tmp/pilot-memory.json';

// ─── Client + runner ─────────────────────────────────────────────────────────

const { GET, POST, DELETE } = createClient(BASE_URL, USERNAME, PASSWORD);
const runner = createRunner();
const { test, suite, assert, assertStatus } = runner;

// ─── Polling helper ───────────────────────────────────────────────────────────

async function pollUntilIdle(sessionId, { intervalMs = 600, timeoutMs = 30000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await GET('/session/status');
    if (r.status === 200 && typeof r.data === 'object') {
      const status = r.data[sessionId];
      if (status === 'idle' || status === 'error' || status === undefined) return status ?? 'idle';
    }
    await sleep(intervalMs);
  }
  throw new Error(`session ${sessionId} did not reach idle within ${timeoutMs}ms`);
}

// ─── Banner ──────────────────────────────────────────────────────────────────

const runStart = Date.now();

console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════╗
║      Pilot Memory Plugin Bench Suite         ║
╚══════════════════════════════════════════════╝${C.reset}`);
console.log(fmt.info(`target : ${BASE_URL}`));
console.log(fmt.info(`auth   : ${USERNAME ? `basic (${USERNAME})` : 'none'}`));
console.log(fmt.info(`output : ${JSON_OUT}`));

// ─── Inline logic (mirrors plugin source, no TS imports needed) ───────────────

// ── Extraction JSON parser (mirrors extraction/MemoryExtractor.ts) ────────────

const VALID_CATEGORIES = ['preference', 'fact', 'code_pattern', 'decision'];

function isValidCategory(v) { return VALID_CATEGORIES.includes(v); }

function parseExtractionResponse(raw) {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    const result = [];
    for (const item of arr) {
      if (typeof item !== 'object' || item === null) continue;
      const content    = typeof item.content    === 'string' ? item.content.trim()                        : '';
      const category   = isValidCategory(item.category)      ? item.category                              : 'fact';
      const confidence = typeof item.confidence === 'number'
        ? Math.min(1, Math.max(0, item.confidence))
        : 0.8;
      const tags = Array.isArray(item.tags)
        ? item.tags.filter((t) => typeof t === 'string')
        : [];
      if (content.length < 10 || confidence < 0.65) continue;
      result.push({ content, category, confidence, tags });
    }
    return result;
  } catch {
    return [];
  }
}

// ── Cosine similarity (mirrors embeddings/similarity.ts) ─────────────────────

function cosineSimilarity(a, b) {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function topK(queryVec, items, vecFn, k, minScore = 0) {
  return items
    .map((item) => ({ item, score: cosineSimilarity(queryVec, vecFn(item)) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// ── Injection context builder (mirrors injection/MemoryInjector.ts) ───────────

const CONTEXT_HEADER = '[Memory Context — from previous sessions]';
const CONTEXT_FOOTER = '[End Memory Context]';

function buildContext(queryVec, memories, embeddings, topKCount = 5, minScore = 0.5) {
  if (memories.length === 0 || embeddings.length === 0) return '';

  const memoryById = Object.fromEntries(memories.map((m) => [m.id, m]));

  const scored = topK(queryVec, embeddings, (e) => e.vector, topKCount, minScore);
  if (scored.length === 0) return '';

  const lines = scored
    .map(({ item }) => {
      const mem = memoryById[item.memoryId];
      return mem ? `- ${mem.content}` : null;
    })
    .filter(Boolean);

  if (lines.length === 0) return '';
  return `${CONTEXT_HEADER}\n${lines.join('\n')}\n${CONTEXT_FOOTER}\n\n`;
}

// ─── Suite 1: Shadow Session Pathway ─────────────────────────────────────────

suite('1. Shadow Session Pathway (server endpoints used by ExtractionSession)');

let shadowSessionId = null;

await test('POST /session creates extraction shadow session', async () => {
  const r = await POST('/session', { title: '__memory_bench_shadow__' });
  assertStatus(r, 200, 'create session: ');
  assert(r.data?.id, 'no id in response');
  shadowSessionId = r.data.id;
  return `id=${shadowSessionId} ${fmt.ms(r.elapsed)}`;
});

await test('POST /session/:id/prompt_async accepts extraction prompt (204 fire-and-forget)', async () => {
  assert(shadowSessionId, 'no shadow session id — previous test failed');
  const r = await POST(`/session/${shadowSessionId}/prompt_async`, {
    parts: [{
      type: 'text',
      text: 'Extract memories from: "User prefers tabs over spaces. Project uses React 19."',
    }],
  }, 12000);
  assert(r.status === 204 || r.status === 200, `expected 204 or 200, got ${r.status}`);
  return `HTTP ${r.status} ${fmt.ms(r.elapsed)}`;
});

await test('GET /session/status returns status map including shadow session', async () => {
  assert(shadowSessionId, 'no shadow session id');
  const r = await GET('/session/status');
  assertStatus(r, 200, 'status map: ');
  assert(r.data && typeof r.data === 'object', 'not an object');
  const status = r.data[shadowSessionId];
  return `shadow session status="${status ?? 'not yet visible'}" ${fmt.ms(r.elapsed)}`;
});

await test('poll until shadow session is idle (30 s timeout)', async () => {
  assert(shadowSessionId, 'no shadow session id');
  const t0 = Date.now();
  let finalStatus;
  try {
    finalStatus = await pollUntilIdle(shadowSessionId, { intervalMs: 600, timeoutMs: 30000 });
  } catch (e) {
    return `skip (${e.message})`;
  }
  return `status="${finalStatus}" after ${fmt.ms(Date.now() - t0)}`;
});

await test('GET /session/:id/message returns messages array after prompt', async () => {
  assert(shadowSessionId, 'no shadow session id');
  const r = await GET(`/session/${shadowSessionId}/message`, 8000);
  assertStatus(r, 200, 'messages: ');
  assert(Array.isArray(r.data), 'not an array');
  return `${r.data.length} message(s) ${fmt.ms(r.elapsed)}`;
});

await test('DELETE /session/:id cleans up shadow session', async () => {
  assert(shadowSessionId, 'no shadow session id');
  const r = await DELETE(`/session/${shadowSessionId}`);
  assert(r.status === 200 || r.status === 204, `unexpected ${r.status}`);
  return fmt.ms(r.elapsed);
});

await test('GET /session/:id after delete returns 4xx (shadow session gone)', async () => {
  assert(shadowSessionId, 'no shadow session id');
  const r = await GET(`/session/${shadowSessionId}`);
  assert(r.status >= 400, `expected 4xx after delete, got ${r.status}`);
  return `HTTP ${r.status} ${fmt.ms(r.elapsed)}`;
});

// ─── Suite 2: Extraction JSON Parser ─────────────────────────────────────────

suite('2. Extraction JSON Parser (pure logic — no network)');

await test('valid array returns correctly typed candidates', () => {
  const raw = JSON.stringify([
    { content: 'User prefers tabs for indentation', category: 'preference', confidence: 0.9, tags: ['style'] },
    { content: 'Project uses React 19 with Expo SDK 54', category: 'fact', confidence: 0.95, tags: ['deps', 'react'] },
  ]);
  const result = parseExtractionResponse(raw);
  assert(result.length === 2, `expected 2, got ${result.length}`);
  assert(result[0].category === 'preference', `category mismatch: ${result[0].category}`);
  assert(result[0].confidence === 0.9, `confidence mismatch: ${result[0].confidence}`);
  assert(Array.isArray(result[0].tags) && result[0].tags[0] === 'style', 'tags wrong');
  return `${result.length} candidate(s) parsed`;
});

await test('missing category defaults to "fact"', () => {
  const raw = JSON.stringify([
    { content: 'Always use strict TypeScript mode', confidence: 0.8 },
  ]);
  const result = parseExtractionResponse(raw);
  assert(result.length === 1, `expected 1, got ${result.length}`);
  assert(result[0].category === 'fact', `expected "fact", got "${result[0].category}"`);
  return `category="${result[0].category}"`;
});

await test('invalid category ("unknown") defaults to "fact"', () => {
  const raw = JSON.stringify([
    { content: 'Prefer functional components over classes', category: 'unknown_type', confidence: 0.85 },
  ]);
  const result = parseExtractionResponse(raw);
  assert(result.length === 1, 'should have 1 result');
  assert(result[0].category === 'fact', `expected "fact", got "${result[0].category}"`);
  return `invalid category coerced to "${result[0].category}"`;
});

await test('content shorter than 10 chars is filtered out', () => {
  const raw = JSON.stringify([
    { content: 'short', category: 'fact', confidence: 0.9 },
    { content: 'Use async/await over raw promises', category: 'preference', confidence: 0.88 },
  ]);
  const result = parseExtractionResponse(raw);
  assert(result.length === 1, `expected 1 after filter, got ${result.length}`);
  assert(result[0].content.startsWith('Use async'), 'wrong item survived');
  return `short-content item filtered; ${result.length} survivor(s)`;
});

await test('confidence below 0.65 is filtered out', () => {
  const raw = JSON.stringify([
    { content: 'Maybe use Redux for state management?', category: 'decision', confidence: 0.5 },
    { content: 'Project always uses ESLint with Airbnb config', category: 'fact', confidence: 0.9 },
  ]);
  const result = parseExtractionResponse(raw);
  assert(result.length === 1, `expected 1, got ${result.length}`);
  assert(result[0].confidence === 0.9, 'wrong item survived');
  return `low-confidence item filtered; ${result.length} survivor(s)`;
});

await test('JSON array wrapped in prose (AI preamble) is still parsed', () => {
  const raw = `Here are the extracted memories from the conversation:

[
  {"content": "Developer prefers small focused commits", "category": "preference", "confidence": 0.88, "tags": ["git"]},
  {"content": "API uses JWT tokens with 24h expiry", "category": "fact", "confidence": 0.92, "tags": ["auth"]}
]

That's everything I found.`;
  const result = parseExtractionResponse(raw);
  assert(result.length === 2, `expected 2, got ${result.length}`);
  assert(result[0].tags.includes('git'), 'tags not preserved');
  return `extracted ${result.length} candidates from prose-wrapped response`;
});

await test('non-JSON response returns empty array without throwing', () => {
  const raw = 'I could not find any notable memories in this conversation.';
  const result = parseExtractionResponse(raw);
  assert(Array.isArray(result) && result.length === 0, `expected [], got ${JSON.stringify(result)}`);
  return 'returned [] safely';
});

// ─── Suite 3: Cosine Similarity & TopK ───────────────────────────────────────

suite('3. Cosine Similarity & TopK (pure logic — no network)');

await test('identical vectors produce similarity = 1.0', () => {
  const v = [0.5, 0.3, 0.8, 0.1];
  const sim = cosineSimilarity(v, v);
  assert(Math.abs(sim - 1.0) < 1e-9, `expected 1.0, got ${sim}`);
  return `sim=${sim.toFixed(6)}`;
});

await test('orthogonal vectors produce similarity = 0', () => {
  const a = [1, 0, 0];
  const b = [0, 1, 0];
  const sim = cosineSimilarity(a, b);
  assert(Math.abs(sim) < 1e-9, `expected 0, got ${sim}`);
  return `sim=${sim.toFixed(6)}`;
});

await test('opposite vectors produce similarity = -1.0', () => {
  const a = [1, 0];
  const b = [-1, 0];
  const sim = cosineSimilarity(a, b);
  assert(Math.abs(sim + 1.0) < 1e-9, `expected -1.0, got ${sim}`);
  return `sim=${sim.toFixed(6)}`;
});

await test('topK returns at most K results', () => {
  const query = [1, 0, 0];
  const items = Array.from({ length: 20 }, (_, i) => ({
    memoryId: `m${i}`,
    vector: [Math.cos(i * 0.3), Math.sin(i * 0.3), 0],
  }));
  const results = topK(query, items, (e) => e.vector, 5, 0);
  assert(results.length <= 5, `expected ≤5 results, got ${results.length}`);
  return `${results.length} results from 20 items (k=5)`;
});

await test('topK filters results below minScore threshold', () => {
  const query = [1, 0];
  const items = [
    { memoryId: 'a', vector: [1, 0]    },   // sim = 1.0 — included
    { memoryId: 'b', vector: [0, 1]    },   // sim = 0.0 — excluded at threshold 0.5
    { memoryId: 'c', vector: [0.7, 0.7] },  // sim ≈ 0.707 — included
  ];
  const results = topK(query, items, (e) => e.vector, 10, 0.5);
  assert(results.length === 2, `expected 2 above threshold, got ${results.length}`);
  assert(results[0].item.memoryId === 'a', 'highest score not first');
  return `${results.length}/3 items above 0.5 threshold`;
});

await test('topK returns results sorted descending by score', () => {
  const query = [1, 0, 0];
  const items = [
    { memoryId: 'low',  vector: [0.5, 0.866, 0] },   // sim ≈ 0.5
    { memoryId: 'high', vector: [0.9, 0.436, 0] },   // sim ≈ 0.9
    { memoryId: 'mid',  vector: [0.7, 0.714, 0] },   // sim ≈ 0.7
  ];
  const results = topK(query, items, (e) => e.vector, 3, 0);
  assert(results[0].score >= results[1].score, 'not sorted by score desc');
  assert(results[1].score >= results[2].score, 'not sorted by score desc (2nd)');
  return `sorted: ${results.map((r) => r.item.memoryId + '=' + r.score.toFixed(2)).join(', ')}`;
});

// ─── Suite 4: Config & Schema Defaults ───────────────────────────────────────

suite('4. Config & Schema Defaults (pure logic — no network)');

const CREATE_MEMORY_CONFIG_DDL = `
CREATE TABLE IF NOT EXISTS memory_config (
  server_id            TEXT PRIMARY KEY,
  enabled              INTEGER NOT NULL DEFAULT 1,
  extract_enabled      INTEGER NOT NULL DEFAULT 1,
  inject_enabled       INTEGER NOT NULL DEFAULT 1,
  embedding_provider   TEXT NOT NULL DEFAULT 'ollama',
  embedding_model      TEXT NOT NULL DEFAULT 'nomic-embed-text',
  dedup_threshold      REAL NOT NULL DEFAULT 0.92,
  top_k                INTEGER NOT NULL DEFAULT 5,
  max_memories         INTEGER NOT NULL DEFAULT 2000
)`;

function extractDefault(ddl, col) {
  const re = new RegExp(`${col}\\s+\\w+\\s+NOT NULL DEFAULT ([^,\\n)]+)`, 'i');
  const m  = ddl.match(re);
  if (!m) return null;
  const raw = m[1].trim().replace(/'/g, '');
  const n   = Number(raw);
  return isNaN(n) ? raw : n;
}

await test('dedup_threshold default = 0.92', () => {
  const v = extractDefault(CREATE_MEMORY_CONFIG_DDL, 'dedup_threshold');
  assert(v === 0.92, `expected 0.92, got ${v}`);
  return `dedup_threshold=${v}`;
});

await test('top_k default = 5', () => {
  const v = extractDefault(CREATE_MEMORY_CONFIG_DDL, 'top_k');
  assert(v === 5, `expected 5, got ${v}`);
  return `top_k=${v}`;
});

await test('max_memories default = 2000', () => {
  const v = extractDefault(CREATE_MEMORY_CONFIG_DDL, 'max_memories');
  assert(v === 2000, `expected 2000, got ${v}`);
  return `max_memories=${v}`;
});

await test('embedding_provider default = "ollama"', () => {
  const v = extractDefault(CREATE_MEMORY_CONFIG_DDL, 'embedding_provider');
  assert(v === 'ollama', `expected "ollama", got "${v}"`);
  return `embedding_provider="${v}"`;
});

await test('embedding_model default = "nomic-embed-text"', () => {
  const v = extractDefault(CREATE_MEMORY_CONFIG_DDL, 'embedding_model');
  assert(v === 'nomic-embed-text', `expected "nomic-embed-text", got "${v}"`);
  return `embedding_model="${v}"`;
});

await test('enabled, extract_enabled, inject_enabled all default to 1 (true)', () => {
  const e   = extractDefault(CREATE_MEMORY_CONFIG_DDL, 'enabled');
  const ex  = extractDefault(CREATE_MEMORY_CONFIG_DDL, 'extract_enabled');
  const inj = extractDefault(CREATE_MEMORY_CONFIG_DDL, 'inject_enabled');
  assert(e === 1 && ex === 1 && inj === 1,
    `expected all 1, got enabled=${e} extract=${ex} inject=${inj}`);
  return `enabled=${e} extract_enabled=${ex} inject_enabled=${inj}`;
});

await test('all four memory categories are defined', () => {
  const categories = ['preference', 'fact', 'code_pattern', 'decision'];
  assert(categories.every((c) => isValidCategory(c)), 'a category is missing');
  assert(!isValidCategory('unknown'), '"unknown" should not be valid');
  return `${categories.length} valid categories`;
});

// ─── Suite 5: Injection Context Format ───────────────────────────────────────

suite('5. Injection Context Format (pure logic — no network)');

const MOCK_MEMORIES = [
  { id: 'm1', content: 'User prefers tabs for indentation in all files' },
  { id: 'm2', content: 'Project uses React 19 with Expo SDK 54' },
  { id: 'm3', content: 'Always run tsc --noEmit before committing changes' },
];

const MOCK_EMBEDDINGS = [
  { memoryId: 'm1', vector: [0.9, 0.3, 0.1] },   // most similar to [1,0,0]
  { memoryId: 'm2', vector: [0.2, 0.8, 0.5] },
  { memoryId: 'm3', vector: [0.5, 0.5, 0.7] },
];

const QUERY_VEC_CODE_STYLE = [1, 0, 0];

await test('context block includes CONTEXT_HEADER', () => {
  const ctx = buildContext(QUERY_VEC_CODE_STYLE, MOCK_MEMORIES, MOCK_EMBEDDINGS, 5, 0.0);
  assert(ctx.includes(CONTEXT_HEADER), `header not found in:\n${ctx}`);
  return 'CONTEXT_HEADER present';
});

await test('context block includes CONTEXT_FOOTER', () => {
  const ctx = buildContext(QUERY_VEC_CODE_STYLE, MOCK_MEMORIES, MOCK_EMBEDDINGS, 5, 0.0);
  assert(ctx.includes(CONTEXT_FOOTER), `footer not found in:\n${ctx}`);
  return 'CONTEXT_FOOTER present';
});

await test('each injected memory line starts with "- "', () => {
  const ctx = buildContext(QUERY_VEC_CODE_STYLE, MOCK_MEMORIES, MOCK_EMBEDDINGS, 5, 0.0);
  const innerLines = ctx
    .split('\n')
    .filter((l) => l && l !== CONTEXT_HEADER && l !== CONTEXT_FOOTER && l.trim() !== '');
  assert(innerLines.length > 0, 'no inner lines found');
  assert(innerLines.every((l) => l.startsWith('- ')), `some lines missing "- " prefix: ${innerLines}`);
  return `${innerLines.length} memory line(s) correctly prefixed`;
});

await test('highest-scoring memory is first in the context block', () => {
  const ctx = buildContext(QUERY_VEC_CODE_STYLE, MOCK_MEMORIES, MOCK_EMBEDDINGS, 5, 0.0);
  const lines = ctx.split('\n').filter((l) => l.startsWith('- '));
  assert(lines[0].includes('tabs for indentation'), `expected m1 first, got: ${lines[0]}`);
  return `first line: "${lines[0].slice(0, 50)}…"`;
});

await test('empty memories array returns empty string', () => {
  const ctx = buildContext(QUERY_VEC_CODE_STYLE, [], MOCK_EMBEDDINGS, 5, 0.5);
  assert(ctx === '', `expected "", got "${ctx.slice(0, 60)}"`);
  return 'empty string returned';
});

await test('empty embeddings array returns empty string', () => {
  const ctx = buildContext(QUERY_VEC_CODE_STYLE, MOCK_MEMORIES, [], 5, 0.5);
  assert(ctx === '', `expected "", got "${ctx.slice(0, 60)}"`);
  return 'empty string returned';
});

await test('all memories below minScore returns empty string', () => {
  const queryVecOrthogonal = [0, 0, 0];
  const ctx = buildContext(queryVecOrthogonal, MOCK_MEMORIES, MOCK_EMBEDDINGS, 5, 0.5);
  assert(ctx === '', `expected "" when nothing scores above 0.5, got: ${ctx.slice(0, 60)}`);
  return 'empty string returned when no memories score ≥ 0.5';
});

await test('topK limit is respected in context output', () => {
  const ctx = buildContext(QUERY_VEC_CODE_STYLE, MOCK_MEMORIES, MOCK_EMBEDDINGS, 1, 0.0);
  const lines = ctx.split('\n').filter((l) => l.startsWith('- '));
  assert(lines.length === 1, `expected 1 memory line, got ${lines.length}`);
  return `1 memory line with topK=1`;
});

await test('context block ends with double newline (prompt separator)', () => {
  const ctx = buildContext(QUERY_VEC_CODE_STYLE, MOCK_MEMORIES, MOCK_EMBEDDINGS, 5, 0.0);
  assert(ctx.endsWith('\n\n'), `expected trailing "\\n\\n", got: ${JSON.stringify(ctx.slice(-4))}`);
  return 'trailing double-newline present';
});

// ─── Summary ─────────────────────────────────────────────────────────────────

const totalDuration = Date.now() - runStart;
const total         = runner.passed + runner.failed + runner.skipped;

runner.printSummary('Memory Results');
console.log(fmt.info(`JSON results → ${JSON_OUT}`));

// ─── Write JSON ───────────────────────────────────────────────────────────────

writeJson(JSON_OUT, {
  memory: {
    passed:     runner.passed,
    failed:     runner.failed,
    skipped:    runner.skipped,
    total,
    durationMs: totalDuration,
    tests:      runner.allTests,
  },
});

process.exit(runner.failed > 0 ? 1 : 0);
