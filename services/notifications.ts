import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { savePushToken } from "./auth";
import { OpencodeClient } from "./api";
import { useServerStore } from "@/store/server";
import { log } from "./logger";

/** Identifier for the permission-request notification category. */
const PERMISSION_CATEGORY = "PILOT_PERMISSION";

/** Action identifier for "allow once". */
const ACTION_ALLOW_ONCE = "ALLOW_ONCE";

/** Action identifier for "deny". */
const ACTION_DENY = "DENY";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications. Returns the token (also persisted).
 * Safe to call multiple times.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    const { status: req } = await Notifications.requestPermissionsAsync();
    status = req;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    if (token) await savePushToken(token);
    return token;
  } catch (e) {
    console.warn("failed to get expo push token:", (e as Error).message);
    return null;
  }
}

/**
 * Set up a tap-on-notification listener that deep-links into the app.
 * The relay sends `data: { sessionID, permissionID? }`.
 * Navigates to `/?sessionId={sessionID}` so the bootstrap effect in index.tsx
 * can load the specific session directly.
 */
export function useNotificationDeepLink() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          string | undefined
        >;
        const sessionID = data?.sessionID;
        if (sessionID) {
          router.push({ pathname: "/", params: { sessionId: sessionID } });
        } else {
          router.push("/");
        }
      },
    );
    return () => sub.remove();
  }, [router]);
}

/**
 * Register the PILOT_PERMISSION notification category with "Allow Once" and
 * "Deny" action buttons. Must be called at app startup (before any permission
 * push arrives). Safe to call multiple times.
 */
export async function registerPermissionCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(PERMISSION_CATEGORY, [
    {
      identifier: ACTION_ALLOW_ONCE,
      buttonTitle: "Allow Once",
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_DENY,
      buttonTitle: "Deny",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}

/**
 * Respond to a permission notification action (allow once / deny).
 * Reads the active server from the store directly — safe to call outside React.
 */
async function handlePermissionAction(
  response: Notifications.NotificationResponse,
): Promise<void> {
  const { actionIdentifier, notification } = response;

  // Ignore plain taps (handled by useNotificationDeepLink).
  // Dismiss swipes don't trigger this listener at all, so no guard needed.
  if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return;
  }

  const data = notification.request.content.data as Record<
    string,
    string | undefined
  >;
  const sessionID = data.sessionID;
  const permissionID = data.permissionID;

  if (!sessionID || !permissionID) {
    log.warn(
      "notification",
      "permission action missing sessionID or permissionID",
    );
    return;
  }

  const server = useServerStore.getState().active();
  if (!server) {
    log.warn("notification", "permission action: no active server configured");
    return;
  }

  const permResponse: "once" | "reject" =
    actionIdentifier === ACTION_ALLOW_ONCE ? "once" : "reject";

  try {
    const client = new OpencodeClient(server);
    await client.respondPermission(sessionID, permissionID, {
      response: permResponse,
    });
    log.info(
      "notification",
      `permission ${permResponse} sent for ${permissionID}`,
    );
  } catch (e) {
    // The permission may have already been resolved (race between app and notification).
    log.warn(
      "notification",
      `permission response failed (may be resolved): ${(e as Error).message}`,
    );
  }
}

/**
 * Hook that listens for notification action button taps and responds to
 * permission requests without requiring the user to open the app.
 *
 * @param enabled - Pass `true` only after the server store is hydrated so
 *   `useServerStore.getState().active()` returns a valid server.
 */
export function useNotificationActionHandler(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    // Handle any action that fired while the app was completely killed.
    // `getLastNotificationResponseAsync` returns the response that launched the app.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void handlePermissionAction(response);
    });

    // Handle actions while the app is in the foreground or background.
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void handlePermissionAction(response);
      },
    );

    return () => sub.remove();
  }, [enabled]);
}
