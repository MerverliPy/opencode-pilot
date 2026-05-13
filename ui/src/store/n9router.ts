import { create } from "zustand";
import { loadN9RouterConfig, saveN9RouterConfig } from "../services/auth";
import { N9RouterClient } from "../services/n9router";

type N9RouterState = {
  url: string;
  key: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setConfig: (url: string, key: string) => Promise<void>;
  /** Returns a client if url is configured, otherwise null. */
  client: () => N9RouterClient | null;
};

export const useN9RouterStore = create<N9RouterState>((set, get) => ({
  url: "",
  key: "",
  hydrated: false,

  hydrate: async () => {
    const cfg = await loadN9RouterConfig();
    set({ url: cfg.url, key: cfg.key, hydrated: true });
  },

  setConfig: async (url: string, key: string) => {
    set({ url, key });
    await saveN9RouterConfig({ url, key });
  },

  client: () => {
    const { url, key } = get();
    if (!url) return null;
    return new N9RouterClient(url, key);
  },
}));
