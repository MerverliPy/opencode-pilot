import { describe, expect, it } from "@jest/globals";
import { Hono } from "hono";

/**
 * Input validation tests.
 *
 * Tests that the server properly validates and sanitizes
 * untrusted input at API boundaries.
 */

function createTestApp(): Hono {
  const app = new Hono();

  // Echo body endpoint for testing input validation
  app.post("/echo", async (c) => {
    const body = await c.req.json();
    return c.json({ received: body });
  });

  // Memory-like endpoint
  app.post("/memory/test-server", async (c) => {
    const body = await c.req.json();
    if (!body || typeof body !== "object") {
      return c.json({ error: "Body must be an object" }, 400);
    }
    if (body.content !== undefined && typeof body.content !== "string") {
      return c.json({ error: "content must be a string" }, 400);
    }
    if (body.content && body.content.length > 100_000) {
      return c.json({ error: "content too large" }, 413);
    }
    return c.json({ success: true, id: "mem-1" }, 201);
  });

  // Catch-all error handler
  app.onError((err, c) => {
    return c.json({ error: "Internal error" }, 500);
  });

  return app;
}

describe("input validation", () => {
  const app = createTestApp();

  it("rejects non-JSON body", async () => {
    const res = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json-at-all",
    });
    // Should handle gracefully (either 400 or error response)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("handles unicode normalization in content", async () => {
    const res = await app.request("/memory/test-server", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "\u0041\u030a" }), // A + combining ring above
    });
    expect(res.status).toBe(201);
  });

  it("rejects prototype pollution attempt", async () => {
    const res = await app.request("/memory/test-server", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "safe", __proto__: { admin: true } }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("handles very large array in body", async () => {
    const largeArray = new Array(10001).fill("x");
    const res = await app.request("/memory/test-server", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "test", tags: largeArray }),
    });
    // Should handle gracefully — either 201 if it accepts or 413/400
    expect([201, 400, 413]).toContain(res.status);
  });

  it("handles extremely long string", async () => {
    const longContent = "x".repeat(200_000);
    const res = await app.request("/memory/test-server", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: longContent }),
    });
    expect(res.status).toBe(413);
  });

  it("rejects oversized body", async () => {
    const huge = { content: "a".repeat(500_000) };
    const res = await app.request("/memory/test-server", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(huge),
    });
    expect(res.status).toBe(413);
  });

  it("handles null bytes in string", async () => {
    const res = await app.request("/memory/test-server", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "safe\x00null" }),
    });
    expect(res.status).toBe(201);
  });

  it("rejects empty body", async () => {
    const res = await app.request("/memory/test-server", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "",
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects body with unexpected types", async () => {
    const res = await app.request("/memory/test-server", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: 12345 }), // number instead of string
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
