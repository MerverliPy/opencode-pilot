/**
 * useMemoryInjection
 *
 * Returns a `buildPrefix(query)` function that, when called before sending a
 * prompt, returns a memory-context block to prepend to the user's message.
 * Returns an empty string if injection is disabled or fails.
 *
 * Uses the server MemoryApi for all data access (replaces old expo-sqlite DB).
 */
import { useCallback } from "react";
import { useMemoryStore } from "../store/memoryStore";
import { MemoryInjector } from "../injection/MemoryInjector";
import { createMemoryApi } from "../../../services/memoryApi";
import type { ServerConfig } from "../../../services/auth";

export function useMemoryInjection(opts: {
  serverId: string | null;
  server: ServerConfig | null;
  serverUrl?: string;
}) {
  const { serverId, server, serverUrl } = opts;
  const config = useMemoryStore((s) => s.config);

  const buildPrefix = useCallback(
    async (query: string): Promise<string> => {
      if (!serverId || !server || !config?.enabled || !config?.injectEnabled)
        return "";
      const api = createMemoryApi(server);
      const injector = new MemoryInjector(serverId, api, serverUrl);
      return injector.buildContext(query, config);
    },
    [serverId, server, serverUrl, config],
  );

  return { buildPrefix };
}
