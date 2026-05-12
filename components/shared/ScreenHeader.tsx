import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  onMenu?: () => void;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  onMenu,
  onBack,
  rightElement,
}: ScreenHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 44,
        paddingHorizontal: 10,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {onMenu ? (
        <Pressable
          onPress={onMenu}
          hitSlop={12}
          style={{ width: 32, alignItems: "center" }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontFamily: fonts.mono,
              fontSize: 20,
            }}
          >
            ☰
          </Text>
        </Pressable>
      ) : onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={{ width: 32, alignItems: "center" }}
        >
          <Text
            style={{
              color: colors.accent,
              fontFamily: fonts.mono,
              fontSize: fontSizes.md,
            }}
          >
            ‹
          </Text>
        </Pressable>
      ) : (
        <View style={{ width: 32 }} />
      )}
      <View style={{ flex: 1, alignItems: "center" }}>
        {title && (
          <Text
            style={{
              color: colors.foreground,
              fontFamily: fonts.mono,
              fontSize: fontSizes.md,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement ?? <View style={{ width: 32 }} />}
    </View>
  );
}
