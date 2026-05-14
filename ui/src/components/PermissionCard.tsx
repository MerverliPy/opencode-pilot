/**
 * PermissionCard: inline permission request with allow/deny buttons.
 */
import { colors, fonts, fontSizes } from "../theme";
import type { PermissionRequest } from "@pilot-shared/types";

type Props = {
  permission: PermissionRequest;
  onRespond: (response: "always" | "once" | "reject") => void;
};

export function PermissionCard({ permission, onRespond }: Props) {
  return (
    <div
      data-testid="permission-card"
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: "12px 14px",
        backgroundColor: colors.bg,
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
          color: colors.text,
          marginBottom: 4,
        }}
      >
        {permission.title}
      </div>
      {permission.description && (
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            color: colors.muted,
            marginBottom: 10,
          }}
        >
          {permission.description}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          data-testid="permission-approve-button"
          onClick={() => onRespond("always")}
          style={{
            backgroundColor: colors.success,
            color: "#000",
            border: "none",
            borderRadius: 4,
            padding: "5px 12px",
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            cursor: "pointer",
          }}
        >
          Always
        </button>
        <button
          data-testid="permission-once-button"
          onClick={() => onRespond("once")}
          style={{
            backgroundColor: colors.accent,
            color: "#000",
            border: "none",
            borderRadius: 4,
            padding: "5px 12px",
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            cursor: "pointer",
          }}
        >
          Once
        </button>
        <button
          data-testid="permission-reject-button"
          onClick={() => onRespond("reject")}
          style={{
            backgroundColor: "transparent",
            color: colors.error,
            border: `1px solid ${colors.error}`,
            borderRadius: 4,
            padding: "5px 12px",
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            cursor: "pointer",
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}
