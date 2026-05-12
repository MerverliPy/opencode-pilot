import {
  insertEmbedding,
  getEmbeddingsByModel,
  getEmbeddingByMemoryAndModel,
  deleteEmbeddingsByMemory,
  upsertEmbedding,
} from "@/plugin/memory/db/EmbeddingRepository";
import { getDb, closeDb } from "@/plugin/memory/db/database";

describe("EmbeddingRepository", () => {
  beforeEach(async () => {
    const sqlite = require("expo-sqlite") as any;
    sqlite.__resetDatabases();
    await getDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  it("insertEmbedding creates an embedding", async () => {
    const e = await insertEmbedding({
      memoryId: "m1",
      modelId: "model-a",
      vector: [0.1, 0.2, 0.3],
    });
    expect(e.id).toBeTruthy();
    expect(e.vector).toEqual([0.1, 0.2, 0.3]);
  });

  it("getEmbeddingsByModel returns embeddings for model", async () => {
    await insertEmbedding({
      memoryId: "m1",
      modelId: "model-a",
      vector: [1, 0],
    });
    await insertEmbedding({
      memoryId: "m2",
      modelId: "model-a",
      vector: [0, 1],
    });
    await insertEmbedding({
      memoryId: "m3",
      modelId: "model-b",
      vector: [1, 1],
    });
    const embeddings = await getEmbeddingsByModel("model-a");
    expect(embeddings).toHaveLength(2);
  });

  it("getEmbeddingsByModel filters by memory ids", async () => {
    await insertEmbedding({
      memoryId: "m1",
      modelId: "model-a",
      vector: [1, 0],
    });
    await insertEmbedding({
      memoryId: "m2",
      modelId: "model-a",
      vector: [0, 1],
    });
    const embeddings = await getEmbeddingsByModel("model-a", ["m1"]);
    expect(embeddings).toHaveLength(1);
    expect(embeddings[0].memoryId).toBe("m1");
  });

  it("getEmbeddingByMemoryAndModel returns matching embedding", async () => {
    await insertEmbedding({
      memoryId: "m1",
      modelId: "model-a",
      vector: [1, 0],
    });
    const found = await getEmbeddingByMemoryAndModel("m1", "model-a");
    expect(found).toBeTruthy();
    expect(found?.vector).toEqual([1, 0]);
  });

  it("getEmbeddingByMemoryAndModel returns null for no match", async () => {
    const found = await getEmbeddingByMemoryAndModel("m1", "model-a");
    expect(found).toBeNull();
  });

  it("deleteEmbeddingsByMemory removes embeddings", async () => {
    await insertEmbedding({
      memoryId: "m1",
      modelId: "model-a",
      vector: [1, 0],
    });
    await deleteEmbeddingsByMemory("m1");
    const found = await getEmbeddingByMemoryAndModel("m1", "model-a");
    expect(found).toBeNull();
  });

  it("upsertEmbedding inserts new embedding", async () => {
    await upsertEmbedding({
      memoryId: "m1",
      modelId: "model-a",
      vector: [1, 0],
    });
    const found = await getEmbeddingByMemoryAndModel("m1", "model-a");
    expect(found).toBeTruthy();
    expect(found?.vector).toEqual([1, 0]);
  });

  it("upsertEmbedding updates existing embedding", async () => {
    await insertEmbedding({
      memoryId: "m1",
      modelId: "model-a",
      vector: [1, 0],
    });
    await upsertEmbedding({
      memoryId: "m1",
      modelId: "model-a",
      vector: [0, 1],
    });
    const found = await getEmbeddingByMemoryAndModel("m1", "model-a");
    expect(found?.vector).toEqual([0, 1]);
  });
});
