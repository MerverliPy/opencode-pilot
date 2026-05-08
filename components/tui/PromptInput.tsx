import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, fontSizes } from '@/theme';

type Props = {
  onSubmit: (text: string) => void | Promise<void>;
  onSlash: () => void;
  onMention: () => void;
  disabled?: boolean;
};

/** TUI prompt input with `>` prefix and a toolbar of slash/at/submit. */
export function PromptInput({ onSubmit, onSlash, onMention, disabled }: Props) {
  const [text, setText] = useState('');

  const submit = async () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await onSubmit(v);
  };

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingHorizontal: 10,
          paddingTop: 8,
          paddingBottom: 4,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            lineHeight: fontSizes.md * 1.45,
            paddingTop: 2,
          }}
        >
          {'>'}
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!disabled}
          multiline
          placeholder="ask opencode…"
          placeholderTextColor={colors.mutedAlt}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          style={{
            flex: 1,
            marginLeft: 8,
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            lineHeight: fontSizes.md * 1.45,
            maxHeight: 160,
            padding: 0,
          }}
          onSubmitEditing={submit}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 6,
          gap: 12,
        }}
      >
        <ToolbarBtn label="/" onPress={onSlash} />
        <ToolbarBtn label="@" onPress={onMention} />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={submit}
          disabled={disabled || !text.trim()}
          hitSlop={8}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 4,
            backgroundColor: text.trim() ? colors.accent : colors.surfaceAlt,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text
            style={{
              color: text.trim() ? colors.background : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              fontWeight: '600',
            }}
          >
            send ⏎
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ToolbarBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 32,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
      })}
    >
      <Text style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.md }}>
        {label}
      </Text>
    </Pressable>
  );
}
