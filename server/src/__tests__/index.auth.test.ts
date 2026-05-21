import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "@jest/globals";
import { Hono } from "hono";
import { requireBearerAuth } from "../auth.js";

const TOKEN = "test-matrix-token";

/**
 * Verify that the auth middleware correctly gates routes.
 *
 * We test against a fresh Hono app (not the singleton from index.ts)
 * to avoid jest module transform issues with import.meta.url.
 */
describe("auth middleware route gating", () => {
  let app: Hono;
  let authMw: ReturnType<typeof requireBearerAuth>;

  beforeAll(() => {
    authMw = requireBearerAuth();
  });

  beforeEach(() => {
    app = new Hono();
  });

  // ── With token configured ─────────────────────────────────────────
  describe("with PILOT_AUTH_TOKEN set", () => {
    beforeEach(() => {
      process.env.PILOT_AUTH_TOKEN = TOKEN;
    });

    afterEach(() => {
      delete process.env.PILOT_AUTH_TOKEN;
    });

    it("returns 401 on unprotected route without auth header", async () => {
      app.use("/api/*", authMw);
      app.get("/api/test", (c) => c.json({ ok: true }));
      const res = await app.request("/api/test");
      expect(res.status).toBe(401);
    });

    it("allows route with correct auth header", async () => {
      app.use("/api/*", authMw);
      app.get("/api/test", (c) => c.json({ ok: true }));
      const res = await app.request("/api/test", {
        headers: { authorization: `Bearer ${TOKEN}` },
      });
      expect(res.status).toBe(200);
    });

    it("rejects wrong bearer token", async () => {
      app.use("/api/*", authMw);
      app.get("/api/test", (c) => c.json({ ok: true }));
      const res = await app.request("/api/test", {
        headers: { authorization: "Bearer wrong-token" },
      });
      expect(res.status).toBe(401);
    });

    it("rejects non-Bearer scheme", async () => {
      app.use("/api/*", authMw);
      app.get("/api/test", (c) => c.json({ ok: true }));
      const res = await app.request("/api/test", {
        headers: { authorization: "Basic " + Buffer.from("x:y").toString("base64") },
      });
      expect(res.status).toBe(401);
    });

    it("returns 401 on POST route without auth", async () => {
      app.use("/api/*", authMw);
      app.post("/api/submit", (c) => c.json({ ok: true }));
      const res = await app.request("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: "test" }),
      });
      expect(res.status).toBe(401);
    });

    it("does not gate routes outside the protected path", async () => {
      app.use("/api/*", authMw);
      app.get("/public", (c) => c.json({ ok: true }));
      const res = await app.request("/public");
      expect(res.status).toBe(200);
    });

    it("falls through when route has no handler (Hono 404)", async () => {
      app.use("/api/*", authMw);
      // No handler for /api/test — but middleware still runs first
      const res = await app.request("/api/test");
      expect(res.status).toBe(401);
    });
  });

  // ── Without token configured ───────────────────────────────────────
  describe("with PILOT_AUTH_TOKEN unset", () => {
    beforeEach(() => {
      delete process.env.PILOT_AUTH_TOKEN;
    });

    it("rejects routes when no token is configured", async () => {
      app.use("/api/*", authMw);
      app.get("/api/test", (c) => c.json({ ok: true }));
      const res = await app.request("/api/test");
      expect(res.status).toBe(401);
    });
  });

  describe("with PILOT_AUTH_DISABLE=1", () => {
    beforeEach(() => {
      process.env.PILOT_AUTH_DISABLE = "1";
    });

    afterEach(() => {
      delete process.env.PILOT_AUTH_DISABLE;
    });

    it("allows routes without auth header when disabled", async () => {
      app.use("/api/*", authMw);
      app.get("/api/test", (c) => c.json({ ok: true }));
      const res = await app.request("/api/test");
      expect(res.status).toBe(200);
    });
  });
});
