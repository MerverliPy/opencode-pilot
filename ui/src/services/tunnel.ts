/**
 * Cloudflare tunnel client service for the Pilot UI.
 */

import { csrfHeaders } from "./auth";

export type TunnelStatus = {
  active: boolean;
  url: string | null;
  error: string | null;
};

export async function fetchTunnelStatus(): Promise<TunnelStatus> {
  const res = await fetch("/tunnel/status", { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as TunnelStatus;
}

export async function startTunnel(): Promise<void> {
  const res = await fetch("/tunnel/start", {
    method: "POST",
    headers: csrfHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function stopTunnel(): Promise<void> {
  const res = await fetch("/tunnel/stop", {
    method: "POST",
    headers: csrfHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
