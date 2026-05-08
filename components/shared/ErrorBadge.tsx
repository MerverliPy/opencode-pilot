/**
 * Floating error badge — shown in bottom-right corner whenever there are
 * error-level log entries. Tap to navigate to Settings → error log.
 */
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLogStore } from '@/store/log';
import { colors, fonts, fontSizes } from '@/theme';

export function ErrorBadge() {
  const router = useRouter();
  const entries = useLogStore((s) => s.entries);
  const errorCount = entries.filter((e) => e.level === 'error').length;

  if (errorCount === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 72, // above StatusBar
        right: 12,
        zIndex: 999,
        pointerEvents: 'box-none',
      }}
    >
      <Pressable
        onPress={() => router.push('/(main)/settings')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          backgroundColor: colors.error,
          borderRadius: 12,
          paddingHorizontal: 9,
          paddingVertical: 4,
          opacity: pressed ? 0.75 : 1,
          shadowColor: '#000',
          shadowOpacity: 0.4,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 6,
        })}
      >
        <Text style={{ color: '#fff', fontFamily: fonts.mono, fontSize: fontSizes.xs }}>
          ✕
        </Text>
        <Text style={{ color: '#fff', fontFamily: fonts.mono, fontSize: fontSizes.xs, fontWeight: '700' }}>
          {errorCount > 99 ? '99+' : errorCount}
        </Text>
      </Pressable>
    </View>
  );
}
