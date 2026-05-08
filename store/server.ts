import { create } from 'zustand';
import {
  loadActiveServerId,
  loadServers,
  saveActiveServerId,
  saveServers,
  ServerConfig,
} from '@/services/auth';
import { OpencodeClient } from '@/services/api';

type ServerState = {
  servers: ServerConfig[];
  activeId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActive: (id: string | null) => Promise<void>;
  upsert: (server: ServerConfig) => Promise<void>;
  remove: (id: string) => Promise<void>;
  active: () => ServerConfig | null;
  client: () => OpencodeClient | null;
};

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeId: null,
  hydrated: false,

  hydrate: async () => {
    const [servers, activeId] = await Promise.all([loadServers(), loadActiveServerId()]);
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
}));
