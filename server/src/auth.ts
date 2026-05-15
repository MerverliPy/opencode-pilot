import type { MiddlewareHandler } from "hono";
import type { IncomingMessage } from "node:http";

const AUTH_ENV_NAME = "PILOT_AUTH_TOKEN";
const BEARER_PREFIX = "Bearer ";

export function getConfiguredAuthToken(): string | null {
  const token = process.env[AUTH_ENV_NAME]?.trim();
  return token ? token : null;
}

export function isAuthEnabled(): boolean {
  return getConfiguredAuthToken() !== null;
}

export function getBearerTokenFromHeader(value: string | null | undefined): string | null {
  if (!value || !value.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = value.slice(BEARER_PREFIX.length).trim();
  return token ? token : null;
}

export function isAuthorizedHeaderValue(
  value: string | null | undefined,
  expectedToken: string | null = getConfiguredAuthToken(),
): boolean {
  if (!expectedToken) {
    return true;
  }

  return getBearerTokenFromHeader(value) === expectedToken;
}

export function isAuthorizedNodeRequest(
  req: IncomingMessage,
  expectedToken: string | null = getConfiguredAuthToken(),
): boolean {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  return isAuthorizedHeaderValue(value, expectedToken);
}

export function unauthorizedJson(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": "Bearer",
    },
  });
}

export function requireBearerAuth(): MiddlewareHandler {
  return async (c, next) => {
    if (!isAuthorizedHeaderValue(c.req.header("authorization"))) {
      return c.newResponse(unauthorizedJson().body, 401, {
        "Content-Type": "application/json",
        "WWW-Authenticate": "Bearer",
      });
    }

    await next();
  };
}
