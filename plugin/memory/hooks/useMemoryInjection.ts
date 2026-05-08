/**
 * useMemoryInjection
 *
 * Returns a `buildPrefix(query)` function that, when called before sending a
 * prompt, returns a memory-context block to prepend to the user's message.
 * Returns an empty string if injection is disabled or fails.
 */
import { useCallback } from 'react';
import { useMemoryStore } from '../store/memoryStore';
import { MemoryInjector } from '../injection/MemoryInjector';

export function useMemoryInjection(opts: {
  serverId: string | null;
  serverUrl?: string;
}) {
  const { serverId, serverUrl } = opts;
  const config = useMemoryStore((s) => s.config);

  const buildPrefix = useCallback(
    async (query: string): Promise<string> => {
      if (!serverId || !config?.enabled || !config?.injectEnabled) return '';
      const injector = new MemoryInjector(serverId, serverUrl);
      return injector.buildContext(query, config);
    },
    [serverId, serverUrl, config],
  );

  return { buildPrefix };
}
