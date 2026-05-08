import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { savePushToken } from './auth';

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
  if (existing !== 'granted') {
    const { status: req } = await Notifications.requestPermissionsAsync();
    status = req;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
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
    console.warn('failed to get expo push token:', (e as Error).message);
    return null;
  }
}

/**
 * Set up a tap-on-notification listener that deep-links into the app.
 * The relay sends `data: { sessionID, permissionID? }`.
 *
 * For now the deep-link is "open the main TUI" — the session bootstrap will
 * pick up the latest session. A more granular jump-to-session can be added
 * by exposing a session-id param on the index route.
 */
export function useNotificationDeepLink() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push('/');
    });
    return () => sub.remove();
  }, [router]);
}
