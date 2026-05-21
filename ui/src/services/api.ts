import { ServerConfig, csrfHeaders } from "./auth";
import { log } from "./logger";
import type {
  Agent,
  Command,
  FileContent,
  FileDiff,
  FileNode,
  MessageWithParts,
  Provider,
  Session,
  SessionStatus,
} from "@pilot-shared/types";

class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`OpenCode API error ${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

export class OpencodeClient {
  constructor(public server: ServerConfig) {}

  private url(
    path: string,
    query?: Record<string, string | number | undefined>,
  ) {
    const base = this.server.url.replace(/\/$/, "");
    const qs = query
      ? "?" +
        Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
          )
          .join("&")
      : "";
    return `${base}${path}${qs}`;
  }

  private async req<T>(
    method: string,
    path: string,
    init?: {
      body?: unknown;
      query?: Record<string, string | number | undefined>;
      /** Status codes that are handled by the caller — skip error logging for these. */
      expectedStatuses?: number[];
    },
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (init?.body !== undefined) headers["Content-Type"] = "application/json";
    // Include CSRF header on mutating methods for cookie auth
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      Object.assign(headers, csrfHeaders());
    }

    const res = await fetch(this.url(path, init?.query), {
      method,
      headers,
      credentials: "include",
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (!init?.expectedStatuses?.includes(res.status)) {
        log.error(
          "api",
          `${method} ${path} → ${res.status}`,
          text || "(no body)",
        );
      }
      throw new ApiError(res.status, text);
    }
    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  }

  // ---------- Global ----------
  health() {
    return this.req<{ healthy: boolean; version: string }>(
      "GET",
      "/global/health",
    );
  }

  // ---------- Sessions ----------
  listSessions() {
    return this.req<Session[]>("GET", "/session");
  }

  createSession(body: { parentID?: string; title?: string } = {}) {
    return this.req<Session>("POST", "/session", { body });
  }

  getSession(id: string) {
    return this.req<Session>("GET", `/session/${id}`);
  }

  async deleteSession(id: string): Promise<boolean> {
    try {
      return await this.req<boolean>("DELETE", `/session/${id}`, {
        // 404 means the session is already gone — expected, not an error
        expectedStatuses: [404],
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return true;
      throw err;
    }
  }

  updateSession(id: string, body: { title?: string }) {
    return this.req<Session>("PATCH", `/session/${id}`, { body });
  }

  abortSession(id: string) {
    return this.req<boolean>("POST", `/session/${id}/abort`);
  }

  sessionStatus() {
    return this.req<Record<string, SessionStatus>>("GET", "/session/status");
  }

  sessionDiff(id: string, messageID?: string) {
    return this.req<FileDiff[]>("GET", `/session/${id}/diff`, {
      query: { messageID },
    });
  }

  respondPermission(
    id: string,
    permissionID: string,
    body: { response: "always" | "once" | "reject"; remember?: boolean },
  ) {
    return this.req<boolean>(
      "POST",
      `/session/${id}/permissions/${permissionID}`,
      { body },
    );
  }

  // ---------- Session Tags ----------
  getSessionTags() {
    return this.req<Array<{ sessionId: string; tags: string[]; folder: string; updatedAt: number }>>("GET", "/session-tags");
  }

  setSessionTags(sessionId: string, body: { tags?: string[]; folder?: string }) {
    return this.req<{ sessionId: string; tags: string[]; folder: string; updatedAt: number }>("PUT", `/session-tags/${sessionId}`, { body });
  }

  deleteSessionTags(sessionId: string) {
    return this.req<{ deleted: boolean }>("DELETE", `/session-tags/${sessionId}`);
  }

  // ---------- Messages ----------
  listMessages(sessionId: string, limit?: number) {
    return this.req<MessageWithParts[]>(
      "GET",
      `/session/${sessionId}/message`,
      { query: { limit } },
    );
  }

  /** Fire-and-forget: server returns 204 and continues running the agent. */
  promptAsync(
    sessionId: string,
    body: {
      messageID?: string;
      model?: { providerID: string; modelID: string };
      agent?: string;
      parts: Array<
        | { type: "text"; text: string }
        | { type: "file"; filename: string; mime?: string }
      >;
    },
  ) {
    return this.req<void>("POST", `/session/${sessionId}/prompt_async`, {
      body,
    });
  }

  runCommand(
    sessionId: string,
    body: {
      command: string;
      arguments?: string;
      agent?: string;
      model?: string | { providerID: string; modelID: string };
    },
  ) {
    return this.req<MessageWithParts>("POST", `/session/${sessionId}/command`, {
      body,
    });
  }

  // ---------- Config / Provider / Agent / Command ----------
  configProviders() {
    return this.req<{ providers: Provider[]; default: Record<string, string> }>(
      "GET",
      "/config/providers",
    );
  }

  listAgents() {
    return this.req<Agent[]>("GET", "/agent");
  }

  listCommands() {
    return this.req<Command[]>("GET", "/command");
  }

  // ---------- Files ----------
  listFiles(path: string) {
    return this.req<FileNode[]>("GET", "/file", { query: { path } });
  }

  fileContent(path: string) {
    return this.req<FileContent>("GET", "/file/content", { query: { path } });
  }

  findFile(
    query: string,
    opts: { type?: "file" | "directory"; limit?: number } = {},
  ) {
    return this.req<string[]>("GET", "/find/file", {
      query: { query, type: opts.type, limit: opts.limit },
    });
  }

  findText(pattern: string) {
    return this.req<
      Array<{ path: string; line_number: number; lines: string }>
    >("GET", "/find", { query: { pattern } });
  }
}

export { ApiError };
