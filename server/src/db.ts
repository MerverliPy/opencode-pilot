/**
 * SQLite database for the Pilot server.
 *
 * Stores push subscriptions and other server-side state.
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { join } from "path";

const DB_PATH = process.env.PILOT_DB_PATH ?? join(process.cwd(), "pilot.db");

const db = new Database(DB_PATH);

// ─── Push subscriptions ──────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id      TEXT PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh   TEXT NOT NULL,
    auth     TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

export type PushSubscriptionRecord = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: number;
};

export function savePushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): void {
  const id = randomUUID();
  const stmt = db.prepare(
    `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth)
     VALUES (@id, @endpoint, @p256dh, @auth)
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       created_at = excluded.created_at`,
  );
  stmt.run({
    id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
  });
}

export function removePushSubscription(endpoint: string): void {
  const stmt = db.prepare(
    "DELETE FROM push_subscriptions WHERE endpoint = @endpoint",
  );
  stmt.run({ endpoint });
}

export function getAllPushSubscriptions(): PushSubscriptionRecord[] {
  const stmt = db.prepare("SELECT * FROM push_subscriptions");
  return stmt.all() as PushSubscriptionRecord[];
}

// ─── Session tags ─────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS session_tags (
    session_id TEXT PRIMARY KEY,
    tags TEXT NOT NULL DEFAULT '[]',
    folder TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`);

export type SessionTagsRecord = {
  session_id: string;
  tags: string;
  folder: string;
  updated_at: number;
};

/** Get all session tags metadata */
export function getAllSessionTags(): SessionTagsRecord[] {
  const stmt = db.prepare("SELECT * FROM session_tags");
  return stmt.all() as SessionTagsRecord[];
}

/** Get tags for a specific session */
export function getSessionTags(sessionId: string): SessionTagsRecord | undefined {
  const stmt = db.prepare("SELECT * FROM session_tags WHERE session_id = @session_id");
  return stmt.get({ session_id: sessionId }) as SessionTagsRecord | undefined;
}

/** Set tags and folder for a session (upsert) */
export function setSessionTags(sessionId: string, tags: string[], folder: string): void {
  const stmt = db.prepare(
    `INSERT INTO session_tags (session_id, tags, folder, updated_at)
     VALUES (@session_id, @tags, @folder, unixepoch())
     ON CONFLICT(session_id) DO UPDATE SET
       tags = excluded.tags,
       folder = excluded.folder,
       updated_at = excluded.updated_at`,
  );
  stmt.run({ session_id: sessionId, tags: JSON.stringify(tags), folder });
}

/** Delete tags for a session */
export function deleteSessionTags(sessionId: string): boolean {
  const stmt = db.prepare("DELETE FROM session_tags WHERE session_id = @session_id");
  const result = stmt.run({ session_id: sessionId });
  return result.changes > 0;
}
