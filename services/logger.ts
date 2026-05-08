/**
 * Lightweight structured logger.
 * Entries are stored in the log Zustand store (ring-buffer, 100 max) AND
 * mirrored to the metro console so they appear in the bundler output.
 *
 * Usage:
 *   import { log } from '@/services/logger';
 *   log.error('api', 'request failed', { status: 404, body: '...' });
 */
import { useLogStore } from '@/store/log';
import type { LogLevel } from '@/store/log';

let _seq = 0;

function serialize(extra: unknown): string | undefined {
  if (extra === undefined || extra === null) return undefined;
  if (typeof extra === 'string') return extra;
  try {
    return JSON.stringify(extra, null, 2);
  } catch {
    return String(extra);
  }
}

function addEntry(level: LogLevel, tag: string, message: string, extra?: unknown): void {
  const id = `${Date.now()}-${++_seq}`;
  const entry = {
    id,
    ts: Date.now(),
    level,
    tag,
    message,
    data: serialize(extra),
  };

  // Write to store (ring-buffer; works even before React mounts)
  useLogStore.getState().addEntry(entry);

  // Mirror to metro so logs show up in the bundler terminal
  const prefix = `[pilot:${tag}] ${message}`;
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(prefix, extra ?? '');
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(prefix, extra ?? '');
  } else {
    // eslint-disable-next-line no-console
    console.log(prefix, extra ?? '');
  }
}

export const log = {
  debug: (tag: string, message: string, extra?: unknown) =>
    addEntry('debug', tag, message, extra),
  info: (tag: string, message: string, extra?: unknown) =>
    addEntry('info', tag, message, extra),
  warn: (tag: string, message: string, extra?: unknown) =>
    addEntry('warn', tag, message, extra),
  error: (tag: string, message: string, extra?: unknown) =>
    addEntry('error', tag, message, extra),
};
