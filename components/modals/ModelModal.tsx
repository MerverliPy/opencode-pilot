import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { ModalShell } from './ModalShell';
import { colors, fonts, fontSizes } from '@/theme';
import { useServerStore } from '@/store/server';
import { useSessionStore } from '@/store/session';
import type { Provider } from '@/services/types';

type Props = {
  onClose: () => void;
};

type Row = { providerID: string; providerName: string; modelID: string; modelName: string };

export function ModelModal({ onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const currentModel = useSessionStore((s) => s.modelID);
  const currentProvider = useSessionStore((s) => s.providerID);
  const setModel = useSessionStore((s) => s.setModel);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [filter, setFilter] = useState('');

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

  const rows: Row[] = useMemo(() => {
    const all: Row[] = [];
    for (const p of providers) {
      for (const m of Object.values(p.models)) {
        all.push({ providerID: p.id, providerName: p.name, modelID: m.id, modelName: m.name });
      }
    }
    const f = filter.trim().toLowerCase();
    if (!f) return all;
    return all.filter(
      (r) =>
        r.modelID.toLowerCase().includes(f) ||
        r.modelName.toLowerCase().includes(f) ||
        r.providerID.toLowerCase().includes(f),
    );
  }, [providers, filter]);

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
      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.providerID}/${r.modelID}`}
        ListEmptyComponent={
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              padding: 16,
              textAlign: 'center',
            }}
          >
            no models
          </Text>
        }
        renderItem={({ item }) => {
          const isCurrent =
            currentProvider === item.providerID && currentModel === item.modelID;
          return (
            <Pressable
              onPress={() => { setModel(item.providerID, item.modelID); onClose(); }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSubtle,
                backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
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
                {isCurrent ? '●' : '○'}
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
