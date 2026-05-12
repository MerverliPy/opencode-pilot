import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { colors, fonts, fontSizes } from "@/theme";
import { useServerStore } from "@/store/server";
import { useN9RouterStore } from "@/store/n9router";
import { useUIStore } from "@/store/ui";
import { useSessionStore } from "@/store/session";
import { useLogStore } from "@/store/log";
import type { LogEntry } from "@/store/log";
import { loadPushToken } from "@/services/auth";
import { registerForPushNotifications } from "@/services/notifications";
import type { ServerConfig } from "@/services/auth";

import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { SettingsSection } from "@/components/shared/SettingsSection";
import { SettingsRow } from "@/components/shared/SettingsRow";
import { Stepper } from "@/components/shared/Stepper";
import { LogRow } from "@/components/shared/LogRow";

export default function SettingsScreen() {
  const nav = useNavigation();
  const router = useRouter();
  const servers = useServerStore((s) => s.servers);
  const activeId = useServerStore((s) => s.activeId);
  const setActive = useServerStore((s) => s.setActive);
  const remove = useServerStore((s) => s.remove);

  const fontSize = useUIStore((s) => s.fontSize);
  const setFontSize = useUIStore((s) => s.setFontSize);

  const resetSession = useSessionStore((s) => s.reset);
  const logEntries = useLogStore((s) => s.entries);
  const clearLog = useLogStore((s) => s.clearLog);

  const n9Url = useN9RouterStore((s) => s.url);
  const n9Key = useN9RouterStore((s) => s.key);
  const setN9Config = useN9RouterStore((s) => s.setConfig);
  const n9Client = useN9RouterStore((s) => s.client());

  const [draftUrl, setDraftUrl] = useState(n9Url);
  const [draftKey, setDraftKey] = useState(n9Key);
  const [n9Dirty, setN9Dirty] = useState(false);
  const [tunnelStatus, setTunnelStatus] = useState<{
    enabled: boolean;
    url?: string;
  } | null>(null);
  const [tunnelLoading, setTunnelLoading] = useState(false);

  const [pushToken, setPushToken] = useState<string | null>(null);

  // Sync drafts when store hydrates
  useEffect(() => {
    setDraftUrl(n9Url);
  }, [n9Url]);
  useEffect(() => {
    setDraftKey(n9Key);
  }, [n9Key]);

  // Fetch tunnel status whenever client changes
  useEffect(() => {
    if (!n9Client) {
      setTunnelStatus(null);
      return;
    }
    n9Client
      .tunnelStatus()
      .then(setTunnelStatus)
      .catch(() => setTunnelStatus(null));
  }, [n9Client]);

  const onN9UrlChange = (v: string) => {
    setDraftUrl(v);
    setN9Dirty(true);
  };
  const onN9KeyChange = (v: string) => {
    setDraftKey(v);
    setN9Dirty(true);
  };

  const saveN9Config = async () => {
    await setN9Config(draftUrl.trim(), draftKey.trim());
    setN9Dirty(false);
  };

  const toggleTunnel = async () => {
    if (!n9Client) return;
    setTunnelLoading(true);
    try {
      const res = tunnelStatus?.enabled
        ? await n9Client.tunnelDisable()
        : await n9Client.tunnelEnable();
      setTunnelStatus(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Tunnel error", msg);
    } finally {
      setTunnelLoading(false);
    }
  };

  useEffect(() => {
    void loadPushToken().then(setPushToken);
  }, []);

  const copyToken = async () => {
    let token = pushToken;
    if (!token) {
      token = await registerForPushNotifications();
      setPushToken(token);
    }
    if (!token) {
      Alert.alert("No push token", "Notifications permission was not granted.");
      return;
    }
    await Clipboard.setStringAsync(token);
    Alert.alert("Copied", "Push token copied to clipboard.");
  };

  const copyLog = async () => {
    if (logEntries.length === 0) {
      Alert.alert("Log empty", "No entries to copy.");
      return;
    }
    const text = logEntries
      .slice()
      .reverse()
      .map((e) => {
        const d = new Date(e.ts);
        const hms = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
        const base = `[${hms}] ${e.level.toUpperCase().padEnd(5)} ${e.tag}: ${e.message}`;
        return e.data ? `${base}\n  ${e.data.replace(/\n/g, "\n  ")}` : base;
      })
      .join("\n");
    await Clipboard.setStringAsync(text);
    Alert.alert(
      "Copied",
      `${logEntries.length} log entries copied to clipboard.`,
    );
  };

  const openDrawer = () => nav.dispatch(DrawerActions.openDrawer());

  const onSelect = async (s: ServerConfig) => {
    if (s.id === activeId) return;
    resetSession();
    await setActive(s.id);
  };

  const onRemove = (s: ServerConfig) => {
    Alert.alert("Remove server", `Remove "${s.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await remove(s.id);
          if (s.id === activeId) {
            resetSession();
            router.replace("/setup");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      <ScreenHeader title="settings" onMenu={openDrawer} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <SettingsSection title="servers">
          <FlatList
            data={servers}
            keyExtractor={(s) => s.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                  padding: 16,
                }}
              >
                no servers configured
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                onLongPress={() => onRemove(item)}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderSubtle,
                  backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                })}
              >
                <Text
                  style={{
                    color:
                      item.id === activeId ? colors.accent : colors.mutedAlt,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                    width: 14,
                  }}
                >
                  {item.id === activeId ? "●" : "○"}
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
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.muted,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {item.url}
                  </Text>
                </View>
              </Pressable>
            )}
          />
          <Pressable
            onPress={() => router.push("/setup")}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: pressed ? colors.surfaceAlt : "transparent",
            })}
          >
            <Text
              style={{
                color: colors.accent,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              + add server
            </Text>
          </Pressable>
        </SettingsSection>

        <SettingsSection title="memory">
          <Pressable
            onPress={() =>
              router.push("/memory" as Parameters<typeof router.push>[0])
            }
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: pressed ? colors.surfaceAlt : "transparent",
              flexDirection: "row",
              alignItems: "center",
            })}
          >
            <Text
              style={{
                flex: 1,
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              agent memory
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              ›
            </Text>
          </Pressable>
        </SettingsSection>

        {/* ── n9router ─────────────────────────────────────────────── */}
        <SettingsSection title="n9router">
          {/* URL */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                marginBottom: 4,
              }}
            >
              URL
            </Text>
            <TextInput
              value={draftUrl}
              onChangeText={onN9UrlChange}
              placeholder="http://localhost:20128"
              placeholderTextColor={colors.mutedAlt}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                borderWidth: 1,
                borderColor: n9Dirty ? colors.accent : colors.border,
                borderRadius: 4,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            />
          </View>
          {/* API Key */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                marginBottom: 4,
              }}
            >
              API KEY (optional)
            </Text>
            <TextInput
              value={draftKey}
              onChangeText={onN9KeyChange}
              placeholder="leave empty for local deployments"
              placeholderTextColor={colors.mutedAlt}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                borderWidth: 1,
                borderColor: n9Dirty ? colors.accent : colors.border,
                borderRadius: 4,
                paddingHorizontal: 10,
                paddingVertical: 7,
              }}
            />
          </View>
          {/* Save button (visible when dirty) */}
          {n9Dirty && (
            <Pressable
              onPress={saveN9Config}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSubtle,
                backgroundColor: pressed ? colors.surfaceAlt : "transparent",
              })}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                }}
              >
                save n9router config
              </Text>
            </Pressable>
          )}
          {/* Tunnel status + toggle */}
          {n9Client && (
            <Pressable
              onPress={toggleTunnel}
              disabled={tunnelLoading}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSubtle,
                backgroundColor: pressed ? colors.surfaceAlt : "transparent",
                flexDirection: "row",
                alignItems: "center",
              })}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                  }}
                >
                  {tunnelLoading
                    ? "updating tunnel…"
                    : tunnelStatus?.enabled
                      ? "tunnel: on"
                      : "tunnel: off"}
                </Text>
                {tunnelStatus?.url && (
                  <Text
                    style={{
                      color: colors.muted,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {tunnelStatus.url}
                  </Text>
                )}
              </View>
              <Text
                style={{
                  color: tunnelStatus?.enabled ? colors.accent : colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                }}
              >
                {tunnelStatus?.enabled ? "●" : "○"}
              </Text>
            </Pressable>
          )}
          {/* Link to usage screen */}
          <Pressable
            onPress={() =>
              router.push("/usage" as Parameters<typeof router.push>[0])
            }
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: pressed ? colors.surfaceAlt : "transparent",
              flexDirection: "row",
              alignItems: "center",
            })}
          >
            <Text
              style={{
                flex: 1,
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              usage dashboard
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              ›
            </Text>
          </Pressable>
        </SettingsSection>

        <SettingsSection title="appearance">
          <SettingsRow label="font size">
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <Stepper
                label="−"
                onPress={() => setFontSize(Math.max(10, fontSize - 1))}
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                  minWidth: 24,
                  textAlign: "center",
                }}
              >
                {fontSize}
              </Text>
              <Stepper
                label="+"
                onPress={() => setFontSize(Math.min(20, fontSize + 1))}
              />
            </View>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="notifications">
          <Pressable
            onPress={copyToken}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
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
            >
              {pushToken ? "copy push token" : "enable push notifications"}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {pushToken ?? "tap to register with apple push servers"}
            </Text>
          </Pressable>
        </SettingsSection>

        <SettingsSection title="about">
          <SettingsRow label="version">
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              0.1.0
            </Text>
          </SettingsRow>
          <SettingsRow label="opencode">
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              pilot
            </Text>
          </SettingsRow>
        </SettingsSection>

        {/* ── Error / Debug Log ───────────────────────────────────────── */}
        <View style={{ marginTop: 18 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                flex: 1,
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                letterSpacing: 1,
              }}
            >
              {`DEBUG LOG (${logEntries.length})`}
            </Text>
            <Pressable
              onPress={copyLog}
              hitSlop={8}
              style={{ marginRight: 12 }}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                }}
              >
                copy all
              </Text>
            </Pressable>
            <Pressable onPress={clearLog} hitSlop={8}>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                }}
              >
                clear
              </Text>
            </Pressable>
          </View>

          <View style={{ borderTopWidth: 1, borderColor: colors.border }}>
            {logEntries.length === 0 ? (
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                  padding: 16,
                }}
              >
                no log entries
              </Text>
            ) : (
              logEntries.map((entry) => <LogRow key={entry.id} entry={entry} />)
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
