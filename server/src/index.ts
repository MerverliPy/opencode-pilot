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
import { createPushRouter, type PushConfig } from "./push.js";
import { createTunnelRouter } from "./tunnel.js";
import { attachTerminalWS, listSessions } from "./terminal.js";
import { createGitRouter } from "./git.js";
import { createMemoryRouter } from "./memory/memoryRouter.js";

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

// ─── Web Push (M3) ─────────────────────────────────────────────────────────────
export function setupPush(cfg: PushConfig) {
  const pushRouter = createPushRouter(cfg);
  app.route("/push", pushRouter);
}

// ─── Cloudflare Tunnel (M3) ────────────────────────────────────────────────────
export function setupTunnel(localPort: number) {
  const tunnelRouter = createTunnelRouter(localPort);
  app.route("/tunnel", tunnelRouter);
}

// ─── Terminal WebSocket bridge (M4) ────────────────────────────────────────────
// Terminal sessions API — WebSocket connections handled by attachTerminalWS()
app.get("/terminal/sessions", (c) => c.json(listSessions()));

// ─── Git routes (M4) ──────────────────────────────────────────────────────────
export function setupGit(cwd?: string) {
  const gitRouter = createGitRouter(cwd);
  app.route("/git", gitRouter);
}

// ─── Memory plugin (M5) ───────────────────────────────────────────────────────
export function setupMemory() {
  const memoryRouter = createMemoryRouter();
  app.route("/memory", memoryRouter);
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
  setupPush({
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidSubject: process.env.VAPID_SUBJECT,
  });
  setupTunnel(port);
  setupGit();
  setupMemory();
  const httpServer = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`✈  Pilot server listening on http://localhost:${info.port}`);
    if (openCodeUrl) {
      console.log(`↔  Proxying to OpenCode at ${openCodeUrl}`);
    }
  });
  // Attach terminal WebSocket bridge to the same HTTP server
  attachTerminalWS(httpServer as import("node:http").Server);
}
