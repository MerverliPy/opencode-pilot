/**
 * Card — reusable surface container with border + radius + bg.
 *
 * Default: 1px solid border, radii.md, colors.surface bg.
 * Override padding/bg/radius via `style` prop.
 */
import { colors, radii, spacing } from "../../theme";

type Props = {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
  style?: React.CSSProperties;
};

export function Card({
  children,
  className,
  "data-testid": testId,
  style,
}: Props) {
  return (
    <div
      className={className}
      data-testid={testId}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        padding: spacing.px3,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
