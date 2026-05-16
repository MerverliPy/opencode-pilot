import { describe, it, expect } from "@jest/globals";

process.env.PILOT_DB_PATH = ":memory:";

import {
  insertTimelineEvent,
  getTimeline,
  getTimelineBySession,
  clearTimeline,
} from "../TimelineRepository.js";

const SERVER_ID = "test-server-t1";
const SESSION_ID = "test-session-1";

function sampleEvent(
  overrides?: Record<string, unknown>,
  payload?: Record<string, unknown>,
) {
  return {
    serverId: SERVER_ID,
    sessionId: SESSION_ID,
    messageId: undefined as string | undefined,
    eventType: "prompt_sent" as const,
    payload: payload ?? { text: "hello" },
    ...overrides,
  };
}

describe("TimelineRepository", () => {
  it("insertTimelineEvent creates event with id and timestamp", () => {
    const ev = insertTimelineEvent(sampleEvent());
    expect(ev.id).toBeTruthy();
    expect(ev.createdAt).toBeGreaterThan(0);
    expect(ev.serverId).toBe(SERVER_ID);
    expect(ev.eventType).toBe("prompt_sent");
    expect(ev.payload).toEqual({ text: "hello" });
  });

  it("getTimeline returns events in DESC order (most recent first)", () => {
    const e1 = insertTimelineEvent(
      sampleEvent({}, { seq: 1 }),
    );
    const e2 = insertTimelineEvent(
      sampleEvent({}, { seq: 2 }),
    );
    const results = getTimeline(SERVER_ID);
    expect(results.length).toBeGreaterThanOrEqual(2);
    // Most recent event should be first
    expect(results[0].createdAt).toBeGreaterThanOrEqual(
      results[results.length - 1].createdAt,
    );
  });

  it("getTimeline respects limit parameter", () => {
    insertTimelineEvent(sampleEvent({}, { seq: 1 }));
    insertTimelineEvent(sampleEvent({}, { seq: 2 }));
    insertTimelineEvent(sampleEvent({}, { seq: 3 }));
    const results = getTimeline(SERVER_ID, 2);
    expect(results).toHaveLength(2);
  });

  it("getTimeline respects offset parameter", () => {
    insertTimelineEvent(sampleEvent({}, { seq: 1 }));
    insertTimelineEvent(sampleEvent({}, { seq: 2 }));
    insertTimelineEvent(sampleEvent({}, { seq: 3 }));
    const offset1 = getTimeline(SERVER_ID, 100, 1);
    expect(offset1.length).toBeGreaterThanOrEqual(2);
    const offset2 = getTimeline(SERVER_ID, 100, 2);
    expect(offset2.length).toBeGreaterThanOrEqual(1);
  });

  it("getTimelineBySession returns events for specific session", () => {
    insertTimelineEvent(
      sampleEvent({ sessionId: SESSION_ID }, { msg: "session-msg" }),
    );
    insertTimelineEvent(
      sampleEvent({ sessionId: "other-session" }, { msg: "other" }),
    );
    const results = getTimelineBySession(SESSION_ID);
    expect(results.every((r) => r.sessionId === SESSION_ID)).toBe(true);
    expect(results.some((r) => r.payload.msg === "session-msg")).toBe(true);
  });

  it("clearTimeline removes all events for server", () => {
    insertTimelineEvent(sampleEvent());
    insertTimelineEvent(sampleEvent());
    clearTimeline(SERVER_ID);
    expect(getTimeline(SERVER_ID)).toHaveLength(0);
  });
});
