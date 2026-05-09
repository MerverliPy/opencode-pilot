import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, fonts, fontSizes } from "@/theme";
import { useServerStore } from "@/store/server";
import { useMemoryStore } from "@/plugin/memory/store/memoryStore";

type Item = {
  label: string;
  icon: string;
  route: "/" | "/files" | "/diff" | "/settings" | "/memory";
};

const ITEMS: Item[] = [
  { label: "opencode", icon: "◆", route: "/" },
  { label: "file browser", icon: "▤", route: "/files" },
  { label: "diff viewer", icon: "±", route: "/diff" },
  { label: "memory", icon: "◉", route: "/memory" },
  { label: "settings", icon: "⚙", route: "/settings" },
];

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const active = useServerStore((s) => s.active());
  const memoryCount = useMemoryStore((s) => s.memoryCount);
  const isExtracting = useMemoryStore((s) => s.isExtracting);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 14,
          paddingBottom: 18,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: 22 }}
        >
          pilot
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            marginTop: 4,
          }}
        >
          {active ? `● ${active.name}` : "○ no server"}
        </Text>
      </View>

      <View style={{ paddingVertical: 8 }}>
        {ITEMS.map((it) => {
          const isActive =
            props.state.routes[props.state.index]?.name ===
            routeToName(it.route);
          return (
            <Pressable
              key={it.route}
              onPress={() => {
                props.navigation.closeDrawer();
                router.push(it.route as any);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 18,
                paddingVertical: 12,
                backgroundColor: pressed
                  ? colors.surfaceAlt
                  : isActive
                    ? colors.surface
                    : "transparent",
                borderLeftWidth: 2,
                borderLeftColor: isActive ? colors.accent : "transparent",
              })}
            >
              <Text
                style={{
                  color: isActive ? colors.accent : colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.md,
                  width: 24,
                }}
              >
                {it.icon}
              </Text>
              <Text
                style={{
                  color: isActive ? colors.foreground : colors.foreground,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.md,
                }}
              >
                {it.label}
              </Text>
              {it.route === "/memory" && memoryCount > 0 && (
                <View
                  style={{
                    marginLeft: 8,
                    backgroundColor: isExtracting
                      ? colors.accentDim
                      : colors.surfaceAlt,
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    minWidth: 20,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: isExtracting ? colors.accent : colors.muted,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                    }}
                  >
                    {isExtracting ? "…" : String(memoryCount)}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <View
        style={{
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Text
          style={{
            color: colors.mutedAlt,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
          }}
        >
          v0.1.0 — pilot for opencode
        </Text>
      </View>
    </SafeAreaView>
  );
}

function routeToName(route: string): string {
  if (route === "/") return "index";
  return route.replace(/^\//, "");
}
