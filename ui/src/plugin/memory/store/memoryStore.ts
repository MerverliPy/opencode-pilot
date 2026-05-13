/**
 * Zustand store for the memory plugin (M5).
 *
 * All persistence is now via the Pilot server HTTP API (`/memory/*`).
 * The store holds an in-memory view of memories + config for the active server.
 */
import { create } from "zustand";
import { createMemoryApi } from "../../../services/memoryApi";
import type { ServerConfig } from "../../../services/auth";
import type { Memory, MemoryConfig } from "../db/schema";

type MemoryState = {
  /** Memories for the active server (most-recent first). */
  memories: Memory[];
  /** Count of non-archived memories (for the badge). */
  memoryCount: number;
  /** Config for the active server, null until first load. */
  config: MemoryConfig | null;
  /** True while background extraction is running. */
  isExtracting: boolean;
  /** The serverId these memories belong to, or null if not loaded. */
  loadedServerId: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Load memories + config from server for a given server. */
  loadForServer: (serverId: string, server: ServerConfig) => Promise<void>;

  /** Reload memories from server (without changing the serverId). */
  refreshMemories: (server: ServerConfig) => Promise<void>;

  /** Load config only (cheaper than a full reload). */
  loadConfig: (serverId: string, server: ServerConfig) => Promise<MemoryConfig>;

  /** Persist updated config to server and update store. */
  saveConfig: (config: MemoryConfig, server: ServerConfig) => Promise<void>;

  /** Append newly extracted memories to the list (avoids full reload). */
  addMemories: (memories: Memory[]) => void;

  /** Delete a memory by id from server and update store. */
  deleteMemory: (id: string, server: ServerConfig) => Promise<void>;

  /** Toggle pinned state. */
  pinMemory: (
    id: string,
    isPinned: boolean,
    server: ServerConfig,
  ) => Promise<void>;

  /** Archive a memory (soft-delete). */
  archiveMemory: (id: string, server: ServerConfig) => Promise<void>;

  /** Set the extracting flag. */
  setExtracting: (v: boolean) => void;
};

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  memoryCount: 0,
  config: null,
  isExtracting: false,
  loadedServerId: null,

  loadForServer: async (serverId, server) => {
    const api = createMemoryApi(server);
    const [{ memories, count }, config] = await Promise.all([
      api.listMemories(serverId),
      api.getConfig(serverId),
    ]);
    set({ memories, config, memoryCount: count, loadedServerId: serverId });
  },

  refreshMemories: async (server) => {
    const { loadedServerId } = get();
    if (!loadedServerId) return;
    const api = createMemoryApi(server);
    const { memories, count } = await api.listMemories(loadedServerId);
    set({ memories, memoryCount: count });
  },

  loadConfig: async (serverId, server) => {
    const api = createMemoryApi(server);
    const config = await api.getConfig(serverId);
    set({ config });
    return config;
  },

  saveConfig: async (config, server) => {
    const api = createMemoryApi(server);
    const saved = await api.saveConfig(config.serverId, config);
    set({ config: saved });
  },

  addMemories: (newMemories) => {
    set((s) => ({
      memories: [...newMemories, ...s.memories],
      memoryCount: s.memoryCount + newMemories.length,
    }));
  },

  deleteMemory: async (id, server) => {
    const { loadedServerId } = get();
    if (!loadedServerId) return;
    const api = createMemoryApi(server);
    await api.deleteMemory(loadedServerId, id);
    set((s) => ({
      memories: s.memories.filter((m) => m.id !== id),
      memoryCount: Math.max(0, s.memoryCount - 1),
    }));
  },

  pinMemory: async (id, isPinned, server) => {
    const { loadedServerId } = get();
    if (!loadedServerId) return;
    const api = createMemoryApi(server);
    await api.updateMemory(loadedServerId, id, { isPinned });
    set((s) => ({
      memories: s.memories.map((m) => (m.id === id ? { ...m, isPinned } : m)),
    }));
  },

  archiveMemory: async (id, server) => {
    const { loadedServerId } = get();
    if (!loadedServerId) return;
    const api = createMemoryApi(server);
    await api.updateMemory(loadedServerId, id, { isArchived: true });
    set((s) => ({
      memories: s.memories.filter((m) => m.id !== id),
      memoryCount: Math.max(0, s.memoryCount - 1),
    }));
  },

  setExtracting: (isExtracting) => set({ isExtracting }),
}));
