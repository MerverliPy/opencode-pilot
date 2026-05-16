import { describe, it, expect, jest } from "@jest/globals";

jest.mock("web-push", () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

process.env.PILOT_DB_PATH = ":memory:";

import { createPushRouter, broadcastPushNotification } from "../push.js";
import { savePushSubscription, getAllPushSubscriptions } from "../db.js";
import webPush from "web-push";

const mockWebPush = webPush as jest.Mocked<typeof webPush>;

function validSub() {
  return {
    endpoint: "https://push.example.com/sub_1",
    keys: { p256dh: "p256dh-key", auth: "auth-key" },
  };
}

describe("push router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /status returns enabled=false when no VAPID keys", async () => {
    const router = createPushRouter({});
    const res = await router.request("/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(false);
    expect(body.publicKey).toBeNull();
  });

  it("GET /status returns enabled=true with VAPID keys", async () => {
    const router = createPushRouter({
      vapidPublicKey: "pub-key",
      vapidPrivateKey: "priv-key",
    });
    const res = await router.request("/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
    expect(body.publicKey).toBe("pub-key");
  });

  it("POST /subscribe returns 400 for invalid body", async () => {
    const router = createPushRouter({
      vapidPublicKey: "key",
      vapidPrivateKey: "secret",
    });
    const res = await router.request("/subscribe", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid subscription/i);
  });

  it("POST /subscribe returns 503 when push not configured", async () => {
    const router = createPushRouter({});
    const res = await router.request("/subscribe", {
      method: "POST",
      body: JSON.stringify(validSub()),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(503);
  });

  it("POST /subscribe returns 200 for valid subscription", async () => {
    const router = createPushRouter({
      vapidPublicKey: "key",
      vapidPrivateKey: "secret",
    });
    const res = await router.request("/subscribe", {
      method: "POST",
      body: JSON.stringify(validSub()),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("POST /unsubscribe returns 400 for missing endpoint", async () => {
    const router = createPushRouter({
      vapidPublicKey: "key",
      vapidPrivateKey: "secret",
    });
    const res = await router.request("/unsubscribe", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(400);
  });

  it("broadcastPushNotification handles 410 by removing subscription", async () => {
    const sub = validSub();
    savePushSubscription(sub);
    expect(getAllPushSubscriptions()).toHaveLength(1);

    mockWebPush.sendNotification.mockRejectedValueOnce({
      statusCode: 410,
    });

    await broadcastPushNotification({
      title: "test",
      body: "body",
    });

    expect(getAllPushSubscriptions()).toHaveLength(0);
  });
});
