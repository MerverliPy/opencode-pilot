/**
 * Theme stub for M1 — provides colour / font tokens so that the
 * legacy React Native memory-plugin UI components type-check correctly.
 *
 * Real web theming will be implemented in M2 using CSS variables / Tailwind.
 */

export const colors = {
  // Backgrounds
  bg: "#0d0d0d",
  surface: "#1a1a1a",
  surfaceAlt: "#222222",

  // Text
  text: "#e8e8e8",
  muted: "#808080",
  mutedAlt: "#606060",

  // Accents
  accent: "#4fc3f7",
  info: "#64b5f6",
  success: "#81c784",
  warning: "#ffb74d",
  error: "#e57373",
  tool: "#ce93d8",

  // Borders
  border: "#333333",
  borderSubtle: "#2a2a2a",

  // Foreground alias (same as text)
  foreground: "#e8e8e8",
} as const;

export const fonts = {
  mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  sans: "system-ui, -apple-system, sans-serif",
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
} as const;
