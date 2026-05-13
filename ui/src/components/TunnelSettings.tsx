/**
 * Cloudflare Tunnel settings component.
 *
 * Displays tunnel status, URL, QR code, and start/stop controls.
 */
import { useState, useEffect } from "react";
import { colors, fonts, fontSizes } from "../theme";
import {
  fetchTunnelStatus,
  startTunnel,
  stopTunnel,
  type TunnelStatus,
} from "../services/tunnel";
import QRCode from "qrcode";

export function TunnelSettings() {
  const [status, setStatus] = useState<TunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const s = await fetchTunnelStatus();
      setStatus(s);
      if (s.url) {
        const dataUrl = await QRCode.toDataURL(s.url, {
          width: 180,
          margin: 2,
          color: { dark: "#fafafa", light: "#18181b" },
        });
        setQrDataUrl(dataUrl);
      } else {
        setQrDataUrl(null);
      }
      setError(null);
    } catch {
      setError("Failed to fetch tunnel status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startTunnel();
      await refresh();
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : String(_err));
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopTunnel();
      await refresh();
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : String(_err));
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async () => {
    if (!status?.url) return;
    await navigator.clipboard.writeText(status.url);
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
        Remote Access
      </h2>

      <div
        style={{
          padding: "10px 12px",
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
              Cloudflare Tunnel
            </div>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                color: colors.muted,
              }}
            >
              {status?.active
                ? "Active"
                : status?.error
                  ? `Error: ${status.error}`
                  : "Inactive"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              data-testid="tunnel-start"
              onClick={() => void handleStart()}
              disabled={loading || status?.active}
              style={{
                backgroundColor: colors.accent,
                color: "#000",
                border: "none",
                borderRadius: 4,
                padding: "6px 12px",
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                cursor: loading || status?.active ? "not-allowed" : "pointer",
                opacity: loading || status?.active ? 0.5 : 1,
              }}
            >
              Start
            </button>
            <button
              data-testid="tunnel-stop"
              onClick={() => void handleStop()}
              disabled={loading || !status?.active}
              style={{
                backgroundColor: colors.error,
                color: "#000",
                border: "none",
                borderRadius: 4,
                padding: "6px 12px",
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                cursor: loading || !status?.active ? "not-allowed" : "pointer",
                opacity: loading || !status?.active ? 0.5 : 1,
              }}
            >
              Stop
            </button>
          </div>
        </div>

        {status?.url && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                color: colors.accent,
                wordBreak: "break-all",
              }}
            >
              {status.url}
            </span>
            <button
              data-testid="tunnel-copy"
              onClick={() => void copyUrl()}
              style={{
                backgroundColor: "transparent",
                border: `1px solid ${colors.border}`,
                color: colors.text,
                borderRadius: 4,
                padding: "4px 10px",
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                cursor: "pointer",
              }}
            >
              Copy
            </button>
          </div>
        )}

        {qrDataUrl && (
          <img
            data-testid="tunnel-qr"
            src={qrDataUrl}
            alt="Tunnel QR code"
            style={{ width: 180, height: 180, borderRadius: 4 }}
          />
        )}
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
