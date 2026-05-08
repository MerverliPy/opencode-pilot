import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import { colors, fonts, fontSizes } from '@/theme';
import type { ToolPart } from '@/services/types';

/**
 * TUI-style tool call line. Collapsed by default; expand to see args/output.
 *
 *   ● Reading packages/auth/index.ts
 *   ✓ Edit packages/settings/index.ts
 *   ✗ Bash: command failed
 */
export function ToolCall({ part }: { part: ToolPart }) {
  const [expanded, setExpanded] = useState(false);
  const status = part.state.status;

  const icon =
    status === 'completed' ? '✓' :
    status === 'error' ? '✗' :
    '●';

  const color =
    status === 'completed' ? colors.success :
    status === 'error' ? colors.error :
    colors.accent;

  const title = part.state.title ?? prettyToolName(part.tool);

  return (
    <Pressable onPress={() => setExpanded((x) => !x)} style={{ paddingVertical: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text style={{ color, fontFamily: fonts.mono, fontSize: fontSizes.sm, width: 16 }}>
          {icon}
        </Text>
        <Text
          style={{
            flex: 1,
            color: colors.foreground,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
          }}
        >
          <Text style={{ color: colors.muted }}>{part.tool}</Text>
          <Text>  </Text>
          <Text>{title}</Text>
        </Text>
      </View>
      {expanded && (
        <View
          style={{
            marginLeft: 16,
            marginTop: 4,
            paddingLeft: 8,
            borderLeftWidth: 1,
            borderLeftColor: colors.border,
          }}
        >
          {part.state.input !== undefined && (
            <Text
              selectable
              style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.xs, marginBottom: 4 }}
            >
              {safeStringify(part.state.input)}
            </Text>
          )}
          {part.state.output && (
            <Text
              selectable
              style={{ color: colors.foreground, fontFamily: fonts.mono, fontSize: fontSizes.xs }}
            >
              {part.state.output}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

function prettyToolName(tool: string): string {
  return tool.replace(/_/g, ' ');
}

function safeStringify(v: unknown): string {
  try {
    if (typeof v === 'string') return v;
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
