import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import Database from "better-sqlite3";

// Set in-memory DB path BEFORE any imports that call getMemoryDb()
process.env.PILOT_DB_PATH = ":memory:";

// Now import the modules under test
import {
  insertMemory,
  getMemoriesByServer,
  getMemoryById,
  updateMemory,
  deleteMemory,
  deleteAllMemoriesByServer,
  countMemories,
  searchMemories,
  getMemoryConfig,
  saveMemoryConfig,
} from "../MemoryRepository.js";

const SERVER_ID = "test-server-1";

function sample(overrides?: Record<string, unknown>) {
  return {
    serverId: SERVER_ID,
    content: "Test memory content",
    category: "fact" as const,
    confidence: 0.95,
    tags: ["test", "memory"],
    sourceSessionId: undefined as string | undefined,
    sourceMessageId: undefined as string | undefined,
    isPinned: false,
    isArchived: false,
    ...overrides,
  };
}

describe("MemoryRepository", () => {
  it("insertMemory creates a memory with generated id and timestamps", () => {
    const m = insertMemory(sample());
    expect(m.id).toBeTruthy();
    expect(m.createdAt).toBeGreaterThan(0);
    expect(m.updatedAt).toBeGreaterThan(0);
    expect(m.content).toBe("Test memory content");
    expect(m.serverId).toBe(SERVER_ID);
  });

  it("getMemoryById returns null for non-existent id", () => {
    expect(getMemoryById("nonexistent")).toBeNull();
  });

  it("getMemoryById returns the inserted memory", () => {
    const m = insertMemory(sample({ content: "find-me" }));
    const found = getMemoryById(m.id);
    expect(found).not.toBeNull();
    expect(found!.content).toBe("find-me");
  });

  it("getMemoriesByServer returns memories for a server", () => {
    // Clean up first
    deleteAllMemoriesByServer(SERVER_ID);
    insertMemory(sample({ content: "memory-a" }));
    insertMemory(sample({ content: "memory-b" }));
    const results = getMemoriesByServer(SERVER_ID);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("getMemoriesByServer excludes archived by default", () => {
    deleteAllMemoriesByServer(SERVER_ID);
    insertMemory(sample({ content: "active" }));
    const archived = insertMemory(sample({ content: "archived", isArchived: true }));
    const results = getMemoriesByServer(SERVER_ID);
    expect(results.every((r) => r.isArchived === false)).toBe(true);
  });

  it("getMemoriesByServer with includeArchived includes archived", () => {
    deleteAllMemoriesByServer(SERVER_ID);
    insertMemory(sample({ content: "active" }));
    insertMemory(sample({ content: "archived", isArchived: true }));
    const results = getMemoriesByServer(SERVER_ID, { includeArchived: true });
    expect(results.some((r) => r.isArchived)).toBe(true);
  });

  it("getMemoriesByServer respects limit", () => {
    deleteAllMemoriesByServer(SERVER_ID);
    insertMemory(sample({ content: "a" }));
    insertMemory(sample({ content: "b" }));
    insertMemory(sample({ content: "c" }));
    const results = getMemoriesByServer(SERVER_ID, { limit: 2 });
    expect(results.length).toBe(2);
  });

  it("updateMemory updates content", () => {
    const m = insertMemory(sample({ content: "before" }));
    updateMemory(m.id, { content: "after" });
    const updated = getMemoryById(m.id);
    expect(updated!.content).toBe("after");
  });

  it("updateMemory updates isPinned", () => {
    const m = insertMemory(sample({ isPinned: false }));
    updateMemory(m.id, { isPinned: true });
    expect(getMemoryById(m.id)!.isPinned).toBe(true);
  });

  it("updateMemory updates isArchived", () => {
    const m = insertMemory(sample({ isArchived: false }));
    updateMemory(m.id, { isArchived: true });
    expect(getMemoryById(m.id)!.isArchived).toBe(true);
  });

  it("updateMemory updates tags", () => {
    const m = insertMemory(sample({ tags: ["old"] }));
    updateMemory(m.id, { tags: ["new"] });
    expect(getMemoryById(m.id)!.tags).toEqual(["new"]);
  });

  it("updateMemory updates confidence", () => {
    const m = insertMemory(sample({ confidence: 0.5 }));
    updateMemory(m.id, { confidence: 0.99 });
    expect(getMemoryById(m.id)!.confidence).toBe(0.99);
  });

  it("updateMemory updates category", () => {
    const m = insertMemory(sample({ category: "fact" }));
    updateMemory(m.id, { category: "preference" });
    expect(getMemoryById(m.id)!.category).toBe("preference");
  });

  it("deleteMemory removes the memory", () => {
    const m = insertMemory(sample());
    deleteMemory(m.id);
    expect(getMemoryById(m.id)).toBeNull();
  });

  it("deleteAllMemoriesByServer removes all memories for a server", () => {
    deleteAllMemoriesByServer(SERVER_ID);
    insertMemory(sample({ content: "a" }));
    insertMemory(sample({ content: "b" }));
    deleteAllMemoriesByServer(SERVER_ID);
    expect(getMemoriesByServer(SERVER_ID)).toHaveLength(0);
  });

  it("countMemories returns count of non-archived memories", () => {
    deleteAllMemoriesByServer(SERVER_ID);
    insertMemory(sample({ content: "a" }));
    insertMemory(sample({ content: "b" }));
    insertMemory(sample({ content: "c", isArchived: true }));
    expect(countMemories(SERVER_ID)).toBe(2);
  });

  it("searchMemories finds by content", () => {
    deleteAllMemoriesByServer(SERVER_ID);
    insertMemory(sample({ content: "unique-search-term" }));
    const results = searchMemories(SERVER_ID, "unique-search-term");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("searchMemories returns empty for non-matching query", () => {
    const results = searchMemories(SERVER_ID, "zzz_nonexistent_zzz");
    expect(results).toHaveLength(0);
  });

  it("searchMemories searches by tags", () => {
    deleteAllMemoriesByServer(SERVER_ID);
    insertMemory(sample({ tags: ["special-tag"], content: "tagged memory" }));
    const results = searchMemories(SERVER_ID, "special-tag");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("getMemoryConfig returns defaults when no config exists", () => {
    const cfg = getMemoryConfig("new-server");
    expect(cfg.enabled).toBe(true);
    expect(cfg.embeddingProvider).toBe("ollama");
    expect(cfg.serverId).toBe("new-server");
  });

  it("saveMemoryConfig persists config", () => {
    saveMemoryConfig({
      serverId: SERVER_ID,
      enabled: false,
      extractEnabled: false,
      injectEnabled: false,
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      dedupThreshold: 0.95,
      topK: 10,
      maxMemories: 1000,
    });
    const cfg = getMemoryConfig(SERVER_ID);
    expect(cfg.enabled).toBe(false);
    expect(cfg.embeddingProvider).toBe("openai");
    expect(cfg.topK).toBe(10);
  });
});
