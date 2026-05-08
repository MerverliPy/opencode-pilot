import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { ModalShell } from './ModalShell';
import { colors, fonts, fontSizes } from '@/theme';
import { useServerStore } from '@/store/server';
import { useSessionStore } from '@/store/session';
import { saveLastSessionId } from '@/services/auth';
import type { Session } from '@/services/types';

type Props = { onClose: () => void };

export function SessionsModal({ onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const server = useServerStore((s) => s.active());
  const current = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const hydrateTurns = useSessionStore((s) => s.hydrateTurns);
  const reset = useSessionStore((s) => s.reset);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const list = await client.listSessions();
      setSessions(list.sort((a, b) => b.time.updated - a.time.updated));
    } catch (e) {
      Alert.alert('Failed to load sessions', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelect = async (s: Session) => {
    if (!client || !server) return;
    try {
      reset();
      setSession(s);
      await saveLastSessionId(server.id, s.id);
      const msgs = await client.listMessages(s.id);
      hydrateTurns(msgs.map((m) => ({ message: m.info, parts: m.parts })));
      onClose();
    } catch (e) {
      Alert.alert('Failed to load session', (e as Error).message);
    }
  };

  const onCreate = async () => {
    if (!client || !server) return;
    try {
      const s = await client.createSession({ title: 'new session' });
      reset();
      setSession(s);
      await saveLastSessionId(server.id, s.id);
      hydrateTurns([]);
      onClose();
    } catch (e) {
      Alert.alert('Failed to create session', (e as Error).message);
    }
  };

  const onDelete = (s: Session) => {
    Alert.alert('Delete session', `Delete "${s.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!client) return;
          try {
            await client.deleteSession(s.id);
            await refresh();
            if (current?.id === s.id) {
              reset();
            }
          } catch (e) {
            Alert.alert('Delete failed', (e as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <ModalShell title="sessions" onClose={onClose} rightAction={{ label: '+ new', onPress: onCreate }}>
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
              textAlign: 'center',
            }}
          >
            {loading ? 'loading…' : 'no sessions'}
          </Text>
        }
        renderItem={({ item }) => {
          const isCurrent = current?.id === item.id;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              onLongPress={() => onDelete(item)}
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
                  numberOfLines={1}
                >
                  {item.title || '(untitled)'}
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
          );
        }}
      />
    </ModalShell>
  );
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
