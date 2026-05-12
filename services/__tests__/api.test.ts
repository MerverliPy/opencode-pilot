import { OpencodeClient, ApiError } from "@/services/api";
import type { ServerConfig } from "@/services/auth";

describe("OpencodeClient", () => {
  const server: ServerConfig = {
    id: "s1",
    name: "Home",
    url: "http://localhost:4096",
    username: "alice",
    password: "secret",
  };

  let client: OpencodeClient;

  beforeEach(() => {
    client = new OpencodeClient(server);
    jest.clearAllMocks();
  });

  describe("url construction", () => {
    it("strips trailing slash from server url", () => {
      const c = new OpencodeClient({ ...server, url: "http://host/" });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({}),
      });
      return c.health().then(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://host/global/health",
          expect.any(Object),
        );
      });
    });

    it("appends query string when query provided", () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([]),
      });
      return client.listMessages("ses_123", 10).then(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:4096/session/ses_123/message?limit=10",
          expect.any(Object),
        );
      });
    });

    it("omits undefined query params", () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([]),
      });
      return client.listMessages("ses_123").then(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:4096/session/ses_123/message?",
          expect.any(Object),
        );
      });
    });
  });

  describe("request headers", () => {
    it("includes Authorization header for basic auth", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ healthy: true, version: "1.0" }),
      });
      await client.health();
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers).toHaveProperty("Authorization");
      expect(init.headers.Authorization).toMatch(/^Basic /);
    });

    it("sets Content-Type for POST with body", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ id: "ses_123" }),
      });
      await client.createSession({ title: "Test" });
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(init.body).toBe(JSON.stringify({ title: "Test" }));
    });

    it("does not set Content-Type for GET", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([]),
      });
      await client.listSessions();
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers["Content-Type"]).toBeUndefined();
    });
  });

  describe("response handling", () => {
    it("parses JSON response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ healthy: true, version: "1.0" }),
      });
      const result = await client.health();
      expect(result).toEqual({ healthy: true, version: "1.0" });
    });

    it("returns undefined for 204 No Content", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 204,
        headers: { get: () => "" },
      });
      const result = await client.promptAsync("ses_123", {
        parts: [{ type: "text", text: "hi" }],
      });
      expect(result).toBeUndefined();
    });

    it("returns text for non-JSON responses", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "text/html" },
        text: () => Promise.resolve("<html></html>"),
      });
      const result = await client.fileContent("README.md");
      expect(result).toBe("<html></html>");
    });

    it("throws ApiError on non-ok response", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
      });
      await expect(client.getSession("bad-id")).rejects.toThrow(ApiError);
      await expect(client.getSession("bad-id")).rejects.toThrow("404");
    });

    it("handles empty error body", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error("read failed")),
      });
      await expect(client.getSession("x")).rejects.toThrow(ApiError);
    });
  });

  describe("ApiError", () => {
    it("stores status and body", () => {
      const err = new ApiError(404, "Not found");
      expect(err.status).toBe(404);
      expect(err.body).toBe("Not found");
      expect(err.message).toContain("404");
    });
  });

  describe("endpoint coverage", () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([]),
      });
    });

    it("listSessions calls GET /session", async () => {
      await client.listSessions();
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("createSession calls POST /session", async () => {
      await client.createSession({ title: "Test" });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("getSession calls GET /session/:id", async () => {
      await client.getSession("ses_123");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("deleteSession calls DELETE /session/:id", async () => {
      await client.deleteSession("ses_123");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("updateSession calls PATCH /session/:id", async () => {
      await client.updateSession("ses_123", { title: "New" });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123",
        expect.objectContaining({ method: "PATCH" }),
      );
    });

    it("abortSession calls POST /session/:id/abort", async () => {
      await client.abortSession("ses_123");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123/abort",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("sessionStatus calls GET /session/status", async () => {
      await client.sessionStatus();
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/status",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("sessionDiff calls GET /session/:id/diff", async () => {
      await client.sessionDiff("ses_123");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123/diff?",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("respondPermission calls POST /session/:id/permissions/:permID", async () => {
      await client.respondPermission("ses_123", "perm_1", { response: "once" });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123/permissions/perm_1",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("listMessages calls GET /session/:id/message", async () => {
      await client.listMessages("ses_123");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123/message?",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("promptAsync calls POST /session/:id/prompt_async", async () => {
      await client.promptAsync("ses_123", {
        parts: [{ type: "text", text: "hi" }],
      });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123/prompt_async",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("runCommand calls POST /session/:id/command", async () => {
      await client.runCommand("ses_123", { command: "test" });
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/session/ses_123/command",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("configProviders calls GET /config/providers", async () => {
      await client.configProviders();
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/config/providers",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("listAgents calls GET /agent", async () => {
      await client.listAgents();
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/agent",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("listCommands calls GET /command", async () => {
      await client.listCommands();
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/command",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("listFiles calls GET /file", async () => {
      await client.listFiles(".");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/file?path=.",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("fileContent calls GET /file/content", async () => {
      await client.fileContent("README.md");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/file/content?path=README.md",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("findFile calls GET /find/file", async () => {
      await client.findFile("package");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/find/file?query=package",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("findText calls GET /find", async () => {
      await client.findText("TODO");
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/find?pattern=TODO",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });
});
