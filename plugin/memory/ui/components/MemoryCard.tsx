/**
 * MemoryCard: displays a single memory with pin / archive / delete actions.
 */
import { Pressable, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import type { Memory, MemoryCategory } from "@/plugin/memory/db/schema";

const CATEGORY_COLOR: Record<MemoryCategory, string> = {
  preference: colors.info,
  fact: colors.success,
  code_pattern: colors.tool,
  decision: colors.warning,
};

const CATEGORY_LABEL: Record<MemoryCategory, string> = {
  preference: "pref",
  fact: "fact",
  code_pattern: "code",
  decision: "dec",
};

type Props = {
  memory: Memory;
  onPin: (id: string, isPinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export function MemoryCard({ memory, onPin, onArchive, onDelete }: Props) {
  const catColor = CATEGORY_COLOR[memory.category] ?? colors.muted;
  const catLabel = CATEGORY_LABEL[memory.category] ?? memory.category;

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: memory.isPinned ? colors.surface : "transparent",
      }}
    >
      {/* Category badge + pin indicator */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 6,
          gap: 8,
        }}
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: catColor,
            borderRadius: 3,
            paddingHorizontal: 5,
            paddingVertical: 1,
          }}
        >
          <Text
            style={{
              color: catColor,
              fontFamily: fonts.mono,
              fontSize: 9,
              letterSpacing: 0.5,
            }}
          >
            {catLabel.toUpperCase()}
          </Text>
        </View>
        {memory.isPinned && (
          <Text
            style={{
              color: colors.accent,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
            }}
          >
            ★
          </Text>
        )}
        <Text
          style={{
            color: colors.mutedAlt,
            fontFamily: fonts.mono,
            fontSize: 9,
            marginLeft: "auto",
          }}
        >
          {`${Math.round(memory.confidence * 100)}%`}
        </Text>
      </View>

      {/* Content */}
      <Text
        style={{
          color: colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
          lineHeight: fontSizes.sm * 1.5,
        }}
      >
        {memory.content}
      </Text>

      {/* Tags */}
      {memory.tags.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 4,
            marginTop: 8,
          }}
        >
          {memory.tags.map((tag) => (
            <Text
              key={tag}
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: 9,
                backgroundColor: colors.surfaceAlt,
                paddingHorizontal: 5,
                paddingVertical: 2,
                borderRadius: 3,
              }}
            >
              {`#${tag}`}
            </Text>
          ))}
        </View>
      )}

      {/* Action row */}
      <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
        <Pressable
          onPress={() => onPin(memory.id, !memory.isPinned)}
          hitSlop={8}
        >
          <Text
            style={{
              color: memory.isPinned ? colors.accent : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
            }}
          >
            {memory.isPinned ? "unpin" : "pin"}
          </Text>
        </Pressable>
        <Pressable onPress={() => onArchive(memory.id)} hitSlop={8}>
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
            }}
          >
            archive
          </Text>
        </Pressable>
        <Pressable onPress={() => onDelete(memory.id)} hitSlop={8}>
          <Text
            style={{
              color: colors.error,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
            }}
          >
            delete
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
