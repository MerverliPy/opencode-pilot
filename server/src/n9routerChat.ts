/**
 * n9routerChat — Direct n9router chat completions endpoint with tool calling.
 *
 * POST /api/chat/completions → n9router /v1/chat/completions
 * Supports OpenAI-compatible function/tool calling.
 * If the model makes tool calls, the server executes them and continues the conversation.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { debugLogMiddleware } from "./debugLog.js";
import { TOOLS, SYSTEM_PROMPT } from "./tools/toolDefinitions.js";
import { executeToolCall } from "./tools/toolExecutor.js";

const DEFAULT_N9ROUTER_URL = "http://localhost:20128/v1";
const MAX_TOOL_ROUNDS = 3; // max tool call iterations before forcing response

// Simple file-based debug log for tool calling (since stdout goes to socket)

// ─── XML tool block filter ──────────────────────────────────────────
// Strips Anthropic/Claude-style XML tool call blocks from model text output.
// Uses character-level state machine to handle streaming token-by-token.

/** Known XML tool tags that should be stripped (lowercase). */
const XML_TOOL_TAGS = new Set([
  "tool_calls", "invoke", "use_mcp_tool", "result",
  "search", "read", "write", "edit", "glob", "grep", "bash", "execute",
  "parameter", "thinking", "answer",
  "tool_uses", "function_call", "mcp_result", "tool_result"
]);

/** Per-stream XML filter instance with isolated state. */
export interface XmlFilter {
  /** Filter XML tool call / thinking blocks from a content string. Call on each chunk. */
  filter(chunk: string): string;
  /** Reset state for a new stream. */
  reset(): void;
}

/** Create a new XML filter with isolated per-instance state. */
export function createXmlFilter(): XmlFilter {
  let depth = 0;
  let tagBuf = "";
  let inTag = false;
  const MAX_TAG_BUF = 500;

  return {
    filter(chunk: string): string {
      if (!chunk) return chunk;
      let result = "";
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i];
        if (inTag) {
          if (tagBuf.length > MAX_TAG_BUF) {
            result += "<" + tagBuf + ch;
            inTag = false;
            tagBuf = "";
            continue;
          }
          tagBuf += ch;
          if (ch === ">") {
            inTag = false;
            const parsed = parseXmlTag(tagBuf);
            if (parsed) {
              const [, isClose] = parsed;
              const isSelfClosing = tagBuf.endsWith("/>") || tagBuf.endsWith("/");
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
        if (ch === "<") {
          inTag = true;
          tagBuf = "";
          continue;
        }
        if (depth > 0) continue;
        result += ch;
      }
      return result;
    },
    reset(): void {
      depth = 0;
      tagBuf = "";
      inTag = false;
    },
  };
}

/**
 * Extract tag name from a complete XML tag string like "<invoke name='x'>".
 * Returns [tagName, isClose] or null if not a tool tag.
 */
function parseXmlTag(tagStr: string): [string, boolean] | null {
  const cleaned = tagStr.replace(/^<\s*/, "").replace(/\s*>$/, "").trim();
  const isClose = cleaned.startsWith("/");
  const name = isClose ? cleaned.slice(1).split(/\s+/)[0] : cleaned.split(/\s+/)[0];
  if (XML_TOOL_TAGS.has(name.toLowerCase())) {
    return [name, isClose];
  }
  return null;
}




interface ChatCompletionRequest {
  messages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }>;
  model: string;
  stream?: boolean;
  tools?: unknown[];
  [key: string]: unknown;
}

interface N9RouterErrorResponse {
  error?: { code?: string; message?: string };
}

interface ToolCallDelta {
  index: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface ChoiceDelta {
  role?: string;
  content?: string | null;
  tool_calls?: ToolCallDelta[];
}

interface StreamChunk {
  choices?: Array<{
    index: number;
    delta: ChoiceDelta;
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
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

/**
 * Accumulate tool calls from streaming chunks.
 * Tool call arguments are streamed across multiple chunks.
 */
function accumulateToolCalls(chunks: StreamChunk[]): Map<number, ToolCallDelta> {
  const calls = new Map<number, ToolCallDelta>();
  for (const chunk of chunks) {
    if (!chunk.choices) continue;
    for (const choice of chunk.choices) {
      const tc = choice.delta?.tool_calls;
      if (!tc) continue;
      for (const call of tc) {
        const idx = call.index;
        if (!calls.has(idx)) {
          calls.set(idx, { index: idx, id: "", type: "", function: { name: "", arguments: "" } });
        }
        const existing = calls.get(idx)!;
        if (call.id) existing.id = call.id;
        if (call.type) existing.type = call.type;
        if (call.function?.name) {
          existing.function = existing.function || { name: "", arguments: "" };
          existing.function.name += call.function.name;
        }
        if (call.function?.arguments) {
          existing.function = existing.function || { name: "", arguments: "" };
          existing.function.arguments += call.function.arguments;
        }
      }
    }
  }
  return calls;
}

/**
 * Check if any chunk has finish_reason "tool_calls".
 */
function hasToolCalls(chunks: StreamChunk[]): boolean {
  for (const chunk of chunks) {
    if (!chunk.choices) continue;
    for (const choice of chunk.choices) {
      if (choice.finish_reason === "tool_calls") return true;
    }
  }
  return false;
}

/**
 * Read the full SSE response body and parse it into chunks.
 */
async function readSSEStream(body: ReadableStream<Uint8Array>): Promise<StreamChunk[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const chunks: StreamChunk[] = [];
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    buffer += text;

    // Parse SSE data lines
    for (const line of buffer.split("\n")) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data) as StreamChunk;
          chunks.push(parsed);
        } catch {
          // skip unparseable chunks
        }
      }
    }
    // Keep only the last incomplete line in buffer
    const lastNewline = buffer.lastIndexOf("\n");
    if (lastNewline >= 0) {
      buffer = buffer.slice(lastNewline + 1);
    }
  }

  return chunks;
}

/**
 * Recreate the raw SSE bytes from parsed chunks and raw data.
 * Used when no tool calls — just replay the original stream.
 */
function rawSSEToResponse(raw: Uint8Array[]): ReadableStream<Uint8Array> {
  const xmlFilter = createXmlFilter();
  // Pre-process raw chunks to filter XML from content fields
  const filtered = raw.map((chunk) => {
    const text = new TextDecoder().decode(chunk);
    const lines = text.split("\n");
    let modified = false;
    const outLines = lines.map((line) => {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]" || data.trim() === "[DONE]") return line;
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0]?.delta?.content) {
            const orig = parsed.choices[0].delta.content;
            const filtered = xmlFilter.filter(orig);
            if (filtered !== orig) {
              modified = true;
              if (filtered) {
                parsed.choices[0].delta.content = filtered;
                return "data: " + JSON.stringify(parsed);
              }
              return ""; // skip empty line
            }
          }
        } catch { /* pass through */ }
      }
      return line;
    });
    if (modified) {
      const outText = outLines.filter(l => l !== "").join("\n") + "\n";
      return new TextEncoder().encode(outText);
    }
    return chunk;
  });

  return new ReadableStream({
    async pull(controller) {
      for (const chunk of filtered) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

/**
 * Make a streaming request to n9router and pipe the response.
 */
async function streamFromN9router(
  n9routerUrl: string,
  headers: Record<string, string>,
  requestBody: ChatCompletionRequest,
  c: Context,
  model: string,
  startTime: number,
): Promise<Response> {
  const response = await fetch(`${n9routerUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const status = response.status;
    let errorBody = "";
    try { errorBody = await response.text(); } catch { /* ignore */ }
    let parsed: N9RouterErrorResponse | null = null;
    try { parsed = JSON.parse(errorBody) as N9RouterErrorResponse; } catch { /* not JSON */ }
    const code = parsed?.error?.code ?? mapStatusToErrorCode(status);
    const message = parsed?.error?.message ?? (errorBody || `n9router responded with ${status}`);
    logError("upstream_error", `POST /v1/chat/completions → ${status}`, message);
    return c.json({ error: { code, message, detail: errorBody || undefined } }, status as any);
  }

  if (!response.body) {
    return c.json(
      { error: { code: "upstream_error", message: "n9router returned empty response body" } },
      502,
    );
  }

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  const xmlFilter = createXmlFilter();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let inputTokens = 0;
  let outputTokens = 0;

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          logInfo(`model=${model} input_tokens=${inputTokens} output_tokens=${outputTokens} latency=${Date.now() - startTime}ms`);
          controller.close();
          return;
        }
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        const modifiedLines: string[] = [];
        let modified = false;
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") { modifiedLines.push(line); continue; }
            try {
              const parsed = JSON.parse(data) as StreamChunk & { choices?: Array<{ delta: { content?: string } }> };
              if (parsed.usage) {
                inputTokens = parsed.usage.prompt_tokens ?? inputTokens;
                outputTokens = parsed.usage.completion_tokens ?? outputTokens;
              }
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                const orig = parsed.choices[0].delta.content;
                const filtered = xmlFilter.filter(orig);
                if (filtered !== orig) {
                  modified = true;
                  if (filtered) {
                    parsed.choices[0].delta.content = filtered;
                    modifiedLines.push("data: " + JSON.stringify(parsed));
                  }
                  // if filtered empty, skip line
                } else {
                  modifiedLines.push(line);
                }
              } else {
                modifiedLines.push(line);
              }
            } catch {
              modifiedLines.push(line);
            }
          } else {
            modifiedLines.push(line);
          }
        }
        if (modified) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(modifiedLines.join("\n")));
        } else {
          controller.enqueue(value);
        }
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
}

/**
 * Handle tool calling: execute tools and build response messages.
 */
async function handleToolCalls(
  toolCalls: Map<number, ToolCallDelta>,
  messages: ChatCompletionRequest["messages"],
  n9routerUrl: string,
  headers: Record<string, string>,
): Promise<ChatCompletionRequest["messages"]> {
  const assistantMsg: Record<string, unknown> = {
    role: "assistant",
    content: null,
    tool_calls: [],
  };

  const toolResults: ChatCompletionRequest["messages"] = [];

  for (const [, call] of toolCalls) {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function?.arguments ?? "{}");
    } catch {
      args = {};
    }

    const toolCallEntry = {
      id: call.id || `call_${call.index}`,
      type: call.type || "function",
      function: {
        name: call.function?.name || "unknown",
        arguments: call.function?.arguments || "{}",
      },
    };
    (assistantMsg.tool_calls as unknown[]).push(toolCallEntry);

    const result = executeToolCall(call.function?.name || "unknown", args);
    toolResults.push({
      role: "tool",
      tool_call_id: call.id || `call_${call.index}`,
      content: result,
    });
  }

  // Add anti-XML instruction to prevent model from outputting XML tool calls
  toolResults.push({
    role: "user",
    content: "Summarize the tool results above in plain text. Do NOT output any XML tags like <tool_calls>, <invoke>, <search>, <read>, or similar. Your response must be pure text with no XML. The tool results you received are: you read the requested files. Now describe what you found."
  });

  return [...messages, assistantMsg as ChatCompletionRequest["messages"][0], ...toolResults];
}


/** Count input/output tokens from parsed SSE chunks. */
function countTokens(chunks: StreamChunk[]): { inputTokens: number; outputTokens: number } {
  let inputTokens = 0;
  let outputTokens = 0;
  for (const chunk of chunks) {
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
      outputTokens = chunk.usage.completion_tokens ?? outputTokens;
    }
  }
  return { inputTokens, outputTokens };
}

export function setupChatRouter(): Hono {
  const router = new Hono();

  // Apply debug logging middleware to all routes
  router.use("*", debugLogMiddleware);

  router.post("/api/chat/completions", async (c: Context) => {
    const startTime = Date.now();
    let toolRound = 0;
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

      // Prepend system prompt if first message is not system
      const messages = [...body.messages];
      if (messages[0]?.role !== "system") {
        messages.unshift({ role: "system", content: SYSTEM_PROMPT });
      }

      // Build request to n9router with tools
      const requestBody: ChatCompletionRequest = {
        messages,
        model,
        stream: true,
        tools: TOOLS,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      // Make initial request to n9router
      const response = await fetch(`${n9routerUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
    signal: AbortSignal.any([AbortSignal.timeout(120_000), c.req.raw.signal]),
      });

      // Handle n9router error responses
      if (!response.ok) {
        const status = response.status;
        let errorBody = "";
        try { errorBody = await response.text(); } catch { /* ignore */ }
        let parsed: N9RouterErrorResponse | null = null;
        try { parsed = JSON.parse(errorBody) as N9RouterErrorResponse; } catch { /* not JSON */ }
        const code = parsed?.error?.code ?? mapStatusToErrorCode(status);
        const message = parsed?.error?.message ?? (errorBody || `n9router responded with ${status}`);
        logError("upstream_error", `POST /v1/chat/completions → ${status}`, message);
        return c.json({ error: { code, message, detail: errorBody || undefined } }, status as any);
      }

      if (!response.body) {
        return c.json(
          { error: { code: "upstream_error", message: "n9router returned empty response body" } },
          502,
        );
      }

      // Tee the response body: one branch for tool-call detection, one for streaming
      const [parseBody, streamBody] = response.body.tee();
      const chunks = await readSSEStream(parseBody);

      if (hasToolCalls(chunks)) {
        // Cancel the unused streaming branch
        streamBody.cancel().catch(() => {});

        // Accumulate tool calls from chunks
        const toolCalls = accumulateToolCalls(chunks);
        logInfo(`model=${model} tool_calls=${toolCalls.size} executing...`);

        // Handle tool calls: execute and build new messages
        const updatedMessages = await handleToolCalls(toolCalls, requestBody.messages, n9routerUrl, headers);

        // Check max rounds
        if (toolRound >= MAX_TOOL_ROUNDS) {
          // Add a forced user message to break the loop
          updatedMessages.push({
            role: "user",
            content: "Continue with your answer using the information you already have. Do not make additional tool calls."
          });
        }

        // Make new streaming request with tool results (force text response)
        const finalRequestBody: ChatCompletionRequest = {
          messages: updatedMessages,
          model,
          stream: true,
          tools: TOOLS,
          tool_choice: "none",
        };

        logInfo(`model=${model} streaming response after ${toolCalls.size} tool call(s) (round ${toolRound})`);
        return streamFromN9router(n9routerUrl, headers, finalRequestBody, c, model, startTime);
      }

      // No tool calls — stream through with XML filtering
      const { inputTokens: noTcInput, outputTokens: noTcOutput } = countTokens(chunks);
      logInfo(`model=${model} no tool calls input_tokens=${noTcInput} output_tokens=${noTcOutput} latency=${Date.now() - startTime}ms`);
      c.header("Content-Type", "text/event-stream");
      c.header("Cache-Control", "no-cache");
      c.header("Connection", "keep-alive");

      const xmlFilter = createXmlFilter();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let lineBuffer = "";

      const filterTransform = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          const text = decoder.decode(chunk, { stream: true });
          lineBuffer += text;
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";

          const outLines: string[] = [];
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]" || data.trim() === "[DONE]") {
                outLines.push(line);
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                let modified = false;
                if (parsed.choices?.[0]?.delta?.content) {
                  const orig = parsed.choices[0].delta.content;
                  const filtered = xmlFilter.filter(orig);
                  if (filtered !== orig) {
                    modified = true;
                    if (filtered) {
                      parsed.choices[0].delta.content = filtered;
                      outLines.push("data: " + JSON.stringify(parsed));
                    }
                  }
                }
                if (!modified) outLines.push(line);
              } catch {
                outLines.push(line);
              }
            } else {
              outLines.push(line);
            }
          }
          if (outLines.length > 0) {
            controller.enqueue(encoder.encode(outLines.join("\n")));
          }
        },
        flush(controller) {
          if (lineBuffer) {
            const filtered = xmlFilter.filter(lineBuffer);
            if (filtered) controller.enqueue(encoder.encode(filtered + "\n"));
          }
        },
      });

      const stream = streamBody.pipeThrough(filterTransform);
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
