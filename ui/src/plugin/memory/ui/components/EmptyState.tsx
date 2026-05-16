/**
 * EmptyState: shown when a memory list is empty.
 * Ported from React Native to HTML/CSS (M5).
 */
import { colors, fonts, fontSizes } from "../../../../theme";

type Props = {
  message?: string;
};

export function EmptyState({ message = "no memories yet" }: Props) {
  return (
    <div
      data-testid="memory-empty-state"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        textAlign: "center",
      }}
    >
      <div
        style={{
          color: colors.mutedAlt,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
        }}
      >
        {message}
      </div>
      <div
        style={{
          color: colors.mutedAlt,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          marginTop: 8,
          lineHeight: 1.6,
          whiteSpace: "pre-line",
        }}
      >
        {"memories are extracted automatically\nafter each conversation ends"}
      </div>
    </div>
  );
}
