/**
 * Structured logger with localStorage persistence and global error capture.
 *
 * Usage:
 *   import { log, downloadDebugLog, initLogCapture } from '@/services/logger';
 *   log.error('api', 'request failed', { status: 404 });
 *   initLogCapture(); // call once at app startup
 */
import { useLogStore } from "../store/log";
import type { LogEntry, LogLevel } from "../store/log";

let _seq = 0;

function serialize(extra: unknown): string | undefined {
  if (extra === undefined || extra === null) return undefined;
  if (typeof extra === "string") return extra;
  try {
    return JSON.stringify(extra, null, 2);
  } catch {
    return String(extra);
  }
}

function addEntry(
  level: LogLevel,
  tag: string,
  message: string,
  extra?: unknown,
): void {
  const id = `${Date.now()}-${++_seq}`;
  const entry: LogEntry = {
    id,
    ts: Date.now(),
    level,
    tag,
    message,
    data: serialize(extra),
  };

  useLogStore.getState().addEntry(entry);

  const prefix = `[pilot:${tag}] ${message}`;
  if (level === "error") {
    console.error(prefix, extra ?? "");
  } else if (level === "warn") {
    console.warn(prefix, extra ?? "");
  } else {
    console.log(prefix, extra ?? "");
  }
}

export const log = {
  debug: (tag: string, message: string, extra?: unknown) =>
    addEntry("debug", tag, message, extra),
  info: (tag: string, message: string, extra?: unknown) =>
    addEntry("info", tag, message, extra),
  warn: (tag: string, message: string, extra?: unknown) =>
    addEntry("warn", tag, message, extra),
  error: (tag: string, message: string, extra?: unknown) =>
    addEntry("error", tag, message, extra),
};

function fmt(entry: LogEntry): string {
  const ts = new Date(entry.ts).toISOString();
  return `[${ts}] ${entry.level.padEnd(5)} [${entry.tag}] ${entry.message}${entry.data ? `\n  ${entry.data}` : ""}`;
}

export function downloadDebugLog(): void {
  const entries = useLogStore.getState().entries;
  const body = entries.map(fmt).join("\n");
  const blob = new Blob([`Pilot Debug Log — ${new Date().toISOString()}\n${"=".repeat(60)}\n${body}`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pilot-debug-${Date.now()}.log`;
  a.click();
  URL.revokeObjectURL(url);
}

export function initLogCapture(): void {
  window.addEventListener("error", (event) => {
    const msg = event.error?.message ?? event.message ?? String(event.error);
    addEntry("error", "uncaught", msg, { stack: event.error?.stack, filename: event.filename, lineno: event.lineno });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const err = event.reason;
    const msg = err?.message ?? String(err);
    addEntry("error", "unhandled", msg, { stack: err?.stack });
  });
}
