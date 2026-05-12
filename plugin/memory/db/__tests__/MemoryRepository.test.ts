import {
  insertMemory,
  getMemoriesByServer,
  getMemoryById,
  updateMemory,
  deleteMemory,
  countMemories,
  searchMemories,
  getMemoryConfig,
  saveMemoryConfig,
} from "@/plugin/memory/db/MemoryRepository";
import { getDb, closeDb } from "@/plugin/memory/db/database";
describe("MemoryRepository", () => {
  beforeEach(async () => {
    const sqlite = require("expo-sqlite") as any;
    sqlite.__resetDatabases();
    await getDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  it("insertMemory creates a memory", async () => {
    const memory = await insertMemory({
      serverId: "srv1",
      content: "test content",
      category: "fact",
      confidence: 0.9,
      tags: ["test"],
      isPinned: false,
      isArchived: false,
    });
    expect(memory.id).toBeTruthy();
    expect(memory.content).toBe("test content");
    expect(memory.createdAt).toBeGreaterThan(0);
  });

  it("getMemoriesByServer returns memories for server", async () => {
    await insertMemory({
      serverId: "srv1",
      content: "content 1",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    await insertMemory({
      serverId: "srv2",
      content: "content 2",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    const memories = await getMemoriesByServer("srv1");
    expect(memories).toHaveLength(1);
    expect(memories[0].content).toBe("content 1");
  });

  it("getMemoriesByServer excludes archived by default", async () => {
    await insertMemory({
      serverId: "srv1",
      content: "archived",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: true,
    });
    const memories = await getMemoriesByServer("srv1");
    expect(memories).toHaveLength(0);
  });

  it("getMemoryById returns matching memory", async () => {
    const inserted = await insertMemory({
      serverId: "srv1",
      content: "find me",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    const found = await getMemoryById(inserted.id);
    expect(found).toBeTruthy();
    expect(found?.content).toBe("find me");
  });

  it("getMemoryById returns null for unknown id", async () => {
    const found = await getMemoryById("nonexistent");
    expect(found).toBeNull();
  });

  it("updateMemory updates fields", async () => {
    const inserted = await insertMemory({
      serverId: "srv1",
      content: "old",
      category: "fact",
      confidence: 0.5,
      tags: ["a"],
      isPinned: false,
      isArchived: false,
    });
    await updateMemory(inserted.id, { content: "new", confidence: 0.9 });
    const updated = await getMemoryById(inserted.id);
    expect(updated?.content).toBe("new");
    expect(updated?.confidence).toBe(0.9);
  });

  it("updateMemory no-op when no fields provided", async () => {
    const inserted = await insertMemory({
      serverId: "srv1",
      content: "unchanged",
      category: "fact",
      confidence: 0.5,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    await updateMemory(inserted.id, {});
    const found = await getMemoryById(inserted.id);
    expect(found?.content).toBe("unchanged");
  });

  it("deleteMemory removes memory", async () => {
    const inserted = await insertMemory({
      serverId: "srv1",
      content: "delete me",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    await deleteMemory(inserted.id);
    const found = await getMemoryById(inserted.id);
    expect(found).toBeNull();
  });

  it("countMemories returns correct count", async () => {
    await insertMemory({
      serverId: "srv1",
      content: "a",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    await insertMemory({
      serverId: "srv1",
      content: "b",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    const count = await countMemories("srv1");
    expect(count).toBe(2);
  });

  it("countMemories excludes archived", async () => {
    await insertMemory({
      serverId: "srv1",
      content: "archived",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: true,
    });
    const count = await countMemories("srv1");
    expect(count).toBe(0);
  });

  it("searchMemories filters by content", async () => {
    await insertMemory({
      serverId: "srv1",
      content: "hello world",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    await insertMemory({
      serverId: "srv1",
      content: "goodbye",
      category: "fact",
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
    });
    const results = await searchMemories("srv1", "hello");
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("hello world");
  });

  it("getMemoryConfig returns default for new server", async () => {
    const config = await getMemoryConfig("srv1");
    expect(config.serverId).toBe("srv1");
    expect(config.enabled).toBe(true);
    expect(config.dedupThreshold).toBe(0.92);
  });

  it("saveMemoryConfig persists config", async () => {
    await saveMemoryConfig({
      serverId: "srv1",
      enabled: false,
      extractEnabled: true,
      injectEnabled: true,
      embeddingProvider: "openai",
      embeddingModel: "test-model",
      dedupThreshold: 0.95,
      topK: 10,
      maxMemories: 100,
    });
    const config = await getMemoryConfig("srv1");
    expect(config.enabled).toBe(false);
    expect(config.embeddingProvider).toBe("openai");
    expect(config.dedupThreshold).toBe(0.95);
  });
});
