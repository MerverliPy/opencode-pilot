import { useEffect, useRef } from 'react';
import EventSource from 'react-native-sse';
import { basicAuthHeader, ServerConfig } from './auth';
import type { ServerEvent } from './types';

type Handler = (event: ServerEvent) => void;

/**
 * Subscribes to /event SSE on the active server and dispatches typed events.
 * Auto-reconnects with exponential backoff. Single connection per server.
 */
export function useEventStream(server: ServerConfig | null, onEvent: Handler) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!server) return;
    let stopped = false;
    let es: EventSource | null = null;
    let backoff = 500;

    const connect = () => {
      if (stopped) return;
      const url = `${server.url.replace(/\/$/, '')}/event`;
      es = new EventSource(url, {
        headers: basicAuthHeader(server),
        // keep-alive ping on iOS
        pollingInterval: 0,
      });

      es.addEventListener('open', () => {
        backoff = 500;
      });

      es.addEventListener('message', (msg: { data?: string | null }) => {
        if (!msg.data) return;
        try {
          const parsed = JSON.parse(msg.data) as ServerEvent;
          handlerRef.current(parsed);
        } catch {
          // ignore malformed events
        }
      });

      es.addEventListener('error', () => {
        es?.close();
        es = null;
        if (stopped) return;
        backoff = Math.min(backoff * 2, 15_000);
        setTimeout(connect, backoff);
      });
    };

    connect();
    return () => {
      stopped = true;
      es?.close();
    };
  }, [server?.id, server?.url, server?.username, server?.password]);
}
