/**
 * Pilot Server — Hono-based backend.
 *
 * Proxies OpenCode API calls, serves the compiled Vite frontend as static
 * files, and will eventually host the terminal bridge, Web Push relay,
 * Cloudflare tunnel manager, and memory plugin.
 */
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { createProxy } from "./proxy.js";
import { createPushRouter, type PushConfig } from "./push.js";
import { createTunnelRouter } from "./tunnel.js";
import { attachTerminalWS, listSessions } from "./terminal.js";
import { createGitRouter } from "./git.js";
import { createMemoryRouter } from "./memory/memoryRouter.js";

const app = new Hono();

// ─── Body size limit (P9) ──────────────────────────────────────────────────────
const bodyLimitMb = parseInt(process.env.BODY_LIMIT_SIZE ?? "10", 10);
app.use(
  bodyLimit({
    maxSize: bodyLimitMb * 1024 * 1024,
    onError: (c) => {
      return c.json({ error: "Payload too large" }, 413);
    },
  }),
);

// ─── Rate limiting (P2) ─────────────────────────────────────────────────────────
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10);
const rateLimitWindow = 60_000; // 1 minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

app.use(async (c, next) => {
  const ip = c.req.header("x-forwarded-for") ?? "local";
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + rateLimitWindow };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > rateLimitMax) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }
  await next();
});

// ─── CORS (P3) ─────────────────────────────────────────────────────────────────
const corsOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);

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

// ─── Static frontend (P4: serve Vite build) ────────────────────────────────────
// Called from startServer() after proxy routes to ensure correct precedence.
export function setupStatic() {
  app.use("/assets/*", serveStatic({ root: "ui/dist" }));

  // Try serving any existing file (registerSW.js, sw.js, workbox-*.js, etc.),
  // then fall back to index.html for SPA routes.
  app.get("/*", async (c, next) => {
    const handler = serveStatic({ root: "ui/dist" });
    const res = await handler(c, next);
    if (res) return res;

    const { readFile } = await import("node:fs/promises");
    const html = await readFile("ui/dist/index.html", "utf-8");
    return c.html(html);
  });
}

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
  setupStatic();
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
