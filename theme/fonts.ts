/**
 * Monospaced font stack matching the OpenCode TUI feel.
 * JetBrainsMono is the canonical TUI font; we fall back to system mono.
 */
export const fonts = {
  mono: 'JetBrainsMono',
  monoBold: 'JetBrainsMono-Bold',
  monoItalic: 'JetBrainsMono-Italic',
} as const;

export const fontSizes = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
} as const;

export const lineHeights = {
  tight: 1.2,
  normal: 1.45,
  relaxed: 1.7,
} as const;
