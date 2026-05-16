import { describe, it, expect, beforeEach } from "@jest/globals";

process.env.PILOT_DB_PATH = ":memory:";

import {
  savePushSubscription,
  removePushSubscription,
  getAllPushSubscriptions,
} from "../db.js";

beforeEach(() => {
  // Clean all subscriptions between tests since :memory: DB is shared
  getAllPushSubscriptions().forEach((s) => removePushSubscription(s.endpoint));
});

function sampleSub(overrides?: Record<string, unknown>) {
  const id = Math.random().toString(36).slice(2);
  return {
    endpoint: `https://push.example.com/sub_${id}`,
    keys: { p256dh: "test-p256dh-key", auth: "test-auth-key" },
    ...overrides,
  };
}

describe("push subscriptions db", () => {
  it("getAllPushSubscriptions returns empty array initially", () => {
    const subs = getAllPushSubscriptions();
    expect(subs).toEqual([]);
  });

  it("savePushSubscription creates a subscription record", () => {
    const sub = sampleSub();
    savePushSubscription(sub);
    const all = getAllPushSubscriptions();
    expect(all).toHaveLength(1);
    expect(all[0].endpoint).toBe(sub.endpoint);
    expect(all[0].p256dh).toBe(sub.keys.p256dh);
    expect(all[0].auth).toBe(sub.keys.auth);
  });

  it("savePushSubscription upserts on duplicate endpoint", () => {
    const endpoint = "https://push.example.com/upsert-test";
    savePushSubscription({ endpoint, keys: { p256dh: "old-key", auth: "old-auth" } });
    savePushSubscription({ endpoint, keys: { p256dh: "new-key", auth: "new-auth" } });
    const all = getAllPushSubscriptions();
    const match = all.filter((s) => s.endpoint === endpoint);
    expect(match).toHaveLength(1);
    expect(match[0].p256dh).toBe("new-key");
    expect(match[0].auth).toBe("new-auth");
  });

  it("removePushSubscription removes subscription by endpoint", () => {
    const sub = sampleSub();
    savePushSubscription(sub);
    expect(getAllPushSubscriptions()).toHaveLength(1);
    removePushSubscription(sub.endpoint);
    expect(getAllPushSubscriptions()).toHaveLength(0);
  });

  it("getAllPushSubscriptions returns all saved subscriptions", () => {
    savePushSubscription(sampleSub());
    savePushSubscription(sampleSub());
    savePushSubscription(sampleSub());
    expect(getAllPushSubscriptions()).toHaveLength(3);
  });
});
