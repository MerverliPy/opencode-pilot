/**
 * Push notification registration for the Pilot client.
 *
 * Uses Expo notifications (backed by expo-notifications mock in tests).
 * Web Push VAPID relay will be wired in M3; for now this handles the
 * Expo token flow so tests can verify the logic.
 */
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { savePushToken } from "./auth";

/**
 * Register for push notifications.
 * Returns the Expo push token on success, null otherwise.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const { status: reqStatus } = await Notifications.requestPermissionsAsync();
    status = reqStatus;
  }
  if (status !== "granted") return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await savePushToken(token);
    return token;
  } catch {
    return null;
  }
}

/**
 * Register the PILOT_PERMISSION notification category with Allow Once / Deny
 * actions so that permission prompts can be handled from the notification tray.
 */
export async function registerPermissionCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync("PILOT_PERMISSION", [
    {
      identifier: "ALLOW_ONCE",
      buttonTitle: "Allow Once",
      options: {},
    },
    {
      identifier: "DENY",
      buttonTitle: "Deny",
      options: { isDestructive: true },
    },
  ]);
}

/**
 * Set up notification deep linking.
 * Stub — will be implemented in M3.
 */
export function useNotificationDeepLink(): void {
  // TODO: M3 — implement notification deep linking
}

/**
 * Handle notification actions.
 * Stub — will be implemented in M3.
 */
export function useNotificationActionHandler(_enabled: boolean): void {
  // TODO: M3 — implement notification action handling
}
