import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { colors, fonts, fontSizes } from '@/theme';
import { useServerStore } from '@/store/server';
import { useUIStore } from '@/store/ui';
import type { FileNode } from '@/services/types';

type Mode = 'browse' | 'name' | 'text';

type TextHit = { path: string; line_number: number; lines: string };

export default function FilesScreen() {
  const nav = useNavigation();
  const openModal = useUIStore((s) => s.openModal);
  const client = useServerStore((s) => s.client());

  const [mode, setMode] = useState<Mode>('browse');
  const [path, setPath] = useState('.');
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [nameHits, setNameHits] = useState<string[]>([]);
  const [textHits, setTextHits] = useState<TextHit[]>([]);

  // Browse mode loader
  useEffect(() => {
    if (mode !== 'browse' || !client) return;
    let cancelled = false;
    setLoading(true);
    client
      .listFiles(path)
      .then((n) => { if (!cancelled) setNodes(sortNodes(n)); })
      .catch(() => { if (!cancelled) setNodes([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client, path, mode]);

  // Search loader (debounced)
  useEffect(() => {
    if (!client || mode === 'browse' || !query.trim()) {
      setNameHits([]); setTextHits([]); return;
    }
    const id = setTimeout(async () => {
      try {
        if (mode === 'name') {
          const r = await client.findFile(query.trim(), { limit: 100 });
          setNameHits(r);
        } else {
          const r = await client.findText(query.trim());
          setTextHits(r);
        }
      } catch {
        setNameHits([]); setTextHits([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [client, query, mode]);

  const parent = useMemo(() => {
    if (path === '.' || path === '/') return null;
    const i = path.lastIndexOf('/');
    return i <= 0 ? '.' : path.slice(0, i);
  }, [path]);

  const open = (p: string) => openModal({ kind: 'file-view', path: p });

  const openDrawer = () => nav.dispatch(DrawerActions.openDrawer());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Header title="file browser" onMenu={openDrawer} />

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <ModeTab label="browse" active={mode === 'browse'} onPress={() => setMode('browse')} />
        <ModeTab label="name"   active={mode === 'name'}   onPress={() => setMode('name')} />
        <ModeTab label="text"   active={mode === 'text'}   onPress={() => setMode('text')} />
      </View>

      {mode === 'browse' ? (
        <>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {parent !== null && (
              <Pressable onPress={() => setPath(parent)} hitSlop={8}>
                <Text style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: fontSizes.sm }}>../</Text>
              </Pressable>
            )}
            <Text
              numberOfLines={1}
              style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.sm, flex: 1 }}
            >
              {path === '.' ? '/' : path}
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={nodes}
              keyExtractor={(n) => n.path}
              ListEmptyComponent={<EmptyHint text="empty directory" />}
              renderItem={({ item }) => (
                <FileRow
                  node={item}
                  onPress={() => (item.type === 'directory' ? setPath(item.path) : open(item.path))}
                />
              )}
            />
          )}
        </>
      ) : (
        <>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
            }}
          >
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={mode === 'name' ? 'fuzzy file name…' : 'text in files…'}
              placeholderTextColor={colors.mutedAlt}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.md,
                padding: 10,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 4,
                backgroundColor: colors.surface,
              }}
            />
          </View>
          {mode === 'name' ? (
            <FlatList
              data={nameHits}
              keyExtractor={(p) => p}
              ListEmptyComponent={
                <EmptyHint text={query.trim() ? 'no matches' : 'type to search file names'} />
              }
              renderItem={({ item }) => (
                <FileRow
                  node={{ name: basename(item), path: item, type: 'file' }}
                  onPress={() => open(item)}
                />
              )}
            />
          ) : (
            <FlatList
              data={textHits}
              keyExtractor={(h, i) => `${h.path}:${h.line_number}:${i}`}
              ListEmptyComponent={
                <EmptyHint text={query.trim() ? 'no matches' : 'type to search file contents'} />
              }
              renderItem={({ item }) => <TextHitRow hit={item} onPress={() => open(item.path)} />}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

function Header({ title, onMenu }: { title: string; onMenu: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        paddingHorizontal: 10,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable onPress={onMenu} hitSlop={12} style={{ width: 32, alignItems: 'center' }}>
        <Text style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: 20 }}>☰</Text>
      </Pressable>
      <Text style={{ flex: 1, color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.md, textAlign: 'center' }}>
        {title}
      </Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: active ? colors.accent : 'transparent',
      }}
    >
      <Text
        style={{
          color: active ? colors.accent : colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function FileRow({ node, onPress }: { node: FileNode; onPress: () => void }) {
  const isDir = node.type === 'directory';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: pressed ? colors.surface : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      })}
    >
      <Text style={{ color: isDir ? colors.accent : colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.md, width: 24 }}>
        {isDir ? '▸' : '•'}
      </Text>
      <Text
        numberOfLines={1}
        style={{ flex: 1, color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.sm }}
      >
        {node.name}{isDir ? '/' : ''}
      </Text>
    </Pressable>
  );
}

function TextHitRow({ hit, onPress }: { hit: TextHit; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: pressed ? colors.surface : 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      })}
    >
      <Text style={{ color: colors.info, fontFamily: fonts.mono, fontSize: fontSizes.xs }} numberOfLines={1}>
        {hit.path}:{hit.line_number}
      </Text>
      <Text
        numberOfLines={1}
        style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.xs, marginTop: 2 }}
      >
        {hit.lines.trim()}
      </Text>
    </Pressable>
  );
}

function basename(p: string): string {
  const i = p.lastIndexOf('/');
  return i >= 0 ? p.slice(i + 1) : p;
}

function EmptyHint({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: fontSizes.sm,
        textAlign: 'center',
        padding: 24,
      }}
    >
      {text}
    </Text>
  );
}

function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
