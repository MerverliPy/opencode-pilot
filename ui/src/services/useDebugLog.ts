/**
 * useDebugLog — React hook for collecting debug log entries.
 *
 * Maintains 100-entry FIFO, toggle, and clear.
 */

import { useCallback, useState } from "react";

export interface DebugEntry {
  id: string;
  method: string;
  path: string;
  status: number;
  latency: number;
  timestamp: number;
  model?: string;
  tokens?: number;
}

const MAX_ENTRIES = 100;

function generateId(): string {
  return `debug_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function useDebugLog() {
  const [entries, setEntries] = useState<DebugEntry[]>([]);
  const [enabled, setEnabled] = useState(true);

  const addEntry = useCallback(
    (entry: Omit<DebugEntry, "id" | "timestamp">) => {
      if (!enabled) return;
      const newEntry: DebugEntry = {
        ...entry,
        id: generateId(),
        timestamp: Date.now(),
      };
      setEntries((prev) => {
        const next = [...prev, newEntry];
        if (next.length > MAX_ENTRIES) {
          return next.slice(next.length - MAX_ENTRIES);
        }
        return next;
      });
    },
    [enabled],
  );

  const clearLog = useCallback(() => {
    setEntries([]);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return { entries, addEntry, clearLog, toggle, enabled };
}
