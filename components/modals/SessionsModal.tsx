/**
 * SessionsModal: lists all server sessions, allows switching, creating,
 * deleting (swipe-left or long-press), and batch-clearing old sessions.
 */
import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { ModalShell } from "./ModalShell";
import { colors, fonts, fontSizes } from "@/theme";
import { useServerStore } from "@/store/server";
import { useSessionStore } from "@/store/session";
import { useUIStore } from "@/store/ui";
import { saveLastSessionId } from "@/services/auth";
import type { Session } from "@/services/types";

type Props = { onClose: () => void };

/** Cutoff presets shown in the "clear..." action sheet. */
const CLEAR_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All sessions", days: 0 },
] as const;

export function SessionsModal({ onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const server = useServerStore((s) => s.active());
  const current = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const hydrateTurns = useSessionStore((s) => s.hydrateTurns);
  const reset = useSessionStore((s) => s.reset);
  const openModal = useUIStore((s) => s.openModal);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  /** Tracks all mounted Swipeable instances keyed by session id. */
  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());

  // ── Data ────────────────────────────────────────────────────────────────────

  const refresh = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const list = await client.listSessions();
      setSessions(list.sort((a, b) => b.time.updated - a.time.updated));
    } catch (e) {
      Alert.alert("Failed to load sessions", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Session actions ──────────────────────────────────────────────────────────

  const onSelect = async (s: Session) => {
    if (!client || !server) return;
    closeAllSwipeables();
    try {
      reset();
      setSession(s);
      await saveLastSessionId(server.id, s.id);
      const msgs = await client.listMessages(s.id);
      hydrateTurns(msgs.map((m) => ({ message: m.info, parts: m.parts })));
      onClose();
    } catch (e) {
      Alert.alert("Failed to load session", (e as Error).message);
    }
  };

  const onCreate = async () => {
    if (!client || !server) return;
    try {
      const s = await client.createSession({ title: "new session" });
      reset();
      setSession(s);
      await saveLastSessionId(server.id, s.id);
      hydrateTurns([]);
      onClose();
      openModal({ kind: "workdir" });
    } catch (e) {
      Alert.alert("Failed to create session", (e as Error).message);
    }
  };

  const onDelete = (s: Session) => {
    Alert.alert("Delete session", `Delete "${s.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!client) return;
          try {
            await client.deleteSession(s.id);
            await refresh();
            if (current?.id === s.id) reset();
          } catch (e) {
            Alert.alert("Delete failed", (e as Error).message);
          }
        },
      },
    ]);
  };

  // ── Batch clear ──────────────────────────────────────────────────────────────

  /**
   * Delete all sessions (excluding the active one) not updated within `days`
   * days. Pass `days = 0` to clear all other sessions regardless of age.
   */
  const clearOlderThan = (days: number) => {
    if (!client) return;
    const cutoff = days > 0 ? Date.now() - days * 86_400_000 : Infinity;
    const toDelete = sessions.filter(
      (s) => s.id !== current?.id && s.time.updated < cutoff,
    );

    if (toDelete.length === 0) {
      Alert.alert(
        "Nothing to clear",
        days > 0
          ? `No sessions are older than ${days} days.`
          : "No other sessions to clear.",
      );
      return;
    }

    const rangeLabel =
      days > 0 ? `not updated in ${days} days` : "all other sessions";
    const n = toDelete.length;
    const noun = `${n} session${n !== 1 ? "s" : ""}`;

    Alert.alert("Clear sessions", `Delete ${noun} (${rangeLabel})?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            for (const s of toDelete) {
              await client.deleteSession(s.id);
            }
            await refresh();
          } catch (e) {
            Alert.alert("Delete failed", (e as Error).message);
          }
        },
      },
    ]);
  };

  /** Show native action sheet (iOS) or Alert (Android) to pick a cutoff. */
  const onClearOld = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Clear old sessions",
          message: "Delete sessions (excluding active) not updated in:",
          options: ["Cancel", ...CLEAR_PRESETS.map((p) => p.label)],
          cancelButtonIndex: 0,
          destructiveButtonIndex: CLEAR_PRESETS.length, // "All sessions"
        },
        (index) => {
          if (index === 0) return;
          const preset = CLEAR_PRESETS[index - 1];
          if (preset) clearOlderThan(preset.days);
        },
      );
    } else {
      Alert.alert("Clear old sessions", "Delete sessions not updated in:", [
        { text: "Cancel", style: "cancel" },
        ...CLEAR_PRESETS.map((p) => ({
          text: p.label,
          style: p.days === 0 ? ("destructive" as const) : ("default" as const),
          onPress: () => clearOlderThan(p.days),
        })),
      ]);
    }
  };

  // ── Swipeable helpers ────────────────────────────────────────────────────────

  const closeAllSwipeables = () => {
    swipeRefs.current.forEach((ref) => ref.close());
  };

  const onSwipeableOpen = (id: string) => {
    swipeRefs.current.forEach((ref, key) => {
      if (key !== id) ref.close();
    });
  };

  const renderDeleteAction = (s: Session) => (
    <Pressable
      onPress={() => onDelete(s)}
      style={{
        backgroundColor: colors.error,
        justifyContent: "center",
        alignItems: "center",
        width: 80,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          letterSpacing: 0.5,
        }}
      >
        delete
      </Text>
    </Pressable>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ModalShell
      title="sessions"
      onClose={onClose}
      rightActions={[
        { label: "+ new", onPress: onCreate },
        { label: "clear...", onPress: onClearOld },
      ]}
    >
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingVertical: 4 }}
        ListEmptyComponent={
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              padding: 16,
              textAlign: "center",
            }}
          >
            {loading ? "loading…" : "no sessions"}
          </Text>
        }
        renderItem={({ item }) => {
          const isCurrent = current?.id === item.id;
          return (
            <Swipeable
              ref={(ref) => {
                if (ref) swipeRefs.current.set(item.id, ref);
                else swipeRefs.current.delete(item.id);
              }}
              renderRightActions={() => renderDeleteAction(item)}
              onSwipeableOpen={() => onSwipeableOpen(item.id)}
              friction={2}
              rightThreshold={40}
            >
              <Pressable
                onPress={() => onSelect(item)}
                onLongPress={() => onDelete(item)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderSubtle,
                  backgroundColor: pressed
                    ? colors.surfaceAlt
                    : colors.background,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                })}
              >
                <Text
                  style={{
                    color: isCurrent ? colors.accent : colors.mutedAlt,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                    width: 14,
                  }}
                >
                  {isCurrent ? "●" : "○"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.sm,
                    }}
                    numberOfLines={1}
                  >
                    {item.title || "(untitled)"}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                      marginTop: 2,
                    }}
                  >
                    {relTime(item.time.updated)}
                  </Text>
                </View>
              </Pressable>
            </Swipeable>
          );
        }}
      />
    </ModalShell>
  );
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
