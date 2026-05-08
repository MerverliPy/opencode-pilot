import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { colors, fonts, fontSizes } from '@/theme';

type Props = {
  code: string;
  language?: string;
};

/**
 * Code block rendered TUI-style: title bar with language, monospace body,
 * long-press to copy. We avoid heavy syntax-highlighter on RN by doing
 * lightweight regex tokenization for the most common languages.
 */
export function CodeBlock({ code, language }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await Clipboard.setStringAsync(code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <View
      style={{
        marginVertical: 6,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surfaceAlt,
        }}
      >
        <Text style={{ color: colors.muted, fontFamily: fonts.mono, fontSize: fontSizes.xs }}>
          {language ?? 'text'}
        </Text>
        <Pressable onPress={onCopy} hitSlop={6}>
          <Text style={{ color: copied ? colors.success : colors.accent, fontFamily: fonts.mono, fontSize: fontSizes.xs }}>
            {copied ? 'copied' : 'copy'}
          </Text>
        </Pressable>
      </View>
      <Pressable onLongPress={onCopy}>
        <View style={{ padding: 8 }}>
          <HighlightedText code={code} language={language} />
        </View>
      </Pressable>
    </View>
  );
}

/**
 * Lightweight tokenizer-based highlighter. Not a full parser, but enough
 * to feel like the TUI for the common languages.
 */
function HighlightedText({ code, language }: { code: string; language?: string }) {
  const tokens = tokenize(code, language);
  return (
    <Text
      selectable
      style={{
        color: colors.foreground,
        fontFamily: fonts.mono,
        fontSize: fontSizes.sm,
        lineHeight: fontSizes.sm * 1.45,
      }}
    >
      {tokens.map((t, i) => (
        <Text key={i} style={{ color: t.color ?? colors.foreground }}>
          {t.text}
        </Text>
      ))}
    </Text>
  );
}

type Tok = { text: string; color?: string };

function tokenize(code: string, language?: string): Tok[] {
  const out: Tok[] = [];
  const lang = (language ?? '').toLowerCase();
  // Pattern set per language family
  const isCode = ['ts', 'tsx', 'js', 'jsx', 'typescript', 'javascript', 'go', 'rs', 'rust', 'py', 'python', 'java', 'kt', 'kotlin', 'c', 'cpp', 'swift'].includes(lang);

  if (!isCode) {
    out.push({ text: code });
    return out;
  }

  const keywords = new Set([
    'const','let','var','function','return','if','else','for','while','do','switch','case','break','continue',
    'class','interface','type','enum','extends','implements','import','export','from','default','async','await',
    'new','this','super','public','private','protected','static','readonly','void','null','undefined','true','false',
    'try','catch','finally','throw','as','in','of','typeof','instanceof',
    'def','lambda','pass','elif','None','True','False','and','or','not','is','with','yield',
    'fn','let','mut','pub','use','mod','match','struct','impl','trait','self','Self','crate','where',
    'package','func','go','chan','select','defer','map','interface',
  ]);

  // Tokenize via running scanner
  const len = code.length;
  let i = 0;
  while (i < len) {
    const ch = code[i];

    // Line comment //  or  #
    if (ch === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const stop = end === -1 ? len : end;
      out.push({ text: code.slice(i, stop), color: colors.muted });
      i = stop;
      continue;
    }
    if (ch === '#' && (lang === 'py' || lang === 'python')) {
      const end = code.indexOf('\n', i);
      const stop = end === -1 ? len : end;
      out.push({ text: code.slice(i, stop), color: colors.muted });
      i = stop;
      continue;
    }
    // Block comment /* */
    if (ch === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? len : end + 2;
      out.push({ text: code.slice(i, stop), color: colors.muted });
      i = stop;
      continue;
    }

    // Strings
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < len && code[j] !== quote) {
        if (code[j] === '\\') j++;
        j++;
      }
      const stop = Math.min(j + 1, len);
      out.push({ text: code.slice(i, stop), color: colors.success });
      i = stop;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < len && /[0-9._xXa-fA-F]/.test(code[j])) j++;
      out.push({ text: code.slice(i, j), color: colors.warning });
      i = j;
      continue;
    }

    // Identifiers / keywords
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < len && /[A-Za-z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (keywords.has(word)) {
        out.push({ text: word, color: colors.tool });
      } else if (/^[A-Z]/.test(word)) {
        out.push({ text: word, color: colors.warning });
      } else if (code[j] === '(') {
        out.push({ text: word, color: colors.info });
      } else {
        out.push({ text: word });
      }
      i = j;
      continue;
    }

    // Default: single char
    out.push({ text: ch });
    i++;
  }

  return out;
}
