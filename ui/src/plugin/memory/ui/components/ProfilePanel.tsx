/**
 * ProfilePanel — Displays user profile facts extracted by the memory system.
 *
 * Fetches from GET /memory/:serverId/profile on mount and renders a scrollable
 * grid of key-value cards with confidence bars.
 */
import { useState, useEffect } from "react";
import { createMemoryApi } from "../../../../services/memoryApi";
import type { ServerConfig } from "../../../../services/auth";
import type { ProfileEntry } from "../../db/schema";
import { colors, fonts, fontSizes } from "../../../../theme";
import { friendlyError } from "../../../../lib/errors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return colors.success;
  if (confidence >= 0.5) return colors.warning;
  return colors.error;
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  serverId: string;
  server: ServerConfig;
};

export function ProfilePanel({ serverId, server }: Props) {
  const [entries, setEntries] = useState<ProfileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const api = createMemoryApi(server);
        const results = await api.getProfile(serverId);
        if (cancelled) return;
        // Sort by confidence descending (most confident first)
        const sorted = [...results].sort((a, b) => b.confidence - a.confidence);
        setEntries(sorted);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(friendlyError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch();
    return () => {
      cancelled = true;
    };
  }, [serverId, server]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        data-testid="profile-panel"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
        }}
      >
        loading profile…
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        data-testid="profile-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
          gap: 8,
          padding: 24,
          color: colors.error,
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
        }}
      >
        <span>{error}</span>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div
        data-testid="profile-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
          padding: 32,
          color: colors.mutedAlt,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
          textAlign: "center",
        }}
      >
        no profile data yet
      </div>
    );
  }

  // ── Cards ──────────────────────────────────────────────────────────────────
  return (
    <div
      data-testid="profile-panel"
      style={{
        flex: 1,
        overflowY: "auto",
        minHeight: 0,
      }}
    >
      {entries.map((entry) => {
        const barColor = confidenceColor(entry.confidence);
        return (
          <div
            key={entry.id}
            data-testid={`profile-entry-${entry.id}`}
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${colors.borderSubtle}`,
            }}
          >
            {/* Key */}
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                color: colors.accent,
                fontWeight: 600,
                marginBottom: 4,
                wordBreak: "break-word",
              }}
            >
              {entry.key}
            </div>

            {/* Value */}
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.md,
                color: colors.text,
                wordBreak: "break-word",
                marginBottom: 6,
              }}
            >
              {entry.value}
            </div>

            {/* Confidence bar */}
            <div
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.surfaceAlt,
                marginTop: 8,
                marginBottom: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${entry.confidence * 100}%`,
                  backgroundColor: barColor,
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            {/* Metadata row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                  color: barColor,
                  fontWeight: 600,
                }}
              >
                {Math.round(entry.confidence * 100)}%
              </span>

              {entry.sourceMemoryId && (
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    color: colors.mutedAlt,
                  }}
                >
                  source: {truncateId(entry.sourceMemoryId)}
                </span>
              )}

              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                  color: colors.mutedAlt,
                  marginLeft: "auto",
                }}
              >
                {relativeTime(entry.updatedAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
