/**
 * Server-side ProfileRepository — synchronous better-sqlite3 API.
 */
import { getMemoryDb, newId } from "./memoryDb.js";
import type { ProfileEntry } from "./schema.js";

type ProfileRow = {
  id: string;
  server_id: string;
  key: string;
  value: string;
  confidence: number;
  source_memory_id: string | null;
  updated_at: number;
};

function rowToEntry(r: ProfileRow): ProfileEntry {
  return {
    id: r.id,
    serverId: r.server_id,
    key: r.key,
    value: r.value,
    confidence: r.confidence,
    sourceMemoryId: r.source_memory_id ?? undefined,
    updatedAt: r.updated_at,
  };
}

export function getProfile(serverId: string): ProfileEntry[] {
  const rows = getMemoryDb()
    .prepare(
      "SELECT * FROM user_profile WHERE server_id = @server_id ORDER BY key ASC",
    )
    .all({ server_id: serverId }) as ProfileRow[];
  return rows.map(rowToEntry);
}

export function upsertProfileEntry(
  serverId: string,
  key: string,
  value: string,
  confidence: number,
  sourceMemoryId?: string,
): ProfileEntry {
  const db = getMemoryDb();
  const existing = db
    .prepare(
      "SELECT * FROM user_profile WHERE server_id = @server_id AND key = @key",
    )
    .get({ server_id: serverId, key }) as ProfileRow | undefined;

  const now = Date.now();
  if (existing) {
    db.prepare(
      `UPDATE user_profile
       SET value = @value, confidence = @confidence,
           source_memory_id = @source_memory_id, updated_at = @updated_at
       WHERE server_id = @server_id AND key = @key`,
    ).run({
      value,
      confidence,
      source_memory_id: sourceMemoryId ?? null,
      updated_at: now,
      server_id: serverId,
      key,
    });
    return rowToEntry({
      ...existing,
      value,
      confidence,
      source_memory_id: sourceMemoryId ?? null,
      updated_at: now,
    });
  }

  const id = newId();
  db.prepare(
    `INSERT INTO user_profile(id, server_id, key, value, confidence, source_memory_id, updated_at)
     VALUES (@id,@server_id,@key,@value,@confidence,@source_memory_id,@updated_at)`,
  ).run({
    id,
    server_id: serverId,
    key,
    value,
    confidence,
    source_memory_id: sourceMemoryId ?? null,
    updated_at: now,
  });
  return {
    id,
    serverId,
    key,
    value,
    confidence,
    sourceMemoryId,
    updatedAt: now,
  };
}

export function deleteProfileEntry(serverId: string, key: string): void {
  getMemoryDb()
    .prepare(
      "DELETE FROM user_profile WHERE server_id = @server_id AND key = @key",
    )
    .run({ server_id: serverId, key });
}

export function clearProfile(serverId: string): void {
  getMemoryDb()
    .prepare("DELETE FROM user_profile WHERE server_id = @server_id")
    .run({ server_id: serverId });
}
