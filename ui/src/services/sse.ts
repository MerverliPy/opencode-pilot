/**
 * SSE client for the Pilot web client.
 *
 * Uses the native browser EventSource API (replaces react-native-sse).
 * Auto-reconnects with exponential backoff.
 */
import { useEffect, useRef } from "react";
import type { ServerConfig, ServerEvent } from "@pilot-shared/types";
import { log } from "./logger";

type Handler = (event: ServerEvent) => void;

/**
 * Subscribes to /event SSE on the active server and dispatches typed events.
 * Auto-reconnects with exponential backoff. Single connection per server.
 *
 * Note: Native EventSource does not support custom headers (including
 * Authorization). The server proxy (M2) will handle auth via httpOnly
 * cookies. For now, we pass the server URL and rely on the proxy.
 */
export function useEventStream(server: ServerConfig | null, onEvent: Handler) {
  const handlerRef = useRef(onEvent);

  // Keep ref in sync with the latest handler on every render so the connection
  // effect always calls the current version without needing to be re-run.
  // Writing (not reading) a ref during render is safe per React docs.
  // eslint-disable-next-line react-hooks/refs
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!server) return;
    let stopped = false;
    let es: EventSource | null = null;
    let backoff = 500;

    const connect = () => {
      if (stopped) return;
      const url = `${server.url.replace(/\/$/, "")}/event`;
      es = new EventSource(url);

      es.onopen = () => {
        log.info("sse", `connected → ${server.name ?? server.url}`);
        backoff = 500;
      };

      es.onmessage = (msg: MessageEvent) => {
        if (!msg.data) return;
        try {
          const parsed = JSON.parse(msg.data as string) as ServerEvent;
          handlerRef.current(parsed);
        } catch {
          log.warn("sse", "malformed event (JSON parse failed)", msg.data);
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (stopped) return;
        backoff = Math.min(backoff * 2, 15_000);
        log.warn("sse", `disconnected — reconnecting in ${backoff}ms`);
        setTimeout(connect, backoff);
      };
    };

    connect();
    return () => {
      stopped = true;
      es?.close();
    };
    // Depend on individual properties so a new server object with identical
    // values does not trigger an unnecessary reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id, server?.url, server?.username, server?.password]);
}
