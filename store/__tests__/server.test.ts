import * as SecureStore from "expo-secure-store";
import { useServerStore } from "@/store/server";
import type { ServerConfig } from "@/services/auth";

describe("useServerStore", () => {
  beforeEach(() => {
    useServerStore.setState({
      servers: [],
      activeId: null,
      hydrated: false,
    });
    jest.clearAllMocks();
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
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(servers))
        .mockResolvedValueOnce("s1");

      await useServerStore.getState().hydrate();
      const state = useServerStore.getState();
      expect(state.servers).toEqual(servers);
      expect(state.activeId).toBe("s1");
      expect(state.hydrated).toBe(true);
    });

    it("handles empty store", async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await useServerStore.getState().hydrate();
      expect(useServerStore.getState().hydrated).toBe(true);
    });
  });

  describe("setActive", () => {
    it("sets active server id and persists", async () => {
      await useServerStore.getState().setActive("s1");
      expect(useServerStore.getState().activeId).toBe("s1");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "pilot.activeServer",
        "s1",
      );
    });

    it("sets null active id and deletes", async () => {
      await useServerStore.getState().setActive(null);
      expect(useServerStore.getState().activeId).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "pilot.activeServer",
      );
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
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
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
});
