import React from "react";
import { Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import type { LogEntry } from "@/store/log";

const LEVEL_COLOR: Record<string, string> = {
  debug: "#6c7a89",
  info: "#5b9bd5",
  warn: "#e5a639",
  error: "#e05252",
};

interface LogRowProps {
  entry: LogEntry;
}

export function LogRow({ entry }: LogRowProps) {
  const d = new Date(entry.ts);
  const hms = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  const levelColor = LEVEL_COLOR[entry.level] ?? colors.muted;

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      {/* Header row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <Text
          style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: 10 }}
        >
          {hms}
        </Text>
        <Text
          style={{
            color: levelColor,
            fontFamily: fonts.mono,
            fontSize: 10,
            fontWeight: "700",
          }}
        >
          {entry.level.toUpperCase()}
        </Text>
        <Text
          style={{
            color: colors.mutedAlt ?? colors.muted,
            fontFamily: fonts.mono,
            fontSize: 10,
          }}
        >
          {entry.tag}
        </Text>
      </View>
      {/* Message */}
      <Text
        selectable
        style={{
          color: entry.level === "error" ? levelColor : colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          marginTop: 2,
        }}
      >
        {entry.message}
      </Text>
      {/* Extra data */}
      {!!entry.data && (
        <Text
          selectable
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: 10,
            marginTop: 4,
          }}
          numberOfLines={6}
        >
          {entry.data}
        </Text>
      )}
    </View>
  );
}
