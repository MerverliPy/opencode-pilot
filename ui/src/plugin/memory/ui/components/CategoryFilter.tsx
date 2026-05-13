/**
 * CategoryFilter: horizontal tab strip for filtering memories by category.
 * Ported from React Native to HTML/CSS (M5).
 */
import { colors, fonts, fontSizes } from "../../../../theme";
import type { MemoryCategory } from "../../db/schema";

export type FilterCategory = MemoryCategory | "all";

const TABS: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "all" },
  { value: "preference", label: "pref" },
  { value: "fact", label: "fact" },
  { value: "code_pattern", label: "code" },
  { value: "decision", label: "dec" },
];

type Props = {
  value: FilterCategory;
  onChange: (v: FilterCategory) => void;
};

export function CategoryFilter({ value, onChange }: Props) {
  return (
    <div
      style={{
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        overflowX: "auto",
        paddingInline: 12,
        gap: 4,
      }}
    >
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            style={{
              background: "none",
              border: "none",
              borderBottom: `2px solid ${active ? colors.accent : "transparent"}`,
              padding: "8px 12px",
              color: active ? colors.accent : colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              cursor: "pointer",
              flexShrink: 0,
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
