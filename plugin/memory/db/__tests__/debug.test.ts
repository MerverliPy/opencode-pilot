import {
  insertEmbedding,
  getEmbeddingsByModel,
} from "@/plugin/memory/db/EmbeddingRepository";
import { getDb, closeDb } from "@/plugin/memory/db/database";

describe("debug", () => {
  beforeEach(async () => {
    const sqlite = require("expo-sqlite") as any;
    sqlite.__resetDatabases();
    await getDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  it("trace", async () => {
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

    const db = await getDb();
    const rows = await db.getAllAsync(
      "SELECT * FROM memory_embeddings WHERE model_id = ? AND memory_id IN (?)",
      ["model-a", "m1"],
    );
    expect((rows as any[]).length).toBe(1);
    expect((rows as any[])[0].memory_id).toBe("m1");

    // Also test through the repository function
    const db2 = await getDb();
    expect(db2).toBe(db); // should be same singleton

    const embeddings = await getEmbeddingsByModel("model-a", ["m1"]);
    expect(embeddings.length).toBe(1);
  });
});
