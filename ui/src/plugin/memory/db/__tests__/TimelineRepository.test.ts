import {
  insertTimelineEvent,
  getTimeline,
  getTimelineBySession,
  clearTimeline,
} from "../TimelineRepository";
import { getDb, closeDb } from "../database";

describe("TimelineRepository", () => {
  beforeEach(async () => {
    const sqlite = require("expo-sqlite") as any;
    sqlite.__resetDatabases();
    await getDb();
  });

  afterEach(async () => {
    await closeDb();
  });

  it("insertTimelineEvent creates event", async () => {
    const event = await insertTimelineEvent({
      serverId: "srv1",
      eventType: "memory_created",
      payload: { test: true },
    });
    expect(event.id).toBeTruthy();
    expect(event.eventType).toBe("memory_created");
  });

  it("getTimeline returns events ordered by created_at DESC", async () => {
    // Pin Date.now() so both inserts share the same timestamp; the ROWID ASC
    // tiebreaker then preserves insertion order deterministically.
    const fixedTs = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(fixedTs);
    try {
      await insertTimelineEvent({
        serverId: "srv1",
        eventType: "memory_created",
        payload: {},
      });
      await insertTimelineEvent({
        serverId: "srv1",
        eventType: "memory_extracted",
        payload: {},
      });
    } finally {
      jest.spyOn(Date, "now").mockRestore();
    }
    const events = await getTimeline("srv1");
    expect(events).toHaveLength(2);
    // Equal timestamps → ROWID ASC tiebreaker preserves insertion order
    expect(events[0].eventType).toBe("memory_created");
    expect(events[1].eventType).toBe("memory_extracted");
  });

  it("getTimeline respects limit", async () => {
    await insertTimelineEvent({
      serverId: "srv1",
      eventType: "memory_created",
      payload: {},
    });
    await insertTimelineEvent({
      serverId: "srv1",
      eventType: "memory_extracted",
      payload: {},
    });
    await insertTimelineEvent({
      serverId: "srv1",
      eventType: "memory_injected",
      payload: {},
    });
    const events = await getTimeline("srv1", 2);
    expect(events).toHaveLength(2);
  });

  it("getTimelineBySession filters by session", async () => {
    await insertTimelineEvent({
      serverId: "srv1",
      sessionId: "ses1",
      eventType: "memory_created",
      payload: {},
    });
    await insertTimelineEvent({
      serverId: "srv1",
      sessionId: "ses2",
      eventType: "memory_created",
      payload: {},
    });
    const events = await getTimelineBySession("ses1");
    expect(events).toHaveLength(1);
    expect(events[0].sessionId).toBe("ses1");
  });

  it("clearTimeline removes events for server", async () => {
    await insertTimelineEvent({
      serverId: "srv1",
      eventType: "memory_created",
      payload: {},
    });
    await insertTimelineEvent({
      serverId: "srv2",
      eventType: "memory_extracted",
      payload: {},
    });
    await clearTimeline("srv1");
    expect(await getTimeline("srv1")).toHaveLength(0);
    expect(await getTimeline("srv2")).toHaveLength(1);
  });
});
