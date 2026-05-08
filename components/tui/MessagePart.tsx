import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, fonts, fontSizes } from '@/theme';
import type { Part } from '@/services/types';
import { CodeBlock } from './CodeBlock';
import { ToolCall } from './ToolCall';

/** Renders a single message part using TUI conventions. */
export function MessagePart({ part, role }: { part: Part; role: 'user' | 'assistant' | 'system' }) {
  switch (part.type) {
    case 'text':
      return <TextBlock text={part.text} role={role} />;
    case 'reasoning':
      return (
        <Text
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            fontStyle: 'italic',
            marginVertical: 2,
          }}
        >
          {part.text}
        </Text>
      );
    case 'tool':
      return <ToolCall part={part} />;
    case 'file':
      return (
        <Text style={{ color: colors.info, fontFamily: fonts.mono, fontSize: fontSizes.sm }}>
          📎 {part.filename ?? 'file'}
        </Text>
      );
    case 'step-start':
    case 'step-finish':
      return null;
    default:
      return null;
  }
}

/**
 * A text block can contain ``` fenced code. Split it into prose and CodeBlock.
 */
function TextBlock({ text, role }: { text: string; role: 'user' | 'assistant' | 'system' }) {
  const segments = splitFences(text);
  const onLongPress = async () => {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={400}>
      <View style={{ marginVertical: 2 }}>
        {segments.map((seg, i) => {
          if (seg.kind === 'code') {
            return <CodeBlock key={i} code={seg.code} language={seg.lang} />;
          }
          return (
            <Text
              key={i}
              selectable
              style={{
                color: role === 'user' ? colors.user : colors.foreground,
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                lineHeight: fontSizes.sm * 1.5,
              }}
            >
              {seg.text}
            </Text>
          );
        })}
      </View>
    </Pressable>
  );
}

type Segment = { kind: 'text'; text: string } | { kind: 'code'; code: string; lang?: string };

function splitFences(input: string): Segment[] {
  const out: Segment[] = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    if (m.index > last) {
      const txt = input.slice(last, m.index);
      if (txt.trim()) out.push({ kind: 'text', text: txt });
    }
    out.push({ kind: 'code', code: m[2].replace(/\n$/, ''), lang: m[1] });
    last = m.index + m[0].length;
  }
  if (last < input.length) {
    const tail = input.slice(last);
    if (tail.trim()) out.push({ kind: 'text', text: tail });
  }
  return out;
}
