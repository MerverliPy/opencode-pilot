import * as SecureStore from "expo-secure-store";
import { useN9RouterStore } from "@/store/n9router";

describe("useN9RouterStore", () => {
  beforeEach(() => {
    useN9RouterStore.setState({
      url: "",
      key: "",
      hydrated: false,
    });
    jest.clearAllMocks();
  });

  it("has default empty state", () => {
    const state = useN9RouterStore.getState();
    expect(state.url).toBe("");
    expect(state.key).toBe("");
    expect(state.hydrated).toBe(false);
  });

  describe("hydrate", () => {
    it("loads config from secure store", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({ url: "http://n9router.local", key: "secret" }),
      );
      await useN9RouterStore.getState().hydrate();
      const state = useN9RouterStore.getState();
      expect(state.url).toBe("http://n9router.local");
      expect(state.key).toBe("secret");
      expect(state.hydrated).toBe(true);
    });

    it("handles missing config", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      await useN9RouterStore.getState().hydrate();
      expect(useN9RouterStore.getState().hydrated).toBe(true);
      expect(useN9RouterStore.getState().url).toBe("");
    });

    it("handles invalid JSON", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("bad");
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
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "pilot.n9router",
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
