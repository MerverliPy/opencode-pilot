import { ReactNode } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, fontSizes } from "@/theme";

type Action = { label: string; onPress: () => void };

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Single right-side header action (legacy — prefer rightActions). */
  rightAction?: Action;
  /** Multiple right-side header actions rendered left-to-right. */
  rightActions?: Action[];
};

/** Full-screen TUI-style modal with a top bar matching the app aesthetic. */
export function ModalShell({
  title,
  onClose,
  children,
  rightAction,
  rightActions,
}: Props) {
  const actions = rightActions ?? (rightAction ? [rightAction] : []);
  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* SafeAreaProvider must be re-declared inside Modal — React Native's
          Modal renders in a separate native window so the root provider's
          context does not propagate here. Without this the top inset is 0
          and the header row is hidden under the notch / Dynamic Island. */}
      <SafeAreaProvider>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.background }}
          edges={["top", "bottom"]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 8,
            }}
          >
            <Pressable onPress={onClose} hitSlop={10}>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.md,
                }}
              >
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
            {actions.length > 0 ? (
              <View style={{ flexDirection: "row", gap: 16 }}>
                {actions.map((a) => (
                  <Pressable key={a.label} onPress={a.onPress} hitSlop={10}>
                    <Text
                      style={{
                        color: colors.accent,
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.sm,
                      }}
                    >
                      {a.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>{children}</View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
