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
  searchSimilarMemories,
} from "./EmbeddingRepository.js";
import { getProfile, upsertProfileEntry } from "./ProfileRepository.js";
import { getTimeline, insertTimelineEvent } from "./TimelineRepository.js";
import type { MemoryCategory, MemoryConfig, MemoryEmbedding, TimelineEventType } from "./schema.js";

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

// ── Semantic Search ────────────────────────────────────────────────────────────

router.post("/:serverId/semantic-search", async (c) => {
  const { serverId } = c.req.param();
  const body = await c.req.json();
  const { queryVector, modelId, topK } = body as {
    queryVector: number[];
    modelId: string;
    topK?: number;
  };

  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    return c.json({ error: "queryVector must be a non-empty array of numbers" }, 400);
  }
  if (!modelId || typeof modelId !== "string") {
    return c.json({ error: "modelId is required" }, 400);
  }

  const results = searchSimilarMemories(serverId, modelId, queryVector, topK ?? 5);
  return c.json({ results });
});

// ── Export ─────────────────────────────────────────────────────────────────────

router.get("/:serverId/export", (c) => {
  const { serverId } = c.req.param();

  const memories = getMemoriesByServer(serverId, {
    includeArchived: true,
    limit: 999999,
  });
  const profile = getProfile(serverId);
  const timeline = getTimeline(serverId, 999999);
  const config = getMemoryConfig(serverId);

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    serverId,
    memories,
    profile,
    timeline,
    config,
  };

  return c.json(exportData);
});

// ── Import ─────────────────────────────────────────────────────────────────────

router.post("/:serverId/import", async (c) => {
  const { serverId } = c.req.param();
  const body = await c.req.json();

  if (!body || typeof body !== "object") {
    return c.json({ error: "invalid import format" }, 400);
  }

  const {
    memories,
    profile,
    timeline,
    config: importConfig,
  } = body as {
    version?: number;
    memories?: unknown[];
    profile?: unknown[];
    timeline?: unknown[];
    config?: unknown;
  };

  const imported = { memories: 0, profile: 0, timeline: 0 };

  // Import memories
  if (Array.isArray(memories)) {
    for (const m of memories as Array<Record<string, unknown>>) {
      if (typeof m.content !== "string" || !m.content) continue;
      try {
        insertMemory({
          serverId,
          content: String(m.content),
          category: (m.category as MemoryCategory) ?? "fact",
          confidence: typeof m.confidence === "number" ? m.confidence : 0.8,
          tags: Array.isArray(m.tags) ? m.tags.map(String) : [],
          sourceSessionId:
            typeof m.sourceSessionId === "string"
              ? m.sourceSessionId
              : undefined,
          sourceMessageId:
            typeof m.sourceMessageId === "string"
              ? m.sourceMessageId
              : undefined,
          isPinned: Boolean(m.isPinned),
          isArchived: Boolean(m.isArchived),
        });
        imported.memories++;
      } catch {
        /* skip malformed row */
      }
    }
  }

  // Import profile entries (upsert by serverId+key)
  if (Array.isArray(profile)) {
    for (const p of profile as Array<Record<string, unknown>>) {
      if (typeof p.key !== "string" || !p.key) continue;
      try {
        upsertProfileEntry(
          serverId,
          String(p.key),
          String(p.value ?? ""),
          typeof p.confidence === "number" ? p.confidence : 0.8,
          typeof p.sourceMemoryId === "string" ? p.sourceMemoryId : undefined,
        );
        imported.profile++;
      } catch {
        /* skip malformed row */
      }
    }
  }

  // Import timeline events
  if (Array.isArray(timeline)) {
    for (const t of timeline as Array<Record<string, unknown>>) {
      if (typeof t.eventType !== "string" || !t.eventType) continue;
      try {
        insertTimelineEvent({
          serverId,
          sessionId:
            typeof t.sessionId === "string" ? t.sessionId : undefined,
          messageId:
            typeof t.messageId === "string" ? t.messageId : undefined,
          eventType: t.eventType as TimelineEventType,
          payload:
            typeof t.payload === "object" && t.payload !== null
              ? (t.payload as Record<string, unknown>)
              : {},
        });
        imported.timeline++;
      } catch {
        /* skip malformed row */
      }
    }
  }

  // Import config
  if (importConfig && typeof importConfig === "object") {
    const cfg = importConfig as Record<string, unknown>;
    const current = getMemoryConfig(serverId);
    const merged: MemoryConfig = {
      ...current,
      ...(typeof cfg.enabled === "boolean" ? { enabled: cfg.enabled } : {}),
      ...(typeof cfg.extractEnabled === "boolean"
        ? { extractEnabled: cfg.extractEnabled }
        : {}),
      ...(typeof cfg.injectEnabled === "boolean"
        ? { injectEnabled: cfg.injectEnabled }
        : {}),
      ...(typeof cfg.embeddingProvider === "string"
        ? { embeddingProvider: cfg.embeddingProvider }
        : {}),
      ...(typeof cfg.embeddingModel === "string"
        ? { embeddingModel: cfg.embeddingModel }
        : {}),
      ...(typeof cfg.dedupThreshold === "number"
        ? { dedupThreshold: cfg.dedupThreshold }
        : {}),
      ...(typeof cfg.topK === "number" ? { topK: cfg.topK } : {}),
      ...(typeof cfg.maxMemories === "number"
        ? { maxMemories: cfg.maxMemories }
        : {}),
      serverId,
    };
    saveMemoryConfig(merged);
  }

  return c.json({ imported });
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
