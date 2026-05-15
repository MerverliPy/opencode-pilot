/**
 * Server-side MemoryRepository — synchronous better-sqlite3 API.
 */
import { getMemoryDb, newId } from "./memoryDb.js";
import type { Memory, MemoryCategory, MemoryConfig } from "./schema.js";

// ── Row shapes ───────────────────────────────────────────────────────────────

type MemoryRow = {
  id: string;
  server_id: string;
  content: string;
  category: string;
  confidence: number;
  tags: string;
  source_session_id: string | null;
  source_message_id: string | null;
  is_pinned: number;
  is_archived: number;
  created_at: number;
  updated_at: number;
};

type ConfigRow = {
  server_id: string;
  enabled: number;
  extract_enabled: number;
  inject_enabled: number;
  embedding_provider: string;
  embedding_model: string;
  dedup_threshold: number;
  top_k: number;
  max_memories: number;
};

function rowToMemory(r: MemoryRow): Memory {
  return {
    id: r.id,
    serverId: r.server_id,
    content: r.content,
    category: r.category as MemoryCategory,
    confidence: r.confidence,
    tags: JSON.parse(r.tags) as string[],
    sourceSessionId: r.source_session_id ?? undefined,
    sourceMessageId: r.source_message_id ?? undefined,
    isPinned: r.is_pinned === 1,
    isArchived: r.is_archived === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToConfig(r: ConfigRow): MemoryConfig {
  return {
    serverId: r.server_id,
    enabled: r.enabled === 1,
    extractEnabled: r.extract_enabled === 1,
    injectEnabled: r.inject_enabled === 1,
    embeddingProvider: r.embedding_provider,
    embeddingModel: r.embedding_model,
    dedupThreshold: r.dedup_threshold,
    topK: r.top_k,
    maxMemories: r.max_memories,
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export function insertMemory(
  m: Omit<Memory, "id" | "createdAt" | "updatedAt">,
): Memory {
  const db = getMemoryDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO memories
     (id, server_id, content, category, confidence, tags,
      source_session_id, source_message_id, is_pinned, is_archived,
      created_at, updated_at)
     VALUES (@id,@server_id,@content,@category,@confidence,@tags,
             @source_session_id,@source_message_id,@is_pinned,@is_archived,
             @created_at,@updated_at)`,
  ).run({
    id,
    server_id: m.serverId,
    content: m.content,
    category: m.category,
    confidence: m.confidence,
    tags: JSON.stringify(m.tags),
    source_session_id: m.sourceSessionId ?? null,
    source_message_id: m.sourceMessageId ?? null,
    is_pinned: m.isPinned ? 1 : 0,
    is_archived: m.isArchived ? 1 : 0,
    created_at: now,
    updated_at: now,
  });
  return { ...m, id, createdAt: now, updatedAt: now };
}

export function getMemoriesByServer(
  serverId: string,
  opts: { includeArchived?: boolean; limit?: number } = { limit: 200 },
): Memory[] {
  const db = getMemoryDb();
  const archived = opts.includeArchived ? "" : "AND is_archived = 0";
  const limit = `LIMIT ${opts.limit ?? -1}`;
  const rows = db
    .prepare(
      `SELECT * FROM memories WHERE server_id = @server_id ${archived}
       ORDER BY is_pinned DESC, updated_at DESC ${limit}`,
    )
    .all({ server_id: serverId }) as MemoryRow[];
  return rows.map(rowToMemory);
}

export function getMemoryById(id: string): Memory | null {
  const db = getMemoryDb();
  const row = db
    .prepare("SELECT * FROM memories WHERE id = @id")
    .get({ id }) as MemoryRow | undefined;
  return row ? rowToMemory(row) : null;
}

export function updateMemory(
  id: string,
  patch: Partial<
    Pick<
      Memory,
      "content" | "confidence" | "tags" | "isPinned" | "isArchived" | "category"
    >
  >,
): void {
  const db = getMemoryDb();
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };

  if (patch.content !== undefined) {
    sets.push("content = @content");
    params.content = patch.content;
  }
  if (patch.confidence !== undefined) {
    sets.push("confidence = @confidence");
    params.confidence = patch.confidence;
  }
  if (patch.tags !== undefined) {
    sets.push("tags = @tags");
    params.tags = JSON.stringify(patch.tags);
  }
  if (patch.isPinned !== undefined) {
    sets.push("is_pinned = @is_pinned");
    params.is_pinned = patch.isPinned ? 1 : 0;
  }
  if (patch.isArchived !== undefined) {
    sets.push("is_archived = @is_archived");
    params.is_archived = patch.isArchived ? 1 : 0;
  }
  if (patch.category !== undefined) {
    sets.push("category = @category");
    params.category = patch.category;
  }

  if (sets.length === 0) return;
  sets.push("updated_at = @updated_at");
  params.updated_at = Date.now();

  db.prepare(`UPDATE memories SET ${sets.join(", ")} WHERE id = @id`).run(
    params,
  );
}

export function deleteMemory(id: string): void {
  getMemoryDb().prepare("DELETE FROM memories WHERE id = @id").run({ id });
}

export function deleteAllMemoriesByServer(serverId: string): void {
  getMemoryDb()
    .prepare("DELETE FROM memories WHERE server_id = @server_id")
    .run({ server_id: serverId });
}

export function countMemories(serverId: string): number {
  const row = getMemoryDb()
    .prepare(
      "SELECT COUNT(*) as cnt FROM memories WHERE server_id = @server_id AND is_archived = 0",
    )
    .get({ server_id: serverId }) as { cnt: number };
  return row.cnt;
}

export function searchMemories(serverId: string, query: string): Memory[] {
  const db = getMemoryDb();
  const like = `%${query}%`;
  const rows = db
    .prepare(
      `SELECT * FROM memories
       WHERE server_id = @server_id AND is_archived = 0
         AND (content LIKE @like OR tags LIKE @like OR category LIKE @like)
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT 100`,
    )
    .all({ server_id: serverId, like }) as MemoryRow[];
  return rows.map(rowToMemory);
}

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = (serverId: string): MemoryConfig => ({
  serverId,
  enabled: true,
  extractEnabled: true,
  injectEnabled: true,
  embeddingProvider: "ollama",
  embeddingModel: "nomic-embed-text",
  dedupThreshold: 0.92,
  topK: 5,
  maxMemories: 2000,
});

export function getMemoryConfig(serverId: string): MemoryConfig {
  const db = getMemoryDb();
  const row = db
    .prepare("SELECT * FROM memory_config WHERE server_id = @server_id")
    .get({ server_id: serverId }) as ConfigRow | undefined;
  if (row) return rowToConfig(row);

  // Insert and return defaults
  db.prepare(
    `INSERT OR IGNORE INTO memory_config(server_id) VALUES(@server_id)`,
  ).run({ server_id: serverId });
  return DEFAULT_CONFIG(serverId);
}

export function saveMemoryConfig(config: MemoryConfig): void {
  getMemoryDb()
    .prepare(
      `INSERT OR REPLACE INTO memory_config
       (server_id, enabled, extract_enabled, inject_enabled,
        embedding_provider, embedding_model, dedup_threshold, top_k, max_memories)
       VALUES (@server_id,@enabled,@extract_enabled,@inject_enabled,
               @embedding_provider,@embedding_model,@dedup_threshold,
               @top_k,@max_memories)`,
    )
    .run({
      server_id: config.serverId,
      enabled: config.enabled ? 1 : 0,
      extract_enabled: config.extractEnabled ? 1 : 0,
      inject_enabled: config.injectEnabled ? 1 : 0,
      embedding_provider: config.embeddingProvider,
      embedding_model: config.embeddingModel,
      dedup_threshold: config.dedupThreshold,
      top_k: config.topK,
      max_memories: config.maxMemories,
    });
}
