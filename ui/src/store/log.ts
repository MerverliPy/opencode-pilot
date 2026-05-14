import { create } from 'zustand';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  id: string;
  ts: number;
  level: LogLevel;
  tag: string;
  message: string;
  data?: string;
};

const MAX_ENTRIES = 500;
const STORAGE_KEY = "pilot-debug-log";

function loadPersisted(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LogEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function persist(entries: LogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // storage full — silently drop
  }
}

type LogState = {
  entries: LogEntry[];
  addEntry: (entry: LogEntry) => void;
  clearLog: () => void;
};

export const useLogStore = create<LogState>((set) => ({
  entries: loadPersisted(),

  addEntry: (entry) =>
    set((state) => {
      const entries = [entry, ...state.entries].slice(0, MAX_ENTRIES);
      persist(entries);
      return { entries };
    }),

  clearLog: () => {
    persist([]);
    set({ entries: [] });
  },
}));
