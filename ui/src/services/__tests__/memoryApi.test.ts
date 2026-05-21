import { createMemoryApi } from "../memoryApi";
import type { ServerConfig } from "../auth";
import type { Memory, MemoryConfig, MemoryEmbedding, ProfileEntry, TimelineEvent } from "../../plugin/memory/db/schema";

describe("createMemoryApi", () => {
  const server: ServerConfig = {
    id: "s1",
    name: "Home",
    url: "http://localhost:4096",
    username: "alice",
    password: "secret",
  };

  const api = createMemoryApi(server);
  const serverId = "svr_1";

  // Shared mock response factory
  const mockJsonResponse = (data: unknown, status = 200) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(""),
    });

  const mockEmptyResponse = (status = 204) =>
    Promise.resolve({
      ok: true,
      status,
      headers: { get: () => "" },
      text: () => Promise.resolve(""),
    });

  const mockErrorResponse = (status: number, body: string) =>
    Promise.resolve({
      ok: false,
      status,
      headers: { get: () => "text/plain" },
      text: () => Promise.resolve(body),
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET helpers ──────────────────────────────────────────────────────────

  describe("listMemories", () => {
    it("calls GET /memory/:serverId without query when no opts", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ memories: [], count: 0 }),
      );
      const result = await api.listMemories(serverId);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual({ memories: [], count: 0 });
    });

    it("appends includeArchived and limit query params", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ memories: [], count: 0 }),
      );
      await api.listMemories(serverId, { includeArchived: true, limit: 50 });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1?includeArchived=true&limit=50",
        expect.any(Object),
      );
    });

    it("omits query string when all opts are falsey", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ memories: [], count: 0 }),
      );
      await api.listMemories(serverId, { includeArchived: false });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1",
        expect.any(Object),
      );
    });

    it("returns MemoryListResult with populated data", async () => {
      const mockMemories: Memory[] = [
        {
          id: "mem_1", serverId, content: "test",
          category: "fact", confidence: 0.9,
          tags: ["test"], isPinned: false, isArchived: false,
          createdAt: 100, updatedAt: 100,
        },
      ];
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ memories: mockMemories, count: 1 }),
      );
      const result = await api.listMemories(serverId);
      expect(result.count).toBe(1);
      expect(result.memories[0].content).toBe("test");
    });
  });

  describe("searchMemories", () => {
    it("calls GET /memory/:serverId/search with query", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ memories: [] }),
      );
      await api.searchMemories(serverId, "test query");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/search?q=test%20query",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("encodes special characters in query", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockJsonResponse({ memories: [] }),
      );
      await api.searchMemories(serverId, "a&b=c");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("a%26b%3Dc"),
        expect.any(Object),
      );
    });
  });

  describe("getConfig", () => {
    it("calls GET /memory/:serverId/config", async () => {
      const config: MemoryConfig = {
        serverId, enabled: true, extractEnabled: true,
        injectEnabled: true, embeddingProvider: "ollama",
        embeddingModel: "nomic-embed-text", dedupThreshold: 0.92,
        topK: 5, maxMemories: 2000,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(config));
      const result = await api.getConfig(serverId);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/config",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(config);
    });
  });

  describe("getProfile", () => {
    it("calls GET /memory/:serverId/profile", async () => {
      const profile: ProfileEntry[] = [
        { id: "p1", serverId, key: "name", value: "Alice", confidence: 0.9, updatedAt: 100 },
      ];
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(profile));
      const result = await api.getProfile(serverId);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/profile",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("getTimeline", () => {
    it("calls GET /memory/:serverId/timeline without opts", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse([]));
      await api.getTimeline(serverId);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/timeline",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("appends limit and offset query params", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse([]));
      await api.getTimeline(serverId, { limit: 10, offset: 20 });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/timeline?limit=10&offset=20",
        expect.any(Object),
      );
    });

    it("returns parsed TimelineEvent array", async () => {
      const events: TimelineEvent[] = [
        {
          id: "t1", serverId, sessionId: "ses_1",
          eventType: "memory_extracted", payload: {},
          createdAt: 100,
        },
      ];
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(events));
      const result = await api.getTimeline(serverId);
      expect(result[0].eventType).toBe("memory_extracted");
    });
  });

  describe("getEmbeddings", () => {
    it("calls GET /memory/:serverId/embeddings with modelId", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse([]));
      await api.getEmbeddings(serverId, "model_1");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/embeddings?modelId=model_1",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("appends memoryIds when provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse([]));
      await api.getEmbeddings(serverId, "model_1", ["mem_1", "mem_2"]);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/embeddings?modelId=model_1&memoryIds=mem_1%2Cmem_2",
        expect.any(Object),
      );
    });

    it("returns MemoryEmbedding array", async () => {
      const embeddings: MemoryEmbedding[] = [
        { id: "e1", memoryId: "mem_1", modelId: "m1", vector: [0.1, 0.2], createdAt: 100 },
      ];
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(embeddings));
      const result = await api.getEmbeddings(serverId, "m1");
      expect(result).toHaveLength(1);
      expect(result[0].vector).toEqual([0.1, 0.2]);
    });
  });

  // ── POST / PUT ───────────────────────────────────────────────────────────

  describe("insertMemory", () => {
    it("calls POST /memory/:serverId with body", async () => {
      const input = {
        serverId, content: "new memory", category: "fact" as const,
        confidence: 0.8, tags: [], isPinned: false, isArchived: false,
      };
      const output: Memory = { ...input, id: "mem_new", createdAt: 200, updatedAt: 200 };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(output, 201));
      const result = await api.insertMemory(serverId, input);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1",
        expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
      );
      expect(result.id).toBe("mem_new");
    });

    it("sets Content-Type header", async () => {
      const input = {
        serverId, content: "x", category: "fact" as const,
        confidence: 0.5, tags: [], isPinned: false, isArchived: false,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(input, 201));
      await api.insertMemory(serverId, input);
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(init.headers["X-Requested-With"]).toBe("PilotPWA");
      expect(init.credentials).toBe("include");
    });
  });

  describe("saveConfig", () => {
    it("calls PUT /memory/:serverId/config with partial config", async () => {
      const patch = { enabled: false };
      const full: MemoryConfig = {
        serverId, enabled: false, extractEnabled: true,
        injectEnabled: true, embeddingProvider: "ollama",
        embeddingModel: "nomic-embed-text", dedupThreshold: 0.92,
        topK: 5, maxMemories: 2000,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(full));
      const result = await api.saveConfig(serverId, patch);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/config",
        expect.objectContaining({ method: "PUT", body: JSON.stringify(patch) }),
      );
      expect(result.enabled).toBe(false);
    });
  });

  describe("insertEmbedding", () => {
    it("calls POST /memory/:serverId/embeddings with body", async () => {
      const input = { memoryId: "mem_1", modelId: "m1", vector: [0.5] };
      const output: MemoryEmbedding = { ...input, id: "emb_new", createdAt: 300 };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(output, 201));
      const result = await api.insertEmbedding(serverId, input);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/embeddings",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.id).toBe("emb_new");
    });
  });

  // ── PATCH ────────────────────────────────────────────────────────────────

  describe("updateMemory", () => {
    it("calls PATCH /memory/:serverId/:id with partial body", async () => {
      const patch = { content: "updated", confidence: 0.95 };
      const updated: Memory = {
        id: "mem_1", serverId, content: "updated",
        category: "fact", confidence: 0.95,
        tags: [], isPinned: false, isArchived: false,
        createdAt: 100, updatedAt: 200,
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(updated));
      const result = await api.updateMemory(serverId, "mem_1", patch);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/mem_1",
        expect.objectContaining({ method: "PATCH", body: JSON.stringify(patch) }),
      );
      expect(result.content).toBe("updated");
    });

    it("encodes ID with special characters", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({} as Memory));
      await api.updateMemory(serverId, "mem/id", { content: "x" });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("mem%2Fid"),
        expect.any(Object),
      );
    });
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  describe("deleteMemory", () => {
    it("calls DELETE /memory/:serverId/:id", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockEmptyResponse(204));
      const result = await api.deleteMemory(serverId, "mem_1");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/mem_1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(result).toBeUndefined();
    });
  });

  describe("deleteAllMemories", () => {
    it("calls DELETE /memory/:serverId/all", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockEmptyResponse(204));
      const result = await api.deleteAllMemories(serverId);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/all",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(result).toBeUndefined();
    });
  });

  describe("deleteEmbeddingsByMemory", () => {
    it("calls DELETE /memory/:serverId/embeddings/:memoryId", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockEmptyResponse(204));
      const result = await api.deleteEmbeddingsByMemory(serverId, "mem_1");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/embeddings/mem_1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(result).toBeUndefined();
    });
  });

  // ── Auth headers ────────────────────────────────────────────────────────

  describe("auth headers", () => {
    it("uses cookie auth without Authorization header", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse([]));
      await api.getProfile(serverId);
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers.Authorization).toBeUndefined();
      expect(init.credentials).toBe("include");
    });

    it("sets Accept header on all requests", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse([]));
      await api.getProfile(serverId);
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers.Accept).toBe("application/json");
    });
  });

  // ── Error handling ──────────────────────────────────────────────────────

  describe("error handling", () => {
    it("throws on non-ok response with status and body", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse(404, "Not found"));
      await expect(api.getConfig(serverId)).rejects.toThrow("Memory API GET /memory/svr_1/config → 404: Not found");
    });

    it("throws on server error (500)", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse(500, "Internal error"));
      await expect(api.searchMemories(serverId, "x")).rejects.toThrow("500");
    });

    it("handles empty error body", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        Promise.resolve({
          ok: false,
          status: 500,
          headers: { get: () => "text/plain" },
          text: () => Promise.reject(new Error("read failed")),
        }),
      );
      await expect(api.listMemories(serverId)).rejects.toThrow("Memory API");
    });
  });

  // ── Semantic Search ─────────────────────────────────────────────────────

  describe("semanticSearch", () => {
    it("calls POST with queryVector, modelId, topK and returns results", async () => {
      const mockResults = {
        results: [
          { memory: { id: "mem_1", serverId, content: "found", category: "fact", confidence: 0.9, tags: [], isPinned: false, isArchived: false, createdAt: 100, updatedAt: 100 }, score: 0.95 },
          { memory: { id: "mem_2", serverId, content: "also", category: "fact", confidence: 0.8, tags: [], isPinned: false, isArchived: false, createdAt: 200, updatedAt: 200 }, score: 0.82 },
        ],
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(mockResults));

      const result = await api.semanticSearch(serverId, [0.1, 0.2, 0.3], "model-1", 10);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/semantic-search",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ queryVector: [0.1, 0.2, 0.3], modelId: "model-1", topK: 10 }),
        }),
      );
      expect(result).toEqual(mockResults);
      expect(result.results[0].score).toBe(0.95);
    });

    it("omits topK from body when not provided", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse({ results: [] }));

      await api.semanticSearch(serverId, [0.5], "model-X");

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(init.body as string);
      expect(body).toEqual({ queryVector: [0.5], modelId: "model-X" });
      // topK should not be in the body
      expect(body).not.toHaveProperty("topK");
    });
  });

  // ── Export / Import ─────────────────────────────────────────────────────

  describe("exportAll", () => {
    it("calls GET /export and returns export blob", async () => {
      const exportData = {
        version: 1,
        exportedAt: "2025-01-01T00:00:00.000Z",
        serverId,
        memories: [],
        profile: [],
        timeline: [],
        config: { serverId, enabled: true, extractEnabled: true, injectEnabled: true, embeddingProvider: "ollama", embeddingModel: "nomic-embed-text", dedupThreshold: 0.92, topK: 5, maxMemories: 2000 },
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(exportData));

      const result = await api.exportAll(serverId);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/export",
        expect.objectContaining({ method: "GET" }),
      );
      expect(result).toEqual(exportData);
      expect(result.version).toBe(1);
      expect(result.serverId).toBe(serverId);
      expect(result.memories).toEqual([]);
      expect(result.profile).toEqual([]);
      expect(result.timeline).toEqual([]);
      expect(result.config).toHaveProperty("embeddingProvider", "ollama");
    });
  });

  describe("importAll", () => {
    it("calls POST /import with data and returns import counts", async () => {
      const importData = {
        version: 1,
        memories: [{ content: "test", category: "fact", confidence: 0.9, tags: [], isPinned: false, isArchived: false }],
        profile: [{ key: "name", value: "Alice", confidence: 0.8 }],
        timeline: [{ eventType: "memory_extracted", payload: {} }],
      };
      const importResult = { imported: { memories: 1, profile: 1, timeline: 1 } };
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse(importResult));

      const result = await api.importAll(serverId, importData);

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/memory/svr_1/import",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(importData),
        }),
      );
      expect(result.imported).toEqual({ memories: 1, profile: 1, timeline: 1 });
    });
  });

  // ── URL encoding ─────────────────────────────────────────────────────────

  describe("URL encoding", () => {
    it("encodes serverId with special chars", async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockJsonResponse([]));
      await api.getConfig("svr/1");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("svr%2F1"),
        expect.any(Object),
      );
    });
  });
});
