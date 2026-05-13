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

  // Run all DDL migrations (all are idempotent CREATE IF NOT EXISTS)
  for (const ddl of ALL_MIGRATIONS) {
    _db.exec(ddl);
  }

  // Record schema version
  _db
    .prepare(
      `INSERT OR IGNORE INTO schema_meta(key, value) VALUES('version', ?)`,
    )
    .run(String(SCHEMA_VERSION));

  return _db;
}

/** Generate a new UUID (same helper used by client-side plugin). */
export function newId(): string {
  return randomUUID();
}
