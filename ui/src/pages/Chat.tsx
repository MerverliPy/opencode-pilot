/**
 * Chat page — the main Pilot interface.
 *
 * Manages session lifecycle, SSE streaming, message rendering,
 * prompt input, and permission cards.
 */
import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { useServerStore } from "../store/server";
import { useSessionStore } from "../store/session";
import { useEventStream } from "../services/sse";
import { OpencodeClient } from "../services/api";
import type { ServerEvent, Session, SessionStatus } from "@pilot-shared/types";
import { log } from "../services/logger";
import { MessageList } from "../components/MessageList";
import { PromptInput } from "../components/PromptInput";
import { PermissionCard } from "../components/PermissionCard";
import { colors, fonts } from "../theme";
import { friendlyError } from "../lib/errors";
import { useMemoryExtraction } from "../plugin/memory/hooks/useMemoryExtraction";
import { useMemoryInjection } from "../plugin/memory/hooks/useMemoryInjection";

export function Chat() {
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();
  const server = useServerStore((s) => s.active());
  const client = useMemo(
    () => (server ? new OpencodeClient(server) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [server?.id, server?.url, server?.username, server?.password],
  );

  const session = useSessionStore((s) => s.session);
  const status = useSessionStore((s) => s.status);
  const turns = useSessionStore((s) => s.turns);
  const permissions = useSessionStore((s) => s.permissions);
  const setSession = useSessionStore((s) => s.setSession);
  const setStatus = useSessionStore((s) => s.setStatus);
  const hydrateTurns = useSessionStore((s) => s.hydrateTurns);
  const upsertMessage = useSessionStore((s) => s.upsertMessage);
  const upsertPart = useSessionStore((s) => s.upsertPart);
  const removeMessage = useSessionStore((s) => s.removeMessage);
  const removePart = useSessionStore((s) => s.removePart);
  const pushPermission = useSessionStore((s) => s.pushPermission);
  const resolvePermission = useSessionStore((s) => s.resolvePermission);
  const resetSession = useSessionStore((s) => s.reset);

  const newlyCreatedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  // ── Memory hooks ──────────────────────────────────────────────────────────────
  useMemoryExtraction({
    client,
    serverId: server?.id ?? null,
    server: server ?? null,
    serverUrl: server?.url,
    status,
    turns,
  });

  const { buildPrefix } = useMemoryInjection({
    serverId: server?.id ?? null,
    server: server ?? null,
    serverUrl: server?.url,
  });

  // ── SSE event handler ─────────────────────────────────────────────────────────
  const handleEvent = (event: ServerEvent) => {
    switch (event.type) {
      case "session.updated": {
        const props = event.properties as { info: Session };
        setSession(props.info);
        break;
      }
      case "session.idle":
        setStatus("idle");
        break;
      case "session.status": {
        const props = event.properties as {
          sessionID: string;
          status: { type: string };
        };
        setStatus(props.status.type as SessionStatus);
        break;
      }
      case "session.error": {
        const props = event.properties as {
          sessionID: string;
          error?: unknown;
        };
        setStatus("error");
        log.error("sse", "session error", props.error);
        break;
      }
      case "message.updated": {
        const props = event.properties as {
          info: Parameters<typeof upsertMessage>[0];
        };
        upsertMessage(props.info);
        break;
      }
      case "message.removed": {
        const props = event.properties as {
          sessionID: string;
          messageID: string;
        };
        removeMessage(props.sessionID, props.messageID);
        break;
      }
      case "message.part.updated": {
        const props = event.properties as {
          part: Parameters<typeof upsertPart>[0];
        };
        upsertPart(props.part);
        break;
      }
      case "message.part.removed": {
        const props = event.properties as {
          sessionID: string;
          messageID: string;
          partID: string;
        };
        removePart(props.sessionID, props.messageID, props.partID);
        break;
      }
      case "permission.requested": {
        const props = event.properties as Parameters<typeof pushPermission>[0];
        pushPermission(props);
        break;
      }
      case "permission.replied": {
        const props = event.properties as { id: string; sessionID: string };
        resolvePermission(props.id);
        break;
      }
      case "server.connected":
        log.info("sse", "server connected");
        break;
      default:
        break;
    }
  };

  useEventStream(server, handleEvent);

  // ── Session bootstrap ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!client || !server) return;
    let cancelled = false;

    (async () => {
      try {
      if (!cancelled) setError(null);
      let sess: import("@pilot-shared/types").Session | null = null;

        // Priority 1: session from URL param
        if (urlSessionId) {
          sess = await client.getSession(urlSessionId);
        }

        // Priority 2: create new session
        if (!sess) {
          sess = await client.createSession({ title: "new session" });
          newlyCreatedRef.current = true;
        }

        if (cancelled) return;
        setSession(sess);
        setStatus("idle");

        // Load messages
        const messages = await client.listMessages(sess.id);
        hydrateTurns(
          messages.map((m) => ({ message: m.info, parts: m.parts })),
        );
      } catch (err) {
        if (cancelled) return;
        setError(friendlyError(err));
        log.error("chat", "session bootstrap failed", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, server, urlSessionId, setSession, setStatus, hydrateTurns]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      resetSession();
    };
  }, [resetSession]);

  useEffect(() => {
    if (!isEditingTitle) {
      setTitleDraft(session?.title ?? "");
    }
  }, [isEditingTitle, session?.title]);

  const startTitleEdit = () => {
    if (!session) return;
    setTitleDraft(session.title);
    setTitleError(null);
    setIsEditingTitle(true);
  };

  const cancelTitleEdit = () => {
    setTitleDraft(session?.title ?? "");
    setTitleError(null);
    setIsEditingTitle(false);
    setIsSavingTitle(false);
  };

  const saveTitle = async () => {
    if (!client || !session || isSavingTitle) return;

    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      cancelTitleEdit();
      return;
    }

    if (nextTitle === session.title.trim()) {
      setTitleDraft(nextTitle);
      setTitleError(null);
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    setTitleError(null);
    try {
      const updatedSession = await client.updateSession(session.id, { title: nextTitle });
      setSession(updatedSession);
      setTitleDraft(updatedSession.title);
      setIsEditingTitle(false);
    } catch (err) {
      setTitleError(friendlyError(err));
      log.error("chat", "session title update failed", err);
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleTitleKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await saveTitle();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelTitleEdit();
    }
  };

  const handleTitleBlur = async (event: FocusEvent<HTMLInputElement>) => {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof HTMLElement && nextFocus.dataset.titleAction === "true") {
      return;
    }

    await saveTitle();
  };

  // ── Prompt submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (text: string) => {
    if (!client || !session) return;
    try {
      setStatus("busy");
      const prefix = await buildPrefix(text);
      const fullText = prefix ? `${prefix}\n\n${text}` : text;
      await client.promptAsync(session.id, {
        parts: [{ type: "text", text: fullText }],
      });
    } catch (err) {
      setError(friendlyError(err));
      setStatus("error");
      log.error("chat", "prompt failed", err);
    }
  };

  // ── Permission response ─────────────────────────────────────────────────────
  const handlePermission = async (
    id: string,
    sessionID: string,
    response: "always" | "once" | "reject",
  ) => {
    if (!client) return;
    try {
      await client.respondPermission(sessionID, id, { response });
      resolvePermission(id);
    } catch (err) {
      log.error("chat", "permission response failed", err);
    }
  };

  // ── Status display ────────────────────────────────────────────────────────────
  const statusText = (() => {
    switch (status) {
      case "idle":
        return "ready";
      case "busy":
        return "running…";
      case "question":
        return "question";
      case "error":
        return "error";
      case "aborted":
        return "aborted";
      default:
        return status;
    }
  })();

  const statusColor = (() => {
    switch (status) {
      case "idle":
        return colors.success;
      case "busy":
        return colors.accent;
      case "question":
        return colors.warning;
      case "error":
        return colors.error;
      case "aborted":
        return colors.warning;
      default:
        return colors.muted;
    }
  })();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        backgroundColor: colors.bg,
      }}
    >
      {/* Top bar */}
      <header
        data-testid="session-bar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          paddingTop: "env(safe-area-inset-top, 10px)",
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: 0,
            flex: 1,
          }}
        >
          {isEditingTitle ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <input
                aria-label="Session title"
                data-testid="session-title-input"
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  void handleTitleKeyDown(event);
                }}
                onBlur={(event) => {
                  void handleTitleBlur(event);
                }}
                disabled={isSavingTitle}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 14,
                  color: colors.text,
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  padding: "6px 8px",
                  minWidth: 0,
                  flex: 1,
                }}
              />
              <button
                type="button"
                data-title-action="true"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  void saveTitle();
                }}
                disabled={isSavingTitle}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: colors.text,
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  padding: "6px 8px",
                  cursor: isSavingTitle ? "default" : "pointer",
                }}
              >
                save
              </button>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={cancelTitleEdit}
                disabled={isSavingTitle}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: colors.muted,
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  padding: "6px 8px",
                  cursor: isSavingTitle ? "default" : "pointer",
                }}
              >
                cancel
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 14,
                  color: colors.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {session?.title ?? "new session"}
              </div>
              <button
                type="button"
                aria-label="Edit session title"
                data-testid="session-title-edit"
                onClick={startTitleEdit}
                disabled={!session}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  color: colors.muted,
                  backgroundColor: "transparent",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 6,
                  padding: "4px 8px",
                  cursor: session ? "pointer" : "default",
                  flexShrink: 0,
                }}
              >
                edit
              </button>
            </div>
          )}
          {titleError && (
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                color: colors.error,
              }}
            >
              {titleError}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: statusColor,
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              color: colors.muted,
              textTransform: "uppercase",
            }}
          >
            {statusText}
          </span>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div
          style={{
            padding: "8px 16px",
            backgroundColor: "rgba(229,115,115,0.1)",
            borderBottom: `1px solid ${colors.error}`,
            color: colors.error,
            fontFamily: fonts.mono,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* Message list */}
      <div data-testid="message-list" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <MessageList turns={turns} />
      </div>

      {/* Permission cards */}
      {permissions.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {permissions.map((p) => (
            <PermissionCard
              key={p.id}
              permission={p}
              onRespond={(resp) => handlePermission(p.id, p.sessionID, resp)}
            />
          ))}
        </div>
      )}

      {/* Prompt input */}
      <PromptInput
        onSubmit={handleSubmit}
        disabled={!client || !session || (status !== "idle" && status !== "question")}
      />
    </div>
  );
}
