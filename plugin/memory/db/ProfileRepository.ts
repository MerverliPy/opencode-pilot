import { getDb, newId } from './database';
import type { ProfileEntry } from './schema';

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

export async function getProfile(serverId: string): Promise<ProfileEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ProfileRow>(
    'SELECT * FROM user_profile WHERE server_id = ? ORDER BY key ASC',
    [serverId],
  );
  return rows.map(rowToEntry);
}

export async function upsertProfileEntry(
  serverId: string,
  key: string,
  value: string,
  confidence: number,
  sourceMemoryId?: string,
): Promise<ProfileEntry> {
  const db = await getDb();
  const existing = await db.getFirstAsync<ProfileRow>(
    'SELECT * FROM user_profile WHERE server_id = ? AND key = ?',
    [serverId, key],
  );

  const now = Date.now();
  if (existing) {
    await db.runAsync(
      `UPDATE user_profile
       SET value = ?, confidence = ?, source_memory_id = ?, updated_at = ?
       WHERE server_id = ? AND key = ?`,
      [value, confidence, sourceMemoryId ?? null, now, serverId, key],
    );
    return rowToEntry({ ...existing, value, confidence, source_memory_id: sourceMemoryId ?? null, updated_at: now });
  }

  const id = newId();
  await db.runAsync(
    `INSERT INTO user_profile(id, server_id, key, value, confidence, source_memory_id, updated_at)
     VALUES (?,?,?,?,?,?,?)`,
    [id, serverId, key, value, confidence, sourceMemoryId ?? null, now],
  );
  return { id, serverId, key, value, confidence, sourceMemoryId, updatedAt: now };
}

export async function deleteProfileEntry(serverId: string, key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM user_profile WHERE server_id = ? AND key = ?', [serverId, key]);
}

export async function clearProfile(serverId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM user_profile WHERE server_id = ?', [serverId]);
}
