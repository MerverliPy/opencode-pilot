/**
 * Zustand store for the memory plugin.
 * Manages the in-memory view of memories, config, and extraction status
 * for the currently-active server.
 */
import { create } from 'zustand';
import type { Memory, MemoryConfig } from '../db/schema';
import {
  getMemoriesByServer,
  getMemoryConfig,
  saveMemoryConfig,
  deleteMemory as dbDeleteMemory,
  updateMemory,
  countMemories,
} from '../db/MemoryRepository';

type MemoryState = {
  /** Memories for the active server (most-recent first). */
  memories: Memory[];
  /** Count of non-archived memories (for the badge). */
  memoryCount: number;
  /** Config for the active server, null until first load. */
  config: MemoryConfig | null;
  /** True while the background extraction is running. */
  isExtracting: boolean;
  /** The serverId these memories belong to, or null if not loaded. */
  loadedServerId: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Load memories + config from DB for a given server. */
  loadForServer: (serverId: string) => Promise<void>;

  /** Reload memories from DB (without changing the serverId). */
  refreshMemories: () => Promise<void>;

  /** Load config only (cheaper than a full reload). */
  loadConfig: (serverId: string) => Promise<MemoryConfig>;

  /** Persist updated config to DB and update store. */
  saveConfig: (config: MemoryConfig) => Promise<void>;

  /** Append newly extracted memories to the list (avoids full DB reload). */
  addMemories: (memories: Memory[]) => void;

  /** Delete a memory by id from DB and update store. */
  deleteMemory: (id: string) => Promise<void>;

  /** Toggle pinned state. */
  pinMemory: (id: string, isPinned: boolean) => Promise<void>;

  /** Archive a memory (soft-delete). */
  archiveMemory: (id: string) => Promise<void>;

  /** Set the extracting flag. */
  setExtracting: (v: boolean) => void;
};

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  memoryCount: 0,
  config: null,
  isExtracting: false,
  loadedServerId: null,

  loadForServer: async (serverId) => {
    const [memories, config, count] = await Promise.all([
      getMemoriesByServer(serverId),
      getMemoryConfig(serverId),
      countMemories(serverId),
    ]);
    set({ memories, config, memoryCount: count, loadedServerId: serverId });
  },

  refreshMemories: async () => {
    const { loadedServerId } = get();
    if (!loadedServerId) return;
    const [memories, count] = await Promise.all([
      getMemoriesByServer(loadedServerId),
      countMemories(loadedServerId),
    ]);
    set({ memories, memoryCount: count });
  },

  loadConfig: async (serverId) => {
    const config = await getMemoryConfig(serverId);
    set({ config });
    return config;
  },

  saveConfig: async (config) => {
    await saveMemoryConfig(config);
    set({ config });
  },

  addMemories: (newMemories) => {
    set((s) => ({
      memories: [...newMemories, ...s.memories],
      memoryCount: s.memoryCount + newMemories.length,
    }));
  },

  deleteMemory: async (id) => {
    await dbDeleteMemory(id);
    set((s) => ({
      memories: s.memories.filter((m) => m.id !== id),
      memoryCount: Math.max(0, s.memoryCount - 1),
    }));
  },

  pinMemory: async (id, isPinned) => {
    await updateMemory(id, { isPinned });
    set((s) => ({
      memories: s.memories.map((m) => (m.id === id ? { ...m, isPinned } : m)),
    }));
  },

  archiveMemory: async (id) => {
    await updateMemory(id, { isArchived: true });
    set((s) => ({
      memories: s.memories.filter((m) => m.id !== id),
      memoryCount: Math.max(0, s.memoryCount - 1),
    }));
  },

  setExtracting: (isExtracting) => set({ isExtracting }),
}));
