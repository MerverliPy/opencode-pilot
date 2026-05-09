/**
 * Memory screen — browse, filter, pin, archive, and delete extracted memories.
 * Also exposes configuration toggles and the embedding model selector.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { colors, fonts, fontSizes } from "@/theme";
import { useServerStore } from "@/store/server";
import { useMemoryStore } from "@/plugin/memory/store/memoryStore";
import { MemoryCard } from "@/plugin/memory/ui/components/MemoryCard";
import {
  CategoryFilter,
  FilterCategory,
} from "@/plugin/memory/ui/components/CategoryFilter";
import { EmptyState } from "@/plugin/memory/ui/components/EmptyState";
import {
  MODELS_BY_PROVIDER,
  PROVIDER_DISPLAY,
} from "@/plugin/memory/embeddings/ModelRegistry";
import type { EmbeddingProviderType } from "@/plugin/memory/embeddings/types";
import {
  getStoredApiKey,
  storeApiKey,
} from "@/plugin/memory/embeddings/EmbeddingProviderFactory";
import type {
  Memory,
  TimelineEvent,
  ProfileEntry,
} from "@/plugin/memory/db/schema";
import { getTimeline } from "@/plugin/memory/db/TimelineRepository";
import { getProfile } from "@/plugin/memory/db/ProfileRepository";

type Tab = "memories" | "timeline" | "profile" | "config";

export default function MemoryScreen() {
  const nav = useNavigation();
  const server = useServerStore((s) => s.active());

  const memories = useMemoryStore((s) => s.memories);
  const memoryCount = useMemoryStore((s) => s.memoryCount);
  const config = useMemoryStore((s) => s.config);
  const isExtracting = useMemoryStore((s) => s.isExtracting);
  const saveConfig = useMemoryStore((s) => s.saveConfig);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  const pinMemory = useMemoryStore((s) => s.pinMemory);
  const archiveMemory = useMemoryStore((s) => s.archiveMemory);
  const loadForServer = useMemoryStore((s) => s.loadForServer);
  const refreshMemories = useMemoryStore((s) => s.refreshMemories);

  const [tab, setTab] = useState<Tab>("memories");
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [profile, setProfile] = useState<ProfileEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load memories when screen mounts / server changes.
  useEffect(() => {
    if (server?.id) void loadForServer(server.id);
  }, [server?.id, loadForServer]);

  // Load timeline when tab is selected.
  useEffect(() => {
    if (tab !== "timeline" || !server?.id) return;
    let cancelled = false;
    setLoadingTimeline(true);
    void getTimeline(server.id, 100, 0).then((events) => {
      if (!cancelled) {
        setTimeline(events);
        setLoadingTimeline(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tab, server?.id]);

  // Load profile when tab is selected.
  useEffect(() => {
    if (tab !== "profile" || !server?.id) return;
    let cancelled = false;
    setLoadingProfile(true);
    void getProfile(server.id).then((entries) => {
      if (!cancelled) {
        setProfile(entries);
        setLoadingProfile(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tab, server?.id]);

  // Pre-fill API key field from SecureStore when config is loaded.
  useEffect(() => {
    if (!config) return;
    getStoredApiKey(config.embeddingProvider).then((k) =>
      setApiKeyInput(k ?? ""),
    );
  }, [config]);

  const openDrawer = () => nav.dispatch(DrawerActions.openDrawer());

  const filteredMemories = useMemo((): Memory[] => {
    let list = memories;
    if (filter !== "all") list = list.filter((m) => m.category === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [memories, filter, searchQuery]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("Delete memory", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteMemory(id),
        },
      ]);
    },
    [deleteMemory],
  );

  const handleSaveApiKey = async () => {
    if (!config) return;
    await storeApiKey(config.embeddingProvider, apiKeyInput.trim());
    Alert.alert("Saved", "API key stored securely.");
  };

  const handleToggleEnabled = async (v: boolean) => {
    if (!config) return;
    await saveConfig({ ...config, enabled: v });
  };

  const handleToggleExtract = async (v: boolean) => {
    if (!config) return;
    await saveConfig({ ...config, extractEnabled: v });
  };

  const handleToggleInject = async (v: boolean) => {
    if (!config) return;
    await saveConfig({ ...config, injectEnabled: v });
  };

  const handleSelectProvider = async (provider: EmbeddingProviderType) => {
    if (!config) return;
    const firstModel = MODELS_BY_PROVIDER[provider]?.[0];
    await saveConfig({
      ...config,
      embeddingProvider: provider,
      embeddingModel: firstModel?.id ?? config.embeddingModel,
    });
    const key = await getStoredApiKey(provider);
    setApiKeyInput(key ?? "");
  };

  const handleSelectModel = async (modelId: string) => {
    if (!config) return;
    await saveConfig({ ...config, embeddingModel: modelId });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 44,
          paddingHorizontal: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={openDrawer}
          hitSlop={12}
          style={{ width: 32, alignItems: "center" }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontFamily: fonts.mono,
              fontSize: 20,
            }}
          >
            ☰
          </Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            textAlign: "center",
          }}
        >
          memory
        </Text>
        <Pressable
          onPress={() => void refreshMemories()}
          hitSlop={12}
          style={{ width: 32, alignItems: "center" }}
        >
          <Text
            style={{
              color: isExtracting ? colors.accent : colors.muted,
              fontFamily: fonts.mono,
              fontSize: 16,
            }}
          >
            {isExtracting ? "⟳" : "↺"}
          </Text>
        </Pressable>
      </View>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {(["memories", "timeline", "profile", "config"] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: "center",
              borderBottomWidth: 2,
              borderBottomColor: tab === t ? colors.accent : "transparent",
            }}
          >
            <Text
              style={{
                color: tab === t ? colors.accent : colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              {t === "memories" ? `memories (${memoryCount})` : t}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === "memories" ? (
        <>
          {/* Search bar */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="search memories…"
              placeholderTextColor={colors.mutedAlt}
              style={{
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                height: 32,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 4,
                paddingHorizontal: 10,
                backgroundColor: colors.surface,
              }}
            />
          </View>

          {/* Category filter */}
          <CategoryFilter value={filter} onChange={setFilter} />

          {/* Extraction status */}
          {isExtracting && (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                }}
              >
                ⟳ extracting memories…
              </Text>
            </View>
          )}

          {/* Memory list */}
          <FlatList
            data={filteredMemories}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MemoryCard
                memory={item}
                onPin={pinMemory}
                onArchive={archiveMemory}
                onDelete={handleDelete}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                message={
                  searchQuery
                    ? "no matching memories"
                    : filter !== "all"
                      ? `no ${filter} memories`
                      : undefined
                }
              />
            }
            contentContainerStyle={{ flexGrow: 1 }}
          />
        </>
      ) : tab === "timeline" ? (
        <TimelineView events={timeline} loading={loadingTimeline} />
      ) : tab === "profile" ? (
        <ProfileView entries={profile} loading={loadingProfile} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Master toggle */}
          <ConfigSection title="general">
            <ConfigToggle
              label="memory enabled"
              note="extract and inject memories"
              value={config?.enabled ?? false}
              onToggle={handleToggleEnabled}
            />
            <ConfigToggle
              label="auto-extract"
              note="extract after each session ends"
              value={config?.extractEnabled ?? false}
              onToggle={handleToggleExtract}
            />
            <ConfigToggle
              label="auto-inject"
              note="prepend relevant memories to prompts"
              value={config?.injectEnabled ?? false}
              onToggle={handleToggleInject}
            />
          </ConfigSection>

          {/* Embedding provider */}
          <ConfigSection title="embedding provider">
            {(Object.keys(PROVIDER_DISPLAY) as EmbeddingProviderType[]).map(
              (p) => {
                const isActive = config?.embeddingProvider === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => void handleSelectProvider(p)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderSubtle,
                      backgroundColor: pressed
                        ? colors.surfaceAlt
                        : "transparent",
                    })}
                  >
                    <Text
                      style={{
                        color: isActive ? colors.accent : colors.mutedAlt,
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.sm,
                        width: 14,
                      }}
                    >
                      {isActive ? "●" : "○"}
                    </Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: fonts.mono,
                          fontSize: fontSizes.sm,
                        }}
                      >
                        {PROVIDER_DISPLAY[p].label}
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontFamily: fonts.mono,
                          fontSize: fontSizes.xs,
                          marginTop: 2,
                        }}
                      >
                        {PROVIDER_DISPLAY[p].note}
                      </Text>
                    </View>
                  </Pressable>
                );
              },
            )}
          </ConfigSection>

          {/* Embedding model */}
          {config && (
            <ConfigSection title={`model — ${config.embeddingProvider}`}>
              {(
                MODELS_BY_PROVIDER[
                  config.embeddingProvider as EmbeddingProviderType
                ] ?? []
              ).map((m) => {
                const isActive = config.embeddingModel === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => void handleSelectModel(m.id)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "flex-start",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderSubtle,
                      backgroundColor: pressed
                        ? colors.surfaceAlt
                        : "transparent",
                    })}
                  >
                    <Text
                      style={{
                        color: isActive ? colors.accent : colors.mutedAlt,
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.sm,
                        width: 14,
                        marginTop: 1,
                      }}
                    >
                      {isActive ? "●" : "○"}
                    </Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: fonts.mono,
                          fontSize: fontSizes.sm,
                        }}
                        numberOfLines={1}
                      >
                        {m.displayName}
                      </Text>
                      {m.note && (
                        <Text
                          style={{
                            color: colors.muted,
                            fontFamily: fonts.mono,
                            fontSize: fontSizes.xs,
                            marginTop: 2,
                          }}
                        >
                          {m.note}
                        </Text>
                      )}
                    </View>
                    {m.bestFor && (
                      <Text
                        style={{
                          color: colors.accentDim,
                          fontFamily: fonts.mono,
                          fontSize: 9,
                          marginTop: 3,
                        }}
                      >
                        {m.bestFor}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ConfigSection>
          )}

          {/* n9router: no API key needed here — uses n9router settings config */}
          {config && config.embeddingProvider === "n9router" && (
            <ConfigSection title="api key">
              <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text
                  style={{
                    color: colors.muted,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    lineHeight: 18,
                  }}
                >
                  {
                    "n9router uses the URL and API key configured in Settings → n9router. No separate key needed here."
                  }
                </Text>
              </View>
            </ConfigSection>
          )}

          {/* API key (for providers that need one) */}
          {config &&
            config.embeddingProvider !== "ollama" &&
            config.embeddingProvider !== "lmstudio" &&
            config.embeddingProvider !== "n9router" && (
              <ConfigSection title="api key">
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <TextInput
                      value={apiKeyInput}
                      onChangeText={setApiKeyInput}
                      placeholder={`${config.embeddingProvider} API key`}
                      placeholderTextColor={colors.mutedAlt}
                      secureTextEntry={!apiKeyVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        flex: 1,
                        color: colors.foreground,
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.xs,
                        height: 36,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 4,
                        paddingHorizontal: 10,
                        backgroundColor: colors.surface,
                      }}
                    />
                    <Pressable
                      onPress={() => setApiKeyVisible((v) => !v)}
                      hitSlop={8}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 4,
                        backgroundColor: colors.surface,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.muted,
                          fontFamily: fonts.mono,
                          fontSize: fontSizes.xs,
                        }}
                      >
                        {apiKeyVisible ? "hide" : "show"}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => void handleSaveApiKey()}
                    style={({ pressed }) => ({
                      alignSelf: "flex-start",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 4,
                      backgroundColor: pressed
                        ? colors.accentDim
                        : colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    })}
                  >
                    <Text
                      style={{
                        color: colors.accent,
                        fontFamily: fonts.mono,
                        fontSize: fontSizes.sm,
                      }}
                    >
                      save key
                    </Text>
                  </Pressable>
                </View>
              </ConfigSection>
            )}

          {/* Danger zone */}
          <ConfigSection title="danger zone">
            <Pressable
              onPress={() => {
                if (!server?.id) return;
                Alert.alert(
                  "Clear all memories",
                  `Delete all memories for "${server.name}"? This cannot be undone.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear all",
                      style: "destructive",
                      onPress: async () => {
                        const { deleteAllMemoriesByServer } =
                          await import("@/plugin/memory/db/MemoryRepository");
                        await deleteAllMemoriesByServer(server.id);
                        await loadForServer(server.id);
                      },
                    },
                  ],
                );
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: pressed ? colors.surfaceAlt : "transparent",
              })}
            >
              <Text
                style={{
                  color: colors.error,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                }}
              >
                clear all memories
              </Text>
            </Pressable>
          </ConfigSection>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Local sub-components ───────────────────────────────────────────────────────

function ConfigSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          paddingHorizontal: 16,
          paddingVertical: 6,
          letterSpacing: 1,
        }}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={{
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function ConfigToggle({
  label,
  note,
  value,
  onToggle,
}: {
  label: string;
  note?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
          }}
        >
          {label}
        </Text>
        {note && (
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              marginTop: 2,
            }}
          >
            {note}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.surfaceAlt, true: colors.accentDim }}
        thumbColor={value ? colors.accent : colors.muted}
      />
    </View>
  );
}

// ── Timeline View ─────────────────────────────────────────────────────────────

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

function TimelineView({
  events,
  loading,
}: {
  events: TimelineEvent[];
  loading: boolean;
}) {
  const eventLabels: Record<TimelineEvent["eventType"], string> = {
    prompt_sent: "↗",
    response_received: "↩",
    memory_extracted: "◇",
    memory_injected: "◈",
    memory_created: "+",
    memory_deduplicated: "≡",
  };

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

// ── Profile View ──────────────────────────────────────────────────────────────

function ProfileView({
  entries,
  loading,
}: {
  entries: ProfileEntry[];
  loading: boolean;
}) {
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
