import { getDb, newId } from './database';
import type { Memory, MemoryCategory, MemoryConfig } from './schema';

// ── Row shape returned by SQLite ────────────────────────────────────────────
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

// ── CRUD ────────────────────────────────────────────────────────────────────

export async function insertMemory(
  m: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Memory> {
  const db = await getDb();
  const id = newId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO memories
     (id, server_id, content, category, confidence, tags,
      source_session_id, source_message_id, is_pinned, is_archived,
      created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      m.serverId,
      m.content,
      m.category,
      m.confidence,
      JSON.stringify(m.tags),
      m.sourceSessionId ?? null,
      m.sourceMessageId ?? null,
      m.isPinned ? 1 : 0,
      m.isArchived ? 1 : 0,
      now,
      now,
    ],
  );
  return { ...m, id, createdAt: now, updatedAt: now };
}

export async function getMemoriesByServer(
  serverId: string,
  opts: { includeArchived?: boolean; limit?: number } = {},
): Promise<Memory[]> {
  const db = await getDb();
  const archived = opts.includeArchived ? '' : 'AND is_archived = 0';
  const limit = opts.limit ? `LIMIT ${opts.limit}` : '';
  const rows = await db.getAllAsync<MemoryRow>(
    `SELECT * FROM memories WHERE server_id = ? ${archived}
     ORDER BY is_pinned DESC, updated_at DESC ${limit}`,
    [serverId],
  );
  return rows.map(rowToMemory);
}

export async function getMemoryById(id: string): Promise<Memory | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<MemoryRow>('SELECT * FROM memories WHERE id = ?', [id]);
  return row ? rowToMemory(row) : null;
}

export async function updateMemory(
  id: string,
  patch: Partial<Pick<Memory, 'content' | 'confidence' | 'tags' | 'isPinned' | 'isArchived' | 'category'>>,
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (patch.content !== undefined) { fields.push('content = ?'); params.push(patch.content); }
  if (patch.confidence !== undefined) { fields.push('confidence = ?'); params.push(patch.confidence); }
  if (patch.tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(patch.tags)); }
  if (patch.isPinned !== undefined) { fields.push('is_pinned = ?'); params.push(patch.isPinned ? 1 : 0); }
  if (patch.isArchived !== undefined) { fields.push('is_archived = ?'); params.push(patch.isArchived ? 1 : 0); }
  if (patch.category !== undefined) { fields.push('category = ?'); params.push(patch.category); }

  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  await db.runAsync(`UPDATE memories SET ${fields.join(', ')} WHERE id = ?`, params);
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM memories WHERE id = ?', [id]);
}

export async function deleteAllMemoriesByServer(serverId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM memories WHERE server_id = ?', [serverId]);
}

export async function countMemories(serverId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM memories WHERE server_id = ? AND is_archived = 0',
    [serverId],
  );
  return row?.cnt ?? 0;
}

export async function searchMemories(serverId: string, query: string): Promise<Memory[]> {
  const db = await getDb();
  const like = `%${query}%`;
  const rows = await db.getAllAsync<MemoryRow>(
    `SELECT * FROM memories
     WHERE server_id = ? AND is_archived = 0
       AND (content LIKE ? OR tags LIKE ? OR category LIKE ?)
     ORDER BY is_pinned DESC, updated_at DESC
     LIMIT 100`,
    [serverId, like, like, like],
  );
  return rows.map(rowToMemory);
}

// ── Config ───────────────────────────────────────────────────────────────────

export async function getMemoryConfig(serverId: string): Promise<MemoryConfig> {
  const db = await getDb();
  const row = await db.getFirstAsync<ConfigRow>(
    'SELECT * FROM memory_config WHERE server_id = ?',
    [serverId],
  );
  if (row) return rowToConfig(row);

  // Insert default config and return it
  await db.runAsync(
    `INSERT OR IGNORE INTO memory_config(server_id) VALUES(?)`,
    [serverId],
  );
  return {
    serverId,
    enabled: true,
    extractEnabled: true,
    injectEnabled: true,
    embeddingProvider: 'ollama',
    embeddingModel: 'nomic-embed-text',
    dedupThreshold: 0.92,
    topK: 5,
    maxMemories: 2000,
  };
}

export async function saveMemoryConfig(config: MemoryConfig): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO memory_config
     (server_id, enabled, extract_enabled, inject_enabled,
      embedding_provider, embedding_model, dedup_threshold, top_k, max_memories)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      config.serverId,
      config.enabled ? 1 : 0,
      config.extractEnabled ? 1 : 0,
      config.injectEnabled ? 1 : 0,
      config.embeddingProvider,
      config.embeddingModel,
      config.dedupThreshold,
      config.topK,
      config.maxMemories,
    ],
  );
}
