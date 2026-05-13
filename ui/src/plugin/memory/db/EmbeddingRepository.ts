import { getDb, newId } from './database';
import type { MemoryEmbedding } from './schema';

type EmbeddingRow = {
  id: string;
  memory_id: string;
  model_id: string;
  vector: string;
  created_at: number;
};

function rowToEmbedding(r: EmbeddingRow): MemoryEmbedding {
  return {
    id: r.id,
    memoryId: r.memory_id,
    modelId: r.model_id,
    vector: JSON.parse(r.vector) as number[],
    createdAt: r.created_at,
  };
}

export async function insertEmbedding(
  e: Omit<MemoryEmbedding, 'id' | 'createdAt'>,
): Promise<MemoryEmbedding> {
  const db = await getDb();
  const id = newId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO memory_embeddings(id, memory_id, model_id, vector, created_at)
     VALUES (?,?,?,?,?)`,
    [id, e.memoryId, e.modelId, JSON.stringify(e.vector), now],
  );
  return { ...e, id, createdAt: now };
}

export async function getEmbeddingsByModel(
  modelId: string,
  serverMemoryIds?: string[],
): Promise<MemoryEmbedding[]> {
  const db = await getDb();
  if (serverMemoryIds && serverMemoryIds.length > 0) {
    const placeholders = serverMemoryIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<EmbeddingRow>(
      `SELECT * FROM memory_embeddings
       WHERE model_id = ? AND memory_id IN (${placeholders})`,
      [modelId, ...serverMemoryIds],
    );
    return rows.map(rowToEmbedding);
  }
  const rows = await db.getAllAsync<EmbeddingRow>(
    'SELECT * FROM memory_embeddings WHERE model_id = ?',
    [modelId],
  );
  return rows.map(rowToEmbedding);
}

export async function getEmbeddingByMemoryAndModel(
  memoryId: string,
  modelId: string,
): Promise<MemoryEmbedding | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EmbeddingRow>(
    'SELECT * FROM memory_embeddings WHERE memory_id = ? AND model_id = ?',
    [memoryId, modelId],
  );
  return row ? rowToEmbedding(row) : null;
}

export async function deleteEmbeddingsByMemory(memoryId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM memory_embeddings WHERE memory_id = ?', [memoryId]);
}

export async function upsertEmbedding(
  e: Omit<MemoryEmbedding, 'id' | 'createdAt'>,
): Promise<void> {
  const db = await getDb();
  const existing = await getEmbeddingByMemoryAndModel(e.memoryId, e.modelId);
  if (existing) {
    await db.runAsync(
      'UPDATE memory_embeddings SET vector = ? WHERE id = ?',
      [JSON.stringify(e.vector), existing.id],
    );
  } else {
    await insertEmbedding(e);
  }
}
