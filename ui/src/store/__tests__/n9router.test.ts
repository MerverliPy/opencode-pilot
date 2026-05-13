import { useN9RouterStore } from "../n9router";

describe("useN9RouterStore", () => {
  beforeEach(() => {
    useN9RouterStore.setState({
      url: "",
      key: "",
      hydrated: false,
    });
    localStorage.clear();
  });

  it("has default empty state", () => {
    const state = useN9RouterStore.getState();
    expect(state.url).toBe("");
    expect(state.key).toBe("");
    expect(state.hydrated).toBe(false);
  });

  describe("hydrate", () => {
    it("loads config from secure store", async () => {
      localStorage.setItem(
        "pilot.n9router",
        JSON.stringify({ url: "http://n9router.local", key: "secret" }),
      );
      await useN9RouterStore.getState().hydrate();
      const state = useN9RouterStore.getState();
      expect(state.url).toBe("http://n9router.local");
      expect(state.key).toBe("secret");
      expect(state.hydrated).toBe(true);
    });

    it("handles missing config", async () => {
      await useN9RouterStore.getState().hydrate();
      expect(useN9RouterStore.getState().hydrated).toBe(true);
      expect(useN9RouterStore.getState().url).toBe("");
    });

    it("handles invalid JSON", async () => {
      localStorage.setItem("pilot.n9router", "bad");
      await useN9RouterStore.getState().hydrate();
      expect(useN9RouterStore.getState().url).toBe("");
      expect(useN9RouterStore.getState().key).toBe("");
    });
  });

  describe("setConfig", () => {
    it("updates state and persists", async () => {
      await useN9RouterStore
        .getState()
        .setConfig("http://n9router.local", "secret");
      const state = useN9RouterStore.getState();
      expect(state.url).toBe("http://n9router.local");
      expect(state.key).toBe("secret");
      expect(localStorage.getItem("pilot.n9router")).toBe(
        JSON.stringify({ url: "http://n9router.local", key: "secret" }),
      );
    });
  });

  describe("client", () => {
    it("returns null when url is empty", () => {
      expect(useN9RouterStore.getState().client()).toBeNull();
    });

    it("returns N9RouterClient when configured", () => {
      useN9RouterStore.setState({
        url: "http://n9router.local",
        key: "secret",
      });
      const client = useN9RouterStore.getState().client();
      expect(client).not.toBeNull();
    });
  });
});
