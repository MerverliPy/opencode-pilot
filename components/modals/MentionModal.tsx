import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ModalShell } from './ModalShell';
import { colors, fonts, fontSizes } from '@/theme';
import { useServerStore } from '@/store/server';

type Props = { onClose: () => void };

/**
 * @-mention picker: search files by name, copy `@path` to clipboard
 * (RN doesn't expose programmatic insertion into TextInput easily without lifting state up,
 * so we use clipboard as a pragmatic UX).
 */
export function MentionModal({ onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!client) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await client.findFile(query || '.', { type: 'file', limit: 50 });
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [client, query]);

  const onPick = async (path: string) => {
    await Clipboard.setStringAsync(`@${path}`);
    Alert.alert('Copied', `@${path} copied to clipboard. Paste into the prompt.`, [
      { text: 'OK', onPress: onClose },
    ]);
  };

  return (
    <ModalShell title="mention file" onClose={onClose}>
      <View style={{ padding: 12 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="search files…"
          placeholderTextColor={colors.mutedAlt}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
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
        data={results}
        keyExtractor={(p) => p}
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
            {loading ? 'searching…' : query ? 'no matches' : 'type to search'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPick(item)}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Text
              style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.sm }}
              numberOfLines={1}
            >
              @{item}
            </Text>
          </Pressable>
        )}
      />
    </ModalShell>
  );
}
