import { getDb, newId } from './database';
import type { TimelineEvent, TimelineEventType } from './schema';

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

export async function insertTimelineEvent(
  e: Omit<TimelineEvent, 'id' | 'createdAt'>,
): Promise<TimelineEvent> {
  const db = await getDb();
  const id = newId();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO memory_timeline(id, server_id, session_id, message_id, event_type, payload, created_at)
     VALUES (?,?,?,?,?,?,?)`,
    [
      id,
      e.serverId,
      e.sessionId ?? null,
      e.messageId ?? null,
      e.eventType,
      JSON.stringify(e.payload),
      now,
    ],
  );
  return { ...e, id, createdAt: now };
}

export async function getTimeline(
  serverId: string,
  limit = 100,
  offset = 0,
): Promise<TimelineEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TimelineRow>(
    `SELECT * FROM memory_timeline
     WHERE server_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [serverId, limit, offset],
  );
  return rows.map(rowToEvent);
}

export async function getTimelineBySession(sessionId: string): Promise<TimelineEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<TimelineRow>(
    'SELECT * FROM memory_timeline WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId],
  );
  return rows.map(rowToEvent);
}

export async function clearTimeline(serverId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM memory_timeline WHERE server_id = ?', [serverId]);
}
