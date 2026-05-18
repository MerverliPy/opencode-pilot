import { Hono } from "hono";
import type { Context } from "hono";
import { getAllSessionTags, getSessionTags, setSessionTags, deleteSessionTags, type SessionTagsRecord } from "./db.js";

function recordToResponse(r: SessionTagsRecord) {
  return {
    sessionId: r.session_id,
    tags: JSON.parse(r.tags) as string[],
    folder: r.folder,
    updatedAt: r.updated_at,
  };
}

export function createSessionTagsRouter(): Hono {
  const router = new Hono();

  // GET /session-tags — return all session tags
  router.get("/session-tags", (c: Context) => {
    const records = getAllSessionTags();
    return c.json(records.map(recordToResponse));
  });

  // GET /session-tags/:sessionId — get tags for one session
  router.get("/session-tags/:sessionId", (c: Context) => {
    const sessionId = c.req.param("sessionId");
    if (!sessionId) return c.json({ error: "sessionId required" }, 400);
    const record = getSessionTags(sessionId);
    if (!record) {
      return c.json({ error: "not found" }, 404);
    }
    return c.json(recordToResponse(record));
  });

  // PUT /session-tags/:sessionId — set/update tags and folder
  router.put("/session-tags/:sessionId", async (c: Context) => {
    const sessionId = c.req.param("sessionId");
    if (!sessionId) return c.json({ error: "sessionId required" }, 400);
    let body: { tags?: string[]; folder?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "invalid_request", message: "invalid JSON body" } }, 400);
    }
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const folder = typeof body.folder === "string" ? body.folder : "";
    setSessionTags(sessionId, tags, folder);
    const record = getSessionTags(sessionId)!;
    return c.json(recordToResponse(record));
  });

  // DELETE /session-tags/:sessionId — remove tags for a session
  router.delete("/session-tags/:sessionId", (c: Context) => {
    const sessionId = c.req.param("sessionId");
    if (!sessionId) return c.json({ error: "sessionId required" }, 400);
    const deleted = deleteSessionTags(sessionId);
    if (!deleted) {
      return c.json({ error: "not found" }, 404);
    }
    return c.json({ deleted: true });
  });

  return router;
}
