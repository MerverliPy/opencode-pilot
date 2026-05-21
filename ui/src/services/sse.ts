/**
 * SSE client for the Pilot web client.
 *
 * Uses `fetch` + `ReadableStream` (instead of native `EventSource`) so we
 * can send `credentials: "include"` for httpOnly session cookie auth.
 * Auto-reconnects with exponential backoff.
 */
import { useEffect, useRef } from "react";
import type { ServerEvent } from "@pilot-shared/types";
import { log } from "./logger";

type Handler = (event: ServerEvent) => void;

/** Maximum reconnection delay (ms). */
const MAX_BACKOFF = 30_000;

/**
 * Async generator that yields parsed ServerEvent objects from an SSE stream.
 * Owns the reader and buffer for the connection lifetime — NOT per-event.
 */
async function* readSSEEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<ServerEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Last element may be incomplete — keep it in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            yield JSON.parse(data) as ServerEvent;
          } catch {
            log.warn("sse", "malformed event (JSON parse failed)", data.slice(0, 200));
          }
        }
      }
    }
  } finally {
    reader.releaseLock(); // release once at stream end
  }
}

/**
 * Subscribes to /event SSE on the active server and dispatches typed events.
 * Auto-reconnects with exponential backoff. Single connection per server.
 *
 * Uses `credentials: "include"` so the server's auth middleware accepts
 * the httpOnly session cookie set at login.
 */
export function useEventStream(
  serverId: string | null,
  serverUrl: string | null,
  onEvent: Handler,
) {
  const handlerRef = useRef(onEvent);

  // Keep ref in sync with the latest handler on every render so the connection
  // effect always calls the current version without needing to be re-run.
  // Writing (not reading) a ref during render is safe per React docs.
  // eslint-disable-next-line react-hooks/refs
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!serverId || !serverUrl) return;
    let stopped = false;
    let controller: AbortController | null = null;
    let backoff = 500;

    const connect = async () => {
      if (stopped) return;

      const url = `${serverUrl.replace(/\/$/, "")}/event`;
      const headers: Record<string, string> = { Accept: "text/event-stream" };

      controller = new AbortController();
      const signal = controller.signal;

      try {
        const response = await fetch(url, {
          headers,
          signal,
          credentials: "include",
        });

        if (!response.ok) {
          const status = response.status;
          // 401: token is wrong — don"t retry; 5xx: temporary, retry
          if (status === 401 || status === 403) {
            log.error("sse", `auth rejected (${status}) — not reconnecting`);
            return;
          }
          throw new Error(`HTTP ${status}`);
        }

        log.info("sse", `connected → ${serverUrl}`);
        backoff = 500; // reset backoff on successful connection

        const reader = response.body?.getReader();
        if (!reader) {
          log.warn("sse", "no readable stream body");
          return;
        }

        // Consume SSE events from the generator
        for await (const event of readSSEEvents(reader)) {
          if (stopped) break;
          handlerRef.current(event);
        }
      } catch (err: unknown) {
        if (signal.aborted) return; // intentional abort, don't reconnect
        log.warn("sse", "stream error", err instanceof Error ? err.message : String(err));
      }

      controller = null;

      if (stopped) return;
      // Exponential backoff with jitter before reconnecting
      backoff = Math.min(backoff * 2 + Math.random() * 500, MAX_BACKOFF);
      log.info("sse", `reconnecting in ${Math.round(backoff)}ms`);
      setTimeout(connect, backoff);
    };

    connect();

    return () => {
      stopped = true;
      controller?.abort();
    };
    // Depend on individual primitives so identical values
    // do not trigger an unnecessary reconnect.
  }, [serverId, serverUrl]);
}
