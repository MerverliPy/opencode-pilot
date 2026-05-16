/**
 * useChatStream — React hook for SSE chat stream lifecycle.
 *
 * Manages start, cancel, error handling for streaming chat completions.
 */

import { useCallback, useRef, useState } from "react";

export type StreamChunk = {
  content: string;
  finishReason?: string;
};

type StreamCallbacks = {
  onChunk: (chunk: StreamChunk) => void;
  onDone: () => void;
  onError: (err: Error) => void;
};

export function useChatStream() {
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      callbacks: StreamCallbacks,
    ) => {
      setStreaming(true);
      setStreamError(null);

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE data lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              callbacks.onDone();
              return;
            }

            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{
                  delta?: { content?: string };
                  finish_reason?: string;
                }>;
              };
              const choice = parsed.choices?.[0];
              if (choice?.delta?.content) {
                callbacks.onChunk({ content: choice.delta.content });
              }
              if (choice?.finish_reason) {
                callbacks.onChunk({ content: "", finishReason: choice.finish_reason });
              }
            } catch {
              // Skip unparseable chunks
            }
          }
        }
        callbacks.onDone();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          callbacks.onDone();
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        setStreamError(error.message);
        callbacks.onError(error);
      } finally {
        setStreaming(false);
      }
    },
    [],
  );

  const cancelStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setStreaming(false);
  }, []);

  const clearError = useCallback(() => {
    setStreamError(null);
  }, []);

  return {
    streaming,
    streamError,
    startStream,
    cancelStream,
    clearError,
    abortRef,
  };
}
