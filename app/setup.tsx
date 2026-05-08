import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { OpencodeClient } from '@/services/api';
import { useServerStore } from '@/store/server';
import { colors, fonts, fontSizes } from '@/theme';

export default function Setup() {
  const router = useRouter();
  const { upsert, setActive } = useServerStore();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('http://');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    if (!url.startsWith('http')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    setBusy(true);
    try {
      const cfg = {
        id: `${Date.now()}`,
        name: name.trim() || hostFromUrl(url),
        url: url.trim().replace(/\/$/, ''),
        username: username.trim() || undefined,
        password: password || undefined,
      };
      const client = new OpencodeClient(cfg);
      const health = await client.health();
      if (!health.healthy) throw new Error('server unhealthy');
      await upsert(cfg);
      await setActive(cfg.id);
      router.replace('/');
    } catch (e) {
      Alert.alert('Connection failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text
            style={{
              color: colors.accent,
              fontFamily: fonts.mono,
              fontSize: 28,
              marginBottom: 6,
            }}
          >
            pilot
          </Text>
          <Text
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              marginBottom: 32,
            }}
          >
            connect to your opencode server
          </Text>

          <Field label="name" value={name} onChange={setName} placeholder="my server" />
          <Field
            label="url"
            value={url}
            onChange={setUrl}
            placeholder="http://192.168.1.10:4096"
            autoCapitalize="none"
            keyboardType="url"
          />
          <Field
            label="username"
            value={username}
            onChange={setUsername}
            placeholder="opencode (optional)"
            autoCapitalize="none"
          />
          <Field
            label="password"
            value={password}
            onChange={setPassword}
            placeholder="optional"
            secure
          />

          <Pressable
            onPress={connect}
            disabled={busy}
            style={({ pressed }) => ({
              marginTop: 20,
              paddingVertical: 14,
              borderRadius: 4,
              backgroundColor: busy ? colors.surfaceAlt : colors.accent,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              style={{
                color: busy ? colors.muted : colors.background,
                fontFamily: fonts.mono,
                fontSize: fontSizes.md,
                fontWeight: '600',
              }}
            >
              {busy ? 'connecting…' : 'connect'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  keyboardType?: 'default' | 'url';
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          marginBottom: 4,
        }}
      >
        {props.label}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={colors.mutedAlt}
        secureTextEntry={props.secure}
        autoCapitalize={props.autoCapitalize ?? 'sentences'}
        keyboardType={props.keyboardType ?? 'default'}
        autoCorrect={false}
        style={{
          color: colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 4,
          backgroundColor: colors.surface,
        }}
      />
    </View>
  );
}

function hostFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return 'opencode';
  }
}
