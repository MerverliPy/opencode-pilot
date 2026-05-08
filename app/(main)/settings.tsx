import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { colors, fonts, fontSizes } from '@/theme';
import { useServerStore } from '@/store/server';
import { useUIStore } from '@/store/ui';
import { useSessionStore } from '@/store/session';
import { loadPushToken } from '@/services/auth';
import { registerForPushNotifications } from '@/services/notifications';
import type { ServerConfig } from '@/services/auth';

export default function SettingsScreen() {
  const nav = useNavigation();
  const router = useRouter();
  const servers = useServerStore((s) => s.servers);
  const activeId = useServerStore((s) => s.activeId);
  const setActive = useServerStore((s) => s.setActive);
  const remove = useServerStore((s) => s.remove);

  const fontSize = useUIStore((s) => s.fontSize);
  const setFontSize = useUIStore((s) => s.setFontSize);

  const resetSession = useSessionStore((s) => s.reset);

  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    void loadPushToken().then(setPushToken);
  }, []);

  const copyToken = async () => {
    let token = pushToken;
    if (!token) {
      token = await registerForPushNotifications();
      setPushToken(token);
    }
    if (!token) {
      Alert.alert('No push token', 'Notifications permission was not granted.');
      return;
    }
    await Clipboard.setStringAsync(token);
    Alert.alert('Copied', 'Push token copied to clipboard.');
  };

  const openDrawer = () => nav.dispatch(DrawerActions.openDrawer());

  const onSelect = async (s: ServerConfig) => {
    if (s.id === activeId) return;
    resetSession();
    await setActive(s.id);
  };

  const onRemove = (s: ServerConfig) => {
    Alert.alert('Remove server', `Remove "${s.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await remove(s.id);
          if (s.id === activeId) {
            resetSession();
            router.replace('/setup');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <Header title="settings" onMenu={openDrawer} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Section title="servers">
          <FlatList
            data={servers}
            keyExtractor={(s) => s.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                  padding: 16,
                }}
              >
                no servers configured
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                onLongPress={() => onRemove(item)}
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
                    color: item.id === activeId ? colors.accent : colors.mutedAlt,
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                    width: 14,
                  }}
                >
                  {item.id === activeId ? '●' : '○'}
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
                    {item.name}
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
                    {item.url}
                  </Text>
                </View>
              </Pressable>
            )}
          />
          <Pressable
            onPress={() => router.push('/setup')}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 14,
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Text
              style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: fontSizes.sm }}
            >
              + add server
            </Text>
          </Pressable>
        </Section>

        <Section title="appearance">
          <Row label="font size">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Stepper
                label="−"
                onPress={() => setFontSize(Math.max(10, fontSize - 1))}
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                  minWidth: 24,
                  textAlign: 'center',
                }}
              >
                {fontSize}
              </Text>
              <Stepper
                label="+"
                onPress={() => setFontSize(Math.min(20, fontSize + 1))}
              />
            </View>
          </Row>
        </Section>

        <Section title="notifications">
          <Pressable
            onPress={copyToken}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderSubtle,
              backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
            })}
          >
            <Text
              style={{
                color: colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
              }}
            >
              {pushToken ? 'copy push token' : 'enable push notifications'}
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                marginTop: 4,
              }}
              numberOfLines={1}
            >
              {pushToken ?? 'tap to register with apple push servers'}
            </Text>
          </Pressable>
        </Section>

        <Section title="about">
          <Row label="version">
            <Text
              style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.sm }}
            >
              0.1.0
            </Text>
          </Row>
          <Row label="opencode">
            <Text
              style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.sm }}
            >
              pilot
            </Text>
          </Row>
        </Section>
      </ScrollView>
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
      <Text
        style={{
          flex: 1,
          color: colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text
        style={{
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          paddingHorizontal: 16,
          paddingVertical: 6,
          letterSpacing: 1,
        }}
      >
        {title.toUpperCase()}
      </Text>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderSubtle,
      }}
    >
      <Text
        style={{
          flex: 1,
          color: colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 30,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
      })}
    >
      <Text style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.md }}>
        {label}
      </Text>
    </Pressable>
  );
}
