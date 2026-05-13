/**
 * Cloudflare tunnel manager for the Pilot server.
 *
 * Spawns the `cloudflared` subprocess to create a public tunnel
 * and exposes the tunnel URL via a status endpoint.
 */
import { spawn, ChildProcess } from "node:child_process";
import { Hono } from "hono";

let tunnelProcess: ChildProcess | null = null;
let tunnelUrl: string | null = null;
let tunnelError: string | null = null;

function extractUrl(line: string): string | null {
  const match = line.match(/https:\/\/[a-zA-Z0-9\-]+\.trycloudflare\.com/);
  return match?.[0] ?? null;
}

export function startTunnel(localPort: number): void {
  if (tunnelProcess) return;

  tunnelError = null;
  tunnelUrl = null;

  tunnelProcess = spawn("cloudflared", [
    "tunnel",
    "--url",
    `http://localhost:${localPort}`,
  ]);

  tunnelProcess.stdout?.on("data", (data: Buffer) => {
    const line = data.toString();
    const url = extractUrl(line);
    if (url) tunnelUrl = url;
  });

  tunnelProcess.stderr?.on("data", (data: Buffer) => {
    const line = data.toString();
    const url = extractUrl(line);
    if (url) {
      tunnelUrl = url;
    } else {
      // Log non-URL stderr lines as potential errors
      tunnelError = line.trim().slice(0, 200);
    }
  });

  tunnelProcess.on("exit", (code) => {
    tunnelProcess = null;
    if (code !== 0 && code !== null) {
      tunnelError = `Tunnel exited with code ${code}`;
    }
  });

  tunnelProcess.on("error", (err) => {
    tunnelProcess = null;
    tunnelError = err.message;
  });
}

export function stopTunnel(): void {
  if (!tunnelProcess) return;
  tunnelProcess.kill("SIGTERM");
  tunnelProcess = null;
  tunnelUrl = null;
  tunnelError = null;
}

export function getTunnelStatus(): {
  active: boolean;
  url: string | null;
  error: string | null;
} {
  return {
    active: tunnelProcess !== null && !tunnelProcess.killed,
    url: tunnelUrl,
    error: tunnelError,
  };
}

export function createTunnelRouter(localPort: number): Hono {
  const router = new Hono();

  router.get("/status", (c) => c.json(getTunnelStatus()));

  router.post("/start", (c) => {
    startTunnel(localPort);
    return c.json({ success: true });
  });

  router.post("/stop", (c) => {
    stopTunnel();
    return c.json({ success: true });
  });

  return router;
}
