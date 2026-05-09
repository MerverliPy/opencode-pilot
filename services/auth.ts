import * as SecureStore from "expo-secure-store";

export type ServerConfig = {
  id: string;
  name: string;
  url: string; // e.g. http://192.168.1.10:4096 or https://opencode.example.com
  username?: string;
  password?: string;
};

const KEY_SERVERS = "pilot.servers";
const KEY_ACTIVE = "pilot.activeServer";
const KEY_LAST_SESSION = "pilot.lastSession";
const KEY_PUSH_TOKEN = "pilot.pushToken";
const KEY_WORKDIR = "pilot.workdir";

export async function loadServers(): Promise<ServerConfig[]> {
  const raw = await SecureStore.getItemAsync(KEY_SERVERS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ServerConfig[];
  } catch {
    return [];
  }
}

export async function saveServers(servers: ServerConfig[]): Promise<void> {
  await SecureStore.setItemAsync(KEY_SERVERS, JSON.stringify(servers));
}

export async function loadActiveServerId(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACTIVE);
}

export async function saveActiveServerId(id: string | null): Promise<void> {
  if (id === null) {
    await SecureStore.deleteItemAsync(KEY_ACTIVE);
  } else {
    await SecureStore.setItemAsync(KEY_ACTIVE, id);
  }
}

export async function loadLastSessionId(
  serverId: string,
): Promise<string | null> {
  return SecureStore.getItemAsync(`${KEY_LAST_SESSION}.${serverId}`);
}

export async function saveLastSessionId(
  serverId: string,
  sessionId: string,
): Promise<void> {
  await SecureStore.setItemAsync(`${KEY_LAST_SESSION}.${serverId}`, sessionId);
}

export async function loadPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_PUSH_TOKEN);
}

export async function savePushToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_PUSH_TOKEN, token);
}

export async function loadSessionWorkdir(
  serverId: string,
  sessionId: string,
): Promise<string | null> {
  return SecureStore.getItemAsync(`${KEY_WORKDIR}.${serverId}.${sessionId}`);
}

export async function saveSessionWorkdir(
  serverId: string,
  sessionId: string,
  path: string | null,
): Promise<void> {
  const key = `${KEY_WORKDIR}.${serverId}.${sessionId}`;
  if (path === null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, path);
  }
}

/** Helper: build the Authorization header for a server config. */
export function basicAuthHeader(server: ServerConfig): Record<string, string> {
  if (!server.username && !server.password) return {};
  const user = server.username ?? "opencode";
  const pass = server.password ?? "";
  // btoa is available in Hermes (RN). Fall back to manual base64 if not.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g: any = globalThis;
  const encoded =
    typeof g.btoa === "function"
      ? g.btoa(`${user}:${pass}`)
      : base64(`${user}:${pass}`);
  return { Authorization: `Basic ${encoded}` };
}

function base64(s: string): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  let i = 0;
  while (i < s.length) {
    const a = s.charCodeAt(i++);
    const b = i < s.length ? s.charCodeAt(i++) : NaN;
    const c = i < s.length ? s.charCodeAt(i++) : NaN;
    const t1 = a >> 2;
    const t2 = ((a & 3) << 4) | (isNaN(b) ? 0 : b >> 4);
    const t3 = isNaN(b) ? 64 : ((b & 15) << 2) | (isNaN(c) ? 0 : c >> 6);
    const t4 = isNaN(c) ? 64 : c & 63;
    out += chars[t1] + chars[t2] + chars[t3] + chars[t4];
  }
  return out;
}
