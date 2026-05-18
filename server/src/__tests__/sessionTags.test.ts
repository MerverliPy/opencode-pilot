import { describe, expect, it, beforeAll } from "@jest/globals";

process.env.PILOT_DB_PATH = ":memory:";

import { Hono } from "hono";
import { createSessionTagsRouter } from "../sessionTags.js";

describe("sessionTags router", () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.route("/", createSessionTagsRouter());
  });

  it("GET /session-tags returns 200 with array", async () => {
    const res = await app.request("/session-tags");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /session-tags/:id returns 404 for unknown session", async () => {
    const res = await app.request("/session-tags/nonexistent");
    expect(res.status).toBe(404);
  });

  it("PUT /session-tags/:id with valid body returns 200", async () => {
    const res = await app.request("/session-tags/test-session", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["test"], folder: "test-folder" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe("test-session");
    expect(body.tags).toEqual(["test"]);
    expect(body.folder).toBe("test-folder");
  });

  it("PUT /session-tags/:id with invalid JSON returns 400", async () => {
    const res = await app.request("/session-tags/test-session", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
  });

  it("GET /session-tags/:id returns tags after PUT", async () => {
    // Put first
    await app.request("/session-tags/read-test", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["read"], folder: "reading" }),
    });
    // Then get
    const res = await app.request("/session-tags/read-test");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tags).toEqual(["read"]);
    expect(body.folder).toBe("reading");
  });

  it("DELETE /session-tags/:id returns 404 for nonexistent", async () => {
    const res = await app.request("/session-tags/never-created", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /session-tags/:id returns 200 after creating", async () => {
    // Create first
    await app.request("/session-tags/del-test", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: [], folder: "" }),
    });
    // Then delete
    const res = await app.request("/session-tags/del-test", {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
  });

  it("GET /session-tags includes newly created tags in list", async () => {
    await app.request("/session-tags/list-test", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["listed"], folder: "list-folder" }),
    });
    const res = await app.request("/session-tags");
    const body = await res.json();
    const found = body.find((t: any) => t.sessionId === "list-test");
    expect(found).toBeDefined();
    expect(found.tags).toEqual(["listed"]);
    expect(found.folder).toBe("list-folder");
  });
});
