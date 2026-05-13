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
