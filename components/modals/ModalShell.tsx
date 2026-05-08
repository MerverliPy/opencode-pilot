import { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '@/theme';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Right-side header action button label, e.g. "new". */
  rightAction?: { label: string; onPress: () => void };
};

/** Full-screen TUI-style modal with a top bar matching the app aesthetic. */
export function ModalShell({ title, onClose, children, rightAction }: Props) {
  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: 8,
          }}
        >
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.md }}>
              ✕
            </Text>
          </Pressable>
          <Text
            style={{
              flex: 1,
              color: colors.foreground,
              fontFamily: fonts.mono,
              fontSize: fontSizes.md,
              marginLeft: 6,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {rightAction ? (
            <Pressable onPress={rightAction.onPress} hitSlop={10}>
              <Text
                style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: fontSizes.sm }}
              >
                {rightAction.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}
