/**
 * Pilot Server — Hono-based backend.
 *
 * Proxies OpenCode API calls, serves the compiled Vite frontend as static
 * files, and will eventually host the terminal bridge, Web Push relay,
 * Cloudflare tunnel manager, and memory plugin.
 */
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createProxy } from "./proxy.js";

const app = new Hono();

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ healthy: true, version: "0.2.0" }));

// ─── OpenCode proxy (M2: full proxy implementation) ──────────────────────────────
export function setupProxy(
  openCodeUrl?: string,
  username?: string,
  password?: string,
) {
  if (!openCodeUrl) return;
  const proxy = createProxy({
    upstreamUrl: openCodeUrl,
    username,
    password,
  });
  app.all("/api/*", proxy);
  app.all("/event", proxy); // SSE events endpoint
  app.all("/session/*", proxy); // direct session endpoints
  app.all("/file", proxy); // file listing
  app.all("/file/*", proxy); // file operations
  app.all("/find", proxy); // text search
  app.all("/find/*", proxy);
  app.all("/config/*", proxy); // config endpoints
  app.all("/agent", proxy); // agents
  app.all("/agent/*", proxy);
  app.all("/command", proxy); // commands
  app.all("/command/*", proxy);
  app.all("/global/*", proxy); // global endpoints
}

// ─── Static frontend (M2: serve Vite build when available) ─────────────────────
// In production, serve the built UI from ../ui/dist. In dev, the Vite dev server
// handles the UI directly.
app.get("/", (c) => {
  // Simple landing page until static file serving is fully wired
  return c.text("Pilot server running. Frontend not yet built.");
});

export { app };

/**
 * Start the Pilot server.
 *
 * @param port - Port to listen on (default: 3000)
 * @param openCodeUrl - URL of the upstream OpenCode instance
 */
export function startServer(
  port: number = 3000,
  openCodeUrl?: string,
  username?: string,
  password?: string,
): void {
  setupProxy(openCodeUrl, username, password);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`✈  Pilot server listening on http://localhost:${info.port}`);
    if (openCodeUrl) {
      console.log(`↔  Proxying to OpenCode at ${openCodeUrl}`);
    }
  });
}
