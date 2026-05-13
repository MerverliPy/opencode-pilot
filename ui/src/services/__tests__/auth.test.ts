import {
  basicAuthHeader,
  loadActiveServerId,
  loadLastSessionId,
  loadN9RouterConfig,
  loadPushToken,
  loadServers,
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
  });

  describe("loadServers / saveServers", () => {
    it("returns empty array when no servers stored", async () => {
      const result = await loadServers();
      expect(result).toEqual([]);
    });

    it("parses stored JSON", async () => {
      const servers: ServerConfig[] = [
        { id: "s1", name: "Home", url: "http://localhost:4096" },
      ];
      localStorage.setItem("pilot.servers", JSON.stringify(servers));
      const result = await loadServers();
      expect(result).toEqual(servers);
    });

    it("returns empty array on invalid JSON", async () => {
      localStorage.setItem("pilot.servers", "not-json");
      const result = await loadServers();
      expect(result).toEqual([]);
    });

    it("saves servers as JSON", async () => {
      const servers: ServerConfig[] = [
        { id: "s1", name: "Home", url: "http://localhost:4096" },
      ];
      await saveServers(servers);
      expect(localStorage.getItem("pilot.servers")).toBe(
        JSON.stringify(servers),
      );
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

    it("parses stored config", async () => {
      localStorage.setItem(
        "pilot.n9router",
        JSON.stringify({ url: "http://n9router.local", key: "secret" }),
      );
      const result = await loadN9RouterConfig();
      expect(result).toEqual({ url: "http://n9router.local", key: "secret" });
    });

    it("returns defaults on invalid JSON", async () => {
      localStorage.setItem("pilot.n9router", "bad");
      const result = await loadN9RouterConfig();
      expect(result).toEqual({ url: "", key: "" });
    });

    it("saves config", async () => {
      await saveN9RouterConfig({ url: "http://n9router.local", key: "secret" });
      expect(localStorage.getItem("pilot.n9router")).toBe(
        JSON.stringify({ url: "http://n9router.local", key: "secret" }),
      );
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
});
