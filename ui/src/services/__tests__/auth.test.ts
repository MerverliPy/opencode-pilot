import {
  basicAuthHeader,
  checkAuthStatus,
  loadActiveServerId,
  loadLastSessionId,
  loadN9RouterConfig,
  loadPushToken,
  loadServers,
  login,
  logout,
  loadSessionWorkdir,
  saveActiveServerId,
  saveLastSessionId,
  saveN9RouterConfig,
  savePushToken,
  saveServers,
  saveSessionWorkdir,
  ServerConfig,
} from "../auth";

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  describe("loadServers / saveServers", () => {
    it("returns empty array when no servers stored", async () => {
      const result = await loadServers();
      expect(result).toEqual([]);
    });

    it("round-trips servers through encryption", async () => {
      const servers: ServerConfig[] = [
        { id: "s1", name: "Home", url: "http://localhost:4096" },
      ];
      await saveServers(servers);
      const result = await loadServers();
      expect(result).toEqual(servers);
    });

    it("returns empty array on corrupted / invalid data", async () => {
      // Directly placed garbage that can't be decrypted or parsed
      localStorage.setItem("pilot.servers", "not-json");
      const result = await loadServers();
      expect(result).toEqual([]);
    });

  });

  describe("loadActiveServerId / saveActiveServerId", () => {
    it("returns null when no active server", async () => {
      const result = await loadActiveServerId();
      expect(result).toBeNull();
    });

    it("returns stored id", async () => {
      localStorage.setItem("pilot.activeServer", "s1");
      const result = await loadActiveServerId();
      expect(result).toBe("s1");
    });

    it("saves active id", async () => {
      await saveActiveServerId("s1");
      expect(localStorage.getItem("pilot.activeServer")).toBe("s1");
    });

    it("deletes active id when null", async () => {
      localStorage.setItem("pilot.activeServer", "s1");
      await saveActiveServerId(null);
      expect(localStorage.getItem("pilot.activeServer")).toBeNull();
    });
  });

  describe("loadLastSessionId / saveLastSessionId", () => {
    it("returns null when no last session", async () => {
      const result = await loadLastSessionId("s1");
      expect(result).toBeNull();
    });

    it("saves last session id with server prefix", async () => {
      await saveLastSessionId("s1", "ses_123");
      expect(localStorage.getItem("pilot.lastSession.s1")).toBe("ses_123");
    });
  });

  describe("loadPushToken / savePushToken", () => {
    it("returns null when no token", async () => {
      const result = await loadPushToken();
      expect(result).toBeNull();
    });

    it("saves push token", async () => {
      await savePushToken("ExponentPushToken[xxx]");
      expect(localStorage.getItem("pilot.pushToken")).toBe(
        "ExponentPushToken[xxx]",
      );
    });
  });

  describe("loadSessionWorkdir / saveSessionWorkdir", () => {
    it("returns null when no workdir", async () => {
      const result = await loadSessionWorkdir("s1", "ses_123");
      expect(result).toBeNull();
    });

    it("saves workdir with compound key", async () => {
      await saveSessionWorkdir("s1", "ses_123", "/home/user/project");
      expect(localStorage.getItem("pilot.workdir.s1.ses_123")).toBe(
        "/home/user/project",
      );
    });

    it("deletes workdir when null", async () => {
      localStorage.setItem("pilot.workdir.s1.ses_123", "/home/user/project");
      await saveSessionWorkdir("s1", "ses_123", null);
      expect(localStorage.getItem("pilot.workdir.s1.ses_123")).toBeNull();
    });
  });

  describe("loadN9RouterConfig / saveN9RouterConfig", () => {
    it("returns defaults when no config stored", async () => {
      const result = await loadN9RouterConfig();
      expect(result).toEqual({ url: "", key: "" });
    });

    it("round-trips config through encryption", async () => {
      const cfg = { url: "http://n9router.local", key: "secret" };
      await saveN9RouterConfig(cfg);
      const result = await loadN9RouterConfig();
      expect(result).toEqual(cfg);
    });

    it("returns defaults on corrupted / invalid data", async () => {
      localStorage.setItem("pilot.n9router", "bad");
      const result = await loadN9RouterConfig();
      expect(result).toEqual({ url: "", key: "" });
    });

  });

  describe("basicAuthHeader", () => {
    it("returns empty object when no credentials", () => {
      const server: ServerConfig = {
        id: "s1",
        name: "Home",
        url: "http://localhost:4096",
      };
      expect(basicAuthHeader(server)).toEqual({});
    });

    it("returns Authorization header with base64", () => {
      const server: ServerConfig = {
        id: "s1",
        name: "Home",
        url: "http://localhost:4096",
        username: "alice",
        password: "secret",
      };
      const result = basicAuthHeader(server);
      expect(result).toHaveProperty("Authorization");
      expect(result.Authorization).toMatch(/^Basic /);
    });

    it('uses default username "opencode" when only password provided', () => {
      const server: ServerConfig = {
        id: "s1",
        name: "Home",
        url: "http://localhost:4096",
        password: "secret",
      };
      const result = basicAuthHeader(server);
      expect(result.Authorization).toBe("Basic b3BlbmNvZGU6c2VjcmV0");
    });

    it("uses btoa when available", () => {
      const mockBtoa = jest.fn(() => "mocked");
      (globalThis as any).btoa = mockBtoa;
      const server: ServerConfig = {
        id: "s1",
        name: "Home",
        url: "http://localhost:4096",
        username: "u",
        password: "p",
      };
      basicAuthHeader(server);
      expect(mockBtoa).toHaveBeenCalledWith("u:p");
      delete (globalThis as any).btoa;
    });
  });

  describe("session cookie auth", () => {
    it("sends logout with CSRF header and credentials", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

      await logout("http://localhost:4096/");

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/auth/logout",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "PilotPWA" },
        }),
      );
    });

    it("throws when logout is rejected", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403 });

      await expect(logout("http://localhost:4096")).rejects.toThrow("HTTP 403");
    });

    it("sends login credentials in a cookie-auth request", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ ok: true, username: "alice" }),
      });

      await login("http://localhost:4096/", "alice", "secret");

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/auth/login",
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: "alice", password: "secret" }),
        }),
      );
    });

    it("checks auth status with credentials included", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ authenticated: true, username: "alice" }),
      });

      await checkAuthStatus("http://localhost:4096/");

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:4096/auth/status",
        expect.objectContaining({
          method: "GET",
          credentials: "include",
        }),
      );
    });
  });
});
