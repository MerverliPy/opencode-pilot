/**
 * Sessions page: list, create, and manage chat sessions.
 */
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useServerStore } from "../store/server";
import { OpencodeClient } from "../services/api";
import type { Session } from "@pilot-shared/types";
import { colors, fonts, fontSizes } from "../theme";
import { log } from "../services/logger";
import { friendlyError } from "../lib/errors";

export function Sessions() {
  const server = useServerStore((s) => s.active());
  const client = server ? new OpencodeClient(server) : null;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
          setError(friendlyError(err));
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
      setError(friendlyError(err));
      log.error("sessions", "create failed", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!client) return;
    try {
      await client.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(friendlyError(err));
      log.error("sessions", "delete failed", err);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  const handleRenameStart = (sess: Session) => {
    setEditingId(sess.id);
    setEditValue(sess.title);
    // Auto-focus after render
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleRenameSave = async () => {
    if (!client || !editingId) return;
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === sessions.find(s => s.id === editingId)?.title) {
      setEditingId(null);
      return;
    }
    try {
      await client.updateSession(editingId, { title: trimmed });
      setSessions((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, title: trimmed } : s)),
      );
    } catch (err) {
      setError(friendlyError(err));
      log.error("sessions", "rename failed", err);
    }
    setEditingId(null);
  };

  const handleRenameCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleRenameSave();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  if (!server) {
    return (
      <div
        data-testid="sessions-no-server"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
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
    <div style={{ padding: "8px 12px", maxWidth: "100%", margin: "0 auto", flex: 1, minHeight: 0, overflow: "auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h1
          data-testid="sessions-heading"
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
          data-testid="new-session-button"
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
          data-testid="sessions-error"
          role="alert"
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
          data-testid="sessions-loading"
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
          data-testid="sessions-empty"
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
        <div data-testid="session-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sessions.map((sess) => (
            <div
              key={sess.id}
              data-testid={`session-row-${sess.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 10px",
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
              }}
            >
              {editingId === sess.id ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    ref={inputRef}
                    data-testid={`rename-input-${sess.id}`}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => void handleRenameSave()}
                    onKeyDown={handleRenameKeyDown}
                    style={{
                      width: "100%",
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                      color: colors.text,
                      backgroundColor: colors.surfaceAlt,
                      border: `1px solid ${colors.accent}`,
                      borderRadius: 4,
                      padding: "2px 4px",
                      outline: "none",
                    }}
                  />
                </div>
              ) : (
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
                      fontSize: fontSizes.xs,
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
                      marginTop: 1,
                    }}
                  >
                    {new Date(sess.time.created).toLocaleString()}
                  </div>
                </Link>
              )}
              <button
                data-testid={`rename-session-${sess.id}`}
                onClick={() => handleRenameStart(sess)}
                disabled={editingId !== null && editingId !== sess.id}
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.muted}`,
                  color: colors.muted,
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                  cursor: editingId !== null && editingId !== sess.id ? "not-allowed" : "pointer",
                  marginLeft: 8,
                  opacity: editingId !== null && editingId !== sess.id ? 0.4 : 1,
                }}
              >
                rename
              </button>
              <button
                data-testid={`delete-session-${sess.id}`}
                onClick={() => void handleDelete(sess.id)}
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.error}`,
                  color: colors.error,
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.xs,
                  cursor: "pointer",
                  marginLeft: 8,
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
