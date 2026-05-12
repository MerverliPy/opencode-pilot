import React from "react";
import { Pressable, Text } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";

interface StepperProps {
  label: string;
  onPress: () => void;
}

export function Stepper({ label, onPress }: StepperProps) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 30,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
      })}
    >
      <Text
        style={{
          color: colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
