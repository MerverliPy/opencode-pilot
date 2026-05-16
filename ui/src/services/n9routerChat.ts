/**
 * N9RouterChatClient — client for Pilot's direct n9router chat endpoint.
 *
 * POST /api/chat/completions via Pilot server, returns SSE reader.
 */

import type { ServerConfig } from "@pilot-shared/types";
import { basicAuthHeader } from "./auth";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  timestamp: number;
  finishReason?: string;
  error?: string;
};

export class N9RouterChatClient {
  constructor(public server: ServerConfig) {}

  /**
   * POST /api/chat/completions, return SSE reader for streaming response.
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    model: string,
    signal?: AbortSignal,
  ): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const url = `${this.server.url.replace(/\/$/, "")}/api/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...basicAuthHeader(this.server),
      },
      body: JSON.stringify({ messages, model, stream: true }),
      signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const body = await res.json();
        detail = body?.error?.message || body?.error?.code || "";
      } catch {
        detail = await res.text().catch(() => "");
      }
      throw new N9RouterChatError(res.status, detail || `n9router error ${res.status}`);
    }

    if (!res.body) {
      throw new N9RouterChatError(502, "Empty response body from server");
    }

    return res.body.getReader();
  }
}

/**
 * Fetch available model IDs from n9router /v1/models.
 * Returns empty array on failure.
 */
export async function availableModels(
  baseUrl: string,
  _apiKey?: string,
): Promise<string[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/v1/models`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[availableModels] GET /v1/models \u2192 ${res.status}`);
      return [];
    }
    const body = (await res.json()) as {
      data?: Array<{ id: string }>;
    };
    return body.data?.map((m) => m.id) ?? [];
  } catch (err) {
    console.warn("[availableModels] fetch failed:", err);
    return [];
  }
}

export class N9RouterChatError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "N9RouterChatError";
  }
}
