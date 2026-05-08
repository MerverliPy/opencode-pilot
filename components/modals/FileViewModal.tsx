import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { ModalShell } from './ModalShell';
import { CodeBlock } from '@/components/tui/CodeBlock';
import { colors, fonts, fontSizes } from '@/theme';
import { useServerStore } from '@/store/server';

type Props = { path: string; onClose: () => void };

export function FileViewModal({ path, onClose }: Props) {
  const client = useServerStore((s) => s.client());
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await client.fileContent(path);
        if (cancelled) return;
        setContent(r.content);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, path]);

  const lang = extToLang(path);
  const filename = path.split('/').pop() ?? path;

  return (
    <ModalShell title={filename} onClose={onClose}>
      <ScrollView
        contentContainerStyle={{ padding: 12 }}
        horizontal={false}
      >
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            marginBottom: 8,
          }}
          numberOfLines={1}
        >
          {path}
        </Text>
        {content === null && !error ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : error ? (
          <Text style={{ color: colors.error, fontFamily: fonts.mono, fontSize: fontSizes.sm }}>
            {error}
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View style={{ minWidth: '100%' }}>
              <CodeBlock code={content ?? ''} language={lang} />
            </View>
          </ScrollView>
        )}
      </ScrollView>
    </ModalShell>
  );
}

function extToLang(path: string): string | undefined {
  const m = /\.([a-zA-Z0-9]+)$/.exec(path);
  if (!m) return undefined;
  const ext = m[1].toLowerCase();
  const map: Record<string, string> = {
    ts: 'ts',
    tsx: 'tsx',
    js: 'js',
    jsx: 'jsx',
    mjs: 'js',
    cjs: 'js',
    py: 'py',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    h: 'c',
    cc: 'cpp',
    cpp: 'cpp',
    hpp: 'cpp',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sh: 'bash',
  };
  return map[ext];
}
