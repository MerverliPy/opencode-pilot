import { useEffect, useRef } from 'react';
import { Animated, FlatList, Text, View } from 'react-native';
import { colors, fonts, fontSizes } from '@/theme';
import type { Turn } from '@/store/session';
import { MessagePart } from './MessagePart';
import { PermissionCard } from './PermissionCard';
import type { PermissionRequest } from '@/services/types';

type Props = {
  turns: Turn[];
  permissions: PermissionRequest[];
  onPermission: (id: string, sessionID: string, response: 'always' | 'once' | 'reject') => void;
};

/** Bottom-aligned auto-scrolling message stream. */
export function MessageStream({ turns, permissions, onPermission }: Props) {
  const ref = useRef<FlatList<Turn>>(null);

  useEffect(() => {
    // Scroll to end when content changes.
    const t = setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [turns]);

  if (turns.length === 0 && permissions.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text style={{ color: colors.accent, fontFamily: fonts.mono, fontSize: 28, marginBottom: 8 }}>
          ◆
        </Text>
        <Text style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.md }}>
          new session
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            marginTop: 8,
            textAlign: 'center',
            lineHeight: fontSizes.xs * 1.6,
          }}
        >
          ask anything · use{'  '}
          <Text style={{ color: colors.accent }}>/</Text>
          {' '}for commands ·{'  '}
          <Text style={{ color: colors.accent }}>@</Text>
          {' '}to mention files
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        ref={ref}
        data={turns}
        keyExtractor={(t) => t.message.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
        renderItem={({ item }) => <TurnView turn={item} />}
        ListFooterComponent={
          permissions.length > 0 ? (
            <View>
              {permissions.map((p) => (
                <FadeIn key={p.id}>
                  <PermissionCard
                    permission={p}
                    onRespond={(resp) => onPermission(p.id, p.sessionID, resp)}
                  />
                </FadeIn>
              ))}
            </View>
          ) : null
        }
        onContentSizeChange={() => ref.current?.scrollToEnd({ animated: false })}
      />
    </View>
  );
}

function FadeIn({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function TurnView({ turn }: { turn: Turn }) {
  const role = turn.message.role;
  return (
    <View style={{ marginBottom: 14 }}>
      <RoleHeader role={role} />
      <View style={{ marginLeft: 14, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: colors.borderSubtle }}>
        {turn.parts.map((p) => (
          <MessagePart key={p.id} part={p} role={role} />
        ))}
      </View>
    </View>
  );
}

function RoleHeader({ role }: { role: 'user' | 'assistant' | 'system' }) {
  const label = role === 'user' ? 'user>' : role === 'assistant' ? 'opencode>' : 'system>';
  const color = role === 'user' ? colors.user : role === 'assistant' ? colors.accent : colors.muted;
  return (
    <Text style={{ color, fontFamily: fonts.mono, fontSize: fontSizes.sm, marginBottom: 4 }}>
      {label}
    </Text>
  );
}
