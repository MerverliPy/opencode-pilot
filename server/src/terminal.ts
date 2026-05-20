/**
 * Terminal WebSocket bridge.
 *
 * Spawns PTY sessions via node-pty and bridges them to WebSocket clients.
 * Attach to an existing Node.js HTTP server via `attachTerminalWS(server)`.
 *
 * Protocol (client → server):
 *   - string data  → written directly to the pty
 *   - JSON { type: 'resize', cols: number, rows: number } → pty.resize()
 *   - JSON { type: 'kill' } → pty.kill()
 *
 * Protocol (server → client):
 *   - string data  → pty output forwarded verbatim
 */
import * as pty from "node-pty";
import { WebSocketServer, type WebSocket } from "ws";
import type { IncomingMessage, Server } from "node:http";
import { isAuthorizedNodeRequest } from "./auth.js";
import { randomUUID } from "node:crypto";

interface PtySession {
  id: string;
  pty: pty.IPty;
  created: number;
  clients: Set<WebSocket>;
  writeQueues?: Map<WebSocket, string[]>;  // C17
  heartbeatTimer?: ReturnType<typeof setInterval>;  // C19
}

const sessions = new Map<string, PtySession>();

/** Create a new PTY session and return its ID. */
export function createPtySession(): string {
  const id = randomUUID();
  const shell = process.env.SHELL ?? "/bin/bash";
  const safeEnvVars = ["TERM", "SHELL", "PATH", "HOME", "LANG"];
  const filteredEnv: Record<string, string> = {};
  for (const key of safeEnvVars) {
    if (process.env[key]) filteredEnv[key] = process.env[key]!;
  }
  const proc = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: filteredEnv,
  });

  const session: PtySession = {
    id,
    pty: proc,
    created: Date.now(),
    clients: new Set(),
  };

  const HEARTBEAT_INTERVAL = 30_000;

  // C17: Per-client write queues to prevent silent data loss under backpressure
  const MAX_QUEUE_SIZE = 100;
  const clientWriteQueues = new Map<WebSocket, string[]>();
  session.writeQueues = clientWriteQueues;

  const flushWriteQueue = (ws: WebSocket) => {
    const queue = clientWriteQueues.get(ws);
    if (!queue || queue.length === 0) return;
    while (queue.length > 0 && ws.readyState === ws.OPEN && ws.bufferedAmount < 65536) {
      const next = queue.shift()!;
      try {
        ws.send(next);
      } catch {
        session.clients.delete(ws);
        clientWriteQueues.delete(ws);
        return;
      }
    }
  };

  const heartbeatTimer = setInterval(() => {
    for (const ws of [...session.clients]) {
      if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
        session.clients.delete(ws);
        clientWriteQueues.delete(ws);
      } else {
        flushWriteQueue(ws);  // C17: drain queued writes
      }
    }
  }, HEARTBEAT_INTERVAL);
  session.heartbeatTimer = heartbeatTimer;

  proc.onData((data: string) => {
    for (const ws of [...session.clients]) {
      if (ws.readyState !== ws.OPEN) continue;
      if (ws.bufferedAmount < 65536) {
        try {
          ws.send(data);
        } catch {
          session.clients.delete(ws);
          clientWriteQueues.delete(ws);
        }
      } else {
        const queue = clientWriteQueues.get(ws) ?? [];
        if (queue.length < MAX_QUEUE_SIZE) {
          queue.push(data);
          clientWriteQueues.set(ws, queue);
        } else {
          console.warn(`terminal: dropping data for session ${id} — client write queue full (${MAX_QUEUE_SIZE} entries)`);
        }
      }
    }
  });

  proc.onExit(({ exitCode }) => {
    // Notify clients and clean up
    for (const ws of [...session.clients]) {
      if (ws.readyState === ws.OPEN) {
        // C18: Protected ws.send with try/catch
        try {
          ws.send(JSON.stringify({ type: "exit", code: exitCode }));
        } catch { /* client gone */ }
        try {
          ws.close();
        } catch { /* already closing */ }
      }
    }
    clearInterval(session.heartbeatTimer);
    sessions.delete(id);
  });

  sessions.set(id, session);
  return id;
}

/** List active terminal sessions (metadata only). */
export function listSessions(): Array<{ id: string; created: number }> {
  return Array.from(sessions.values()).map((s) => ({
    id: s.id,
    created: s.created,
  }));
}

/** Kill a PTY session by ID. */
export function killSession(id: string): boolean {
  const session = sessions.get(id);
  if (!session) return false;
  // C19: Clear heartbeat timer to prevent leak
  if (session.heartbeatTimer) {
    clearInterval(session.heartbeatTimer);
  }
  try {
    session.pty.kill();
  } catch {
    // pty may already be dead
  }
  sessions.delete(id);
  return true;
}

/**
 * Attach a WebSocket server to the provided HTTP server.
 * Handles connections to `/terminal/ws?id=<sessionId>`.
 * If no session ID is provided, a new PTY session is created.
 */
export function attachTerminalWS(
  server: Server,
  authToken?: string | null,
): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    if (!url.pathname.startsWith("/terminal/ws")) {
      socket.destroy();
      return;
    }

    if (!isAuthorizedNodeRequest(req, authToken ?? null)) {
      socket.write(
        "HTTP/1.1 401 Unauthorized\r\n" +
          "Content-Type: application/json\r\n" +
          "WWW-Authenticate: Bearer\r\n" +
          "Connection: close\r\n\r\n" +
          JSON.stringify({ error: "Unauthorized" }),
      );
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    let sessionId = url.searchParams.get("id");

    // Auto-create session if no ID provided
    if (!sessionId || !sessions.has(sessionId)) {
      sessionId = createPtySession();
    }

    const session = sessions.get(sessionId);
    if (!session) {
      // C18: Protected ws.send with try/catch
      try {
        ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
      } catch { /* client gone */ }
      try {
        ws.close();
      } catch { /* already closing */ }
      return;
    }

    session.clients.add(ws);

    // Send session ID so client knows which session was created
    // C18: Protected ws.send with try/catch
    try {
      ws.send(JSON.stringify({ type: "session", id: sessionId }));
    } catch { /* client gone */ }

    ws.on("message", (raw: Buffer | string) => {
      const msg = raw.toString();
      if (msg.length > 1_048_576) return; // 1MB max

      // Try to parse as control message first
      try {
        const parsed = JSON.parse(msg) as {
          type: string;
          cols?: number;
          rows?: number;
        };
        if (parsed.type === "resize" && parsed.cols && parsed.rows) {
          session.pty.resize(parsed.cols, parsed.rows);
          return;
        }
        if (parsed.type === "kill") {
          killSession(sessionId!);
          ws.close();
          return;
        }
      } catch {
        // Not JSON — treat as raw terminal input
      }

      if (session.pty) {
        session.pty.write(msg);
      }
    });

    ws.on("close", () => {
      session.clients.delete(ws);
      session.writeQueues?.delete(ws);  // C17: clean up write queue
    });

    ws.on("error", (err) => {
      console.error("[terminal] WebSocket error:", err);
      session.clients.delete(ws);
      session.writeQueues?.delete(ws);  // C17: clean up write queue
    });
  });
}
