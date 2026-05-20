/**
 * Server-side memory database singleton.
 * Uses better-sqlite3 (synchronous API) — no async wrappers.
 *
 * The memory plugin shares the same pilot.db used by push subscriptions,
 * but all memory DDL is managed here via ALL_MIGRATIONS.
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { ALL_MIGRATIONS, SCHEMA_VERSION } from "./schema.js";

const DB_PATH = process.env.PILOT_DB_PATH ?? join(process.cwd(), "pilot.db");

let _db: Database.Database | null = null;

export function getMemoryDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  // Read stored schema version via pragma
  const pragmaResult = _db.pragma("user_version") as [{ user_version: number }];
  let storedVersion = pragmaResult[0]?.user_version ?? 0;

  // Backward-compat: if pragma returns 0, try legacy schema_meta table
  if (storedVersion === 0) {
    try {
      const legacyRow = _db
        .prepare(`SELECT value FROM schema_meta WHERE key = 'version'`)
        .get() as { value: string } | undefined;
      if (legacyRow) {
        storedVersion = parseInt(legacyRow.value, 10);
        // Migrate to pragma-based versioning for future reads
        _db.pragma(`user_version = ${storedVersion}`);
      }
    } catch (err: unknown) {
      // Only swallow "no such table" (schema_meta doesn't exist in fresh DBs).
      // Re-throw any other SQLite error (corruption, I/O, locking).
      if (err instanceof Database.SqliteError && err.message.includes("no such table")) {
        // Table doesn't exist yet — migrations haven't run.
        // storedVersion stays 0, which is < SCHEMA_VERSION, so migrations will run.
      } else {
        throw err;
      }
    }
  }

  // Run migrations only when schema version has increased
  if (storedVersion < SCHEMA_VERSION) {
    for (const ddl of ALL_MIGRATIONS) {
      _db.exec(ddl);
    }

    // Record new schema version via pragma
    _db.pragma(`user_version = ${SCHEMA_VERSION}`);
  }

  return _db;
}

/** Generate a new UUID (same helper used by client-side plugin). */
export function newId(): string {
  return randomUUID();
}
