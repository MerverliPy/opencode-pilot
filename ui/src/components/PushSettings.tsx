/**
 * Web Push settings component.
 *
 * Allows the user to subscribe / unsubscribe from push notifications.
 */
import { useState, useEffect } from "react";
import { colors, fonts, fontSizes } from "../theme";
import {
  fetchPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
} from "../services/push";

export function PushSettings() {
  const [enabled, setEnabled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const status = await fetchPushStatus();
        if (cancelled) return;
        setEnabled(status.enabled);
        if (status.enabled) {
          const sub = await isPushSubscribed();
          if (cancelled) return;
          setSubscribed(sub);
        }
        setError(null);
      } catch {
        if (!cancelled) setError("Failed to fetch push status");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        const status = await fetchPushStatus();
        if (!status.publicKey) {
          setError("Push not configured on server");
          return;
        }
        const ok = await subscribeToPush(status.publicKey);
        setSubscribed(ok);
        if (!ok) setError("Browser denied push permission");
      }
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : String(_err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontFamily: fonts.sans,
          fontSize: fontSizes.md,
          color: colors.text,
          margin: "0 0 12px",
        }}
      >
        Notifications
      </h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              color: colors.text,
            }}
          >
            Web Push
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              color: colors.muted,
            }}
          >
            {enabled
              ? subscribed
                ? "Subscribed"
                : "Not subscribed"
              : "Not configured"}
          </div>
        </div>
        <button
          data-testid="push-toggle"
          onClick={() => void toggle()}
          disabled={loading || !enabled}
          style={{
            backgroundColor: subscribed ? colors.error : colors.accent,
            color: "#000",
            border: "none",
            borderRadius: 4,
            padding: "6px 12px",
            minWidth: 44,
            minHeight: 44,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            cursor: loading || !enabled ? "not-allowed" : "pointer",
            opacity: loading || !enabled ? 0.5 : 1,
          }}
        >
          {subscribed ? "Disable" : "Enable"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            color: colors.error,
          }}
        >
          {error}
        </div>
      )}
    </section>
  );
}
