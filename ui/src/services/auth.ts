/**
 * Auth utilities for the Pilot web client.
 *
 * Uses localStorage for persistence (replaces Expo SecureStore from RN).
 * The server will use httpOnly session cookies for actual auth in M3.
 *
 * Sensitive values (servers, n9router config) are encrypted with AES-GCM
 * via the Web Crypto API before being written to localStorage.  Plaintext
 * keys (activeServer, lastSession, pushToken, workdir) are NOT encrypted.
 */
import type { ServerConfig, N9RouterConfig } from "@pilot-shared/types";
import { encrypt, decrypt, clearCryptoStore } from "./crypto";

const KEY_SERVERS = "pilot.servers";
const KEY_ACTIVE = "pilot.activeServer";
const KEY_LAST_SESSION = "pilot.lastSession";
const KEY_PUSH_TOKEN = "pilot.pushToken";
const KEY_WORKDIR = "pilot.workdir";
const KEY_N9ROUTER = "pilot.n9router";

export type { ServerConfig, N9RouterConfig };

// ── N9Router config (encrypted) ────────────────────────────────────────────

export async function loadN9RouterConfig(): Promise<N9RouterConfig> {
  const raw = localStorage.getItem(KEY_N9ROUTER);
  if (!raw) return { url: "", key: "" };
  try {
    const decrypted = await decrypt(raw);
    return JSON.parse(decrypted) as N9RouterConfig;
  } catch {
    return { url: "", key: "" };
  }
}

export async function saveN9RouterConfig(cfg: N9RouterConfig): Promise<void> {
  const encrypted = await encrypt(JSON.stringify(cfg));
  localStorage.setItem(KEY_N9ROUTER, encrypted);
}

// ── Servers (encrypted — contains passwords) ───────────────────────────────

export async function loadServers(): Promise<ServerConfig[]> {
  const raw = localStorage.getItem(KEY_SERVERS);
  if (!raw) return [];
  try {
    const decrypted = await decrypt(raw);
    return JSON.parse(decrypted) as ServerConfig[];
  } catch {
    return [];
  }
}

export async function saveServers(servers: ServerConfig[]): Promise<void> {
  const encrypted = await encrypt(JSON.stringify(servers));
  localStorage.setItem(KEY_SERVERS, encrypted);
}

export async function loadActiveServerId(): Promise<string | null> {
  return localStorage.getItem(KEY_ACTIVE);
}

export async function saveActiveServerId(id: string | null): Promise<void> {
  if (id === null) {
    localStorage.removeItem(KEY_ACTIVE);
  } else {
    localStorage.setItem(KEY_ACTIVE, id);
  }
}

export async function loadLastSessionId(
  serverId: string,
): Promise<string | null> {
  return localStorage.getItem(`${KEY_LAST_SESSION}.${serverId}`);
}

export async function saveLastSessionId(
  serverId: string,
  sessionId: string,
): Promise<void> {
  localStorage.setItem(`${KEY_LAST_SESSION}.${serverId}`, sessionId);
}

export async function loadPushToken(): Promise<string | null> {
  return localStorage.getItem(KEY_PUSH_TOKEN);
}

export async function savePushToken(token: string): Promise<void> {
  localStorage.setItem(KEY_PUSH_TOKEN, token);
}

export async function loadSessionWorkdir(
  serverId: string,
  sessionId: string,
): Promise<string | null> {
  return localStorage.getItem(`${KEY_WORKDIR}.${serverId}.${sessionId}`);
}

export async function saveSessionWorkdir(
  serverId: string,
  sessionId: string,
  path: string | null,
): Promise<void> {
  const key = `${KEY_WORKDIR}.${serverId}.${sessionId}`;
  if (path === null) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, path);
  }
}

/** Helper: build the Authorization header for a server config. */
export function basicAuthHeader(server: ServerConfig): Record<string, string> {
  if (!server.username && !server.password) return {};
  const user = server.username ?? "opencode";
  const pass = server.password ?? "";
  const encoded = btoa(`${user}:${pass}`);
  return { Authorization: `Basic ${encoded}` };
}

/**
 * Wipe all auth-related data from localStorage and IndexedDB.
 *
 * Removes every `pilot.*` and `memory_apikey_*` key from localStorage,
 * then deletes the IndexedDB crypto key store so a fresh encryption key
 * is generated on the next write.
 */
export async function clearAllAuth(): Promise<void> {
  // Remove all pilot.* and memory_apikey_* keys from localStorage
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("pilot.") || key.startsWith("memory_apikey_")) {
      localStorage.removeItem(key);
    }
  }
  // Wipe the IndexedDB crypto store
  await clearCryptoStore();
}
