import {
  getProfile,
  upsertProfileEntry,
  deleteProfileEntry,
  clearProfile,
} from "../ProfileRepository";
import { getDb, closeDb } from "../database";

describe("ProfileRepository", () => {
  beforeEach(async () => {
    const sqlite = require("expo-sqlite") as any;
    sqlite.__resetDatabases();
    await getDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  it("upsertProfileEntry inserts new entry", async () => {
    const entry = await upsertProfileEntry("srv1", "name", "Alice", 0.9);
    expect(entry.key).toBe("name");
    expect(entry.value).toBe("Alice");
  });

  it("upsertProfileEntry updates existing entry", async () => {
    await upsertProfileEntry("srv1", "name", "Alice", 0.9);
    const updated = await upsertProfileEntry("srv1", "name", "Bob", 0.95);
    expect(updated.value).toBe("Bob");
  });

  it("getProfile returns entries for server", async () => {
    await upsertProfileEntry("srv1", "a", "1", 0.9);
    await upsertProfileEntry("srv1", "b", "2", 0.9);
    await upsertProfileEntry("srv2", "c", "3", 0.9);
    const entries = await getProfile("srv1");
    expect(entries).toHaveLength(2);
  });

  it("getProfile orders by key", async () => {
    await upsertProfileEntry("srv1", "z", "last", 0.9);
    await upsertProfileEntry("srv1", "a", "first", 0.9);
    const entries = await getProfile("srv1");
    expect(entries[0].key).toBe("a");
    expect(entries[1].key).toBe("z");
  });

  it("deleteProfileEntry removes entry", async () => {
    await upsertProfileEntry("srv1", "name", "Alice", 0.9);
    await deleteProfileEntry("srv1", "name");
    const entries = await getProfile("srv1");
    expect(entries).toHaveLength(0);
  });

  it("clearProfile removes all entries for server", async () => {
    await upsertProfileEntry("srv1", "a", "1", 0.9);
    await upsertProfileEntry("srv1", "b", "2", 0.9);
    await upsertProfileEntry("srv2", "c", "3", 0.9);
    await clearProfile("srv1");
    expect(await getProfile("srv1")).toHaveLength(0);
    expect(await getProfile("srv2")).toHaveLength(1);
  });
});
