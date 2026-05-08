import { Text, View } from 'react-native';
import { colors, fonts, fontSizes } from '@/theme';
import { Pill } from '@/components/shared/Pill';
import type { SessionStatus } from '@/services/types';

type Props = {
  status: SessionStatus;
  modelLabel: string;
  agent: string;
  tokens?: number;
  onModelPress: () => void;
  onAgentPress: () => void;
};

/** Bottom status line. Mirrors the TUI status bar. */
export function StatusBar({ status, modelLabel, agent, tokens, onModelPress, onAgentPress }: Props) {
  const statusText =
    status === 'busy' ? 'thinking…' :
    status === 'error' ? 'error' :
    status === 'aborted' ? 'aborted' :
    'ready';

  const statusColor =
    status === 'busy' ? colors.accent :
    status === 'error' ? colors.error :
    status === 'aborted' ? colors.warning :
    colors.success;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 8,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }}
    >
      <Text style={{ color: statusColor, fontFamily: fonts.mono, fontSize: fontSizes.xs }}>
        {statusText}
      </Text>
      {tokens !== undefined ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.xs }}>
          {tokens.toLocaleString()} tok
        </Text>
      ) : null}
      <View style={{ flex: 1 }} />
      <Pill label={modelLabel} onPress={onModelPress} tone="muted" />
      <Pill label={agent} onPress={onAgentPress} tone="accent" />
    </View>
  );
}
