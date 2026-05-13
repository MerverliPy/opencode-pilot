import { Deduplicator } from "../Deduplicator";
import type { Memory, MemoryEmbedding } from "../../db/schema";
import type { MemoryApi } from "../../../../services/memoryApi";
import * as EmbeddingProviderFactory from "../../embeddings/EmbeddingProviderFactory";

jest.mock("../../embeddings/EmbeddingProviderFactory");

const mockApi = {
  listMemories: jest.fn(),
  getEmbeddings: jest.fn(),
} as unknown as jest.Mocked<MemoryApi>;

describe("Deduplicator", () => {
  const serverId = "srv-1";
  const config: any = {
    embeddingModel: "test-model",
    embeddingProvider: "openai",
    dedupThreshold: 0.92,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when no memories exist", async () => {
    (mockApi.listMemories as jest.Mock).mockResolvedValue({
      memories: [],
      count: 0,
    });
    const dedup = new Deduplicator(serverId, mockApi);
    const result = await dedup.isDuplicate("test content", config);
    expect(result).toBe(false);
  });

  it("returns false when no embeddings exist", async () => {
    (mockApi.listMemories as jest.Mock).mockResolvedValue({
      memories: [{ id: "m1" }],
      count: 1,
    });
    (mockApi.getEmbeddings as jest.Mock).mockResolvedValue([]);
    const dedup = new Deduplicator(serverId, mockApi);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(false);
  });

  it("returns true when similarity is above threshold", async () => {
    (mockApi.listMemories as jest.Mock).mockResolvedValue({
      memories: [{ id: "m1" }],
      count: 1,
    });
    (mockApi.getEmbeddings as jest.Mock).mockResolvedValue([
      { memoryId: "m1", vector: [1, 0, 0], modelId: "test-model" },
    ]);
    (
      EmbeddingProviderFactory.createProviderFromConfig as jest.Mock
    ).mockResolvedValue({
      embed: jest.fn().mockResolvedValue([[1, 0, 0]]),
    });

    const dedup = new Deduplicator(serverId, mockApi);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(true);
  });

  it("returns false when similarity is below threshold", async () => {
    (mockApi.listMemories as jest.Mock).mockResolvedValue({
      memories: [{ id: "m1" }],
      count: 1,
    });
    (mockApi.getEmbeddings as jest.Mock).mockResolvedValue([
      { memoryId: "m1", vector: [0, 1, 0], modelId: "test-model" },
    ]);
    (
      EmbeddingProviderFactory.createProviderFromConfig as jest.Mock
    ).mockResolvedValue({
      embed: jest.fn().mockResolvedValue([[1, 0, 0]]),
    });

    const dedup = new Deduplicator(serverId, mockApi);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(false);
  });

  it("returns false on embedding error", async () => {
    (mockApi.listMemories as jest.Mock).mockResolvedValue({
      memories: [{ id: "m1" }],
      count: 1,
    });
    (mockApi.getEmbeddings as jest.Mock).mockResolvedValue([
      { memoryId: "m1", vector: [1, 0, 0], modelId: "test-model" },
    ]);
    (
      EmbeddingProviderFactory.createProviderFromConfig as jest.Mock
    ).mockRejectedValue(new Error("embed failed"));

    const dedup = new Deduplicator(serverId, mockApi);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(false);
  });

  it("returns false when embed returns empty vector", async () => {
    (mockApi.listMemories as jest.Mock).mockResolvedValue({
      memories: [{ id: "m1" }],
      count: 1,
    });
    (mockApi.getEmbeddings as jest.Mock).mockResolvedValue([
      { memoryId: "m1", vector: [1, 0, 0], modelId: "test-model" },
    ]);
    (
      EmbeddingProviderFactory.createProviderFromConfig as jest.Mock
    ).mockResolvedValue({
      embed: jest.fn().mockResolvedValue([]),
    });

    const dedup = new Deduplicator(serverId, mockApi);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(false);
  });
});
