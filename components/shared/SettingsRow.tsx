import React from "react";
import { Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";

interface SettingsRowProps {
  label: string;
  children: React.ReactNode;
}

export function SettingsRow({ label, children }: SettingsRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <Text
        style={{
          flex: 1,
          color: colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
