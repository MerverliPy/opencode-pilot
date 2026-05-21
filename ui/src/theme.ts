/**
 * Theme tokens — colour palette, font stacks, and font sizes.
 *
 * Colours and fonts are passed as inline styles to components that were
 * ported from the legacy React Native memory plugin UI. Newer components
 * use CSS custom properties defined in the global stylesheet.
 */

export type ThemeName = "dark" | "light";

export type ThemePalette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  mutedAlt: string;
  accent: string;
  accentText: string;
  info: string;
  success: string;
  warning: string;
  error: string;
  tool: string;
  border: string;
  borderSubtle: string;
  foreground: string;
  selectionBackground: string;
  errorTint: string;
  successTint: string;
};

export const darkColors = {
  bg: "#0d0d0d",
  surface: "#1a1a1a",
  surfaceAlt: "#222222",
  text: "#e8e8e8",
  muted: "#878787",
  mutedAlt: "#606060",
  accent: "#4fc3f7",
  accentText: "#041319",
  info: "#64b5f6",
  success: "#81c784",
  warning: "#ffb74d",
  error: "#e57373",
  tool: "#ce93d8",
  border: "#333333",
  borderSubtle: "#2a2a2a",
  foreground: "#e8e8e8",
  selectionBackground: "rgba(79,195,247,0.3)",
  errorTint: "rgba(229,115,115,0.1)",
  successTint: "rgba(129,199,132,0.1)",
} as const satisfies ThemePalette;

export const lightColors = {
  bg: "#f7f7f8",
  surface: "#ffffff",
  surfaceAlt: "#f1f3f5",
  text: "#111827",
  muted: "#6b7280",
  mutedAlt: "#9ca3af",
  accent: "#0ea5e9",
  accentText: "#ffffff",
  info: "#2563eb",
  success: "#15803d",
  warning: "#b45309",
  error: "#dc2626",
  tool: "#9333ea",
  border: "#d1d5db",
  borderSubtle: "#e5e7eb",
  foreground: "#111827",
  selectionBackground: "rgba(14,165,233,0.18)",
  errorTint: "rgba(220,38,38,0.08)",
  successTint: "rgba(21,128,61,0.08)",
} as const satisfies ThemePalette;

function themeVar(name: keyof ThemePalette): string {
  return `var(--pilot-${name})`;
}

export function getSystemTheme(): ThemeName {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

export function getResolvedColors(theme: ThemeName = getSystemTheme()): ThemePalette {
  return theme === "light" ? lightColors : darkColors;
}

export const colors = {
  bg: themeVar("bg"),
  surface: themeVar("surface"),
  surfaceAlt: themeVar("surfaceAlt"),
  text: themeVar("text"),
  muted: themeVar("muted"),
  mutedAlt: themeVar("mutedAlt"),
  accent: themeVar("accent"),
  accentText: themeVar("accentText"),
  info: themeVar("info"),
  success: themeVar("success"),
  warning: themeVar("warning"),
  error: themeVar("error"),
  tool: themeVar("tool"),
  border: themeVar("border"),
  borderSubtle: themeVar("borderSubtle"),
  foreground: themeVar("foreground"),
  selectionBackground: themeVar("selectionBackground"),
  errorTint: themeVar("errorTint"),
  successTint: themeVar("successTint"),
} as const satisfies ThemePalette;

export const fonts = {
  mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  sans: "system-ui, -apple-system, sans-serif",
} as const;

export const fontSizes = {
  xs: "0.6875rem",
  sm: "0.8125rem",
  md: "0.9375rem",
  lg: "1.125rem",
  xl: "1.375rem",
} as const;

export const lineHeights = {
  tight: "1.25",
  normal: "1.5",
  relaxed: "1.75",
} as const;

export const spacing = {
  px1: "var(--pilot-space-1)",
  px2: "var(--pilot-space-2)",
  px3: "var(--pilot-space-3)",
  px4: "var(--pilot-space-4)",
  px5: "var(--pilot-space-5)",
  px6: "var(--pilot-space-6)",
  px7: "var(--pilot-space-7)",
  px8: "var(--pilot-space-8)",
} as const;

export const radii = {
  sm: "var(--pilot-radius-sm)",
  md: "var(--pilot-radius-md)",
  lg: "var(--pilot-radius-lg)",
} as const;
