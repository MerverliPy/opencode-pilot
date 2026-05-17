/**
 * TimelineFeed — Scrollable vertical feed of memory timeline events.
 *
 * Fetches from GET /memory/:serverId/timeline on mount and paginates
 * with a "Load more" button using offset-based cursoring (page size 20).
 */
import { useState, useEffect, useCallback } from "react";
import { createMemoryApi } from "../../../../services/memoryApi";
import type { ServerConfig } from "../../../../services/auth";
import type { TimelineEvent, TimelineEventType } from "../../db/schema";
import { colors, fonts, fontSizes } from "../../../../theme";
import { friendlyError } from "../../../../lib/errors";

const PAGE_SIZE = 20;

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

function summarizePayload(payload: Record<string, unknown>): string {
  const str = JSON.stringify(payload);
  return str.length > 60 ? str.slice(0, 57) + "..." : str;
}

// ── Event type config ────────────────────────────────────────────────────────

type EventStyle = {
  color: string;
  icon: string;
  label: string;
};

const EVENT_STYLES: Record<TimelineEventType, EventStyle> = {
  prompt_sent: { color: colors.info, icon: "\u2192", label: "prompt" },
  response_received: { color: colors.success, icon: "\u2190", label: "response" },
  memory_extracted: { color: colors.tool, icon: "\uD83E\uDDE0", label: "extracted" },
  memory_injected: { color: colors.warning, icon: "\uD83D\uDC89", label: "injected" },
  memory_created: { color: colors.accent, icon: "\u2728", label: "created" },
  memory_deduplicated: { color: colors.muted, icon: "\u2245", label: "dedup" },
};

function eventStyle(type: TimelineEventType): EventStyle {
  return EVENT_STYLES[type] ?? { color: colors.muted, icon: "?", label: type };
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = {
  serverId: string;
  server: ServerConfig;
};

export function TimelineFeed({ serverId, server }: Props) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const fetchPage = useCallback(
    async (pageOffset: number) => {
      setLoading(true);
      setError(null);
      try {
        const api = createMemoryApi(server);
        const results = await api.getTimeline(serverId, {
          limit: PAGE_SIZE,
          offset: pageOffset,
        });
        if (pageOffset === 0) {
          setEvents(results);
        } else {
          setEvents((prev) => [...prev, ...results]);
        }
        setHasMore(results.length >= PAGE_SIZE);
        setOffset(pageOffset + results.length);
      } catch (e: unknown) {
        setError(friendlyError(e));
      } finally {
        setLoading(false);
      }
    },
    [serverId, server],
  );

  // Fetch first page on mount
  useEffect(() => {
    void fetchPage(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = useCallback(() => {
    void fetchPage(offset);
  }, [fetchPage, offset]);

  // ── Loading (initial) ──────────────────────────────────────────────────────
  if (loading && events.length === 0) {
    return (
      <div
        data-testid="timeline-loading"
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
        loading timeline…
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error && events.length === 0) {
    return (
      <div
        data-testid="timeline-error"
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
        <button
          data-testid="timeline-retry"
          onClick={() => void fetchPage(0)}
          style={{
            background: colors.surfaceAlt,
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            padding: "6px 14px",
            color: colors.text,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            cursor: "pointer",
          }}
        >
          retry
        </button>
      </div>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (events.length === 0) {
    return (
      <div
        data-testid="timeline-empty"
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
        no timeline events yet
      </div>
    );
  }

  // ── Feed ──────────────────────────────────────────────────────────────────
  return (
    <div
      data-testid="timeline-feed"
      style={{
        flex: 1,
        overflowY: "auto",
        minHeight: 0,
      }}
    >
      {events.map((event) => {
        const style = eventStyle(event.eventType);
        return (
          <div
            key={event.id}
            data-testid={`timeline-event-${event.id}`}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 16px",
              borderBottom: `1px solid ${colors.borderSubtle}`,
            }}
          >
            {/* Colored dot / icon */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: style.color,
                flexShrink: 0,
                marginTop: 5,
                fontSize: fontSizes.xs,
                lineHeight: 1,
              }}
              title={style.label}
            />

            {/* Content column */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    color: colors.mutedAlt,
                    flexShrink: 0,
                  }}
                >
                  {relativeTime(event.createdAt)}
                </span>
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    color: style.color,
                    fontWeight: 600,
                  }}
                >
                  {style.label}
                </span>
              </div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                  color: colors.muted,
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                }}
              >
                {summarizePayload(event.payload)}
              </div>
            </div>
          </div>
        );
      })}

      {/* Load more */}
      {hasMore && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 12,
          }}
        >
          <button
            data-testid="timeline-load-more"
            onClick={handleLoadMore}
            disabled={loading}
            style={{
              background: "none",
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              padding: "6px 16px",
              color: loading ? colors.mutedAlt : colors.accent,
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "loading…" : "load more"}
          </button>
        </div>
      )}
    </div>
  );
}
