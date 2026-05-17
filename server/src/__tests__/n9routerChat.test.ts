import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { setupChatRouter } from "../n9routerChat.js";

function createStreamResponse(
  chunks: string[],
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status,
    headers: {
      "content-type": "text/event-stream",
      ...extraHeaders,
    },
  });
}

describe("setupChatRouter — POST /api/chat/completions", () => {
  const app = setupChatRouter();

  beforeEach(() => {
    jest.restoreAllMocks();
    delete process.env.N9ROUTER_URL;
    delete process.env.N9ROUTER_API_KEY;
  });

  // ── Validation ──

  it("rejects missing messages field", async () => {
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-4" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
  });

  it("rejects empty messages array", async () => {
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [], model: "gpt-4" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
  });

  it("rejects message without role", async () => {
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
  });

  it("rejects message with non-string content", async () => {
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: 123 }],
        model: "gpt-4",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
  });

  // ── Configuration ──

  it("uses default URL when N9ROUTER_URL not set", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse(["data: [DONE]\n\n"]),
    );
    await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(jest.mocked(globalThis.fetch).mock.calls[0][0]).toBe(
      "http://localhost:20128/v1/chat/completions",
    );
  });

  it("uses configured N9ROUTER_URL", async () => {
    process.env.N9ROUTER_URL = "https://custom.example.com/api";
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse(["data: [DONE]\n\n"]),
    );
    await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(jest.mocked(globalThis.fetch).mock.calls[0][0]).toBe(
      "https://custom.example.com/api/chat/completions",
    );
  });

  it("strips trailing slash from URL", async () => {
    process.env.N9ROUTER_URL = "https://example.com/v1/";
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse(["data: [DONE]\n\n"]),
    );
    await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(jest.mocked(globalThis.fetch).mock.calls[0][0]).toBe(
      "https://example.com/v1/chat/completions",
    );
  });

  it("includes Authorization header when API key is set", async () => {
    process.env.N9ROUTER_API_KEY = "sk-test-key";
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse(["data: [DONE]\n\n"]),
    );
    await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    const headers = jest.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit;
    expect((headers.headers as Record<string, string>)["Authorization"]).toBe("Bearer sk-test-key");
  });

  it("omits Authorization header when no API key", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse(["data: [DONE]\n\n"]),
    );
    await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    const headers = jest.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit;
    expect((headers.headers as Record<string, string>)["Authorization"]).toBeUndefined();
  });

  it("forces stream:true in upstream request", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse(["data: [DONE]\n\n"]),
    );
    await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4", stream: false }),
    });
    const body = JSON.parse(
      (jest.mocked(globalThis.fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.stream).toBe(true);
  });

  // ── Upstream errors ──

  it("forwards 401 upstream as unauthorized", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "bad key" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthorized");
  });

  it("forwards 429 upstream as rate_limited", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 429 }),
    );
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("rate_limited");
  });

  it("forwards 503 upstream as provider_unavailable", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Service Unavailable", { status: 503 }),
    );
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("provider_unavailable");
  });

  it("handles non-JSON upstream error body", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 502 }),
    );
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("upstream_error");
  });

  // ── Timeout ──

  it("returns 504 on fetch timeout (AbortError)", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    jest.spyOn(globalThis, "fetch").mockRejectedValue(abortError);

    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.error.code).toBe("timeout");
  });

  // ── Streaming success ──

  it("streams SSE response on success", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      createStreamResponse(["data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\n", "data: [DONE]\n\n"]),
    );
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    const text = await res.text();
    expect(text).toContain("Hello");
  });

  it("returns 502 when upstream response has no body", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 200 }),
    );
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("upstream_error");
  });

  // ── Generic error ──

  it("returns 500 on unexpected error", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network failure"));
    const res = await app.request("/api/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], model: "gpt-4" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("internal_error");
  });
});
