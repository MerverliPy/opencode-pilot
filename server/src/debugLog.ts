/**
 * debugLog — Hono middleware for debug request logging.
 *
 * Logs method, path, status, latency per request.
 * Never logs credentials, headers, or request bodies.
 */

import { createMiddleware } from "hono/factory";
import type { Context, Next } from "hono";

export interface DebugEntry {
  method: string;
  path: string;
  status: number;
  latency: number;
  timestamp: number;
}

/**
 * Middleware: logs request method/path/status/latency after handler completes.
 */
export const debugLogMiddleware = createMiddleware(
  async (c: Context, next: Next) => {
    const start = Date.now();
    c.set("debugStart", start);
    await next();
    const elapsed = Date.now() - start;
    console.log(
      `[debug] ${c.req.method} ${c.req.path} \u2192 ${c.res.status} ${elapsed}ms`,
    );
  },
);

/**
 * Collect a DebugEntry from the current context.
 */
export function collectDebugEntry(c: Context): DebugEntry {
  const start = (c.get("debugStart") as number) ?? Date.now();
  return {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    latency: Date.now() - start,
    timestamp: Date.now(),
  };
}
