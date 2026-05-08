import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { ModalShell } from './ModalShell';
import { colors, fonts, fontSizes } from '@/theme';
import { useServerStore } from '@/store/server';
import { useSessionStore } from '@/store/session';
import type { Agent } from '@/services/types';

type Props = {
  onClose: () => void;
};

export function AgentModal({ onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const current = useSessionStore((s) => s.agent);
  const setAgent = useSessionStore((s) => s.setAgent);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (!client) return;
    (async () => {
      try {
        const r = await client.listAgents();
        setAgents(r);
      } catch {
        setAgents([{ name: 'build' }, { name: 'plan' }]);
      }
    })();
  }, [client]);

  return (
    <ModalShell title="agent" onClose={onClose}>
      <FlatList
        data={agents}
        keyExtractor={(a) => a.name}
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
            no agents
          </Text>
        }
        renderItem={({ item }) => {
          const isCurrent = current === item.name;
          return (
            <Pressable
              onPress={() => { setAgent(item.name); onClose(); }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
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
                >
                  {item.name}
                </Text>
                {item.description ? (
                  <Text
                    style={{
                      color: colors.muted,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                      marginTop: 2,
                    }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </ModalShell>
  );
}
