/**
 * Memory API client — thin fetch wrappers for the server-side /memory routes.
 *
 * All calls are relative to `serverUrl` (the Pilot server base URL, not the
 * OpenCode upstream). Each call requires a `serverId` that scopes the data.
 */
import { csrfHeaders } from "./auth";
import type { ServerConfig } from "./auth";
import type {
  Memory,
  MemoryConfig,
  MemoryEmbedding,
  ProfileEntry,
  TimelineEvent,
} from "../plugin/memory/db/schema";

export type MemoryListResult = { memories: Memory[]; count: number };

async function req<T>(
  serverUrl: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const base = serverUrl.replace(/\/$/, "");
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
  };
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    Object.assign(headers, csrfHeaders());
  }

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Memory API ${method} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function createMemoryApi(server: ServerConfig) {
  const serverUrl = server.url;
  const r = <T>(method: string, path: string, body?: unknown) =>
    req<T>(serverUrl, method, path, body);

  return {
    listMemories(
      serverId: string,
      opts: { includeArchived?: boolean; limit?: number } = {},
    ): Promise<MemoryListResult> {
      const qs = new URLSearchParams();
      if (opts.includeArchived) qs.set("includeArchived", "true");
      if (opts.limit) qs.set("limit", String(opts.limit));
      const q = qs.toString() ? `?${qs.toString()}` : "";
      return r("GET", `/memory/${encodeURIComponent(serverId)}${q}`);
    },

    searchMemories(
      serverId: string,
      query: string,
    ): Promise<{ memories: Memory[] }> {
      return r(
        "GET",
        `/memory/${encodeURIComponent(serverId)}/search?q=${encodeURIComponent(query)}`,
      );
    },

    insertMemory(
      serverId: string,
      m: Omit<Memory, "id" | "createdAt" | "updatedAt">,
    ): Promise<Memory> {
      return r("POST", `/memory/${encodeURIComponent(serverId)}`, m);
    },

    updateMemory(
      serverId: string,
      id: string,
      patch: Partial<
        Pick<
          Memory,
          | "content"
          | "confidence"
          | "tags"
          | "isPinned"
          | "isArchived"
          | "category"
        >
      >,
    ): Promise<Memory> {
      return r(
        "PATCH",
        `/memory/${encodeURIComponent(serverId)}/${encodeURIComponent(id)}`,
        patch,
      );
    },

    deleteMemory(serverId: string, id: string): Promise<void> {
      return r(
        "DELETE",
        `/memory/${encodeURIComponent(serverId)}/${encodeURIComponent(id)}`,
      );
    },

    deleteAllMemories(serverId: string): Promise<void> {
      return r("DELETE", `/memory/${encodeURIComponent(serverId)}/all`);
    },

    exportAll(serverId: string): Promise<{
      version: number;
      exportedAt: string;
      serverId: string;
      memories: Memory[];
      profile: ProfileEntry[];
      timeline: TimelineEvent[];
      config: MemoryConfig;
    }> {
      return r("GET", `/memory/${encodeURIComponent(serverId)}/export`);
    },

    importAll(
      serverId: string,
      data: Record<string, unknown>,
    ): Promise<{ imported: { memories: number; profile: number; timeline: number } }> {
      return r("POST", `/memory/${encodeURIComponent(serverId)}/import`, data);
    },

    getConfig(serverId: string): Promise<MemoryConfig> {
      return r("GET", `/memory/${encodeURIComponent(serverId)}/config`);
    },

    saveConfig(
      serverId: string,
      config: Partial<MemoryConfig>,
    ): Promise<MemoryConfig> {
      return r("PUT", `/memory/${encodeURIComponent(serverId)}/config`, config);
    },

    getProfile(serverId: string): Promise<ProfileEntry[]> {
      return r("GET", `/memory/${encodeURIComponent(serverId)}/profile`);
    },

    getTimeline(
      serverId: string,
      opts: { limit?: number; offset?: number } = {},
    ): Promise<TimelineEvent[]> {
      const qs = new URLSearchParams();
      if (opts.limit) qs.set("limit", String(opts.limit));
      if (opts.offset) qs.set("offset", String(opts.offset));
      const q = qs.toString() ? `?${qs.toString()}` : "";
      return r("GET", `/memory/${encodeURIComponent(serverId)}/timeline${q}`);
    },

    // ── Semantic Search ──────────────────────────────────────────────────────

    semanticSearch(
      serverId: string,
      queryVector: number[],
      modelId: string,
      topK?: number,
    ): Promise<{ results: Array<{ memory: Memory; score: number }> }> {
      return r(
        "POST",
        `/memory/${encodeURIComponent(serverId)}/semantic-search`,
        { queryVector, modelId, topK },
      );
    },

    // ── Embeddings ──────────────────────────────────────────────────────────

    getEmbeddings(
      serverId: string,
      modelId: string,
      memoryIds?: string[],
    ): Promise<MemoryEmbedding[]> {
      const qs = new URLSearchParams({ modelId });
      if (memoryIds && memoryIds.length > 0) {
        qs.set("memoryIds", memoryIds.join(","));
      }
      return r(
        "GET",
        `/memory/${encodeURIComponent(serverId)}/embeddings?${qs.toString()}`,
      );
    },

    insertEmbedding(
      serverId: string,
      e: Omit<MemoryEmbedding, "id" | "createdAt">,
    ): Promise<MemoryEmbedding> {
      return r("POST", `/memory/${encodeURIComponent(serverId)}/embeddings`, e);
    },

    deleteEmbeddingsByMemory(
      serverId: string,
      memoryId: string,
    ): Promise<void> {
      return r(
        "DELETE",
        `/memory/${encodeURIComponent(serverId)}/embeddings/${encodeURIComponent(memoryId)}`,
      );
    },
  };
}

export type MemoryApi = ReturnType<typeof createMemoryApi>;
