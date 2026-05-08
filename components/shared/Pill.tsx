import { Pressable, Text, View } from 'react-native';
import { colors, fonts, fontSizes } from '@/theme';

type Props = {
  label: string;
  onPress?: () => void;
  tone?: 'default' | 'accent' | 'muted';
};

/** Compact pill used on the prompt toolbar for model/agent chips. */
export function Pill({ label, onPress, tone = 'default' }: Props) {
  const toneColor =
    tone === 'accent' ? colors.accent : tone === 'muted' ? colors.muted : colors.foreground;
  const baseStyle = {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  } as const;
  const text = (
    <Text style={{ color: toneColor, fontFamily: fonts.mono, fontSize: fontSizes.sm }}>
      {label}
    </Text>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          { backgroundColor: pressed ? colors.surfaceAlt : colors.surface },
        ]}
      >
        {text}
      </Pressable>
    );
  }
  return <View style={baseStyle}>{text}</View>;
}
