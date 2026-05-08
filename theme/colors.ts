/**
 * OpenCode TUI default palette, mapped for the iPhone client.
 * Sourced from the OpenCode default theme so the app feels like the TUI.
 */
export const colors = {
  background: '#0F0F0F',
  surface: '#161616',
  surfaceAlt: '#1C1C1C',
  foreground: '#E5E5E5',
  muted: '#7A7A7A',
  mutedAlt: '#4A4A4A',
  border: '#2A2A2A',
  borderSubtle: '#1F1F1F',

  accent: '#FFB454', // OpenCode orange
  accentDim: '#8A5C20',

  success: '#7FBA8A',
  error: '#E06C75',
  warning: '#E5C07B',
  info: '#61AFEF',

  user: '#61AFEF',
  assistant: '#E5E5E5',
  tool: '#C678DD',

  diffAdd: '#1E3A24',
  diffAddText: '#7FBA8A',
  diffRemove: '#3A1E22',
  diffRemoveText: '#E06C75',
} as const;

export type Colors = typeof colors;
