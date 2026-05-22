/**
 * Button — reusable button component with variants.
 *
 * Variants: primary (accent bg), secondary (border + transparent bg),
 *           ghost (no border/bg), danger (error bg or error border).
 * Sizes: sm (compact), md (default).
 */
import { memo } from "react";
import { colors, fonts, fontSizes, radii, spacing } from "../../theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type Props = {
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  "aria-label"?: string;
  style?: React.CSSProperties;
};

function variantStyle(variant: ButtonVariant, disabled: boolean): React.CSSProperties {
  if (disabled) {
    return {
      backgroundColor: colors.surfaceAlt,
      color: colors.muted,
      border: `1px solid ${colors.border}`,
      cursor: "not-allowed",
      opacity: 0.4,
    };
  }
  switch (variant) {
    case "primary":
      return {
        backgroundColor: colors.accent,
        color: colors.accentText,
        border: "none",
        cursor: "pointer",
      };
    case "secondary":
      return {
        backgroundColor: "transparent",
        color: colors.text,
        border: `1px solid ${colors.border}`,
        cursor: "pointer",
      };
    case "ghost":
      return {
        backgroundColor: "transparent",
        color: colors.muted,
        border: "none",
        cursor: "pointer",
      };
    case "danger":
      return {
        backgroundColor: "transparent",
        color: colors.error,
        border: `1px solid ${colors.error}`,
        cursor: "pointer",
      };
  }
}

function sizeStyle(size: ButtonSize): React.CSSProperties {
  switch (size) {
    case "sm":
      return { padding: "2px 10px", fontSize: fontSizes.xs };
    case "md":
      return { padding: `${spacing.px3} ${spacing.px4}`, fontSize: fontSizes.md };
  }
}

export const Button = memo(function Button({
  type = "button" as const,
  variant = "secondary",
  size = "sm",
  disabled = false,
  loading = false,
  onClick,
  children,
  className,
  "data-testid": testId,
  "aria-label": ariaLabel,
  style,
}: Props) {
  return (
    <button
      type={type}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled}
      className={className}
      data-testid={testId}
      aria-label={ariaLabel}
      style={{
        fontFamily: fonts.sans,
        fontWeight: 600,
        borderRadius: radii.md,
        ...variantStyle(variant, disabled),
        ...sizeStyle(size),
        minWidth: 44,
        minHeight: 44,
        display: "inline-flex",
        alignItems: "center",
        gap: spacing.px1,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
        transition: "opacity 0.15s, background-color 0.15s",
        ...style,  // allow caller overrides
      }}
    >
      {loading ? "..." : children}
    </button>
  );
});
