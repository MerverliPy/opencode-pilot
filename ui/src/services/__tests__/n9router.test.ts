import { N9RouterClient, N9RouterUsageStats } from "../n9router";

describe("N9RouterClient", () => {
  const baseUrl = "http://localhost:9090";
  let client: N9RouterClient;

  beforeEach(() => {
    client = new N9RouterClient(baseUrl, "test-key");
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("stores baseUrl and apiKey", () => {
      expect(client.baseUrl).toBe(baseUrl);
      expect(client.apiKey).toBe("test-key");
    });

    it("defaults apiKey to empty string", () => {
      const c = new N9RouterClient(baseUrl);
      expect(c.apiKey).toBe("");
    });
  });

  describe("health", () => {
    it("GET /api/health returns ok", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
      const result = await client.health();
      expect(result).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:9090/api/health",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("throws on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("server error"),
      });
      await expect(client.health()).rejects.toThrow("500");
    });
  });

  describe("models", () => {
    it("GET /v1/models returns model list", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            object: "list",
            data: [{ id: "gpt-4", object: "model", owned_by: "openai" }],
          }),
      });
      const result = await client.models();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("gpt-4");
    });
  });

  describe("combos", () => {
    it("GET /api/combos returns combo definitions", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ combos: [{ id: "c1", name: "Combo 1" }] }),
      });
      const result = await client.combos();
      expect(result.combos).toHaveLength(1);
    });
  });

  describe("usageStats", () => {
    it("GET /api/usage/stats with default period", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ recentRequests: [] }),
      });
      await client.usageStats();
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain("period=24h");
    });

    it("GET /api/usage/stats with custom period", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ recentRequests: [] }),
      });
      await client.usageStats("7d");
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain("period=7d");
    });
  });

  describe("tunnel", () => {
    it("GET /api/tunnel/status", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ enabled: false }),
      });
      const result = await client.tunnelStatus();
      expect(result.enabled).toBe(false);
    });

    it("POST /api/tunnel/enable", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ enabled: true }),
      });
      const result = await client.tunnelEnable();
      expect(result.enabled).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("POST /api/tunnel/disable", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ enabled: false }),
      });
      const result = await client.tunnelDisable();
      expect(result.enabled).toBe(false);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("headers", () => {
    it("includes Bearer token when apiKey is set", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
      await client.health();
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers.Authorization).toBe("Bearer test-key");
    });

    it("omits Authorization when apiKey is empty", async () => {
      const c = new N9RouterClient(baseUrl);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
      await c.health();
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers.Authorization).toBeUndefined();
    });
  });

  describe("url construction", () => {
    it("strips trailing slash from baseUrl", async () => {
      const c = new N9RouterClient("http://host/");
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ok: true }),
      });
      await c.health();
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe("http://host/api/health");
    });
  });

  describe("summarizeByProvider", () => {
    it("aggregates single provider", () => {
      const stats: N9RouterUsageStats = {
        recentRequests: [
          {
            provider: "openai",
            status: "success",
            promptTokens: 10,
            completionTokens: 5,
            timestamp: "",
            model: "",
          },
          {
            provider: "openai",
            status: "success",
            promptTokens: 20,
            completionTokens: 10,
            timestamp: "",
            model: "",
          },
          {
            provider: "openai",
            status: "error",
            promptTokens: 5,
            completionTokens: 0,
            timestamp: "",
            model: "",
          },
        ],
      };
      const result = N9RouterClient.summarizeByProvider(stats);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        provider: "openai",
        requests: 3,
        success: 2,
        errors: 1,
        promptTokens: 35,
        completionTokens: 15,
      });
    });

    it("sorts by request count descending", () => {
      const stats: N9RouterUsageStats = {
        recentRequests: [
          {
            provider: "a",
            status: "success",
            promptTokens: 0,
            completionTokens: 0,
            timestamp: "",
            model: "",
          },
          {
            provider: "b",
            status: "success",
            promptTokens: 0,
            completionTokens: 0,
            timestamp: "",
            model: "",
          },
          {
            provider: "b",
            status: "success",
            promptTokens: 0,
            completionTokens: 0,
            timestamp: "",
            model: "",
          },
        ],
      };
      const result = N9RouterClient.summarizeByProvider(stats);
      expect(result[0].provider).toBe("b");
      expect(result[1].provider).toBe("a");
    });

    it("falls back to unknown for missing provider", () => {
      const stats: N9RouterUsageStats = {
        recentRequests: [
          {
            provider: "",
            status: "success",
            promptTokens: 0,
            completionTokens: 0,
            timestamp: "",
            model: "",
          },
        ],
      };
      const result = N9RouterClient.summarizeByProvider(stats);
      expect(result[0].provider).toBe("unknown");
    });

    it("handles undefined recentRequests", () => {
      const stats: N9RouterUsageStats = { recentRequests: undefined as any };
      const result = N9RouterClient.summarizeByProvider(stats);
      expect(result).toEqual([]);
    });

    it("handles empty stats", () => {
      const stats: N9RouterUsageStats = { recentRequests: [] };
      const result = N9RouterClient.summarizeByProvider(stats);
      expect(result).toEqual([]);
    });

    it("sums token usage correctly", () => {
      const stats: N9RouterUsageStats = {
        recentRequests: [
          {
            provider: "x",
            status: "success",
            promptTokens: 100,
            completionTokens: 50,
            timestamp: "",
            model: "",
          },
          {
            provider: "x",
            status: "success",
            promptTokens: undefined as any,
            completionTokens: undefined as any,
            timestamp: "",
            model: "",
          },
        ],
      };
      const result = N9RouterClient.summarizeByProvider(stats);
      expect(result[0].promptTokens).toBe(100);
      expect(result[0].completionTokens).toBe(50);
    });
  });
});
