import { describe, it, expect } from "@jest/globals";

process.env.PILOT_DB_PATH = ":memory:";

import {
  getProfile,
  upsertProfileEntry,
  deleteProfileEntry,
  clearProfile,
} from "../ProfileRepository.js";

const SERVER_ID = "test-server-p1";

describe("ProfileRepository", () => {
  it("getProfile returns empty array for new server", () => {
    const entries = getProfile("new-server-empty");
    expect(entries).toEqual([]);
  });

  it("upsertProfileEntry creates new entry with id and timestamp", () => {
    const entry = upsertProfileEntry(SERVER_ID, "name", "Alice", 0.95);
    expect(entry.id).toBeTruthy();
    expect(entry.serverId).toBe(SERVER_ID);
    expect(entry.key).toBe("name");
    expect(entry.value).toBe("Alice");
    expect(entry.confidence).toBe(0.95);
    expect(entry.updatedAt).toBeGreaterThan(0);
  });

  it("upsertProfileEntry updates existing entry", () => {
    upsertProfileEntry(SERVER_ID, "name", "Alice", 0.5);
    const updated = upsertProfileEntry(SERVER_ID, "name", "Bob", 0.99);
    expect(updated.value).toBe("Bob");
    expect(updated.confidence).toBe(0.99);
  });

  it("getProfile returns entries sorted by key ASC", () => {
    upsertProfileEntry(SERVER_ID, "z_key", "z-value", 0.5);
    upsertProfileEntry(SERVER_ID, "a_key", "a-value", 0.5);
    upsertProfileEntry(SERVER_ID, "m_key", "m-value", 0.5);
    const entries = getProfile(SERVER_ID);
    expect(entries.length).toBeGreaterThanOrEqual(3);
    const keys = entries.map((e) => e.key);
    expect(keys).toEqual([...keys].sort());
  });

  it("deleteProfileEntry removes specific entry", () => {
    upsertProfileEntry(SERVER_ID, "keep", "keep-value", 0.5);
    upsertProfileEntry(SERVER_ID, "remove", "remove-value", 0.5);
    deleteProfileEntry(SERVER_ID, "remove");
    const entries = getProfile(SERVER_ID);
    expect(entries.some((e) => e.key === "remove")).toBe(false);
    expect(entries.some((e) => e.key === "keep")).toBe(true);
  });

  it("clearProfile removes all entries for server", () => {
    upsertProfileEntry(SERVER_ID, "a", "1", 0.5);
    upsertProfileEntry(SERVER_ID, "b", "2", 0.5);
    clearProfile(SERVER_ID);
    expect(getProfile(SERVER_ID)).toEqual([]);
  });
});
