import React from "react";
import { Switch, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";

interface ConfigToggleProps {
  label: string;
  note?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

export function ConfigToggle({
  label,
  note,
  value,
  onToggle,
}: ConfigToggleProps) {
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
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
          }}
        >
          {label}
        </Text>
        {note && (
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              marginTop: 2,
            }}
          >
            {note}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.surfaceAlt, true: colors.accentDim }}
        thumbColor={value ? colors.accent : colors.muted}
      />
    </View>
  );
}
