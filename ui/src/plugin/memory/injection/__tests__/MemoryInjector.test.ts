/**
 * Tests for MemoryInjector.
 *
 * All external dependencies are mocked; we test the orchestration logic:
 * config guards, memory/embedding loading, query embedding, topK scoring,
 * and context formatting.
 */

// ── Mocks (must be above imports) ────────────────────────────────────────────

jest.mock("../../db/MemoryRepository", () => ({
  getMemoriesByServer: jest.fn(),
}));

jest.mock("../../db/EmbeddingRepository", () => ({
  getEmbeddingsByModel: jest.fn(),
}));

jest.mock("../../embeddings/EmbeddingProviderFactory", () => ({
  createProviderFromConfig: jest.fn(),
}));

jest.mock("../../embeddings/similarity", () => ({
  topK: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { MemoryInjector } from "../MemoryInjector";
import { getMemoriesByServer } from "../../db/MemoryRepository";
import { getEmbeddingsByModel } from "../../db/EmbeddingRepository";
import { createProviderFromConfig } from "../../embeddings/EmbeddingProviderFactory";
import { topK } from "../../embeddings/similarity";
import type { MemoryConfig } from "../../db/schema";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const serverId = "srv-1";
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
const injectDisabledConfig: MemoryConfig = {
  ...defaultConfig,
  injectEnabled: false,
};

const sampleMemories = [
  {
    id: "m1",
    serverId,
    content: "User prefers TypeScript for frontend",
    category: "preference" as const,
    confidence: 0.95,
    tags: ["typescript"],
    isPinned: false,
    isArchived: false,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: "m2",
    serverId,
    content: "Project uses React Native with Expo",
    category: "fact" as const,
    confidence: 0.9,
    tags: ["react-native", "expo"],
    isPinned: false,
    isArchived: false,
    createdAt: 1000,
    updatedAt: 1000,
  },
];

const sampleEmbeddings = [
  {
    id: "e1",
    memoryId: "m1",
    modelId: "text-embedding-3-small",
    vector: [1, 0, 0],
    createdAt: 1000,
  },
  {
    id: "e2",
    memoryId: "m2",
    modelId: "text-embedding-3-small",
    vector: [0, 1, 0],
    createdAt: 1000,
  },
];

const mockEmbedProvider = {
  embed: jest.fn().mockResolvedValue([[0.5, 0.5, 0.5]]),
};

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Re-create embed mock after clearAllMocks to ensure fresh implementation
  mockEmbedProvider.embed = jest.fn().mockResolvedValue([[0.5, 0.5, 0.5]]);

  (getMemoriesByServer as jest.Mock).mockResolvedValue(sampleMemories);
  (getEmbeddingsByModel as jest.Mock).mockResolvedValue(sampleEmbeddings);
  (createProviderFromConfig as jest.Mock).mockResolvedValue(mockEmbedProvider);

  // Default: topK returns both memories with decent scores
  (topK as jest.Mock).mockReturnValue([
    { item: sampleEmbeddings[0], score: 0.92 },
    { item: sampleEmbeddings[1], score: 0.85 },
  ]);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("config guards", () => {
  it("returns '' when config.enabled is false", async () => {
    const injector = new MemoryInjector(serverId, "http://localhost:4096");
    const result = await injector.buildContext("test query", disabledConfig);
    expect(result).toBe("");
    expect(getMemoriesByServer).not.toHaveBeenCalled();
  });

  it("returns '' when config.injectEnabled is false", async () => {
    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext(
      "test query",
      injectDisabledConfig,
    );
    expect(result).toBe("");
    expect(getMemoriesByServer).not.toHaveBeenCalled();
  });
});

describe("empty data guards", () => {
  it("returns '' when no memories exist for the server", async () => {
    (getMemoriesByServer as jest.Mock).mockResolvedValue([]);

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
    expect(getEmbeddingsByModel).not.toHaveBeenCalled();
  });

  it("returns '' when no embeddings exist for the model", async () => {
    (getEmbeddingsByModel as jest.Mock).mockResolvedValue([]);

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
    expect(createProviderFromConfig).not.toHaveBeenCalled();
  });
});

describe("query embedding edge cases", () => {
  it("returns '' when embed returns empty vector", async () => {
    mockEmbedProvider.embed.mockResolvedValue([]);

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
    expect(topK).not.toHaveBeenCalled();
  });

  it("returns '' when embed returns undefined vector", async () => {
    mockEmbedProvider.embed.mockResolvedValue([null]);

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
    expect(topK).not.toHaveBeenCalled();
  });
});

describe("topK results", () => {
  it("returns formatted context block with topK results", async () => {
    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext(
      "TypeScript preferences",
      defaultConfig,
    );

    // Should contain header, bullet points, and footer
    expect(result).toContain("[Memory Context — from previous sessions]");
    expect(result).toContain("[End Memory Context]");
    expect(result).toContain("- User prefers TypeScript for frontend");
    expect(result).toContain("- Project uses React Native with Expo");

    // Verify the full format
    expect(result).toBe(
      "[Memory Context — from previous sessions]\n" +
        "- User prefers TypeScript for frontend\n" +
        "- Project uses React Native with Expo\n" +
        "[End Memory Context]\n\n",
    );

    // Verify dependencies were called as expected
    expect(getMemoriesByServer).toHaveBeenCalledWith(serverId);
    expect(getEmbeddingsByModel).toHaveBeenCalledWith(
      "text-embedding-3-small",
      ["m1", "m2"],
    );
    expect(createProviderFromConfig).toHaveBeenCalledWith({
      modelId: "text-embedding-3-small",
      provider: "openai",
      serverUrl: undefined,
    });
    expect(mockEmbedProvider.embed).toHaveBeenCalledWith(
      ["TypeScript preferences"],
      "query",
    );
    expect(topK).toHaveBeenCalledWith(
      [0.5, 0.5, 0.5],
      sampleEmbeddings,
      expect.any(Function),
      5,
      0.5,
    );
  });

  it("returns '' when all results have scores below the minimum", async () => {
    (topK as jest.Mock).mockReturnValue([]);

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
  });

  it("returns '' when none of the topK results map to known memories", async () => {
    // topK returns an embedding whose memoryId doesn't exist in the memory map
    (topK as jest.Mock).mockReturnValue([
      { item: { memoryId: "nonexistent", vector: [1, 0, 0] }, score: 0.9 },
    ]);

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
  });
});

describe("error handling", () => {
  it("catches errors and returns empty string", async () => {
    (getMemoriesByServer as jest.Mock).mockRejectedValue(new Error("DB error"));

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
  });

  it("handles provider creation failure gracefully", async () => {
    (createProviderFromConfig as jest.Mock).mockRejectedValue(
      new Error("provider error"),
    );

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
  });

  it("handles embed failure gracefully", async () => {
    mockEmbedProvider.embed.mockRejectedValue(new Error("embedding error"));

    const injector = new MemoryInjector(serverId);
    const result = await injector.buildContext("query", defaultConfig);
    expect(result).toBe("");
  });
});
