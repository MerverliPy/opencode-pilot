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
import { resolve, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createProxy } from "./proxy.js";
import { getConfiguredAuthToken, requireBearerAuth } from "./auth.js";
import { shouldRateLimitRequest } from "./rateLimit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uiDist = resolve(__dirname, "../../ui/dist");
import { broadcastPushNotification, createPushRouter, type PushConfig } from "./push.js";
import { createTunnelRouter } from "./tunnel.js";
import { attachTerminalWS, listSessions } from "./terminal.js";
import { createGitRouter } from "./git.js";
import { createMemoryRouter } from "./memory/memoryRouter.js";
import { setupChatRouter } from "./n9routerChat.js";
import { createSessionTagsRouter } from "./sessionTags.js";

const app = new Hono();

// ─── Global error handler ──────────────────────────────────────────────────────
app.onError((err, c) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[server] unhandled error:", message);
  return c.json({ error: "Internal Server Error", detail: message }, 500);
});

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
  if (!shouldRateLimitRequest(c.req.path)) {
    await next();
    return;
  }
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
    allowHeaders: ["Authorization", "Content-Type"],
  }),
);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ healthy: true, version: "0.2.0" }));

const authMiddleware = requireBearerAuth();

function protectRoute(path: string) {
  app.use(path, authMiddleware);
}

protectRoute("/terminal/*");
protectRoute("/git/*");
protectRoute("/tunnel/*");
protectRoute("/api/*");
protectRoute("/event");
protectRoute("/session");
protectRoute("/session/*");
protectRoute("/file");
protectRoute("/file/*");
protectRoute("/find");
protectRoute("/find/*");
protectRoute("/config/*");
protectRoute("/agent");
protectRoute("/agent/*");
protectRoute("/command");
protectRoute("/command/*");
protectRoute("/global/*");
protectRoute("/push/*");
protectRoute("/memory/*");
protectRoute("/api/chat/*");
protectRoute("/session-tags");
protectRoute("/session-tags/*");

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
    pilotAuthToken: getConfiguredAuthToken(),
  });
  app.all("/api/*", proxy);
  app.all("/event", proxy); // SSE events endpoint
  app.all("/session", proxy); // direct session create/list endpoints
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
app.get("/terminal/sessions", (c) => {
  try {
    return c.json(listSessions());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[terminal] sessions error:", message);
    return c.json({ error: "Failed to list sessions", detail: message }, 500);
  }
});

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
  app.use("/assets/*", serveStatic({ root: uiDist }));

  app.get("/*", async (c) => {
    const { readFileSync, existsSync, statSync } = await import("node:fs");
    const relativePath = c.req.path.slice(1);
    const filePath = relativePath ? resolve(uiDist, normalize(relativePath)) : "";
    // Path traversal guard: ensure resolved path stays within uiDist
    if (filePath && !(filePath.startsWith(uiDist + "/") || filePath === uiDist)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    if (filePath && existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = filePath.split(".").pop() ?? "";
      const mimes: Record<string, string> = {
        js: "text/javascript",
        css: "text/css",
        html: "text/html",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        png: "image/png",
        json: "application/json",
        map: "application/json",
        webmanifest: "application/manifest+json",
      };
      const content = readFileSync(filePath);
      return c.body(content, 200, {
        "Content-Type": mimes[ext] ?? "application/octet-stream",
      });
    }
    const html = readFileSync(resolve(uiDist, "index.html"), "utf-8");
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
export function setupN9RouterChat() {
  const chatRouter = setupChatRouter();
  app.route("/", chatRouter);
}

export function setupSessionTags() {
  const sessionTagsRouter = createSessionTagsRouter();
  app.route("/", sessionTagsRouter);
}

export function startServer(
  port: number = 3000,
  openCodeUrl?: string,
  username?: string,
  password?: string,
): void {
  setupN9RouterChat();
  setupSessionTags();
  setupProxy(openCodeUrl, username, password);
  setupGit();
  setupMemory();
  setupPush({
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    vapidSubject: process.env.VAPID_SUBJECT,
  });
  setupTunnel(port);
  setupStatic();
  const httpServer = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`✈  Pilot server listening on http://localhost:${info.port}`);
    if (openCodeUrl) {
      console.log(`↔  Proxying to OpenCode at ${openCodeUrl}`);
    }
  });
  // Attach terminal WebSocket bridge to the same HTTP server
  attachTerminalWS(httpServer as import("node:http").Server, getConfiguredAuthToken());
}
