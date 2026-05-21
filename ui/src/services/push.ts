/**
 * Web Push client service for the Pilot UI.
 *
 * Handles browser Push API subscription and unsubscription,
 * communicating with the Pilot server's /push endpoints.
 */

import { csrfHeaders } from "./auth";

const STORAGE_KEY = "pilot_push_subscription";

export type PushStatus = {
  enabled: boolean;
  publicKey: string | null;
};

/** Ask the server whether Web Push is configured. */
export async function fetchPushStatus(): Promise<PushStatus> {
  const res = await fetch("/push/status", { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as PushStatus;
}

/** Convert a base64 VAPID public key to a Uint8Array. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * Subscribe the current browser to push notifications.
 * Returns true on success, false otherwise.
 */
export async function subscribeToPush(publicKey: string): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Already subscribed — sync with server
    await syncSubscriptionWithServer(existing);
    return true;
  }

  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  } catch {
    return false;
  }

  await syncSubscriptionWithServer(sub);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sub.toJSON()));
  return true;
}

/**
 * Unsubscribe the current browser from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const res = await fetch("/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      credentials: "include",
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    await sub.unsubscribe();
  }

  localStorage.removeItem(STORAGE_KEY);
  return true;
}

async function syncSubscriptionWithServer(
  sub: PushSubscription,
): Promise<void> {
  const res = await fetch("/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...csrfHeaders() },
    credentials: "include",
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

/** Check whether the browser is currently push-subscribed. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub !== null;
}
