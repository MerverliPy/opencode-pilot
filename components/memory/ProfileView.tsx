import React from "react";
import { FlatList, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import type { ProfileEntry } from "@/plugin/memory/db/schema";

interface ProfileViewProps {
  entries: ProfileEntry[];
  loading: boolean;
}

export function ProfileView({ entries, loading }: ProfileViewProps) {
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
          }}
        >
          loading…
        </Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
          }}
        >
          no profile entries yet
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ paddingVertical: 4 }}
      renderItem={({ item }) => (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {item.key}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
              }}
            >
              {Math.round(item.confidence * 100)}%
            </Text>
          </View>
          <Text
            style={{
              color: colors.accent,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              marginTop: 4,
            }}
            numberOfLines={2}
          >
            {item.value}
          </Text>
          {item.sourceMemoryId && (
            <Text
              style={{
                color: colors.mutedAlt,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                marginTop: 2,
              }}
            >
              from: {item.sourceMemoryId.slice(0, 8)}…
            </Text>
          )}
        </View>
      )}
    />
  );
}
