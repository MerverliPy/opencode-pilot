/**
 * Input — reusable input component.
 *
 * Styles derived from theme tokens. Focus ring via global CSS (Phase 1).
 */
import { colors, fonts, fontSizes, radii, spacing } from "../../theme";

type Props = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
  id?: string;
  "aria-label"?: string;
  "data-testid"?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  style?: React.CSSProperties;
  className?: string;
};

export function Input({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
  id,
  "aria-label": ariaLabel,
  "data-testid": testId,
  onKeyDown,
  onBlur,
  autoFocus,
  autoComplete,
  inputRef,
  style,
  className,
}: Props) {
  return (
    <input
      ref={inputRef}
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      data-testid={testId}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      className={className}
      style={{
        fontFamily: fonts.sans,
        fontSize: fontSizes.sm,
        color: colors.text,
        backgroundColor: colors.surfaceAlt,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        padding: `${spacing.px3} ${spacing.px3}`,
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}
