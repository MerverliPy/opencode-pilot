import { Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, fontSizes } from '@/theme';
import type { PermissionRequest } from '@/services/types';

type Props = {
  permission: PermissionRequest;
  onRespond: (resp: 'always' | 'once' | 'reject') => void;
};

/** Inline approval card matching the OpenCode TUI permission prompt. */
export function PermissionCard({ permission, onRespond }: Props) {
  const respond = async (resp: 'always' | 'once' | 'reject') => {
    await Haptics.impactAsync(
      resp === 'reject' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium,
    );
    onRespond(resp);
  };
  return (
    <View
      style={{
        marginVertical: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: colors.warning,
        borderRadius: 4,
        backgroundColor: colors.surface,
      }}
    >
      <Text style={{ color: colors.warning, fontFamily: fonts.mono, fontSize: fontSizes.sm, marginBottom: 4 }}>
        ⚠ permission requested
      </Text>
      <Text style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.sm, marginBottom: 6 }}>
        {permission.title}
      </Text>
      {permission.description ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.xs, marginBottom: 8 }}>
          {permission.description}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Btn label="allow once" tone="success" onPress={() => respond('once')} />
        <Btn label="always" tone="accent" onPress={() => respond('always')} />
        <Btn label="deny" tone="error" onPress={() => respond('reject')} />
      </View>
    </View>
  );
}

function Btn({ label, tone, onPress }: { label: string; tone: 'success' | 'accent' | 'error'; onPress: () => void }) {
  const color = tone === 'success' ? colors.success : tone === 'accent' ? colors.accent : colors.error;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: color,
        borderRadius: 3,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color, fontFamily: fonts.mono, fontSize: fontSizes.xs }}>{label}</Text>
    </Pressable>
  );
}
