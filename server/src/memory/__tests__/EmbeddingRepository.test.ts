import { describe, it, expect, beforeAll, beforeEach, afterAll, jest } from "@jest/globals";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

type EmbeddingRepositoryModule = typeof import("../EmbeddingRepository.js");
type MemoryRepositoryModule = typeof import("../MemoryRepository.js");

let insertEmbedding: EmbeddingRepositoryModule["insertEmbedding"];
let getEmbeddingsByModel: EmbeddingRepositoryModule["getEmbeddingsByModel"];
let getEmbeddingByMemoryAndModel: EmbeddingRepositoryModule["getEmbeddingByMemoryAndModel"];
let deleteEmbeddingsByMemory: EmbeddingRepositoryModule["deleteEmbeddingsByMemory"];
let upsertEmbedding: EmbeddingRepositoryModule["upsertEmbedding"];

let insertMemory: MemoryRepositoryModule["insertMemory"];
let deleteAllMemoriesByServer: MemoryRepositoryModule["deleteAllMemoriesByServer"];

const MODEL_ID = "test-model-1";
const SERVER_ID = "test-server-e1";

let tempDir = "";

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "pilot-memory-embedding-test-"));
  process.env.PILOT_DB_PATH = join(tempDir, "pilot-memory-test.db");

  // Ensure memory DB modules initialize after PILOT_DB_PATH is set.
  jest.resetModules();

  // Import MemoryRepository first so the memory schema is initialized before
  // embedding repository operations attempt to read/write embedding rows.
  const memory = await import("../MemoryRepository.js");
  insertMemory = memory.insertMemory;
  deleteAllMemoriesByServer = memory.deleteAllMemoriesByServer;

  const embeddings = await import("../EmbeddingRepository.js");
  insertEmbedding = embeddings.insertEmbedding;
  getEmbeddingsByModel = embeddings.getEmbeddingsByModel;
  getEmbeddingByMemoryAndModel = embeddings.getEmbeddingByMemoryAndModel;
  deleteEmbeddingsByMemory = embeddings.deleteEmbeddingsByMemory;
  upsertEmbedding = embeddings.upsertEmbedding;
});

beforeEach(() => {
  deleteAllMemoriesByServer(SERVER_ID);
});

afterAll(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  delete process.env.PILOT_DB_PATH;
});

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
