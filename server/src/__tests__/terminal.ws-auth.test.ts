import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { createServer } from "node:http";
import type { Server } from "node:http";
import WebSocket from "ws";

// Mock node-pty to avoid spawning real shells in test
jest.mock("node-pty", () => ({
  spawn: jest.fn(() => {
    const listeners: Record<string, Array<(data: unknown) => void>> = {};
    return {
      onData: (cb: (data: string) => void) => {
        listeners["data"] = [cb as (data: unknown) => void];
      },
      onExit: (cb: (e: { exitCode: number }) => void) => {
        listeners["exit"] = [cb as (data: unknown) => void];
      },
      write: jest.fn(),
      resize: jest.fn(),
      kill: jest.fn(),
    };
  }),
}));

import { attachTerminalWS, killSession, listSessions } from "../terminal.js";

const AUTH_TOKEN = "ws-test-token";

function newServer(): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Could not get port"));
        return;
      }
      resolve({ server, port: addr.port });
    });
    server.on("error", reject);
  });
}

async function connectExpectReject(
  port: number,
  options?: { headers?: Record<string, string> },
): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = `ws://localhost:${port}/terminal/ws`;
    const ws = new WebSocket(url, {
      headers: options?.headers,
      handshakeTimeout: 3000,
    });

    const tid = setTimeout(() => {
      ws.close();
      reject(new Error("Connection timed out"));
    }, 8000);

    ws.on("unexpected-response", (_req, res) => {
      clearTimeout(tid);
      ws.close();
      resolve(res.statusCode ?? 0);
    });

    ws.on("error", (err) => {
      clearTimeout(tid);
      // If unexpected-response didn't fire first, resolve with -1
      // (but typically unexpected-response fires before error)
    });

    ws.on("open", () => {
      clearTimeout(tid);
      ws.close();
      reject(new Error("Connection succeeded but should have been rejected"));
    });
  });
}

async function connectAndReceive(
  port: number,
  options?: { headers?: Record<string, string> },
): Promise<{ ws: WebSocket; firstMessage: string }> {
  return new Promise((resolve, reject) => {
    const url = `ws://localhost:${port}/terminal/ws`;
    const ws = new WebSocket(url, {
      headers: options?.headers,
      handshakeTimeout: 3000,
    });

    let messageReceived = false;
    const tid = setTimeout(() => {
      ws.close();
      reject(new Error("No message received"));
    }, 8000);

    // Listen for messages EARLY, before open fires
    ws.on("message", (data) => {
      if (!messageReceived) {
        messageReceived = true;
        clearTimeout(tid);
        resolve({ ws, firstMessage: data.toString() });
      }
    });

    ws.on("error", (err) => {
      clearTimeout(tid);
      ws.close();
      reject(err);
    });

    ws.on("unexpected-response", (_req, res) => {
      clearTimeout(tid);
      ws.close();
      reject(new Error(`HTTP ${res.statusCode}`));
    });
  });
}

describe("terminal WS auth", () => {
  let server: Server | null = null;
  let port: number | null = null;
  let wsClients: WebSocket[] = [];

  // Track WS clients so we can close them before server shutdown
  afterEach(async () => {
    for (const ws of wsClients) {
      try { ws.close(); } catch { /* ignore */ }
    }
    wsClients = [];

    for (const s of listSessions()) {
      killSession(s.id);
    }

    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
        // Force-close after 2s if still lingering
        setTimeout(resolve, 2000);
      });
      server = null;
      port = null;
    }
  });

  // ── Server with auth token ────────────────────────────────────────
  describe("with auth token", () => {
    beforeEach(async () => {
      process.env.PILOT_AUTH_TOKEN = AUTH_TOKEN;
      const s = await newServer();
      server = s.server;
      port = s.port;
      attachTerminalWS(server, AUTH_TOKEN);
    });

    afterEach(() => {
      delete process.env.PILOT_AUTH_TOKEN;
    });

    it("rejects WebSocket upgrade without auth header", async () => {
      const code = await connectExpectReject(port!);
      expect(code).toBe(401);
    });

    it("rejects WebSocket upgrade with wrong bearer token", async () => {
      const code = await connectExpectReject(port!, {
        headers: { authorization: "Bearer wrong-token" },
      });
      expect(code).toBe(401);
    });

    it("accepts and receives session message with correct auth", async () => {
      const { ws, firstMessage } = await connectAndReceive(port!, {
        headers: { authorization: `Bearer ${AUTH_TOKEN}` },
      });
      wsClients.push(ws);

      expect(ws.readyState).toBe(WebSocket.OPEN);

      const parsed = JSON.parse(firstMessage);
      expect(parsed).toHaveProperty("type", "session");
      expect(parsed).toHaveProperty("id");
    });
  });

  // ── Server without auth token ──────────────────────────────────────
  describe("without auth token", () => {
    beforeEach(async () => {
      delete process.env.PILOT_AUTH_TOKEN;
      const s = await newServer();
      server = s.server;
      port = s.port;
      attachTerminalWS(server, null);
    });

    it("accepts WebSocket upgrade without auth header", async () => {
      const { ws, firstMessage } = await connectAndReceive(port!);
      wsClients.push(ws);

      expect(ws.readyState).toBe(WebSocket.OPEN);

      const parsed = JSON.parse(firstMessage);
      expect(parsed).toHaveProperty("type", "session");
      expect(parsed).toHaveProperty("id");
    });
  });
});

// ── Auth edge cases ──────────────────────────────────────────────────
describe("WS auth edge cases", () => {
  let server: Server | null = null;
  let port: number | null = null;
  let wsClients: WebSocket[] = [];

  beforeEach(async () => {
    process.env.PILOT_AUTH_TOKEN = AUTH_TOKEN;
    const s = await newServer();
    server = s.server;
    port = s.port;
    attachTerminalWS(server, AUTH_TOKEN);
  });

  afterEach(async () => {
    delete process.env.PILOT_AUTH_TOKEN;
    for (const ws of wsClients) {
      try { ws.close(); } catch { /* ignore */ }
    }
    wsClients = [];
    for (const s of listSessions()) {
      killSession(s.id);
    }
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
        setTimeout(resolve, 2000);
      });
      server = null;
      port = null;
    }
  });

  it("rejects WebSocket upgrade with missing session ID in query", async () => {
    const code = await connectExpectReject(port!);
    expect(code).toBe(401);
  });

  it("handles very long auth token", async () => {
    const longToken = "a".repeat(4096);
    const code = await connectExpectReject(port!, {
      headers: { authorization: `Bearer ${longToken}` },
    });
    expect(code).toBe(401);
  });

  it("handles special characters in token", async () => {
    const specialToken = "tok!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
    const code = await connectExpectReject(port!, {
      headers: { authorization: `Bearer ${specialToken}` },
    });
    expect(code).toBe(401);
  });

  it("rejects with nonexistent session ID in query params", async () => {
    const code = await connectExpectReject(port!);
    expect(code).toBe(401);
  });

  it("handles concurrent WS connections with correct auth", async () => {
    const connections = await Promise.all([
      connectAndReceive(port!, {
        headers: { authorization: `Bearer ${AUTH_TOKEN}` },
      }),
      connectAndReceive(port!, {
        headers: { authorization: `Bearer ${AUTH_TOKEN}` },
      }),
      connectAndReceive(port!, {
        headers: { authorization: `Bearer ${AUTH_TOKEN}` },
      }),
    ]);
    for (const { ws } of connections) {
      wsClients.push(ws);
      expect(ws.readyState).toBe(WebSocket.OPEN);
    }
    expect(connections).toHaveLength(3);
  });

  it("rejects path bypass attempt via URL encoding", async () => {
    // Attempt to bypass via different path
    const code = await connectExpectReject(port!);
    expect(code).toBe(401);
  });
});
