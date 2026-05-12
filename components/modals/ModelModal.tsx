import { useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, Text, TextInput, View } from "react-native";
import { ModalShell } from "./ModalShell";
import { colors, fonts, fontSizes } from "@/theme";
import { useServerStore } from "@/store/server";
import { useN9RouterStore } from "@/store/n9router";
import { useSessionStore } from "@/store/session";
import type { Provider } from "@/services/types";

type Props = {
  onClose: () => void;
};

type Row = {
  providerID: string;
  providerName: string;
  modelID: string;
  modelName: string;
};
type Section = { title: string; data: Row[] };

export function ModelModal({ onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const n9Client = useN9RouterStore((s) => s.client());
  const currentModel = useSessionStore((s) => s.modelID);
  const currentProvider = useSessionStore((s) => s.providerID);
  const setModel = useSessionStore((s) => s.setModel);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [comboRows, setComboRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");

  // Fetch OpenCode providers
  useEffect(() => {
    if (!client) return;
    (async () => {
      try {
        const r = await client.configProviders();
        setProviders(r.providers);
      } catch {
        /* silent */
      }
    })();
  }, [client]);

  // Fetch n9router combo models when client is available
  useEffect(() => {
    if (!n9Client) {
      setComboRows([]);
      return;
    }
    (async () => {
      try {
        const r = await n9Client.models();
        const combos = r.data.filter((m) => m.owned_by === "combo");
        setComboRows(
          combos.map((m) => ({
            providerID: "n9router",
            providerName: "n9router combo",
            modelID: m.id,
            modelName: m.id,
          })),
        );
      } catch {
        /* silent — n9router unavailable */
      }
    })();
  }, [n9Client]);

  const sections: Section[] = useMemo(() => {
    const f = filter.trim().toLowerCase();

    // OpenCode provider rows
    const opencodeRows: Row[] = [];
    for (const p of providers) {
      for (const m of Object.values(p.models)) {
        opencodeRows.push({
          providerID: p.id,
          providerName: p.name,
          modelID: m.id,
          modelName: m.name,
        });
      }
    }

    const filterRow = (r: Row) =>
      !f ||
      r.modelID.toLowerCase().includes(f) ||
      r.modelName.toLowerCase().includes(f) ||
      r.providerID.toLowerCase().includes(f);

    const result: Section[] = [];
    const filteredOpencode = opencodeRows.filter(filterRow);
    if (filteredOpencode.length > 0) {
      result.push({ title: "models", data: filteredOpencode });
    }
    const filteredCombos = comboRows.filter(filterRow);
    if (filteredCombos.length > 0) {
      result.push({ title: "n9router combos", data: filteredCombos });
    }
    return result;
  }, [providers, comboRows, filter]);

  return (
    <ModalShell title="model" onClose={onClose}>
      <View style={{ padding: 12 }}>
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="filter…"
          placeholderTextColor={colors.mutedAlt}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 4,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(r) => `${r.providerID}/${r.modelID}`}
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
            no models
          </Text>
        }
        renderSectionHeader={({ section }) =>
          sections.length > 1 ? (
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 5,
                backgroundColor: colors.surface,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                  letterSpacing: 1,
                }}
              >
                {section.title.toUpperCase()}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isCurrent =
            currentProvider === item.providerID &&
            currentModel === item.modelID;
          return (
            <Pressable
              onPress={() => {
                setModel(item.providerID, item.modelID);
                onClose();
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 10,
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
                  {item.modelID}
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
                  {item.providerName}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </ModalShell>
  );
}
