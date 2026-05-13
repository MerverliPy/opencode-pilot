/**
 * Cloudflare tunnel client service for the Pilot UI.
 */

export type TunnelStatus = {
  active: boolean;
  url: string | null;
  error: string | null;
};

export async function fetchTunnelStatus(): Promise<TunnelStatus> {
  const res = await fetch("/tunnel/status");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as TunnelStatus;
}

export async function startTunnel(): Promise<void> {
  const res = await fetch("/tunnel/start", { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function stopTunnel(): Promise<void> {
  const res = await fetch("/tunnel/stop", { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
