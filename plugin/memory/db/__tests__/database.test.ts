import { getDb, closeDb, newId } from "@/plugin/memory/db/database";

describe("database", () => {
  beforeEach(() => {
    const sqlite = require("expo-sqlite") as any;
    sqlite.__resetDatabases();
  });

  afterEach(async () => {
    await closeDb();
  });

  it("getDb returns same instance on repeated calls", async () => {
    const db1 = await getDb();
    const db2 = await getDb();
    expect(db1).toBe(db2);
  });

  it("getDb creates new instance after closeDb", async () => {
    const db1 = await getDb();
    await closeDb();
    const db2 = await getDb();
    expect(db1).not.toBe(db2);
  });

  it("newId returns unique strings", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(newId());
    }
    expect(ids.size).toBe(100);
  });

  it("newId returns string of expected length", () => {
    const id = newId();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(36); // UUID-like format
  });
});
