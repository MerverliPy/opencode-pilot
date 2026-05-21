/**
 * DebugPanel — collapsible debug log panel for chat pipeline.
 *
 * Toggle with Ctrl+D keyboard shortcut.
 * Shows request method, path, status, latency, model, tokens.
*
 * NOTE: This component intentionally uses borderTop instead of full border,
 * because it is a sliding bottom panel, not a card surface.
 * Do NOT migrate to Card component — the visual structure would degrade.
 */

import { useEffect } from "react";
import { useDebugLog } from "../services/useDebugLog";
import { colors, fonts, fontSizes } from "../theme";

type Props = {
  visible: boolean;
  onToggle: () => void;
};

export function DebugPanel({ visible, onToggle }: Props) {
  const { entries, clearLog, toggle, enabled } = useDebugLog();

  // Ctrl+D toggle visibility
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);

  if (!visible) return null;

  return (
    <div
      style={{
        borderTop: `1px solid ${colors.borderSubtle}`,
        backgroundColor: colors.surface,
        fontFamily: fonts.mono,
        fontSize: fontSizes.xs,
        maxHeight: 240,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderBottom: `1px solid ${colors.borderSubtle}`,
          backgroundColor: colors.surfaceAlt,
        }}
      >
        <span style={{ fontWeight: 600, color: colors.text }}>
          Debug Log ({entries.length})
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ color: colors.muted, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={toggle}
              style={{ marginRight: 4 }}
            />
            Capture
          </label>
          <button
            onClick={clearLog}
            style={{
              background: "none",
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              cursor: "pointer",
              padding: "2px 8px",
              borderRadius: 4,
              fontFamily: fonts.sans,
              fontSize: fontSizes.xs,
            }}
          >
            Clear
          </button>
          <button
            onClick={onToggle}
            aria-label="Close debug panel"
            style={{
              background: "none",
              border: "none",
              color: colors.muted,
              cursor: "pointer",
              fontSize: fontSizes.sm,
              padding: "2px 4px",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Entries */}
      {entries.length === 0 && (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: colors.muted,
            fontFamily: fonts.sans,
          }}
        >
          No debug entries yet
        </div>
      )}
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            display: "flex",
            gap: 8,
            padding: "4px 12px",
            borderBottom: `1px solid ${colors.borderSubtle}`,
            color: colors.text,
            alignItems: "center",
          }}
        >
          <span
            style={{
              color:
                entry.status >= 400
                  ? colors.error
                  : entry.status >= 300
                    ? "#d4a017"
                    : colors.success,
              fontWeight: 600,
              minWidth: 36,
            }}
          >
            {entry.status}
          </span>
          <span style={{ color: colors.accent, minWidth: 48 }}>
            {entry.method}
          </span>
          <span style={{ flex: 1, color: colors.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.path}
          </span>
          <span style={{ color: colors.muted, minWidth: 50, textAlign: "right" }}>
            {entry.latency}ms
          </span>
          {entry.model && (
            <span style={{ color: colors.muted, fontSize: fontSizes.xs }}>
              {entry.model}
            </span>
          )}
          {entry.tokens !== undefined && (
            <span style={{ color: colors.muted, fontSize: fontSizes.xs }}>
              {entry.tokens}t
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
