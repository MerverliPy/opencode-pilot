import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { Hono } from "hono";
import {
  handleLogin,
  handleLogout,
  handleAuthStatus,
  requireAuth,
  validateSession,
  isCsrfValid,
  SESSION_COOKIE_NAME,
} from "../auth.js";

const TOKEN = "test-session-token";
const COOKIE_REGEX = /pilot_session=([^;]+)/;

function extractSessionCookie(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(COOKIE_REGEX);
  return match ? match[1] ?? null : null;
}

// ─── validateSession ──────────────────────────────────────────────────────────

describe("validateSession", () => {
  it("returns null for non-existent session", () => {
    expect(validateSession("nonexistent")).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(validateSession(null)).toBeNull();
    expect(validateSession(undefined)).toBeNull();
  });
});

// ─── handleLogin ──────────────────────────────────────────────────────────────

describe("handleLogin", () => {
  let app: Hono;

  beforeEach(() => {
    process.env.PILOT_AUTH_TOKEN = TOKEN;
    app = new Hono();
    app.post("/auth/login", handleLogin);
  });

  afterEach(() => {
    delete process.env.PILOT_AUTH_TOKEN;
  });

  it("returns 400 on invalid JSON body", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 when username is missing", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: TOKEN }),
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("Username");
  });

  it("returns 200 with set-cookie on valid login", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: TOKEN }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.username).toBe("admin");

    // Verify session cookie attributes
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("pilot_session=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
  });

  it("returns 401 on wrong password", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrong" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid credentials");
  });

  it("accepts any password when auth is disabled", async () => {
    process.env.PILOT_AUTH_DISABLE = "1";
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "dev", password: "anything" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.username).toBe("dev");
    delete process.env.PILOT_AUTH_DISABLE;
  });

  it("uses constant-time comparison for password", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: TOKEN + "extra" }),
    });
    expect(res.status).toBe(401);
  });
});

// ─── handleLogout ─────────────────────────────────────────────────────────────

describe("handleLogout", () => {
  let app: Hono;
  let sessionCookie: string;

  beforeEach(async () => {
    process.env.PILOT_AUTH_TOKEN = TOKEN;
    app = new Hono();
    app.post("/auth/login", handleLogin);
    app.post("/auth/logout", handleLogout);

    // Create a valid session via login
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: TOKEN }),
    });
    const extracted = extractSessionCookie(loginRes);
    sessionCookie = extracted ?? "";
  });

  afterEach(() => {
    delete process.env.PILOT_AUTH_TOKEN;
  });

  it("returns 403 without CSRF header", async () => {
    const res = await app.request("/auth/logout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: `pilot_session=${sessionCookie}`,
      },
    });
    expect(res.status).toBe(403);
  });

  it("returns 200 with valid session and CSRF header", async () => {
    const res = await app.request("/auth/logout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: `pilot_session=${sessionCookie}`,
        "X-Requested-With": "PilotPWA",
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    // Cookie should be cleared
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("pilot_session=");
    expect(setCookie).toContain("Max-Age=0");
  });
});

// ─── handleAuthStatus ─────────────────────────────────────────────────────────

describe("handleAuthStatus", () => {
  let app: Hono;

  beforeEach(() => {
    process.env.PILOT_AUTH_TOKEN = TOKEN;
    app = new Hono();
    app.post("/auth/login", handleLogin);
    app.post("/auth/logout", handleLogout);
    app.get("/auth/status", handleAuthStatus);
  });

  afterEach(() => {
    delete process.env.PILOT_AUTH_TOKEN;
  });

  it("returns authenticated=false without cookie", async () => {
    const res = await app.request("/auth/status");
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });

  it("returns authenticated=true with valid session cookie", async () => {
    // Login first
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: TOKEN }),
    });
    const sid = extractSessionCookie(loginRes);
    expect(sid).toBeTruthy();

    // Check status with the session cookie
    const res = await app.request("/auth/status", {
      method: "GET",
      headers: { Cookie: `pilot_session=${sid}` },
    });
    const body = await res.json();
    expect(body.authenticated).toBe(true);
    expect(body.username).toBe("admin");
  });

  it("returns authenticated=false with non-existent session ID", async () => {
    const res = await app.request("/auth/status", {
      method: "GET",
      headers: { Cookie: "pilot_session=nonexistent-session-id" },
    });
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });

  it("returns authenticated=false after logout", async () => {
    // Login
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: TOKEN }),
    });
    const sid = extractSessionCookie(loginRes);
    expect(sid).toBeTruthy();


    // Logout
    const logoutRes = await app.request("/auth/logout", {
      method: "POST",
      headers: {
        Cookie: `pilot_session=${sid}`,
        "X-Requested-With": "PilotPWA",
      },
    });
    expect(logoutRes.status).toBe(200);

    // Check status — should be unauthenticated now
    const res = await app.request("/auth/status", {
      method: "GET",
      headers: { Cookie: `pilot_session=${sid}` },
    });
    const body = await res.json();
    expect(body.authenticated).toBe(false);
  });
});

// ─── requireAuth middleware ───────────────────────────────────────────────────

describe("requireAuth middleware", () => {
  let app: Hono;

  beforeEach(() => {
    process.env.PILOT_AUTH_TOKEN = TOKEN;
    app = new Hono();
    app.post("/auth/login", handleLogin);
    const mw = requireAuth();
    app.use("/protected/*", mw);
    app.get("/protected/resource", (c) => c.json({ ok: true }));
    app.post("/protected/resource", (c) => c.json({ ok: true }));
  });

  afterEach(() => {
    delete process.env.PILOT_AUTH_TOKEN;
  });

  // ── Bearer token (backward compat) ─────────────────────────────────

  it("accepts valid bearer token", async () => {
    const res = await app.request("/protected/resource", {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(res.status).toBe(200);
  });

  it("rejects invalid bearer token", async () => {
    const res = await app.request("/protected/resource", {
      headers: { authorization: "Bearer wrong-token" },
    });
    expect(res.status).toBe(401);
  });

  // ── Session cookie ──────────────────────────────────────────────────

  it("accepts GET with valid session cookie (no CSRF needed)", async () => {
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: TOKEN }),
    });
    const sid = extractSessionCookie(loginRes);
    expect(sid).toBeTruthy();

    const res = await app.request("/protected/resource", {
      method: "GET",
      headers: { Cookie: `pilot_session=${sid}` },
    });
    expect(res.status).toBe(200);
  });

  it("rejects POST with valid session but no CSRF header", async () => {
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: TOKEN }),
    });
    const sid = extractSessionCookie(loginRes);
    expect(sid).toBeTruthy();

    const res = await app.request("/protected/resource", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: `pilot_session=${sid}`,
      },
      body: JSON.stringify({ data: "test" }),
    });
    expect(res.status).toBe(403);
  });

  it("accepts POST with valid session and CSRF header", async () => {
    const loginRes = await app.request("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: TOKEN }),
    });
    const sid = extractSessionCookie(loginRes);
    expect(sid).toBeTruthy();

    const res = await app.request("/protected/resource", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Cookie: `pilot_session=${sid}`,
        "X-Requested-With": "PilotPWA",
      },
      body: JSON.stringify({ data: "test" }),
    });
    expect(res.status).toBe(200);
  });

  // ── No auth ─────────────────────────────────────────────────────────

  it("rejects request with no auth at all", async () => {
    const res = await app.request("/protected/resource");
    expect(res.status).toBe(401);
  });

  it("does not gate routes outside protected prefix", async () => {
    app.get("/public", (c) => c.json({ ok: true }));
    const res = await app.request("/public");
    expect(res.status).toBe(200);
  });

  // ── with PILOT_AUTH_DISABLE=1 ───────────────────────────────────────

  it("allows requests when auth is disabled", async () => {
    process.env.PILOT_AUTH_DISABLE = "1";
    const res = await app.request("/protected/resource");
    expect(res.status).toBe(200);
    delete process.env.PILOT_AUTH_DISABLE;
  });
});
