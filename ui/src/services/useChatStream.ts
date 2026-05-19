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

// ── Client-side XML filter (belt-and-suspenders) ────────────────────
const XML_TAGS_TO_STRIP = new Set([
  "tool_calls", "invoke", "use_mcp_tool", "result",
  "search", "read", "write", "edit", "glob", "grep", "bash", "execute",
  "parameter", "thinking", "answer",
  "tool_uses", "function_call", "mcp_result", "tool_result",
]);

function createXmlStripper() {
  let depth = 0;
  let tagBuf = "";
  let inTag = false;
  const MAX_TAG = 500;

  return {
    filter(chunk: string): string {
      if (!chunk) return chunk;
      let result = "";
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i];
        if (inTag) {
          if (tagBuf.length > MAX_TAG) { result += "<" + tagBuf + ch; inTag = false; tagBuf = ""; continue; }
          tagBuf += ch;
          if (ch === ">") {
            inTag = false;
            const cleaned = tagBuf.replace(/^<\s*/, "").replace(/\s*>$/, "").trim();
            const isSelfClosing = cleaned.endsWith("/") || tagBuf.endsWith("/");
            const isClose = cleaned.startsWith("/");
            const name = isClose ? cleaned.slice(1).split(/\s+/)[0] : cleaned.split(/\s+/)[0];
            if (XML_TAGS_TO_STRIP.has(name.toLowerCase())) {
              tagBuf = "";
              if (isClose) { if (depth > 0) depth--; }
              else if (!isSelfClosing) { depth++; }
            } else {
              result += "<" + tagBuf;
              tagBuf = "";
            }
          }
          continue;
        }
        if (ch === "<") { inTag = true; tagBuf = ""; continue; }
        if (depth > 0) continue;
        result += ch;
      }
      return result;
    },
  };
}

export function useChatStream() {
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (
      reader: ReadableStreamDefaultReader<Uint8Array>,
      callbacks: StreamCallbacks,
      abortController?: AbortController,
    ) => {
      setStreaming(true);
      setStreamError(null);
      if (abortController) abortRef.current = abortController;

      const decoder = new TextDecoder();
      const stripper = createXmlStripper();
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
                const filtered = stripper.filter(choice.delta.content);
                if (filtered) {
                  callbacks.onChunk({ content: filtered });
                }
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
        abortRef.current = null;
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
