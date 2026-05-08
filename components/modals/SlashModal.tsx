import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { ModalShell } from './ModalShell';
import { colors, fonts, fontSizes } from '@/theme';
import { useServerStore } from '@/store/server';
import { useSessionStore } from '@/store/session';
import type { Command } from '@/services/types';

type Props = {
  onClose: () => void;
  /** Reserved: fallback if user wants to type free-form instead of running a command. */
  onSubmit?: (text: string) => void | Promise<void>;
};

/** Slash command picker. Lists `/command` from the server, runs via /session/{id}/command. */
export function SlashModal({ onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const session = useSessionStore((s) => s.session);
  const agent = useSessionStore((s) => s.agent);
  const modelID = useSessionStore((s) => s.modelID);
  const providerID = useSessionStore((s) => s.providerID);

  const [commands, setCommands] = useState<Command[]>([]);
  const [filter, setFilter] = useState('');
  const [args, setArgs] = useState('');
  const [selected, setSelected] = useState<Command | null>(null);

  useEffect(() => {
    if (!client) return;
    (async () => {
      try {
        const list = await client.listCommands();
        setCommands(list);
      } catch {
        /* silent */
      }
    })();
  }, [client]);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return commands;
    return commands.filter(
      (c) => c.name.toLowerCase().includes(f) || (c.description ?? '').toLowerCase().includes(f),
    );
  }, [commands, filter]);

  const run = async (cmd: Command, withArgs: string) => {
    if (!client || !session) return;
    try {
      await client.runCommand(session.id, {
        command: cmd.name,
        arguments: withArgs || undefined,
        agent,
        model: modelID && providerID ? { providerID, modelID } : undefined,
      });
      onClose();
    } catch (e) {
      Alert.alert('Command failed', (e as Error).message);
    }
  };

  if (selected) {
    return (
      <ModalShell
        title={`/${selected.name}`}
        onClose={() => setSelected(null)}
        rightAction={{
          label: 'run',
          onPress: () => run(selected, args),
        }}
      >
        <View style={{ padding: 16 }}>
          {selected.description ? (
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                marginBottom: 12,
              }}
            >
              {selected.description}
            </Text>
          ) : null}
          <TextInput
            value={args}
            onChangeText={setArgs}
            placeholder="arguments (optional)"
            placeholderTextColor={colors.mutedAlt}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            style={{
              color: colors.foreground,
              fontFamily: fonts.mono,
              fontSize: fontSizes.md,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 4,
              padding: 10,
              minHeight: 80,
            }}
          />
        </View>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="commands" onClose={onClose}>
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
        data={filtered}
        keyExtractor={(c) => c.name}
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
            no commands
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setArgs('');
              setSelected(item);
            }}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Text
              style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: fontSizes.sm }}
            >
              /{item.name}
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
          </Pressable>
        )}
      />
    </ModalShell>
  );
}
