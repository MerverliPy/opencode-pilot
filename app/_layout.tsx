import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { useServerStore } from '@/store/server';
import { colors } from '@/theme';
import {
  registerForPushNotifications,
  registerPermissionCategory,
  useNotificationDeepLink,
  useNotificationActionHandler,
} from '@/services/notifications';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono-Bold.ttf'),
    'JetBrainsMono-Italic': require('../assets/fonts/JetBrainsMono-Italic.ttf'),
  });

  const { hydrate, hydrated, activeId } = useServerStore();
  const router = useRouter();
  const segments = useSegments();
  const [routed, setRouted] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Best-effort: ask for push permission and persist token on first launch.
    void registerForPushNotifications();
    // Register action buttons for permission-request notifications.
    void registerPermissionCategory();
  }, []);

  useNotificationDeepLink();
  // Respond to "Allow Once" / "Deny" notification actions without opening the app.
  // Only enabled after the server store is hydrated so the active server is available.
  useNotificationActionHandler(hydrated);

  useEffect(() => {
    if (!hydrated || routed) return;
    const inSetup = segments[0] === 'setup';
    if (!activeId && !inSetup) {
      router.replace('/setup');
    } else if (activeId && inSetup) {
      router.replace('/');
    }
    setRouted(true);
  }, [hydrated, activeId, segments, routed, router]);

  if (!fontsLoaded || !hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
          />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
