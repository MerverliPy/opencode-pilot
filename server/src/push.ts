/**
 * Web Push server routes for the Pilot server.
 *
 * Provides endpoints for subscribing / unsubscribing push clients.
 * Relies on VAPID keys set via environment variables.
 */
import { Hono } from "hono";
import webPush from "web-push";
import {
  getAllPushSubscriptions,
  removePushSubscription,
  savePushSubscription,
} from "./db.js";

export type PushConfig = {
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
};

function configureVapid(cfg: PushConfig): boolean {
  if (!cfg.vapidPublicKey || !cfg.vapidPrivateKey) return false;
  webPush.setVapidDetails(
    cfg.vapidSubject ?? "mailto:pilot@localhost",
    cfg.vapidPublicKey,
    cfg.vapidPrivateKey,
  );
  return true;
}

export function createPushRouter(cfg: PushConfig): Hono {
  const router = new Hono();
  const enabled = configureVapid(cfg);

  router.get("/status", (c) =>
    c.json({
      enabled,
      publicKey: cfg.vapidPublicKey ?? null,
    }),
  );

  router.post("/subscribe", async (c) => {
    if (!enabled) return c.json({ error: "Push not configured" }, 503);

    const body = await c.req.json();
    if (
      typeof body !== "object" ||
      !body.endpoint ||
      !body.keys?.p256dh ||
      !body.keys?.auth
    ) {
      return c.json({ error: "Invalid subscription" }, 400);
    }

    try {
      savePushSubscription(body);
      return c.json({ success: true });
    } catch (err) {
      console.error("[push] subscribe error:", err);
      return c.json({ error: "Failed to save subscription" }, 500);
    }
  });

  router.post("/unsubscribe", async (c) => {
    const body = await c.req.json();
    if (!body?.endpoint) {
      return c.json({ error: "Missing endpoint" }, 400);
    }

    try {
      removePushSubscription(body.endpoint);
      return c.json({ success: true });
    } catch (err) {
      console.error("[push] unsubscribe error:", err);
      return c.json({ error: "Failed to remove subscription" }, 500);
    }
  });

  return router;
}

/**
 * Send a push notification to all registered subscriptions.
 * Called when the server observes a `session.idle` SSE event.
 */
export async function broadcastPushNotification(payload: {
  title: string;
  body: string;
  sessionId?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const subs = getAllPushSubscriptions();
  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: {
      ...payload.data,
      ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
    },
  });

  for (const sub of subs) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        message,
      );
    } catch (err) {
      console.error("[push] send failed:", err);
      // Remove stale subscriptions (410 Gone or 404 Not Found)
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 410 || status === 404) {
        removePushSubscription(sub.endpoint);
      }
    }
  }
}
