/**
 * Pilot Server — Hono-based backend.
 *
 * Proxies OpenCode API calls, serves the compiled Vite frontend as static
 * files, and will eventually host the terminal bridge, Web Push relay,
 * Cloudflare tunnel manager, and memory plugin.
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import type { ServerConfig } from "@MerverliPy/pilot-shared";

const app = new Hono();

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ healthy: true, version: "0.2.0" }));

// ─── OpenCode proxy (placeholder — M2 will implement full proxy) ───────────────
app.all("/api/*", async (c) => {
  return c.json({ error: "Proxy not yet implemented" }, 501);
});

// ─── Static frontend (placeholder — M2 will serve Vite build) ──────────────────
app.get("/", (c) => c.text("Pilot server running. Frontend not yet built."));

export { app };

/**
 * Start the Pilot server.
 *
 * @param port - Port to listen on (default: 3000)
 * @param openCodeUrl - URL of the upstream OpenCode instance
 */
export function startServer(port: number = 3000, openCodeUrl?: string): void {
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`✈  Pilot server listening on http://localhost:${info.port}`);
    if (openCodeUrl) {
      console.log(`↔  Proxying to OpenCode at ${openCodeUrl}`);
    }
  });
}
