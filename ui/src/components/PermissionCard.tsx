/**
 * PermissionCard: inline permission request with allow/deny buttons.
 */
import { colors, fonts, fontSizes } from "../theme";
import type { PermissionRequest } from "@pilot-shared/types";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

type Props = {
  permission: PermissionRequest;
  onRespond: (response: "always" | "once" | "reject") => void;
};

export function PermissionCard({ permission, onRespond }: Props) {
  return (
    <Card
      data-testid="permission-card"
      style={{
        backgroundColor: colors.bg,
        borderRadius: 8,
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
        <Button variant="primary" size="sm" onClick={() => onRespond("always")}>
          Always
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onRespond("once")}>
          Once
        </Button>
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
    </Card>
  );
}
