/**
 * Server-side TimelineRepository — synchronous better-sqlite3 API.
 */
import { getMemoryDb, newId } from "./memoryDb.js";
import type { TimelineEvent, TimelineEventType } from "./schema.js";

type TimelineRow = {
  id: string;
  server_id: string;
  session_id: string | null;
  message_id: string | null;
  event_type: string;
  payload: string;
  created_at: number;
};

function rowToEvent(r: TimelineRow): TimelineEvent {
  return {
    id: r.id,
    serverId: r.server_id,
    sessionId: r.session_id ?? undefined,
    messageId: r.message_id ?? undefined,
    eventType: r.event_type as TimelineEventType,
    payload: JSON.parse(r.payload) as Record<string, unknown>,
    createdAt: r.created_at,
  };
}

export function insertTimelineEvent(
  e: Omit<TimelineEvent, "id" | "createdAt">,
): TimelineEvent {
  const db = getMemoryDb();
  const id = newId();
  const now = Date.now();
  db.prepare(
    `INSERT INTO memory_timeline(id, server_id, session_id, message_id, event_type, payload, created_at)
     VALUES (@id,@server_id,@session_id,@message_id,@event_type,@payload,@created_at)`,
  ).run({
    id,
    server_id: e.serverId,
    session_id: e.sessionId ?? null,
    message_id: e.messageId ?? null,
    event_type: e.eventType,
    payload: JSON.stringify(e.payload),
    created_at: now,
  });
  return { ...e, id, createdAt: now };
}

export function getTimeline(
  serverId: string,
  limit = 100,
  offset = 0,
): TimelineEvent[] {
  const rows = getMemoryDb()
    .prepare(
      `SELECT * FROM memory_timeline
       WHERE server_id = @server_id
       ORDER BY created_at DESC, ROWID ASC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ server_id: serverId, limit, offset }) as TimelineRow[];
  return rows.map(rowToEvent);
}

export function getTimelineBySession(sessionId: string): TimelineEvent[] {
  const rows = getMemoryDb()
    .prepare(
      "SELECT * FROM memory_timeline WHERE session_id = @session_id ORDER BY created_at ASC",
    )
    .all({ session_id: sessionId }) as TimelineRow[];
  return rows.map(rowToEvent);
}

export function clearTimeline(serverId: string): void {
  getMemoryDb()
    .prepare("DELETE FROM memory_timeline WHERE server_id = @server_id")
    .run({ server_id: serverId });
}
