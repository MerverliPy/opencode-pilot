import { colors } from './colors';

/**
 * Syntax highlighter color map matching the OpenCode default TUI theme.
 * Used by react-native-syntax-highlighter via the prism style prop.
 */
export const syntaxStyle = {
  'code[class*="language-"]': {
    color: colors.foreground,
    background: 'transparent',
    fontFamily: 'JetBrainsMono',
    fontSize: 12,
  },
  'pre[class*="language-"]': {
    color: colors.foreground,
    background: 'transparent',
    fontFamily: 'JetBrainsMono',
    margin: 0,
    padding: 0,
  },
  comment: { color: colors.muted, fontStyle: 'italic' },
  prolog: { color: colors.muted },
  doctype: { color: colors.muted },
  cdata: { color: colors.muted },
  punctuation: { color: colors.foreground },
  property: { color: colors.warning },
  tag: { color: colors.error },
  boolean: { color: colors.warning },
  number: { color: colors.warning },
  constant: { color: colors.warning },
  symbol: { color: colors.warning },
  selector: { color: colors.success },
  'attr-name': { color: colors.warning },
  string: { color: colors.success },
  char: { color: colors.success },
  builtin: { color: colors.info },
  inserted: { color: colors.success },
  operator: { color: colors.foreground },
  entity: { color: colors.foreground },
  url: { color: colors.info },
  '.language-css .token.string': { color: colors.success },
  '.style .token.string': { color: colors.success },
  variable: { color: colors.foreground },
  atrule: { color: colors.tool },
  'attr-value': { color: colors.success },
  keyword: { color: colors.tool },
  function: { color: colors.info },
  'class-name': { color: colors.warning },
  regex: { color: colors.warning },
  important: { color: colors.error, fontWeight: 'bold' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
};
