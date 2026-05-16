/**
 * n9routerChat — Direct n9router chat completions endpoint.
 *
 * POST /api/chat/completions → n9router /v1/chat/completions (stream: true)
 * Pipes SSE stream back to client.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { debugLogMiddleware } from "./debugLog";

const DEFAULT_N9ROUTER_URL = "http://localhost:20128/v1";

interface ChatCompletionRequest {
  messages: Array<{ role: string; content: string }>;
  model: string;
  stream?: boolean;
  [key: string]: unknown;
}

interface N9RouterErrorResponse {
  error?: { code?: string; message?: string };
}

function getN9RouterUrl(): string {
  return (process.env.N9ROUTER_URL ?? DEFAULT_N9ROUTER_URL).replace(/\/$/, "");
}

function getN9RouterApiKey(): string | null {
  return process.env.N9ROUTER_API_KEY?.trim() ?? null;
}

function logError(prefix: string, msg: string, detail?: string): void {
  console.error(`[n9router-chat] ${prefix}: ${msg}${detail ? ` — ${detail}` : ""}`);
}

function logInfo(msg: string): void {
  console.log(`[n9router-chat] ${msg}`);
}

export function setupChatRouter(): Hono {
  const router = new Hono();

  // Apply debug logging middleware to all routes
  router.use("*", debugLogMiddleware);

  router.post("/api/chat/completions", async (c: Context) => {
    const startTime = Date.now();
    let model = "unknown";

    try {
      const body: ChatCompletionRequest = await c.req.json();

      // Validate messages
      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return c.json(
          { error: { code: "invalid_request", message: "messages array is required and must be non-empty" } },
          400,
        );
      }

      model = body.model || "unknown";

      // Validate message format
      for (const msg of body.messages) {
        if (!msg.role || typeof msg.content !== "string") {
          return c.json(
            { error: { code: "invalid_request", message: "each message must have role and content" } },
            400,
          );
        }
      }

      const n9routerUrl = getN9RouterUrl();
      const apiKey = getN9RouterApiKey();

      if (!n9routerUrl) {
        return c.json(
          { error: { code: "configuration_error", message: "N9ROUTER_URL is not configured" } },
          500,
        );
      }

      // Build request to n9router
      const requestBody: ChatCompletionRequest = {
        ...body,
        stream: true, // force streaming
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${n9routerUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60_000),
      });

      // Handle n9router error responses
      if (!response.ok) {
        const status = response.status;
        let errorBody = "";
        try {
          errorBody = await response.text();
        } catch {
          // ignore parse errors
        }

        let parsed: N9RouterErrorResponse | null = null;
        try {
          parsed = JSON.parse(errorBody) as N9RouterErrorResponse;
        } catch {
          // not JSON
        }

        const code = parsed?.error?.code ?? mapStatusToErrorCode(status);
        const message = parsed?.error?.message ?? (errorBody || `n9router responded with ${status}`);

        logError("upstream_error", `POST /v1/chat/completions → ${status}`, message);

        return c.json({ error: { code, message, detail: errorBody || undefined } }, status as any);
      }

      // Read body as SSE stream and pipe to client
      if (!response.body) {
        return c.json(
          { error: { code: "upstream_error", message: "n9router returned empty response body" } },
          502,
        );
      }

      // Stream SSE response back
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let inputTokens = 0;
      let outputTokens = 0;

      const stream = new ReadableStream({
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              // Count tokens from usage if available in last chunk
              logInfo(`model=${model} input_tokens=${inputTokens} output_tokens=${outputTokens} latency=${Date.now() - startTime}ms`);
              controller.close();
              return;
            }
            const text = decoder.decode(value, { stream: true });

            // Rough token counting from SSE content
            for (const line of text.split("\n")) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data) as {
                    usage?: { prompt_tokens?: number; completion_tokens?: number };
                    choices?: Array<{ delta?: { content?: string } }>;
                  };
                  if (parsed.usage) {
                    inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
                    outputTokens = parsed.usage.completion_tokens ?? outputTokens;
                  }
                } catch {
                  // ignore parse errors in streaming chunks
                }
              }
            }

            controller.enqueue(value);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logError("stream_error", msg);
            controller.error(err);
          }
        },
        cancel() {
          reader.cancel().catch(() => {});
        },
      });

      return c.newResponse(stream, 200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
    } catch (err) {
      const elapsed = Date.now() - startTime;

      if (err instanceof Error && err.name === "AbortError") {
        logError("timeout", `model=${model} latency=${elapsed}ms`);
        return c.json(
          { error: { code: "timeout", message: "n9router request timed out after 60s" } },
          504,
        );
      }

      const msg = err instanceof Error ? err.message : String(err);
      logError("request_error", msg, `model=${model} latency=${elapsed}ms`);
      return c.json(
        { error: { code: "internal_error", message: msg } },
        500,
      );
    }
  });

  return router;
}

function mapStatusToErrorCode(status: number): string {
  switch (status) {
    case 401: return "unauthorized";
    case 402: return "payment_required";
    case 429: return "rate_limited";
    case 503: return "provider_unavailable";
    default: return "upstream_error";
  }
}
