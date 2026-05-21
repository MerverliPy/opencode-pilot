/**
 * MemoryCard: displays a single memory with pin / archive / delete actions.
 * Ported from React Native to HTML/CSS (M5).
 */
import { colors, fonts, fontSizes } from "../../../../theme";
import { Card } from "../../../../components/ui/Card";
import type { Memory, MemoryCategory } from "../../db/schema";

const CATEGORY_COLOR: Record<MemoryCategory, string> = {
  preference: colors.info,
  fact: colors.success,
  code_pattern: colors.tool,
  decision: colors.warning,
};

const CATEGORY_LABEL: Record<MemoryCategory, string> = {
  preference: "pref",
  fact: "fact",
  code_pattern: "code",
  decision: "dec",
};

type Props = {
  memory: Memory;
  onPin: (id: string, isPinned: boolean) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
};

export function MemoryCard({ memory, onPin, onArchive, onDelete }: Props) {
  const catColor = CATEGORY_COLOR[memory.category] ?? colors.muted;
  const catLabel = CATEGORY_LABEL[memory.category] ?? memory.category;

  return (
    <Card
      data-testid="memory-card"
      style={{
        border: "none",
        borderBottom: `1px solid ${colors.borderSubtle}`,
        borderRadius: 0,
        padding: "12px 16px",
        backgroundColor: memory.isPinned ? colors.surface : "transparent",
      }}
    >
      {/* Category badge + pin indicator + confidence */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          data-testid="memory-category"
          style={{
            border: `1px solid ${catColor}`,
            borderRadius: 3,
            padding: "1px 5px",
            color: catColor,
            fontFamily: fonts.mono,
            fontSize: 9,
            letterSpacing: "0.5px",
          }}
        >
          {catLabel.toUpperCase()}
        </span>
        {memory.isPinned && (
          <span
            style={{
              color: colors.accent,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
            }}
          >
            ★
          </span>
        )}
        <span
          data-testid="memory-confidence"
          style={{
            color: colors.mutedAlt,
            fontFamily: fonts.mono,
            fontSize: 9,
            marginLeft: "auto",
          }}
        >
          {`${Math.round(memory.confidence * 100)}%`}
        </span>
      </div>

      {/* Content */}
      <div
        data-testid="memory-content"
        style={{
          color: colors.foreground,
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
          lineHeight: 1.5,
        }}
      >
        {memory.content}
      </div>

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginTop: 8,
          }}
        >
          {memory.tags.map((tag) => (
            <span
              key={tag}
              style={{
                color: colors.muted,
                fontFamily: fonts.mono,
                fontSize: 9,
                backgroundColor: colors.surfaceAlt,
                padding: "2px 5px",
                borderRadius: 3,
              }}
            >
              {`#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        <button
          data-testid="memory-pin"
          onClick={() => onPin(memory.id, !memory.isPinned)}
          style={{
            background: "none",
            border: "none",
            color: memory.isPinned ? colors.accent : colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {memory.isPinned ? "unpin" : "pin"}
        </button>
        <button
          data-testid="memory-archive"
          onClick={() => onArchive(memory.id)}
          style={{
            background: "none",
            border: "none",
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            cursor: "pointer",
            padding: 0,
          }}
        >
          archive
        </button>
        <button
          data-testid="memory-delete"
          onClick={() => onDelete(memory.id)}
          style={{
            background: "none",
            border: "none",
            color: colors.error,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            cursor: "pointer",
            padding: 0,
          }}
        >
          delete
        </button>
      </div>
    </Card>
  );
}
