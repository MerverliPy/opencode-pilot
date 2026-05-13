/**
 * Mock for expo-sqlite backed by better-sqlite3 in-memory databases.
 *
 * Provides:
 *   - openDatabaseAsync(name) → SQLiteDatabase with the async API used in production
 *   - __resetDatabases()      → wipe all in-memory dbs (call in beforeEach)
 */
import Database from "better-sqlite3";

// Registry of open databases keyed by name
const _dbs: Map<string, Database.Database> = new Map();

/** Called in test beforeEach to give every suite a clean slate. */
export function __resetDatabases(): void {
  for (const db of _dbs.values()) {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
  _dbs.clear();
}

export class SQLiteDatabase {
  private _db: Database.Database;

  constructor(db: Database.Database) {
    this._db = db;
  }

  async execAsync(sql: string): Promise<void> {
    // Skip PRAGMA foreign_keys so tests can insert child rows without
    // corresponding parent rows (FK constraints not needed in unit tests).
    const filtered = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s && !/PRAGMA\s+foreign_keys\s*=/i.test(s))
      .join(";\n");
    if (filtered.trim()) {
      this._db.exec(filtered);
    }
  }

  async runAsync(
    sql: string,
    ...params: unknown[]
  ): Promise<{ lastInsertRowId: number; changes: number }> {
    // better-sqlite3 uses positional ? params supplied as an array
    const args =
      params.length === 1 && Array.isArray(params[0])
        ? (params[0] as unknown[])
        : params;
    const stmt = this._db.prepare(sql);
    const info = stmt.run(...args);
    return {
      lastInsertRowId: Number(info.lastInsertRowid),
      changes: info.changes,
    };
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const args =
      params.length === 1 && Array.isArray(params[0])
        ? (params[0] as unknown[])
        : params;
    const stmt = this._db.prepare(sql);
    const row = stmt.get(...args) as T | undefined;
    return row ?? null;
  }

  async getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    const args =
      params.length === 1 && Array.isArray(params[0])
        ? (params[0] as unknown[])
        : params;
    const stmt = this._db.prepare(sql);
    return stmt.all(...args) as T[];
  }

  async closeAsync(): Promise<void> {
    this._db.close();
    // Remove from registry
    for (const [name, db] of _dbs.entries()) {
      if (db === this._db) {
        _dbs.delete(name);
        break;
      }
    }
  }
}

export async function openDatabaseAsync(name: string): Promise<SQLiteDatabase> {
  // Reuse an existing open database for the same name within a test run
  let db = _dbs.get(name);
  if (!db || !db.open) {
    db = new Database(":memory:");
    // Disable FK enforcement in tests — child rows inserted without parents
    db.pragma("foreign_keys = OFF");
    _dbs.set(name, db);
  }
  return new SQLiteDatabase(db);
}

export default { openDatabaseAsync, __resetDatabases, SQLiteDatabase };
