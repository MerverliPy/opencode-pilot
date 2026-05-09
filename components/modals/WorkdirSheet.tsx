import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, fontSizes } from "@/theme";
import { useServerStore } from "@/store/server";
import { OpencodeClient } from "@/services/api";
import type { FileNode } from "@/services/types";

type Props = {
  visible: boolean;
  initialPath?: string | null;
  onClose: () => void;
  onSelect: (path: string) => void;
};

/**
 * Bottom-sheet directory picker.
 * Slides up from the bottom, shows only directories, and lets the user
 * navigate into subdirectories and select a project root.
 */
export function WorkdirSheet({
  visible,
  initialPath,
  onClose,
  onSelect,
}: Props) {
  const server = useServerStore((s) => s.active());
  const client = useMemo(
    () => (server ? new OpencodeClient(server) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [server?.id, server?.url, server?.username, server?.password],
  );

  const [path, setPath] = useState(initialPath ?? ".");
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset path when the sheet opens.
  useEffect(() => {
    if (visible) {
      setPath(initialPath ?? ".");
    }
  }, [visible, initialPath]);

  // Load directories for the current path.
  useEffect(() => {
    if (!visible || !client) return;
    let cancelled = false;
    setLoading(true);
    client
      .listFiles(path)
      .then((n) => {
        if (!cancelled)
          setNodes(sortNodes(n.filter((node) => node.type === "directory")));
      })
      .catch(() => {
        if (!cancelled) setNodes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, path, visible]);

  const parent = useMemo(() => {
    if (path === "." || path === "/") return null;
    const i = path.lastIndexOf("/");
    return i <= 0 ? "." : path.slice(0, i);
  }, [path]);

  const handleSelect = () => {
    onSelect(path);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <SafeAreaView
          style={{ maxHeight: "75%", backgroundColor: colors.background }}
          edges={["bottom"]}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 8,
            }}
          >
            <Pressable onPress={onClose} hitSlop={10}>
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.md,
                }}
              >
                ✕
              </Text>
            </Pressable>
            <Text
              style={{
                flex: 1,
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.md,
                marginLeft: 6,
              }}
              numberOfLines={1}
            >
              select directory
            </Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Path breadcrumb */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            {parent !== null && (
              <Pressable onPress={() => setPath(parent)} hitSlop={8}>
                <Text
                  style={{
                    color: colors.accent,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                  }}
                >
                  ../
                </Text>
              </Pressable>
            )}
            <Text
              numberOfLines={1}
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                flex: 1,
              }}
            >
              {path === "." ? "/" : path}
            </Text>
          </View>

          {/* Directory list */}
          {loading ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ marginTop: 24 }}
            />
          ) : (
            <FlatList
              data={nodes}
              keyExtractor={(n) => n.path}
              ListEmptyComponent={<EmptyHint text="no directories" />}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setPath(item.path)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: pressed ? colors.surface : "transparent",
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSubtle,
                  })}
                >
                  <Text
                    style={{
                      color: colors.accent,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.md,
                      width: 24,
                    }}
                  >
                    ▸
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      color: colors.foreground,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.sm,
                    }}
                  >
                    {item.name}/
                  </Text>
                </Pressable>
              )}
            />
          )}

          {/* Select button */}
          <View
            style={{
              padding: 12,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Pressable
              onPress={handleSelect}
              style={({ pressed }) => ({
                backgroundColor: pressed ? colors.accentDim : colors.accent,
                paddingVertical: 12,
                alignItems: "center",
                borderRadius: 4,
              })}
            >
              <Text
                style={{
                  color: colors.background,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.md,
                  fontWeight: "600",
                }}
              >
                Select This Directory
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: fontSizes.sm,
        textAlign: "center",
        padding: 24,
      }}
    >
      {text}
    </Text>
  );
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => a.name.localeCompare(b.name));
}
