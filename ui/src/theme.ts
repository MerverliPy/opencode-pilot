/**
 * Theme tokens — colour palette, font stacks, and font sizes.
 *
 * Colours and fonts are passed as inline styles to components that were
 * ported from the legacy React Native memory plugin UI. Newer components
 * use Tailwind CSS variables defined in the global stylesheet.
 */

export const colors = {
  // Backgrounds
  bg: "#0d0d0d",
  surface: "#1a1a1a",
  surfaceAlt: "#222222",

  // Text
  text: "#e8e8e8",
  muted: "#878787",
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
