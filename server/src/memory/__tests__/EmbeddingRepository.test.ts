import { describe, it, expect } from "@jest/globals";

process.env.PILOT_DB_PATH = ":memory:";

import {
  insertEmbedding,
  getEmbeddingsByModel,
  getEmbeddingByMemoryAndModel,
  deleteEmbeddingsByMemory,
  upsertEmbedding,
} from "../EmbeddingRepository.js";
import { insertMemory, deleteAllMemoriesByServer } from "../MemoryRepository.js";

const MODEL_ID = "test-model-1";
const SERVER_ID = "test-server-e1";

function sampleMemory(overrides?: Record<string, unknown>) {
  return {
    serverId: SERVER_ID,
    content: "Source memory for embedding",
    category: "fact" as const,
    confidence: 0.95,
    tags: ["test"],
    sourceSessionId: undefined as string | undefined,
    sourceMessageId: undefined as string | undefined,
    isPinned: false,
    isArchived: false,
    ...overrides,
  };
}

function sampleEmbedding(memoryId: string, overrides?: Record<string, unknown>) {
  return {
    memoryId,
    modelId: MODEL_ID,
    vector: [0.1, 0.2, 0.3],
    ...overrides,
  };
}

describe("EmbeddingRepository", () => {
  it("insertEmbedding creates embedding with id and timestamp", () => {
    const mem = insertMemory(sampleMemory());
    const e = insertEmbedding(sampleEmbedding(mem.id));
    expect(e.id).toBeTruthy();
    expect(e.createdAt).toBeGreaterThan(0);
    expect(e.memoryId).toBe(mem.id);
    expect(e.modelId).toBe(MODEL_ID);
    expect(e.vector).toEqual([0.1, 0.2, 0.3]);
  });

  it("getEmbeddingByMemoryAndModel returns null for nonexistent", () => {
    expect(
      getEmbeddingByMemoryAndModel("nonexistent-memory", MODEL_ID),
    ).toBeNull();
  });

  it("getEmbeddingByMemoryAndModel returns correct embedding", () => {
    const mem = insertMemory(sampleMemory());
    insertEmbedding(sampleEmbedding(mem.id));
    const found = getEmbeddingByMemoryAndModel(mem.id, MODEL_ID);
    expect(found).not.toBeNull();
    expect(found!.vector).toEqual([0.1, 0.2, 0.3]);
    expect(found!.memoryId).toBe(mem.id);
  });

  it("getEmbeddingsByModel returns all embeddings for model", () => {
    const m1 = insertMemory(sampleMemory({ content: "mem-1" }));
    const m2 = insertMemory(sampleMemory({ content: "mem-2" }));
    insertEmbedding(sampleEmbedding(m1.id));
    insertEmbedding(sampleEmbedding(m2.id));
    const results = getEmbeddingsByModel(MODEL_ID);
    expect(results.length).toBeGreaterThanOrEqual(2);
    results.forEach((r) => expect(r.modelId).toBe(MODEL_ID));
  });

  it("getEmbeddingsByModel filters by memoryIds", () => {
    const m1 = insertMemory(sampleMemory({ content: "mem-a" }));
    const m2 = insertMemory(sampleMemory({ content: "mem-b" }));
    insertEmbedding(sampleEmbedding(m1.id));
    insertEmbedding(sampleEmbedding(m2.id));
    const results = getEmbeddingsByModel(MODEL_ID, [m1.id]);
    expect(results).toHaveLength(1);
    expect(results[0].memoryId).toBe(m1.id);
  });

  it("deleteEmbeddingsByMemory removes embeddings", () => {
    const mem = insertMemory(sampleMemory());
    insertEmbedding(sampleEmbedding(mem.id));
    deleteEmbeddingsByMemory(mem.id);
    expect(
      getEmbeddingByMemoryAndModel(mem.id, MODEL_ID),
    ).toBeNull();
  });

  it("upsertEmbedding updates existing embedding vector", () => {
    const mem = insertMemory(sampleMemory());
    insertEmbedding(sampleEmbedding(mem.id, { vector: [0.1, 0.2, 0.3] }));
    upsertEmbedding(
      sampleEmbedding(mem.id, { vector: [0.9, 0.8, 0.7] }),
    );
    const updated = getEmbeddingByMemoryAndModel(mem.id, MODEL_ID);
    expect(updated!.vector).toEqual([0.9, 0.8, 0.7]);
  });

  it("upsertEmbedding inserts when no existing embedding", () => {
    const mem = insertMemory(sampleMemory({ content: "new-mem" }));
    upsertEmbedding(
      sampleEmbedding(mem.id, { vector: [0.5, 0.5] }),
    );
    const found = getEmbeddingByMemoryAndModel(mem.id, MODEL_ID);
    expect(found).not.toBeNull();
    expect(found!.vector).toEqual([0.5, 0.5]);
  });
});
