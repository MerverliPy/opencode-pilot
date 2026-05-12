import * as SecureStore from "expo-secure-store";
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
} from "@/services/auth";

describe("auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loadServers / saveServers", () => {
    it("returns empty array when no servers stored", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await loadServers();
      expect(result).toEqual([]);
    });

    it("parses stored JSON", async () => {
      const servers: ServerConfig[] = [
        { id: "s1", name: "Home", url: "http://localhost:4096" },
      ];
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify(servers),
      );
      const result = await loadServers();
      expect(result).toEqual(servers);
    });

    it("returns empty array on invalid JSON", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("not-json");
      const result = await loadServers();
      expect(result).toEqual([]);
    });

    it("saves servers as JSON", async () => {
      const servers: ServerConfig[] = [
        { id: "s1", name: "Home", url: "http://localhost:4096" },
      ];
      await saveServers(servers);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "pilot.servers",
        JSON.stringify(servers),
      );
    });
  });

  describe("loadActiveServerId / saveActiveServerId", () => {
    it("returns null when no active server", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await loadActiveServerId();
      expect(result).toBeNull();
    });

    it("returns stored id", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("s1");
      const result = await loadActiveServerId();
      expect(result).toBe("s1");
    });

    it("saves active id", async () => {
      await saveActiveServerId("s1");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "pilot.activeServer",
        "s1",
      );
    });

    it("deletes active id when null", async () => {
      await saveActiveServerId(null);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "pilot.activeServer",
      );
    });
  });

  describe("loadLastSessionId / saveLastSessionId", () => {
    it("returns null when no last session", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await loadLastSessionId("s1");
      expect(result).toBeNull();
    });

    it("saves last session id with server prefix", async () => {
      await saveLastSessionId("s1", "ses_123");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "pilot.lastSession.s1",
        "ses_123",
      );
    });
  });

  describe("loadPushToken / savePushToken", () => {
    it("returns null when no token", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await loadPushToken();
      expect(result).toBeNull();
    });

    it("saves push token", async () => {
      await savePushToken("ExponentPushToken[xxx]");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "pilot.pushToken",
        "ExponentPushToken[xxx]",
      );
    });
  });

  describe("loadSessionWorkdir / saveSessionWorkdir", () => {
    it("returns null when no workdir", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await loadSessionWorkdir("s1", "ses_123");
      expect(result).toBeNull();
    });

    it("saves workdir with compound key", async () => {
      await saveSessionWorkdir("s1", "ses_123", "/home/user/project");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "pilot.workdir.s1.ses_123",
        "/home/user/project",
      );
    });

    it("deletes workdir when null", async () => {
      await saveSessionWorkdir("s1", "ses_123", null);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "pilot.workdir.s1.ses_123",
      );
    });
  });

  describe("loadN9RouterConfig / saveN9RouterConfig", () => {
    it("returns defaults when no config stored", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await loadN9RouterConfig();
      expect(result).toEqual({ url: "", key: "" });
    });

    it("parses stored config", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({ url: "http://n9router.local", key: "secret" }),
      );
      const result = await loadN9RouterConfig();
      expect(result).toEqual({ url: "http://n9router.local", key: "secret" });
    });

    it("returns defaults on invalid JSON", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("bad");
      const result = await loadN9RouterConfig();
      expect(result).toEqual({ url: "", key: "" });
    });

    it("saves config", async () => {
      await saveN9RouterConfig({ url: "http://n9router.local", key: "secret" });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "pilot.n9router",
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
