import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { colors, fonts, fontSizes } from "@/theme";
import { useServerStore } from "@/store/server";
import { OpencodeClient } from "@/services/api";
import { useSessionStore } from "@/store/session";
import type { FileDiff } from "@/services/types";

import { ScreenHeader } from "@/components/shared/ScreenHeader";

export default function DiffScreen() {
  const nav = useNavigation();
  const server = useServerStore((s) => s.active());
  const client = useMemo(
    () => (server ? new OpencodeClient(server) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [server?.id, server?.url, server?.username, server?.password],
  );
  const session = useSessionStore((s) => s.session);

  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FileDiff | null>(null);

  const load = useCallback(async () => {
    if (!client || !session) return;
    setLoading(true);
    setError(null);
    try {
      const r = await client.sessionDiff(session.id);
      setDiffs(r);
    } catch (e) {
      setError((e as Error).message);
      setDiffs([]);
    } finally {
      setLoading(false);
    }
  }, [client, session]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDrawer = () => nav.dispatch(DrawerActions.openDrawer());

  if (selected) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={["top", "bottom"]}
      >
        <ScreenHeader
          title={selected.path.split("/").pop() ?? selected.path}
          subtitle={`+${selected.added} −${selected.removed}`}
          onBack={() => setSelected(null)}
        />
        <ScrollView style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <DiffBody diff={selected.diff} />
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      <ScreenHeader
        title="diff viewer"
        onMenu={openDrawer}
        subtitle={session?.title}
      />
      {loading && diffs.length === 0 ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text
          style={{
            color: colors.error,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            padding: 16,
          }}
        >
          {error}
        </Text>
      ) : (
        <FlatList
          data={diffs}
          keyExtractor={(d) => d.path}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                textAlign: "center",
                padding: 24,
              }}
            >
              no changes in this session
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelected(item)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSubtle,
                backgroundColor: pressed ? colors.surfaceAlt : "transparent",
              })}
            >
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                }}
                numberOfLines={1}
              >
                {item.path}
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                <Text
                  style={{
                    color: colors.diffAddText,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                  }}
                >
                  +{item.added}
                </Text>
                <Text
                  style={{
                    color: colors.diffRemoveText,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                  }}
                >
                  −{item.removed}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function DiffBody({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <View style={{ padding: 8, minWidth: "100%" }}>
      {lines.map((line, i) => {
        const { color, bg } = colorForLine(line);
        return (
          <View
            key={i}
            style={{
              backgroundColor: bg,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text
              selectable
              style={{
                color,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                lineHeight: fontSizes.xs * 1.5,
              }}
            >
              {line || " "}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function colorForLine(line: string): { color: string; bg: string } {
  if (line.startsWith("+++") || line.startsWith("---")) {
    return { color: colors.muted, bg: "transparent" };
  }
  if (line.startsWith("@@")) {
    return { color: colors.info, bg: colors.surfaceAlt };
  }
  if (line.startsWith("+")) {
    return { color: colors.diffAddText, bg: colors.diffAdd };
  }
  if (line.startsWith("-")) {
    return { color: colors.diffRemoveText, bg: colors.diffRemove };
  }
  return { color: colors.foreground, bg: "transparent" };
}
