import { Deduplicator } from "../Deduplicator";
import * as MemoryRepository from "../../db/MemoryRepository";
import * as EmbeddingRepository from "../../db/EmbeddingRepository";
import * as EmbeddingProviderFactory from "../../embeddings/EmbeddingProviderFactory";

jest.mock("../../db/MemoryRepository");
jest.mock("../../db/EmbeddingRepository");
jest.mock("../../embeddings/EmbeddingProviderFactory");

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
    (MemoryRepository.getMemoriesByServer as jest.Mock).mockResolvedValue([]);
    const dedup = new Deduplicator(serverId);
    const result = await dedup.isDuplicate("test content", config);
    expect(result).toBe(false);
  });

  it("returns false when no embeddings exist", async () => {
    (MemoryRepository.getMemoriesByServer as jest.Mock).mockResolvedValue([
      { id: "m1" },
    ]);
    (EmbeddingRepository.getEmbeddingsByModel as jest.Mock).mockResolvedValue(
      [],
    );
    const dedup = new Deduplicator(serverId);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(false);
  });

  it("returns true when similarity is above threshold", async () => {
    (MemoryRepository.getMemoriesByServer as jest.Mock).mockResolvedValue([
      { id: "m1" },
    ]);
    (EmbeddingRepository.getEmbeddingsByModel as jest.Mock).mockResolvedValue([
      { memoryId: "m1", vector: [1, 0, 0], modelId: "test-model" },
    ]);
    (
      EmbeddingProviderFactory.createProviderFromConfig as jest.Mock
    ).mockResolvedValue({
      embed: jest.fn().mockResolvedValue([[1, 0, 0]]),
    });

    const dedup = new Deduplicator(serverId);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(true);
  });

  it("returns false when similarity is below threshold", async () => {
    (MemoryRepository.getMemoriesByServer as jest.Mock).mockResolvedValue([
      { id: "m1" },
    ]);
    (EmbeddingRepository.getEmbeddingsByModel as jest.Mock).mockResolvedValue([
      { memoryId: "m1", vector: [0, 1, 0], modelId: "test-model" },
    ]);
    (
      EmbeddingProviderFactory.createProviderFromConfig as jest.Mock
    ).mockResolvedValue({
      embed: jest.fn().mockResolvedValue([[1, 0, 0]]),
    });

    const dedup = new Deduplicator(serverId);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(false);
  });

  it("returns false on embedding error", async () => {
    (MemoryRepository.getMemoriesByServer as jest.Mock).mockResolvedValue([
      { id: "m1" },
    ]);
    (EmbeddingRepository.getEmbeddingsByModel as jest.Mock).mockResolvedValue([
      { memoryId: "m1", vector: [1, 0, 0], modelId: "test-model" },
    ]);
    (
      EmbeddingProviderFactory.createProviderFromConfig as jest.Mock
    ).mockRejectedValue(new Error("embed failed"));

    const dedup = new Deduplicator(serverId);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(false);
  });

  it("returns false when embed returns empty vector", async () => {
    (MemoryRepository.getMemoriesByServer as jest.Mock).mockResolvedValue([
      { id: "m1" },
    ]);
    (EmbeddingRepository.getEmbeddingsByModel as jest.Mock).mockResolvedValue([
      { memoryId: "m1", vector: [1, 0, 0], modelId: "test-model" },
    ]);
    (
      EmbeddingProviderFactory.createProviderFromConfig as jest.Mock
    ).mockResolvedValue({
      embed: jest.fn().mockResolvedValue([]),
    });

    const dedup = new Deduplicator(serverId);
    const result = await dedup.isDuplicate("test", config);
    expect(result).toBe(false);
  });
});
