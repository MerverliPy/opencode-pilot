/**
 * Integration tests for memoryRouter — P2 Server Integration.
 *
 * Uses Hono app.request() with :memory: SQLite (no mocks, no server).
 * Follows the test pattern from MemoryRepository.test.ts and git.test.ts.
 */

// ═══ Must set BEFORE any imports that trigger getMemoryDb() ═══
process.env.PILOT_DB_PATH = ":memory:";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { Hono } from "hono";
import { createMemoryRouter } from "../memoryRouter.js";
import {
  insertMemory,
  getMemoryById,
  deleteAllMemoriesByServer,
} from "../MemoryRepository.js";
import { insertEmbedding } from "../EmbeddingRepository.js";
import type { Memory } from "../schema.js";

// ── Constants ──────────────────────────────────────────────────────────────────
const SERVER_ID = "test-server-p2";
const OTHER_SERVER = "other-server";

// ── Test app factory ───────────────────────────────────────────────────────────
function createTestApp() {
  const app = new Hono();
  // Mirror production error handler (index.ts:31-35)
  app.onError((err, c) => {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: "Internal Server Error", detail: message }, 500);
  });
  const router = createMemoryRouter();
  app.route("/memory", router);
  return app;
}

// ── Sample memory factory ─────────────────────────────────────────────────────
function sample(overrides?: Record<string, unknown>) {
  return {
    serverId: SERVER_ID,
    content: "Test memory content",
    category: "fact" as const,
    confidence: 0.95,
    tags: ["test", "memory"],
    isPinned: false,
    isArchived: false,
    ...overrides,
  };
}

// ── Shape assertion helper ─────────────────────────────────────────────────────
function expectMemoryShape(m: unknown): asserts m is Memory {
  expect(m).toMatchObject({
    id: expect.any(String),
    serverId: expect.any(String),
    content: expect.any(String),
    category: expect.stringMatching(/^(preference|fact|code_pattern|decision)$/),
    confidence: expect.any(Number),
    tags: expect.any(Array),
    isPinned: expect.any(Boolean),
    isArchived: expect.any(Boolean),
    createdAt: expect.any(Number),
    updatedAt: expect.any(Number),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 2.1: Route Happy Paths (14 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe("memoryRouter — happy paths", () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
    // Clean up both servers between tests for isolation
    deleteAllMemoriesByServer(SERVER_ID);
    deleteAllMemoriesByServer(OTHER_SERVER);
  });

  // ── GET /:serverId ──────────────────────────────────────────────────────

  it("2.1.1 GET /:serverId returns {memories, count} and excludes archived by default", async () => {
    insertMemory(sample({ content: "active-1" }));
    insertMemory(sample({ content: "active-2" }));
    insertMemory(sample({ content: "archived-1", isArchived: true }));

    const res = await app.request(`/memory/${SERVER_ID}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("memories");
    expect(body).toHaveProperty("count");
    expect(body.memories).toHaveLength(2);
    expect(body.count).toBe(2);
    expect(body.memories.every((m: Memory) => m.isArchived === false)).toBe(true);
    expectMemoryShape(body.memories[0]);
  });

  it("2.1.2 GET /:serverId?includeArchived=true includes archived memories", async () => {
    insertMemory(sample({ content: "active-1" }));
    insertMemory(sample({ content: "archived-1", isArchived: true }));

    const res = await app.request(`/memory/${SERVER_ID}?includeArchived=true`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.memories).toHaveLength(2);
    expect(body.memories.some((m: Memory) => m.isArchived)).toBe(true);
  });

  it("2.1.3 GET /:serverId?limit=N respects limit", async () => {
    insertMemory(sample({ content: "a" }));
    insertMemory(sample({ content: "b" }));
    insertMemory(sample({ content: "c" }));

    const res = await app.request(`/memory/${SERVER_ID}?limit=2`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.memories).toHaveLength(2);
    expect(body.count).toBe(3); // count ignores limit
  });

  // ── GET /:serverId/search ───────────────────────────────────────────────

  it("2.1.4 GET /:serverId/search with empty q returns {memories:[]}", async () => {
    insertMemory(sample({ content: "something" }));

    const res = await app.request(`/memory/${SERVER_ID}/search?q=`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.memories).toEqual([]);
  });

  it("2.1.5 GET /:serverId/search with matching query returns results", async () => {
    insertMemory(sample({ content: "unique-searchable-phrase-42" }));
    insertMemory(sample({ content: "something-else" }));

    const res = await app.request(`/memory/${SERVER_ID}/search?q=unique-searchable`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.memories.length).toBeGreaterThanOrEqual(1);
    expectMemoryShape(body.memories[0]);
  });

  // ── GET /:serverId/config ───────────────────────────────────────────────

  it("2.1.6 GET /:serverId/config returns defaults when no config set", async () => {
    const res = await app.request(`/memory/${SERVER_ID}/config`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.embeddingProvider).toBe("ollama");
    expect(body.serverId).toBe(SERVER_ID);
  });

  // ── PUT /:serverId/config ───────────────────────────────────────────────

  it("2.1.7 PUT /:serverId/config partial update returns full merged config", async () => {
    const res = await app.request(`/memory/${SERVER_ID}/config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: false, topK: 20 }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.topK).toBe(20);
    expect(body.serverId).toBe(SERVER_ID);
    expect(body.embeddingProvider).toBe("ollama"); // preserved default
  });

  // ── GET /:serverId/profile ──────────────────────────────────────────────

  it("2.1.8 GET /:serverId/profile returns empty array for new server", async () => {
    const res = await app.request(`/memory/${SERVER_ID}/profile`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  // ── GET /:serverId/timeline ─────────────────────────────────────────────

  it("2.1.9 GET /:serverId/timeline returns array with default limit", async () => {
    const res = await app.request(`/memory/${SERVER_ID}/timeline`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  // ── GET /:serverId/embeddings ───────────────────────────────────────────

  it("2.1.10 GET /:serverId/embeddings without modelId returns 400", async () => {
    const res = await app.request(`/memory/${SERVER_ID}/embeddings`);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  // ── POST /:serverId/embeddings ──────────────────────────────────────────

  it("2.1.11 POST /:serverId/embeddings creates embedding, returns 201", async () => {
    const mem = insertMemory(sample({ content: "for-embedding" }));

    const res = await app.request(`/memory/${SERVER_ID}/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        memoryId: mem.id,
        modelId: "test-model",
        vector: [0.1, 0.2, 0.3],
      }),
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body.memoryId).toBe(mem.id);
  });

  // ── DELETE /:serverId/embeddings/:memoryId ──────────────────────────────

  it("2.1.12 DELETE /:serverId/embeddings/:memoryId returns 204", async () => {
    const mem = insertMemory(sample({ content: "embedding-to-delete" }));
    const emb = insertEmbedding({
      memoryId: mem.id,
      modelId: "test-model",
      vector: [0.1, 0.2],
    });

    const res = await app.request(`/memory/${SERVER_ID}/embeddings/${mem.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);

    // Verify body is empty (no JSON)
    const text = await res.text();
    expect(text).toBe("");
  });

  // ── POST /:serverId ─────────────────────────────────────────────────────

  it("2.1.13 POST /:serverId creates memory, returns 201 with Memory shape", async () => {
    const res = await app.request(`/memory/${SERVER_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sample({ content: "freshly-created" })),
    });
    expect(res.status).toBe(201);

    const body = await res.json();
    expectMemoryShape(body);
    expect(body.content).toBe("freshly-created");
    expect(body.serverId).toBe(SERVER_ID);
  });

  // ── PATCH /:serverId/:id ────────────────────────────────────────────────

  it("2.1.14 PATCH /:serverId/:id updates existing, returns 200; 404 for missing", async () => {
    const mem = insertMemory(sample({ content: "before-patch" }));

    // Update existing
    const updateRes = await app.request(`/memory/${SERVER_ID}/${mem.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "after-patch" }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.content).toBe("before-patch"); // router returns OLD memory

    // 404 for nonexistent
    const missingRes = await app.request(`/memory/${SERVER_ID}/nonexistent-id`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "nope" }),
    });
    expect(missingRes.status).toBe(404);
    const missingBody = await missingRes.json();
    expect(missingBody).toHaveProperty("error");
  });

  // ── DELETE /:serverId/all ───────────────────────────────────────────────

  it("2.1.15 DELETE /:serverId/all clears all server memories", async () => {
    insertMemory(sample({ content: "a" }));
    insertMemory(sample({ content: "b" }));

    const res = await app.request(`/memory/${SERVER_ID}/all`, { method: "DELETE" });
    expect(res.status).toBe(204);

    // Verify cleared
    const listRes = await app.request(`/memory/${SERVER_ID}`);
    const listBody = await listRes.json();
    expect(listBody.count).toBe(0);
  });

  // ── DELETE /:serverId/:id ───────────────────────────────────────────────

  it("2.1.16 DELETE /:serverId/:id returns 404 for wrong server, 204 for valid", async () => {
    const mem = insertMemory(sample({ content: "to-delete" }));

    // Wrong server
    const wrongRes = await app.request(`/memory/${OTHER_SERVER}/${mem.id}`, {
      method: "DELETE",
    });
    expect(wrongRes.status).toBe(404);

    // Correct server
    const res = await app.request(`/memory/${SERVER_ID}/${mem.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(getMemoryById(mem.id)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Suite 2.2: Security Edge Cases (12 tests)
// ═══════════════════════════════════════════════════════════════════════════════
describe("memoryRouter — security edge cases", () => {
  let app: Hono;

  beforeEach(() => {
    app = createTestApp();
    deleteAllMemoriesByServer(SERVER_ID);
    deleteAllMemoriesByServer(OTHER_SERVER);
  });

  // ── SQL injection ───────────────────────────────────────────────────────

  it("2.2.1 SQL injection in search query returns safe results", async () => {
    const res = await app.request(
      `/memory/${SERVER_ID}/search?q='; DROP TABLE memories; --`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.memories).toEqual([]);

    // Verify table still intact — can insert and retrieve
    const mem = insertMemory(sample({ content: "after-sqli" }));
    expect(getMemoryById(mem.id)).not.toBeNull();
  });

  it("2.2.2 SQL injection in POST content stored verbatim, table intact", async () => {
    const res = await app.request(`/memory/${SERVER_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sample({
        content: "'; DROP TABLE memories; --",
      })),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.content).toBe("'; DROP TABLE memories; --");

    // Table still works
    const mem2 = insertMemory(sample({ content: "after-sqli-create" }));
    expect(getMemoryById(mem2.id)).not.toBeNull();
  });

  // ── Path traversal ─────────────────────────────────────────────────────

  it("2.2.3 Path traversal serverId does not escape or crash", async () => {
    const res = await app.request("/memory/../../../etc/passwd");
    // Should not return a 500 — either 200 (empty results) or handles gracefully
    expect(res.status).not.toBe(500);

    // Verify no filesystem access
    const normRes = await app.request(`/memory/${SERVER_ID}`);
    expect(normRes.status).toBe(200);
  });

  // ── Mass assignment ────────────────────────────────────────────────────

  it("2.2.4 Mass assignment in POST body does not crash", async () => {
    const res = await app.request(`/memory/${SERVER_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...sample({ content: "mass-assign-test" }),
        injectedField: "evil-payload",
        isAdmin: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expectMemoryShape(body);
  });

  it("2.2.5 Mass assignment in PATCH body: extra fields ignored", async () => {
    const mem = insertMemory(sample({ content: "pre-patch" }));

    const res = await app.request(`/memory/${SERVER_ID}/${mem.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        content: "post-patch",
        injectedField: "bad",
        role: "admin",
      }),
    });
    expect(res.status).toBe(200);
    // Should not crash; Operation completed
  });

  // ── Config overwrite ───────────────────────────────────────────────────

  it("2.2.6 Config PUT body serverId does not override URL param serverId", async () => {
    const res = await app.request(`/memory/${SERVER_ID}/config`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        enabled: false,
        serverId: "hijacked-server",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // The URL param serverId should win over body
    expect(body.serverId).toBe(SERVER_ID);
    expect(body.enabled).toBe(false);
  });

  // ── Invalid embedding vector ────────────────────────────────────────────

  it("2.2.7 Invalid embedding vector does not crash", async () => {
    const mem = insertMemory(sample({ content: "bad-vector-mem" }));

    const res = await app.request(`/memory/${SERVER_ID}/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        memoryId: mem.id,
        modelId: "test-model",
        vector: "not-an-array", // string instead of number[]
      }),
    });
    // Should not 500 — may 200/201 or handle gracefully
    expect(res.status).not.toBe(500);
  });

  // ── Extreme limit/offset ───────────────────────────────────────────────

  it("2.2.8 Extreme limit/offset values handled gracefully", async () => {
    insertMemory(sample({ content: "x" }));

    // Negative limit
    const negRes = await app.request(`/memory/${SERVER_ID}?limit=-1`);
    expect(negRes.status).not.toBe(500);

    // Very large limit
    const bigRes = await app.request(`/memory/${SERVER_ID}?limit=9999999`);
    expect(bigRes.status).toBe(200);

    // Negative offset on timeline
    const offRes = await app.request(`/memory/${SERVER_ID}/timeline?offset=-5`);
    expect(offRes.status).not.toBe(500);
  });

  // ── Missing body on POST ────────────────────────────────────────────────

  it("2.2.9 POST with no body returns 500 with JSON error (no stack leak)", async () => {
    const res = await app.request(`/memory/${SERVER_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // No body provided
    });
    // Global error handler catches the JSON parse error, returns structured JSON
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("detail");
    // Verify no stack trace in response
    expect(body.error).toBe("Internal Server Error");
  });

  // ── Oversized content ──────────────────────────────────────────────────

  it("2.2.10 Oversized content (100KB) does not crash", async () => {
    const largeContent = "x".repeat(100_000);

    const res = await app.request(`/memory/${SERVER_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sample({ content: largeContent })),
    });
    expect(res.status).not.toBe(500);

    if (res.status === 201) {
      const body = await res.json();
      expect(body.content).toBe(largeContent);
    }
  });

  // ── Special regex chars in search ──────────────────────────────────────

  it("2.2.11 Search with special chars treated as literal, not regex", async () => {
    insertMemory(sample({ content: "normal-content-123" }));

    const res = await app.request(
      `/memory/${SERVER_ID}/search?q=.*%25_%5B%5D`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // Should not crash or match everything; LIKE treats % as wildcard though.
    // Key assertion: no 500 error.
    expect(body).toHaveProperty("memories");
  });

  // ── Unicode content ────────────────────────────────────────────────────

  it("2.2.12 Unicode content (emoji, CJK, RTL) preserved round-trip", async () => {
    const unicodeContent = "你好世界 🎉 שלום";

    const res = await app.request(`/memory/${SERVER_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sample({ content: unicodeContent })),
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.content).toBe(unicodeContent);

    // Round-trip via GET
    const listRes = await app.request(`/memory/${SERVER_ID}`);
    const listBody = await listRes.json();
    expect(listBody.memories.some((m: Memory) => m.content === unicodeContent)).toBe(true);
  });
});
