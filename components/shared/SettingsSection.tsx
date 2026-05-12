import React from "react";
import { Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          paddingHorizontal: 16,
          paddingVertical: 6,
          letterSpacing: 1,
        }}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={{
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        {children}
      </View>
    </View>
  );
}
