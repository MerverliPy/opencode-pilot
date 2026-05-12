import React from "react";
import { FlatList, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import type { TimelineEvent } from "@/plugin/memory/db/schema";

type EventType = TimelineEvent["eventType"];

const eventLabels: Record<EventType, string> = {
  prompt_sent: "↗",
  response_received: "↩",
  memory_extracted: "◇",
  memory_injected: "◈",
  memory_created: "+",
  memory_deduplicated: "≡",
};

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface TimelineViewProps {
  events: TimelineEvent[];
  loading: boolean;
}

export function TimelineView({ events, loading }: TimelineViewProps) {
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

  if (events.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
          }}
        >
          no timeline events yet
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ paddingVertical: 4 }}
      renderItem={({ item }) => (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                color: colors.accent,
                fontFamily: fonts.mono,
                fontSize: fontSizes.md,
                width: 18,
                textAlign: "center",
              }}
            >
              {eventLabels[item.eventType] ?? "·"}
            </Text>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                flex: 1,
              }}
              numberOfLines={2}
            >
              {item.eventType.replace(/_/g, " ")}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
              }}
            >
              {relTime(item.createdAt)}
            </Text>
          </View>
          {item.sessionId && (
            <Text
              style={{
                color: colors.mutedAlt,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                marginTop: 2,
                marginLeft: 26,
              }}
            >
              session: {item.sessionId.slice(0, 8)}…
            </Text>
          )}
        </View>
      )}
    />
  );
}
