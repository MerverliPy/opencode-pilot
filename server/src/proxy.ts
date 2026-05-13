/**
 * Hono proxy middleware for the Pilot server.
 *
 * Forwards all /api/* requests to the upstream OpenCode server.
 * Preserves headers (including Authorization) and handles SSE streams.
 */
import type { Context, MiddlewareHandler } from "hono";
import type { StatusCode } from "hono/utils/http-status";

export type ProxyConfig = {
  upstreamUrl: string;
  username?: string;
  password?: string;
};

/** Build the upstream request URL from the incoming Hono context. */
function upstreamUrl(cfg: ProxyConfig, c: Context): string {
  const base = cfg.upstreamUrl.replace(/\/$/, "");
  const path = c.req.path.replace(/^\/api/, "");
  const query = c.req.query();
  const qs = Object.keys(query).length
    ? "?" +
      Object.entries(query)
        .map(
          ([k, v]) =>
            `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
        )
        .join("&")
    : "";
  return `${base}${path}${qs}`;
}

/** Copy relevant headers from the incoming request to the upstream request. */
function copyHeaders(
  incoming: Headers,
  cfg: ProxyConfig,
): Record<string, string> {
  const headers: Record<string, string> = {};

  const allow = ["content-type", "accept", "authorization", "x-requested-with"];
  for (const key of allow) {
    const value = incoming.get(key);
    if (value) headers[key] = value;
  }

  // Inject basic auth from server config if the client didn't send Authorization
  if (!headers.authorization && (cfg.username || cfg.password)) {
    const user = cfg.username ?? "opencode";
    const pass = cfg.password ?? "";
    headers.authorization = `Basic ${btoa(`${user}:${pass}`)}`;
  }

  return headers;
}

/** Create the proxy middleware. */
export function createProxy(cfg: ProxyConfig): MiddlewareHandler {
  return async (c) => {
    const url = upstreamUrl(cfg, c);
    const method = c.req.method;
    const headers = copyHeaders(c.req.raw.headers, cfg);

    // Read body for non-GET/HEAD requests
    let body: BodyInit | undefined;
    if (method !== "GET" && method !== "HEAD") {
      body = await c.req.blob();
    }

    try {
      const upstream = await fetch(url, { method, headers, body });

      // For SSE streams, pipe the response directly
      const contentType = upstream.headers.get("content-type") ?? "";
      const responseHeaders: Record<string, string> = {};
      upstream.headers.forEach((value, key) => {
        // Skip hop-by-hop headers
        if (
          !["transfer-encoding", "connection", "keep-alive"].includes(
            key.toLowerCase(),
          )
        ) {
          responseHeaders[key] = value;
        }
      });

      if (contentType.includes("text/event-stream")) {
        responseHeaders["cache-control"] = "no-cache";
        responseHeaders["connection"] = "keep-alive";
      }

      const status = upstream.status as StatusCode;
      if (upstream.body) {
        return c.newResponse(upstream.body, status, responseHeaders);
      }

      const responseBody = await upstream.arrayBuffer();
      return c.newResponse(responseBody, status, responseHeaders);
    } catch (err) {
      console.error("[proxy] upstream error:", err);
      return c.json({ error: "Upstream unreachable" }, 502);
    }
  };
}
