/**
 * Hono proxy middleware for the Pilot server.
 *
 * Forwards all /api/* requests to the upstream OpenCode server.
 * Preserves headers (including Authorization) and handles SSE streams.
 */
import type { Context, MiddlewareHandler } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { createXmlFilter, type XmlFilter } from "./n9routerChat.js";

export type ProxyConfig = {
  upstreamUrl: string;
  username?: string;
  password?: string;
  pilotAuthToken?: string | null;
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

  if (
    cfg.pilotAuthToken &&
    headers.authorization === `Bearer ${cfg.pilotAuthToken}`
  ) {
    delete headers.authorization;
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
      const upstream = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(30_000) });

      // For SSE streams, pipe the response directly
      const contentType = upstream.headers.get("content-type") ?? "";
      const responseHeaders: Record<string, string> = {};
      upstream.headers.forEach((value, key) => {
        // Skip hop-by-hop headers
        if (
          !["transfer-encoding", "connection", "keep-alive", "te", "trailer", "proxy-authenticate", "proxy-authorization", "upgrade", "content-encoding", "content-length"].includes(
            key.toLowerCase(),
          )
        ) {
          responseHeaders[key] = value;
        }
      });

      if (contentType.includes("text/event-stream")) {
        responseHeaders["cache-control"] = "no-cache";
        responseHeaders["connection"] = "keep-alive";
        responseHeaders["x-accel-buffering"] = "no";   // nginx anti-buffering
        responseHeaders["content-encoding"] = "identity";  // prevent compression buffering
      }

      const status = upstream.status as StatusCode;
      const nullBody = status === 204 || status === 304;
      if (upstream.body && !nullBody) {
        const isSSE = contentType.includes("text/event-stream");
        const xmlFilter: XmlFilter | null = isSSE ? createXmlFilter() : null;
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        // Buffer for partial SSE lines split across chunk boundaries
        let lineBuffer = "";

        const transform = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            if (!xmlFilter) {
              // Non-SSE: pass through unmodified
              controller.enqueue(chunk);
              return;
            }

            const text = decoder.decode(chunk, { stream: true });
            lineBuffer += text;
            const lines = lineBuffer.split("\n");
            // Keep the last (potentially incomplete) line in the buffer
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
                  // Filter text and reasoning parts
                  if (parsed.properties?.part?.text) {
                    const orig = parsed.properties.part.text;
                    const filtered = xmlFilter.filter(orig);
                    if (filtered !== orig) {
                      parsed.properties.part.text = filtered;
                      modified = true;
                    }
                  }
                  // Also filter raw message content if present
                  if (typeof parsed.content === "string") {
                    const orig = parsed.content;
                    const filtered = xmlFilter.filter(orig);
                    if (filtered !== orig) {
                      parsed.content = filtered;
                      modified = true;
                    }
                  }
                  // Also filter OpenAI-compatible choices[0].delta.content path
                  const deltaContent = (parsed as { choices?: Array<{ delta?: { content?: string } }> }).choices?.[0]?.delta?.content;
                  if (typeof deltaContent === "string") {
                    const orig = deltaContent;
                    const filtered = xmlFilter.filter(orig);
                    if (filtered !== orig) {
                      (parsed as { choices: Array<{ delta: { content: string } }> }).choices[0].delta.content = filtered;
                      modified = true;
                    }
                  }
                  if (modified) {
                    outLines.push("data: " + JSON.stringify(parsed));
                  } else {
                    outLines.push(line);
                  }
                } catch {
                  // JSON parse failed — still filter XML from the raw data content
                  const dataContent = line.slice(6); // Remove "data: " prefix
                  const filtered = xmlFilter.filter(dataContent);
                  if (filtered !== dataContent) {
                    outLines.push("data: " + filtered);
                  } else {
                    outLines.push(line);
                  }
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
            // Emit any remaining partial line in the buffer, filtered
            if (lineBuffer && xmlFilter) {
              const filtered = xmlFilter.filter(lineBuffer);
              if (filtered) {
                controller.enqueue(encoder.encode(filtered + "\n"));
              }
            }
          },
        });

        upstream.body
          .pipeTo(transform.writable)
          .catch((err: unknown) => {
            console.error("[proxy] stream pipe error:", err instanceof Error ? err.message : String(err));
          });
        return c.newResponse(transform.readable, status, responseHeaders);
      }

      const responseBody = nullBody ? null : await upstream.arrayBuffer();
      return c.newResponse(responseBody, status, responseHeaders);
    } catch (err) {
      console.error("[proxy] upstream error:", err);
      return c.json({ error: "Upstream unreachable" }, 502);
    }
  };
}
