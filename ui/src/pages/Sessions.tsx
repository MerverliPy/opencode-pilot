/**
 * Sessions page: list, create, and manage chat sessions.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useServerStore } from "../store/server";
import { OpencodeClient } from "../services/api";
import type { Session } from "@pilot-shared/types";
import { colors, fonts, fontSizes } from "../theme";
import { log } from "../services/logger";

export function Sessions() {
  const server = useServerStore((s) => s.active());
  const client = server ? new OpencodeClient(server) : null;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }
    let cancelled = false;
    (async () => {
      if (!cancelled) setLoading(true);
      try {
        const list = await client.listSessions();
        if (!cancelled) setSessions(list);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          log.error("sessions", "list failed", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.id, server?.url]);

  const handleCreate = async () => {
    if (!client) return;
    try {
      const sess = await client.createSession({ title: "new session" });
      setSessions((prev) => [sess, ...prev]);
    } catch (err) {
      log.error("sessions", "create failed", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!client) return;
    try {
      await client.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      log.error("sessions", "delete failed", err);
    }
  };

  if (!server) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
        }}
      >
        no server configured — go to settings
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.lg,
            color: colors.text,
            margin: 0,
          }}
        >
          Sessions
        </h1>
        <button
          onClick={handleCreate}
          style={{
            backgroundColor: colors.accent,
            color: "#000",
            border: "none",
            borderRadius: 6,
            padding: "8px 16px",
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            cursor: "pointer",
          }}
        >
          + New Session
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(229,115,115,0.1)",
            border: `1px solid ${colors.error}`,
            borderRadius: 6,
            color: colors.error,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            textAlign: "center",
            padding: 40,
          }}
        >
          loading…
        </div>
      ) : sessions.length === 0 ? (
        <div
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
            textAlign: "center",
            padding: 40,
          }}
        >
          no sessions yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sessions.map((sess) => (
            <div
              key={sess.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
              }}
            >
              <Link
                to={`/chat/${sess.id}`}
                style={{
                  textDecoration: "none",
                  color: colors.text,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.sm,
                    color: colors.text,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {sess.title}
                </div>
                <div
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: fontSizes.xs,
                    color: colors.muted,
                    marginTop: 2,
                  }}
                >
                  {new Date(sess.time.created).toLocaleString()}
                </div>
              </Link>
              <button
                onClick={() => void handleDelete(sess.id)}
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.error}`,
                  color: colors.error,
                  borderRadius: 4,
                  padding: "4px 10px",
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                  cursor: "pointer",
                  marginLeft: 12,
                }}
              >
                delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
