/**
 * Hono router for the server-side memory plugin (M5).
 *
 * Routes:
 *   GET    /memory/:serverId           - list memories
 *   POST   /memory/:serverId           - insert a memory
 *   PATCH  /memory/:serverId/:id       - update a memory (pin/archive/content)
 *   DELETE /memory/:serverId/:id       - delete a memory
 *   GET    /memory/:serverId/search    - full-text search
 *   GET    /memory/:serverId/config    - get config
 *   PUT    /memory/:serverId/config    - save config
 *   GET    /memory/:serverId/profile   - get user profile
 *   GET    /memory/:serverId/timeline  - get timeline events
 *   GET    /memory/:serverId/timeline  - get timeline events
 *   GET    /memory/:serverId/timeline  - get timeline events
 *   DELETE /memory/:serverId/all       - delete all memories for a server
 *   GET    /memory/:serverId/embeddings?modelId= - get embeddings by model
 *   POST   /memory/:serverId/embeddings          - insert an embedding
 *   DELETE /memory/:serverId/embeddings/:memoryId - delete embeddings for a memory
 *   GET    /memory/:serverId/embeddings?modelId= - get embeddings by model
 *   POST   /memory/:serverId/embeddings          - insert an embedding
 *   DELETE /memory/:serverId/embeddings/:memoryId - delete embeddings for a memory
 */
import { Hono } from "hono";
import {
  countMemories,
  deleteAllMemoriesByServer,
  deleteMemory,
  getMemoriesByServer,
  getMemoryById,
  getMemoryConfig,
  insertMemory,
  saveMemoryConfig,
  searchMemories,
  updateMemory,
} from "./MemoryRepository.js";
import {
  deleteEmbeddingsByMemory,
  getEmbeddingsByModel,
  insertEmbedding,
} from "./EmbeddingRepository.js";
import { getProfile } from "./ProfileRepository.js";
import { getTimeline } from "./TimelineRepository.js";
import type { MemoryConfig, MemoryEmbedding } from "./schema.js";

const router = new Hono();

// ── List ──────────────────────────────────────────────────────────────────────

router.get("/:serverId", (c) => {
  const { serverId } = c.req.param();
  const includeArchived = c.req.query("includeArchived") === "true";
  const limitQ = c.req.query("limit");
  const limit = limitQ ? parseInt(limitQ, 10) : undefined;
  const memories = getMemoriesByServer(serverId, { includeArchived, limit });
  const count = countMemories(serverId);
  return c.json({ memories, count });
});

// ── Search ────────────────────────────────────────────────────────────────────

router.get("/:serverId/search", (c) => {
  const { serverId } = c.req.param();
  const query = c.req.query("q") ?? "";
  if (!query.trim()) {
    return c.json({ memories: [] });
  }
  return c.json({ memories: searchMemories(serverId, query) });
});

// ── Config ────────────────────────────────────────────────────────────────────

router.get("/:serverId/config", (c) => {
  const { serverId } = c.req.param();
  return c.json(getMemoryConfig(serverId));
});

router.put("/:serverId/config", async (c) => {
  const { serverId } = c.req.param();
  const body = (await c.req.json()) as Partial<MemoryConfig>;
  const current = getMemoryConfig(serverId);
  const merged: MemoryConfig = { ...current, ...body, serverId };
  saveMemoryConfig(merged);
  return c.json(merged);
});

// ── Profile ───────────────────────────────────────────────────────────────────

router.get("/:serverId/profile", (c) => {
  const { serverId } = c.req.param();
  return c.json(getProfile(serverId));
});

// ── Timeline ──────────────────────────────────────────────────────────────────

router.get("/:serverId/timeline", (c) => {
  const { serverId } = c.req.param();
  const limitQ = c.req.query("limit");
  const offsetQ = c.req.query("offset");
  const limit = limitQ ? parseInt(limitQ, 10) : 100;
  const offset = offsetQ ? parseInt(offsetQ, 10) : 0;
  return c.json(getTimeline(serverId, limit, offset));
});

// ── Embeddings ────────────────────────────────────────────────────────────────

router.get("/:serverId/embeddings", (c) => {
  const { serverId } = c.req.param();
  const modelId = c.req.query("modelId");
  if (!modelId) return c.json({ error: "modelId query param required" }, 400);
  const memoryIds = c.req.query("memoryIds");
  const ids = memoryIds
    ? memoryIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  return c.json(getEmbeddingsByModel(modelId, ids));
});

router.post("/:serverId/embeddings", async (c) => {
  const { serverId } = c.req.param();
  const body = (await c.req.json()) as Omit<
    MemoryEmbedding,
    "id" | "createdAt"
  >;
  const embedding = insertEmbedding(body);
  return c.json(embedding, 201);
});

router.delete("/:serverId/embeddings/:memoryId", (c) => {
  const { serverId, memoryId } = c.req.param();
  deleteEmbeddingsByMemory(memoryId);
  return c.body(null, 204);
});

// ── Insert ────────────────────────────────────────────────────────────────────

router.post("/:serverId", async (c) => {
  const { serverId } = c.req.param();
  const body = (await c.req.json()) as Parameters<typeof insertMemory>[0];
  const memory = insertMemory({ ...body, serverId });
  return c.json(memory, 201);
});

// ── Update ────────────────────────────────────────────────────────────────────

router.patch("/:serverId/:id", async (c) => {
  const { serverId, id } = c.req.param();
  const existing = getMemoryById(id);
  if (!existing || existing.serverId !== serverId) {
    return c.json({ error: "not found" }, 404);
  }
  const patch = (await c.req.json()) as Parameters<typeof updateMemory>[1];
  updateMemory(id, patch);
  return c.json(existing);
});

// ── Delete all (must be registered BEFORE /:id to avoid "all" matching as :id) ─

router.delete("/:serverId/all", (c) => {
  const { serverId } = c.req.param();
  deleteAllMemoriesByServer(serverId);
  return c.body(null, 204);
});

// ── Delete one ────────────────────────────────────────────────────────────────

router.delete("/:serverId/:id", (c) => {
  const { serverId, id } = c.req.param();
  const existing = getMemoryById(id);
  if (!existing || existing.serverId !== serverId) {
    return c.json({ error: "not found" }, 404);
  }
  deleteMemory(id);
  return c.body(null, 204);
});

export function createMemoryRouter() {
  return router;
}
