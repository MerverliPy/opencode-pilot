/**
 * Server-side EmbeddingRepository — synchronous better-sqlite3 API.
 */
import { getMemoryDb, newId } from "./memoryDb.js";
import type { MemoryEmbedding } from "./schema.js";

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

export function insertEmbedding(
  e: Omit<MemoryEmbedding, "id" | "createdAt">,
): MemoryEmbedding {
  const db = getMemoryDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO memory_embeddings(id, memory_id, model_id, vector, created_at)
     VALUES (@id,@memory_id,@model_id,@vector,@created_at)`,
  ).run({
    id,
    memory_id: e.memoryId,
    model_id: e.modelId,
    vector: JSON.stringify(e.vector),
    created_at: now,
  });
  return { ...e, id, createdAt: now };
}

export function getEmbeddingsByModel(
  modelId: string,
  serverMemoryIds?: string[],
): MemoryEmbedding[] {
  const db = getMemoryDb();
  if (serverMemoryIds && serverMemoryIds.length > 0) {
    const placeholders = serverMemoryIds.map(() => "?").join(",");
    const rows = db
      .prepare(
         `SELECT * FROM memory_embeddings
          WHERE model_id = ? AND memory_id IN (${placeholders})
          LIMIT 100`,
      )
      .all(modelId, ...serverMemoryIds) as EmbeddingRow[];
    return rows.map(rowToEmbedding);
  }
  const rows = db
    .prepare("SELECT * FROM memory_embeddings WHERE model_id = @model_id LIMIT 100")
    .all({ model_id: modelId }) as EmbeddingRow[];
  return rows.map(rowToEmbedding);
}

export function getEmbeddingByMemoryAndModel(
  memoryId: string,
  modelId: string,
): MemoryEmbedding | null {
  const row = getMemoryDb()
    .prepare(
      "SELECT * FROM memory_embeddings WHERE memory_id = @memory_id AND model_id = @model_id",
    )
    .get({ memory_id: memoryId, model_id: modelId }) as
    | EmbeddingRow
    | undefined;
  return row ? rowToEmbedding(row) : null;
}

export function deleteEmbeddingsByMemory(memoryId: string): void {
  getMemoryDb()
    .prepare("DELETE FROM memory_embeddings WHERE memory_id = @memory_id")
    .run({ memory_id: memoryId });
}

export function upsertEmbedding(
  e: Omit<MemoryEmbedding, "id" | "createdAt">,
): void {
  const existing = getEmbeddingByMemoryAndModel(e.memoryId, e.modelId);
  if (existing) {
    getMemoryDb()
      .prepare("UPDATE memory_embeddings SET vector = @vector WHERE id = @id")
      .run({ vector: JSON.stringify(e.vector), id: existing.id });
  } else {
    insertEmbedding(e);
  }
}
