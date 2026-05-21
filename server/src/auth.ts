import type { MiddlewareHandler, Context } from "hono";
import type { IncomingMessage } from "node:http";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

const AUTH_ENV_NAME = "PILOT_AUTH_TOKEN";
const BEARER_PREFIX = "Bearer ";
const AUTH_DISABLE_ENV_NAME = "PILOT_AUTH_DISABLE";

// ─── Session constants ──────────────────────────────────────────────────────────
export const SESSION_COOKIE_NAME = "pilot_session";
const SESSION_IDLE_MS = 24 * 60 * 60 * 1000; // 24h
const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000; // 7d
const SESSION_PURGE_INTERVAL_MS = 600_000; // 10 min

interface SessionData {
  username: string;
  createdAt: number;
  expiresAt: number; // absolute expiry (idle-resettable, capped at createdAt + SESSION_ABSOLUTE_MS)
}

export async function tokensEqualConstantTime(
  actual: string,
  expected: string,
): Promise<boolean> {
  const { timingSafeEqual } = await import("node:crypto");
  const actualBuf = Buffer.from(actual);
  const expectedBuf = Buffer.from(expected);
  const maxLength = Math.max(actualBuf.length, expectedBuf.length, 1);

  const paddedActual = Buffer.alloc(maxLength);
  const paddedExpected = Buffer.alloc(maxLength);
  actualBuf.copy(paddedActual);
  expectedBuf.copy(paddedExpected);

  return (
    timingSafeEqual(paddedActual, paddedExpected) &&
    actualBuf.length === expectedBuf.length
  );
}

// ─── In-memory session store ────────────────────────────────────────────────────
const sessions = new Map<string, SessionData>();

// Clean up expired sessions on an interval (don't keep the process alive).
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(id);
  }
}, SESSION_PURGE_INTERVAL_MS).unref();

// ─── Bearer auth (existing, unchanged) ──────────────────────────────────────────

export function getConfiguredAuthToken(): string | null {
  const token = process.env[AUTH_ENV_NAME]?.trim();
  return token ? token : null;
}

export function isAuthEnabled(): boolean {
  return getConfiguredAuthToken() !== null;
}

export function isAuthDisabled(): boolean {
  const val = process.env[AUTH_DISABLE_ENV_NAME];
  return val === "1" || val === "true";
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
  // Explicit dev bypass: auth completely disabled
  if (isAuthDisabled()) return true;
  // No token configured: reject by default
  if (!expectedToken) return false;
  // Token configured: require exact match
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

// ─── Session cookie helpers ─────────────────────────────────────────────────────

/** Validate a session cookie value against the in-memory store.
 *  Returns the session data if valid, null otherwise. */
export function validateSession(cookieValue: string | null | undefined): SessionData | null {
  if (!cookieValue) return null;
  const session = sessions.get(cookieValue);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(cookieValue);
    return null;
  }
  return session;
}

/** Extend the idle expiry of a valid session. */
function extendSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.expiresAt = Math.min(
    Date.now() + SESSION_IDLE_MS,
    session.createdAt + SESSION_ABSOLUTE_MS,
  );
}

/** Extend session expiry and refresh the browser cookie max-age. */
function refreshSession(c: Context, sessionId: string): void {
  extendSession(sessionId);
  setCookie(c, SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
}

/** Check whether the CSRF sentinel header is present for mutating requests. */
export function isCsrfValid(c: Context): boolean {
  return c.req.header("x-requested-with") === "PilotPWA";
}

/** Cookie options applied to every new session cookie. */
function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_IDLE_MS / 1000),
  };
}

/** Create and return a 401 JSON response consistent with the bearer flow. */
function unauthorizedResponse(c: Context): Response {
  return c.json({ error: "Unauthorized" }, 401, { "WWW-Authenticate": "Bearer" });
}

// ─── Unified auth middleware ────────────────────────────────────────────────────

/**
 * Middleware that accepts EITHER a valid session cookie OR a valid bearer token.
 *
 * When cookie auth is used on a mutating method (POST/PUT/PATCH/DELETE), the
 * request must also include the CSRF sentinel header `X-Requested-With: PilotPWA`.
 */
export function requireAuth(): MiddlewareHandler {
  return async (c, next) => {
    // 1 — Bearer token (backward compat for CLI/API automation)
    if (isAuthorizedHeaderValue(c.req.header("authorization"))) {
      await next();
      return;
    }

    // 2 — Session cookie
    const sessionCookie = getCookie(c, SESSION_COOKIE_NAME);
    if (!sessionCookie) {
      return unauthorizedResponse(c);
    }
    const session = validateSession(sessionCookie);

    if (session) {
      // CSRF protection for mutating requests authenticated via cookie
      const method = c.req.method;
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        if (!isCsrfValid(c)) {
          return c.json({ error: "Invalid or missing CSRF header" }, 403);
        }
      }
      // Extend session idle time and refresh the cookie expiry in the browser.
      refreshSession(c, sessionCookie);
      await next();
      return;
    }

    // 3 — Neither valid
    return unauthorizedResponse(c);
  };
}

// ─── Auth route handlers ────────────────────────────────────────────────────────

export async function handleLogin(c: Context): Promise<Response> {
  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const username = body.username?.trim();
  const password = body.password ?? "";

  if (!username) {
    return c.json({ ok: false, error: "Username is required" }, 400);
  }

  // Dev bypass
  if (isAuthDisabled()) {
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    sessions.set(sessionId, {
      username,
      createdAt: now,
      expiresAt: Math.min(now + SESSION_IDLE_MS, now + SESSION_ABSOLUTE_MS),
    });
    setCookie(c, SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
    return c.json({ ok: true, username });
  }

  // Auth token must be configured
  const configuredToken = getConfiguredAuthToken();
  if (!configuredToken) {
    return c.json({ ok: false, error: "Server auth is not configured" }, 401);
  }

  // Validate password against configured token without leaking token length.
  if (typeof password !== "string" || !configuredToken) {
    return c.json({ ok: false, error: "Invalid credentials" }, 401);
  }
  if (!(await tokensEqualConstantTime(password, configuredToken))) {
    return c.json({ ok: false, error: "Invalid credentials" }, 401);
  }

  // Create session
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  sessions.set(sessionId, {
    username,
    createdAt: now,
    expiresAt: Math.min(now + SESSION_IDLE_MS, now + SESSION_ABSOLUTE_MS),
  });
  setCookie(c, SESSION_COOKIE_NAME, sessionId, sessionCookieOptions());
  return c.json({ ok: true, username });
}

export async function handleLogout(c: Context): Promise<Response> {
  if (!isCsrfValid(c)) {
    return c.json({ ok: false, error: "Invalid or missing CSRF header" }, 403);
  }

  const sessionCookie = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionCookie) {
    sessions.delete(sessionCookie);
  }
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
}

export async function handleAuthStatus(c: Context): Promise<Response> {
  const sessionCookie = getCookie(c, SESSION_COOKIE_NAME);
  const session = validateSession(sessionCookie);
  if (session && sessionCookie) {
    refreshSession(c, sessionCookie);
    return c.json({ authenticated: true, username: session.username });
  }
  return c.json({ authenticated: false });
}
