/**
 * Sessions page: list, create, and manage chat sessions.
 */
import { useEffect, useState, useRef, useCallback, useMemo, Fragment } from "react";
import { Link } from "react-router-dom";
import { useServerStore } from "../store/server";
import { OpencodeClient } from "../services/api";
import type { Session } from "@pilot-shared/types";
import { colors, fonts, fontSizes } from "../theme";
import { log } from "../services/logger";
import { friendlyError } from "../lib/errors";

export function Sessions() {
  const server = useServerStore((s) => s.active());
  const client = useMemo(
    () => (server ? new OpencodeClient(server) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [server?.id, server?.url, server?.username, server?.password],
  );
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [tagsMap, setTagsMap] = useState<Record<string, { tags: string[]; folder: string }>>({});
  const [folderFilter, setFolderFilter] = useState<string>("");
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [folderInput, setFolderInput] = useState("");

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
        // Fetch session tags
        if (client) {
          try {
            const tags = await client.getSessionTags();
            const map: Record<string, { tags: string[]; folder: string }> = {};
            for (const t of tags) {
              map[t.sessionId] = { tags: t.tags, folder: t.folder };
            }
            if (!cancelled) setTagsMap(map);
          } catch {
            // tags not available — ignore
          }
        }
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

  const filteredSessions = folderFilter
    ? sessions.filter(s => tagsMap[s.id]?.folder === folderFilter)
    : sessions;

  const saveTags = useCallback(async (sessionId: string) => {
    if (!client) return;
    const tagList = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    const folder = folderInput.trim();
    try {
      await client.setSessionTags(sessionId, { tags: tagList, folder });
      setTagsMap(prev => ({
        ...prev,
        [sessionId]: { tags: tagList, folder },
      }));
    } catch (err) {
      log.error("sessions", "save tags failed", err);
    }
    setEditingTagsId(null);
  }, [client, tagInput, folderInput]);

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

      {Object.keys(tagsMap).length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted }}>Folder:</span>
          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            style={{
              fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.text,
              padding: "2px 8px", backgroundColor: colors.surfaceAlt,
              border: `1px solid ${colors.border}`, borderRadius: 4, cursor: "pointer",
            }}
          >
            <option value="">All</option>
            {[...new Set(Object.values(tagsMap).map(t => t.folder).filter(Boolean))].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      )}

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
      ) : filteredSessions.length === 0 ? (
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
          {filteredSessions.map((sess) => (
            <Fragment key={sess.id}>
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
                  {tagsMap[sess.id]?.folder && (
                    <div style={{ fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.tool, marginTop: 1 }}>
                      {'📁'} {tagsMap[sess.id].folder}
                    </div>
                  )}
                  {tagsMap[sess.id]?.tags && tagsMap[sess.id].tags.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                      {tagsMap[sess.id].tags.map(tag => (
                        <span key={tag} style={{
                          fontFamily: fonts.mono, fontSize: "10px", color: colors.accent,
                          backgroundColor: colors.surfaceAlt, padding: "1px 6px",
                          borderRadius: 10, border: `1px solid ${colors.border}`,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
              <button
                data-testid={`edit-tags-${sess.id}`}
                onClick={() => {
                  const existing = tagsMap[sess.id];
                  setEditingTagsId(sess.id);
                  setTagInput(existing?.tags?.join(", ") ?? "");
                  setFolderInput(existing?.folder ?? "");
                }}
                disabled={editingId !== null || editingTagsId !== null}
                style={{
                  backgroundColor: "transparent", border: `1px solid ${colors.accent}`,
                  color: colors.accent, borderRadius: 4, padding: "2px 6px",
                  fontFamily: fonts.mono, fontSize: fontSizes.xs, cursor: "pointer",
                  marginLeft: 8,
                }}
              >
                tags
              </button>
            </div>
            {editingTagsId === sess.id && (
              <div style={{
                padding: "8px 12px", backgroundColor: colors.surfaceAlt,
                border: `1px solid ${colors.accent}`, borderRadius: 6,
                marginTop: 4, marginBottom: 4,
              }}>
                <div style={{ marginBottom: 6 }}>
                  <label style={{ fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, display: "block", marginBottom: 2 }}>Tags (comma-separated)</label>
                  <input
                    data-testid={`tag-input-${sess.id}`}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveTags(sess.id);
                      } else if (e.key === "Escape") {
                        setEditingTagsId(null);
                      }
                    }}
                    placeholder="important, bug, feature"
                    style={{
                      width: "100%", padding: "4px 8px", borderRadius: 4,
                      border: `1px solid ${colors.border}`, backgroundColor: colors.surface,
                      color: colors.text, fontFamily: fonts.mono, fontSize: fontSizes.xs,
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontFamily: fonts.mono, fontSize: fontSizes.xs, color: colors.muted, display: "block", marginBottom: 2 }}>Folder</label>
                  <input
                    data-testid={`folder-input-${sess.id}`}
                    value={folderInput}
                    onChange={(e) => setFolderInput(e.target.value)}
                    placeholder="Project A"
                    style={{
                      width: "100%", padding: "4px 8px", borderRadius: 4,
                      border: `1px solid ${colors.border}`, backgroundColor: colors.surface,
                      color: colors.text, fontFamily: fonts.mono, fontSize: fontSizes.xs,
                      outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    data-testid={`save-tags-${sess.id}`}
                    onClick={() => saveTags(sess.id)}
                    style={{
                      backgroundColor: colors.accent, color: "#000", border: "none",
                      borderRadius: 4, padding: "4px 12px", fontFamily: fonts.mono,
                      fontSize: fontSizes.xs, cursor: "pointer",
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingTagsId(null)}
                    style={{
                      backgroundColor: "transparent", border: `1px solid ${colors.muted}`,
                      color: colors.muted, borderRadius: 4, padding: "4px 12px",
                      fontFamily: fonts.mono, fontSize: fontSizes.xs, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
