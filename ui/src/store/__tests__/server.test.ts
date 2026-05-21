import { useServerStore } from "../server";
import type { ServerConfig } from "../../services/auth";
import * as authService from "../../services/auth";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

describe("useServerStore", () => {
  beforeEach(() => {
    useServerStore.setState({
      servers: [],
      activeId: null,
      hydrated: false,
      authenticated: false,
      authUsername: null,
    });
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("has default state", () => {
    const state = useServerStore.getState();
    expect(state.servers).toEqual([]);
    expect(state.activeId).toBeNull();
    expect(state.hydrated).toBe(false);
  });

  describe("hydrate", () => {
    it("loads servers and active id from secure store", async () => {
      const servers: ServerConfig[] = [
        { id: "s1", name: "Home", url: "http://localhost:4096" },
      ];
      localStorage.setItem("pilot.servers", JSON.stringify(servers));
      localStorage.setItem("pilot.activeServer", "s1");

      await useServerStore.getState().hydrate();
      const state = useServerStore.getState();
      expect(state.servers).toEqual(servers);
      expect(state.activeId).toBe("s1");
      expect(state.hydrated).toBe(true);
    });

    it("handles empty store", async () => {
      await useServerStore.getState().hydrate();
      expect(useServerStore.getState().hydrated).toBe(true);
    });
  });

  describe("setActive", () => {
    it("sets active server id and persists", async () => {
      await useServerStore.getState().setActive("s1");
      expect(useServerStore.getState().activeId).toBe("s1");
      expect(localStorage.getItem("pilot.activeServer")).toBe("s1");
    });

    it("sets null active id and deletes", async () => {
      await useServerStore.getState().setActive(null);
      expect(useServerStore.getState().activeId).toBeNull();
      expect(localStorage.getItem("pilot.activeServer")).toBeNull();
    });
  });

  describe("upsert", () => {
    it("adds a new server", async () => {
      const server: ServerConfig = {
        id: "s1",
        name: "Home",
        url: "http://localhost:4096",
      };
      await useServerStore.getState().upsert(server);
      expect(useServerStore.getState().servers).toContainEqual(server);
      expect(localStorage.getItem("pilot.servers")).toBeTruthy();
    });

    it("updates existing server by id", async () => {
      useServerStore.setState({
        servers: [{ id: "s1", name: "Old", url: "http://old" }],
      });
      const updated: ServerConfig = {
        id: "s1",
        name: "New",
        url: "http://new",
      };
      await useServerStore.getState().upsert(updated);
      const servers = useServerStore.getState().servers;
      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe("New");
    });
  });

  describe("remove", () => {
    it("removes a server by id", async () => {
      useServerStore.setState({
        servers: [
          { id: "s1", name: "A", url: "http://a" },
          { id: "s2", name: "B", url: "http://b" },
        ],
      });
      await useServerStore.getState().remove("s1");
      expect(useServerStore.getState().servers).toHaveLength(1);
      expect(useServerStore.getState().servers[0].id).toBe("s2");
    });

    it("clears active if removing active server", async () => {
      useServerStore.setState({
        servers: [{ id: "s1", name: "A", url: "http://a" }],
        activeId: "s1",
      });
      await useServerStore.getState().remove("s1");
      expect(useServerStore.getState().activeId).toBeNull();
    });
  });

  describe("active", () => {
    it("returns null when no active id", () => {
      expect(useServerStore.getState().active()).toBeNull();
    });

    it("returns the active server config", () => {
      useServerStore.setState({
        servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
        activeId: "s1",
      });
      expect(useServerStore.getState().active()).toEqual({
        id: "s1",
        name: "Home",
        url: "http://localhost:4096",
      });
    });
  });

  describe("client", () => {
    it("returns null when no active server", () => {
      expect(useServerStore.getState().client()).toBeNull();
    });

    it("returns OpencodeClient when active", () => {
      useServerStore.setState({
        servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
        activeId: "s1",
      });
      const client = useServerStore.getState().client();
      expect(client).not.toBeNull();
      expect(client?.server.id).toBe("s1");
    });
  });

  describe("auth actions", () => {
    const primaryServer: ServerConfig = {
      id: "s1",
      name: "Home",
      url: "http://localhost:4096",
    };
    const secondaryServer: ServerConfig = {
      id: "s2",
      name: "Other",
      url: "http://localhost:5000",
    };

    it("does not clear auth state when logout fails", async () => {
      useServerStore.setState({
        servers: [primaryServer],
        activeId: "s1",
        authenticated: true,
        authUsername: "alice",
      });
      jest.spyOn(authService, "logout").mockRejectedValue(new Error("HTTP 403"));

      await expect(useServerStore.getState().logout()).rejects.toThrow("HTTP 403");

      expect(useServerStore.getState().authenticated).toBe(true);
      expect(useServerStore.getState().authUsername).toBe("alice");
    });

    it("ignores stale login responses after switching servers", async () => {
      const loginDeferred = createDeferred<{ ok: boolean; username?: string }>();
      useServerStore.setState({
        servers: [primaryServer, secondaryServer],
        activeId: "s1",
      });
      jest.spyOn(authService, "login").mockImplementation(
        () => loginDeferred.promise,
      );

      const loginPromise = useServerStore.getState().login("alice", "secret");
      await useServerStore.getState().setActive("s2");
      loginDeferred.resolve({ ok: true, username: "alice" });

      await expect(loginPromise).resolves.toBe(false);
      expect(useServerStore.getState().activeId).toBe("s2");
      expect(useServerStore.getState().authenticated).toBe(false);
      expect(useServerStore.getState().authUsername).toBeNull();
    });

    it("ignores stale auth checks after switching servers", async () => {
      const checkDeferred = createDeferred<{ authenticated: boolean; username?: string }>();
      useServerStore.setState({
        servers: [primaryServer, secondaryServer],
        activeId: "s1",
      });
      jest.spyOn(authService, "checkAuthStatus").mockImplementation(
        () => checkDeferred.promise,
      );

      const checkPromise = useServerStore.getState().checkAuth();
      await useServerStore.getState().setActive("s2");
      checkDeferred.resolve({ authenticated: true, username: "alice" });
      await checkPromise;

      expect(useServerStore.getState().activeId).toBe("s2");
      expect(useServerStore.getState().authenticated).toBe(false);
      expect(useServerStore.getState().authUsername).toBeNull();
    });
  });
});
