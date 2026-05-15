import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { createProxy, type ProxyConfig } from "../proxy.js";

function mockContext(overrides?: Record<string, unknown>) {
  const headers = new Map<string, string>();
  return {
    req: {
      path: "/api/test",
      method: "GET",
      query: () => ({}),
      raw: {
        headers: {
          get: (key: string) => headers.get(key) ?? null,
          forEach: (cb: (value: string, key: string) => void) =>
            headers.forEach((v, k) => cb(v, k)),
        },
      },
      blob: async () => new Blob(),
      ...(overrides?.req as Record<string, unknown>),
    },
    json: (body: unknown, status?: number) =>
      new Response(JSON.stringify(body), {
        status: status ?? 200,
        headers: { "content-type": "application/json" },
      }),
    newResponse: (
      body: BodyInit | null,
      status?: number,
      headers?: Record<string, string>,
    ) => new Response(body, { status, headers }),
    ...overrides,
  };
}

const fakeUpstream = "http://upstream:4096";

async function execHandler(
  cfg: ProxyConfig,
  c: ReturnType<typeof mockContext>,
): Promise<Response> {
  const handler = createProxy(cfg);
  const result = await handler(c as never, async () => {});
  return result as Response;
}

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("createProxy", () => {
  it("forwards GET requests to upstream", async () => {
    const mockFetch = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const result = await execHandler(
      { upstreamUrl: fakeUpstream },
      mockContext(),
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0] as string).toBe(
      "http://upstream:4096/test",
    );
    expect(result.status).toBe(200);
  });

  it("returns 502 on upstream error", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await execHandler(
      { upstreamUrl: fakeUpstream },
      mockContext(),
    );

    expect(result.status).toBe(502);
    const body = await result.json();
    expect(body).toEqual({ error: "Upstream unreachable" });
  });

  it("copies allowed headers downstream", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", {
        status: 200,
        headers: { "content-type": "application/json", "x-custom": "keep" },
      }),
    );

    const result = await execHandler(
      { upstreamUrl: fakeUpstream },
      mockContext(),
    );

    expect(result.headers.get("content-type")).toBe("application/json");
    expect(result.headers.get("x-custom")).toBe("keep");
  });

  it("injects basic auth when configured", async () => {
    let sentAuth: string | undefined;
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>;
        sentAuth = headers?.authorization;
        return new Response("ok", { status: 200 });
      });

    const cfg: ProxyConfig = {
      upstreamUrl: fakeUpstream,
      username: "admin",
      password: "secret",
    };
    await execHandler(cfg, mockContext());

    expect(sentAuth).toBe("Basic " + btoa("admin:secret"));
  });

  it("strips hop-by-hop headers", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", {
        status: 200,
        headers: {
          "transfer-encoding": "chunked",
          connection: "close",
          "keep-alive": "timeout=5",
          "content-type": "text/plain",
        },
      }),
    );

    const result = await execHandler(
      { upstreamUrl: fakeUpstream },
      mockContext(),
    );

    expect(result.headers.get("transfer-encoding")).toBeNull();
    expect(result.headers.get("connection")).toBeNull();
    expect(result.headers.get("keep-alive")).toBeNull();
    expect(result.headers.get("content-type")).toBe("text/plain");
  });

  it("forwards POST requests with body", async () => {
    let sentMethod: string | undefined;
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, init?: RequestInit) => {
        sentMethod = init?.method;
        return new Response("created", { status: 201 });
      });

    const result = await execHandler(
      { upstreamUrl: fakeUpstream },
      mockContext({
        req: {
          path: "/api/data",
          method: "POST",
          query: () => ({}),
          raw: {
            headers: {
              get: () => null,
              forEach: () => {},
            },
          },
          blob: async () =>
            new Blob(['{"key":"value"}'], { type: "application/json" }),
        },
      }),
    );

    expect(sentMethod).toBe("POST");
    expect(result.status).toBe(201);
  });

  it("preserves SSE content-type and sets no-cache", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("data: hello\n\n", {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    );

    const result = await execHandler(
      { upstreamUrl: fakeUpstream },
      mockContext(),
    );

    expect(result.headers.get("content-type")).toBe("text/event-stream");
    expect(result.headers.get("cache-control")).toBe("no-cache");
  });

  it("builds upstream URL without /api prefix", async () => {
    let calledUrl: string | undefined;
    jest.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      calledUrl = url as string;
      return new Response("ok", { status: 200 });
    });

    await execHandler(
      { upstreamUrl: "http://upstream:4096/" },
      mockContext({
        req: {
          path: "/api/users/123",
          method: "GET",
          query: () => ({}),
          raw: { headers: { get: () => null, forEach: () => {} } },
          blob: async () => new Blob(),
        },
      }),
    );

    expect(calledUrl).toBe("http://upstream:4096/users/123");
  });

  it("passes query parameters", async () => {
    let calledUrl: string | undefined;
    jest.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      calledUrl = url as string;
      return new Response("ok", { status: 200 });
    });

    await execHandler(
      { upstreamUrl: fakeUpstream },
      mockContext({
        req: {
          path: "/api/search",
          method: "GET",
          query: () => ({ q: "hello", page: "1" }),
          raw: { headers: { get: () => null, forEach: () => {} } },
          blob: async () => new Blob(),
        },
      }),
    );

    expect(calledUrl).toBe("http://upstream:4096/search?q=hello&page=1");
  });


  it("does not forward Pilot auth token upstream", async () => {
    let sentAuth: string | undefined;
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>;
        sentAuth = headers?.authorization;
        return new Response("ok", { status: 200 });
      });

    const headers = new Map<string, string>();
    headers.set("authorization", "Bearer pilot-token");

    await execHandler(
      { upstreamUrl: fakeUpstream, pilotAuthToken: "pilot-token" },
      mockContext({
        req: {
          path: "/api/test",
          method: "GET",
          query: () => ({}),
          raw: {
            headers: {
              get: (k: string) => headers.get(k) ?? null,
              forEach: (cb: (v: string, k: string) => void) =>
                headers.forEach((v, k) => cb(v, k)),
            },
          },
          blob: async () => new Blob(),
        },
      }),
    );

    expect(sentAuth).toBeUndefined();
  });

  it("does not inject auth when client sends Authorization", async () => {
    let sentAuth: string | undefined;
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (url, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>;
        sentAuth = headers?.authorization;
        return new Response("ok", { status: 200 });
      });

    const headers = new Map<string, string>();
    headers.set("authorization", "Bearer client-token");
    const cfg: ProxyConfig = {
      upstreamUrl: fakeUpstream,
      username: "admin",
      password: "secret",
    };
    await execHandler(
      cfg,
      mockContext({
        req: {
          path: "/api/test",
          method: "GET",
          query: () => ({}),
          raw: {
            headers: {
              get: (k: string) => headers.get(k) ?? null,
              forEach: (cb: (v: string, k: string) => void) =>
                headers.forEach((v, k) => cb(v, k)),
            },
          },
          blob: async () => new Blob(),
        },
      }),
    );

    expect(sentAuth).toBe("Bearer client-token");
  });
});
