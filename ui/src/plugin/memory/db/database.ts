/**
 * SQLite connection singleton for the memory plugin.
 * Opens the database once and runs all migrations.
 */
import * as SQLite from 'expo-sqlite';
import { ALL_MIGRATIONS, SCHEMA_VERSION } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  const db = await SQLite.openDatabaseAsync('pilot_memory.db');

  // Enable WAL mode for better concurrent read performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Run all DDL migrations (all are IF NOT EXISTS — idempotent)
  for (const sql of ALL_MIGRATIONS) {
    await db.execAsync(sql);
  }

  // Store schema version
  await db.runAsync(
    `INSERT OR REPLACE INTO schema_meta(key, value) VALUES('version', ?)`,
    [String(SCHEMA_VERSION)],
  );

  _db = db;
  return db;
}

/** Close and reset the singleton (used in tests / cleanup). */
export async function closeDb(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}

/** Generate a compact UUID-like ID without external dependencies. */
export function newId(): string {
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}
