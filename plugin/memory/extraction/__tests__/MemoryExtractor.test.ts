/**
 * Tests for MemoryExtractor.
 *
 * All external dependencies are mocked; we test the orchestration logic
 * (config checks, turn conversion, JSON parsing, dedup, DB insertion).
 */

// ── Mocks (must be above imports) ────────────────────────────────────────────

const mockExtractionSession = {
  sendAndWait: jest.fn(),
  reset: jest.fn(),
};

const mockDeduplicator = {
  isDuplicate: jest.fn(),
};

jest.mock("@/plugin/memory/db/MemoryRepository", () => ({
  insertMemory: jest.fn(),
}));

jest.mock("@/plugin/memory/db/EmbeddingRepository", () => ({
  insertEmbedding: jest.fn(),
}));

jest.mock("@/plugin/memory/embeddings/EmbeddingProviderFactory", () => ({
  createProviderFromConfig: jest.fn(),
}));

jest.mock("@/plugin/memory/dedup/Deduplicator", () => ({
  Deduplicator: jest.fn().mockImplementation(() => mockDeduplicator),
}));

jest.mock("@/plugin/memory/extraction/ExtractionSession", () => ({
  ExtractionSession: jest.fn().mockImplementation(() => mockExtractionSession),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { MemoryExtractor } from "@/plugin/memory/extraction/MemoryExtractor";
import { insertMemory } from "@/plugin/memory/db/MemoryRepository";
import { insertEmbedding } from "@/plugin/memory/db/EmbeddingRepository";
import { createProviderFromConfig } from "@/plugin/memory/embeddings/EmbeddingProviderFactory";
import type { Turn } from "@/store/session";
import type { MemoryConfig } from "@/plugin/memory/db/schema";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const serverId = "srv-1";
const serverUrl = "http://localhost:4096";

const defaultConfig: MemoryConfig = {
  serverId,
  enabled: true,
  extractEnabled: true,
  injectEnabled: true,
  embeddingProvider: "openai",
  embeddingModel: "text-embedding-3-small",
  dedupThreshold: 0.92,
  topK: 5,
  maxMemories: 2000,
};

const disabledConfig: MemoryConfig = { ...defaultConfig, enabled: false };
const extractDisabledConfig: MemoryConfig = {
  ...defaultConfig,
  extractEnabled: false,
};

function makeTurn(role: "user" | "assistant", text: string): Turn {
  return {
    message: {
      id: `m-${Date.now()}`,
      sessionID: "s1",
      role,
      time: { created: Date.now() },
    },
    parts: [
      {
        type: "text",
        text,
        id: `p-${Date.now()}`,
        messageID: "m1",
        sessionID: "s1",
      },
    ],
  };
}

function makeEmptyTurn(role: "user" | "assistant"): Turn {
  return {
    message: {
      id: `m-${Date.now()}`,
      sessionID: "s1",
      role,
      time: { created: Date.now() },
    },
    parts: [
      {
        id: `p-${Date.now()}`,
        messageID: "m1",
        sessionID: "s1",
        type: "tool" as const,
        tool: "read",
        state: { status: "completed" as const },
      },
    ],
  };
}

const sampleTurns: Turn[] = [
  makeTurn("user", "I prefer functional programming"),
  makeTurn("assistant", "Good choice!"),
];

const validJsonResponse = JSON.stringify([
  {
    content: "User prefers functional programming over OOP",
    category: "preference",
    confidence: 0.95,
    tags: ["programming-paradigm", "functional"],
  },
]);

const insertedMemory = {
  id: "mem-1",
  serverId,
  content: "User prefers functional programming over OOP",
  category: "preference" as const,
  confidence: 0.95,
  tags: ["programming-paradigm", "functional"],
  isPinned: false,
  isArchived: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default mocks
  mockExtractionSession.sendAndWait.mockResolvedValue(validJsonResponse);
  mockExtractionSession.reset.mockClear();
  mockDeduplicator.isDuplicate.mockResolvedValue(false);
  (createProviderFromConfig as jest.Mock).mockResolvedValue({
    embed: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
  });
  (insertMemory as jest.Mock).mockResolvedValue(insertedMemory);
  (insertEmbedding as jest.Mock).mockResolvedValue({ id: "emb-1" });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("config guards", () => {
  it("returns [] when config.enabled is false", async () => {
    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, disabledConfig);
    expect(result).toEqual([]);
    expect(mockExtractionSession.sendAndWait).not.toHaveBeenCalled();
  });

  it("returns [] when config.extractEnabled is false", async () => {
    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, extractDisabledConfig);
    expect(result).toEqual([]);
    expect(mockExtractionSession.sendAndWait).not.toHaveBeenCalled();
  });
});

describe("empty or no-text turns", () => {
  it("returns [] when turns array is empty", async () => {
    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract([], defaultConfig);
    expect(result).toEqual([]);
  });

  it("returns [] when all turns have no text parts", async () => {
    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(
      [makeEmptyTurn("user"), makeEmptyTurn("assistant")],
      defaultConfig,
    );
    expect(result).toEqual([]);
  });
});

describe("happy path", () => {
  it("parses JSON, deduplicates, and inserts memory + embedding", async () => {
    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("mem-1");

    // Extraction session called
    expect(mockExtractionSession.sendAndWait).toHaveBeenCalledWith(
      expect.stringContaining("functional programming"),
      expect.objectContaining({ timeoutMs: 45_000 }),
    );

    // Dedup check performed
    expect(mockDeduplicator.isDuplicate).toHaveBeenCalledWith(
      "User prefers functional programming over OOP",
      defaultConfig,
    );

    // Memory inserted
    expect(insertMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        serverId,
        content: "User prefers functional programming over OOP",
        category: "preference",
        confidence: 0.95,
        tags: ["programming-paradigm", "functional"],
      }),
    );

    // Embedding inserted
    expect(insertEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryId: "mem-1",
        modelId: "text-embedding-3-small",
        vector: [0.1, 0.2, 0.3],
      }),
    );
  });
});

describe("deduplication", () => {
  it("skips memory when deduplicator returns true", async () => {
    mockDeduplicator.isDuplicate.mockResolvedValue(true);

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toEqual([]);
    expect(insertMemory).not.toHaveBeenCalled();
    expect(mockExtractionSession.sendAndWait).toHaveBeenCalled();
  });
});

describe("JSON parsing edge cases", () => {
  it("returns [] when response is not valid JSON", async () => {
    mockExtractionSession.sendAndWait.mockResolvedValue(
      "The conversation was good but no memories to extract.",
    );

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toEqual([]);
    expect(insertMemory).not.toHaveBeenCalled();
  });

  it("returns [] when AI returns an empty array", async () => {
    mockExtractionSession.sendAndWait.mockResolvedValue("[]");

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toEqual([]);
    expect(insertMemory).not.toHaveBeenCalled();
  });

  it("handles JSON wrapped in markdown fences", async () => {
    mockExtractionSession.sendAndWait.mockResolvedValue(
      "```json\n" + validJsonResponse + "\n```",
    );

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toHaveLength(1);
    expect(insertMemory).toHaveBeenCalled();
  });

  it("skips items with content shorter than 10 chars", async () => {
    mockExtractionSession.sendAndWait.mockResolvedValue(
      JSON.stringify([
        { content: "short", category: "fact", confidence: 0.9, tags: [] },
      ]),
    );

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toEqual([]);
    expect(insertMemory).not.toHaveBeenCalled();
  });

  it("skips items with confidence below 0.65", async () => {
    mockExtractionSession.sendAndWait.mockResolvedValue(
      JSON.stringify([
        {
          content: "A vaguely useful memory",
          category: "fact",
          confidence: 0.5,
          tags: [],
        },
      ]),
    );

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toEqual([]);
    expect(insertMemory).not.toHaveBeenCalled();
  });
});

describe("embedding provider failure", () => {
  it("still inserts memories when embedding provider fails", async () => {
    (createProviderFromConfig as jest.Mock).mockRejectedValue(
      new Error("provider unavailable"),
    );

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    // Memory still inserted
    expect(result).toHaveLength(1);
    expect(insertMemory).toHaveBeenCalled();
    // Embedding not inserted
    expect(insertEmbedding).not.toHaveBeenCalled();
  });

  it("still inserts memory when embed returns empty vector", async () => {
    (createProviderFromConfig as jest.Mock).mockResolvedValue({
      embed: jest.fn().mockResolvedValue([]),
    });

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toHaveLength(1);
    expect(insertMemory).toHaveBeenCalled();
    // No embedding since the vector was empty
    expect(insertEmbedding).not.toHaveBeenCalled();
  });
});

describe("sendAndWait error", () => {
  it("returns [] when the extraction session throws", async () => {
    mockExtractionSession.sendAndWait.mockRejectedValue(
      new Error("network error"),
    );

    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    const result = await extractor.extract(sampleTurns, defaultConfig);

    expect(result).toEqual([]);
    expect(insertMemory).not.toHaveBeenCalled();
  });
});

describe("resetSession", () => {
  it("calls reset on the extraction session", () => {
    const extractor = new MemoryExtractor({} as any, serverId, serverUrl);
    extractor.resetSession();
    expect(mockExtractionSession.reset).toHaveBeenCalled();
  });
});
