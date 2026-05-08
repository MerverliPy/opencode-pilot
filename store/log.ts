import { create } from 'zustand';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogEntry = {
  id: string;
  ts: number;
  level: LogLevel;
  tag: string;
  message: string;
  /** JSON-stringified extra payload, if any */
  data?: string;
};

const MAX_ENTRIES = 100;

type LogState = {
  entries: LogEntry[];
  addEntry: (entry: LogEntry) => void;
  clearLog: () => void;
};

export const useLogStore = create<LogState>((set) => ({
  entries: [],

  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries].slice(0, MAX_ENTRIES),
    })),

  clearLog: () => set({ entries: [] }),
}));
