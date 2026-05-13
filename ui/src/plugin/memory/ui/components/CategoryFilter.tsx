/**
 * CategoryFilter: horizontal tab strip for filtering memories by category.
 */
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "../../../../theme";
import type { MemoryCategory } from "../../db/schema";

export type FilterCategory = MemoryCategory | "all";

const TABS: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "all" },
  { value: "preference", label: "pref" },
  { value: "fact", label: "fact" },
  { value: "code_pattern", label: "code" },
  { value: "decision", label: "dec" },
];

type Props = {
  value: FilterCategory;
  onChange: (v: FilterCategory) => void;
};

export function CategoryFilter({ value, onChange }: Props) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12,
          gap: 4,
          flexDirection: "row",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.value === value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => onChange(tab.value)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderBottomWidth: 2,
                borderBottomColor: active ? colors.accent : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? colors.accent : colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
