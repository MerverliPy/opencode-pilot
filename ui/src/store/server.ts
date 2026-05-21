import { create } from "zustand";
import {
  loadActiveServerId,
  loadServers,
  saveActiveServerId,
  saveServers,
  login as authLogin,
  logout as authLogout,
  checkAuthStatus,
} from "../services/auth";
import type { ServerConfig } from "@pilot-shared/types";
import { OpencodeClient } from "../services/api";

type ServerState = {
  servers: ServerConfig[];
  activeId: string | null;
  hydrated: boolean;
  authenticated: boolean;
  authUsername: string | null;
  hydrate: () => Promise<void>;
  setActive: (id: string | null) => Promise<void>;
  upsert: (server: ServerConfig) => Promise<void>;
  remove: (id: string) => Promise<void>;
  active: () => ServerConfig | null;
  client: () => OpencodeClient | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeId: null,
  hydrated: false,
  authenticated: false,
  authUsername: null,

  hydrate: async () => {
    const [servers, activeId] = await Promise.all([
      loadServers(),
      loadActiveServerId(),
    ]);
    set({ servers, activeId, hydrated: true });
  },

  setActive: async (id) => {
    set({ activeId: id });
    await saveActiveServerId(id);
  },

  upsert: async (server) => {
    const next = [...get().servers.filter((s) => s.id !== server.id), server];
    set({ servers: next });
    await saveServers(next);
  },

  remove: async (id) => {
    const next = get().servers.filter((s) => s.id !== id);
    set({ servers: next });
    await saveServers(next);
    if (get().activeId === id) {
      await get().setActive(null);
    }
  },

  active: () => {
    const { servers, activeId } = get();
    return servers.find((s) => s.id === activeId) ?? null;
  },

  client: () => {
    const a = get().active();
    return a ? new OpencodeClient(a) : null;
  },

  login: async (username, password) => {
    const server = get().active();
    if (!server) return false;
    const res = await authLogin(server.url, username, password);
    if (res.ok) {
      set({ authenticated: true, authUsername: res.username ?? username });
      return true;
    }
    return false;
  },

  logout: async () => {
    const server = get().active();
    if (server) {
      await authLogout(server.url);
    }
    set({ authenticated: false, authUsername: null });
  },

  checkAuth: async () => {
    const server = get().active();
    if (!server) return;
    const res = await checkAuthStatus(server.url);
    set({ authenticated: res.authenticated, authUsername: res.username ?? null });
  },
}));
