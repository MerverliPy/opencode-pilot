/**
 * SimpleChat — streaming chat UI using direct n9router completions.
 *
 * Features: model selector, conversation management, debug panel, responsive layout.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerStore } from "../store/server";
import { useN9RouterStore } from "../store/n9router";
import {
  N9RouterChatClient,
  N9RouterChatError,
  availableModels,
  type ChatMessage,
} from "../services/n9routerChat";
import { useChatStream } from "../services/useChatStream";
import { ChatMessage as ChatMessageBubble } from "../components/ChatMessage";
import { DebugPanel } from "../components/DebugPanel";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { classifyError } from "../lib/errorClassifier";
import { colors, fonts, fontSizes } from "../theme";

const MSGS_KEY = "pilot.simplechat.messages";
const CONVS_KEY = "pilot.simplechat.conversations";
const MODEL_KEY = "pilot.simplechat.model";
const DEFAULT_MODEL = "ds/deepseek-v4-flash";

// --- Conversation types ---

type Conversation = {
  id: string;
  title: string;
  timestamp: number;
};

// --- Helpers ---

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function convId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MSGS_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {
    // ignore corrupt storage
  }
  return [];
}

function saveMessages(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(MSGS_KEY, JSON.stringify(messages));
  } catch {
    // storage full or unavailable
  }
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVS_KEY);
    if (raw) return JSON.parse(raw) as Conversation[];
  } catch {
    // ignore corrupt storage
  }
  return [];
}

function saveConversations(convs: Conversation[]): void {
  try {
    localStorage.setItem(CONVS_KEY, JSON.stringify(convs));
  } catch {
    // storage full or unavailable
  }
}

function loadModel(): string {
  try {
    return localStorage.getItem(MODEL_KEY) ?? DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

function saveModel(m: string): void {
  try {
    localStorage.setItem(MODEL_KEY, m);
  } catch {
    // ignore
  }
}

function convTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  const t = first.content.trim();
  return t.length > 50 ? t.slice(0, 50) + "\u2026" : t;
}

// --- Component ---

export function SimpleChat() {
  const servers = useServerStore((s) => s.servers);
  const activeId = useServerStore((s) => s.activeId);
  const server = useMemo(
    () => servers.find((s) => s.id === activeId) ?? null,
    [servers, activeId]
  );
  const n9routerUrl = useN9RouterStore((s) => s.url);
  const n9routerKey = useN9RouterStore((s) => s.key);

  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(loadModel);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([DEFAULT_MODEL]);
  const [showDebug, setShowDebug] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const { streaming, streamError, startStream, cancelStream, clearError } =
    useChatStream();

  const messagesRef = useRef(messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync ref after render so callbacks see latest messages
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fetch available models on mount
  useEffect(() => {
    if (!n9routerUrl) return;
    availableModels(n9routerUrl, n9routerKey).then((list) => {
      if (list.length > 0) setModels(list);
    });
  }, [n9routerUrl, n9routerKey]);

  // Persist messages (throttled to every 500ms during streaming)
  const lastSaveRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (!streaming || now - lastSaveRef.current > 500) {
      saveMessages(messages);
      lastSaveRef.current = now;
    }
  }, [messages, streaming]);

  // Persist model
  useEffect(() => {
    saveModel(model);
  }, [model]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show stream errors
  useEffect(() => {
    if (streamError) {
      setError(streamError);
    }
  }, [streamError]);

  // Responsive sidebar
  useEffect(() => {
    const handler = () => {
      setSidebarOpen(window.innerWidth > 768);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const client = useMemo(() => {
    if (!server) return null;
    return new N9RouterChatClient(server);
  }, [server]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || !client || streaming) return;

    clearError();
    setError(null);
    setInput("");

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = generateId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      model,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const chatMessages = [...messagesRef.current, userMsg].map((m) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    }));

    let accumulated = "";

    try {
      const abortController = new AbortController();
      const reader = await client.chatCompletion(chatMessages, model, abortController.signal);

      await startStream(reader, {
        onChunk: (chunk) => {
          accumulated += chunk.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated }
                : m,
            ),
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, finishReason: "stop" }
                : m,
            ),
          );
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, error: err instanceof Error ? err.message : String(err) }
                : m,
            ),
          );
        },
      }, abortController);
    } catch (err) {
      if (err instanceof N9RouterChatError) {
        const msg = classifyError(err.status, err.message);
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, error: msg, content: accumulated || m.content } : m,
          ),
        );
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, error: msg } : m,
          ),
        );
      }
    }
  }, [input, client, streaming, model, startStream, clearError]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleRetry = useCallback(() => {
    setError(null);
    clearError();

    const msgs = messagesRef.current;
    // Find last assistant message with error
    let lastFailedIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant" && msgs[i].error) {
        lastFailedIdx = i;
        break;
      }
    }
    if (lastFailedIdx === -1) return;

    // Find preceding user message
    let lastUserIdx = -1;
    for (let i = lastFailedIdx - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx >= 0) {
      const userContent = msgs[lastUserIdx].content;
      setMessages((prev) =>
        prev.filter((_, i) => i !== lastUserIdx && i !== lastFailedIdx),
      );
      setInput(userContent);
    }
  }, [clearError]);

  const handleClear = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(MSGS_KEY);
    setError(null);
    clearError();
  }, [clearError]);

  // --- Conversation management ---

  const handleNewConversation = useCallback(() => {
    // Save current conversation
    if (messages.length > 0) {
      const c: Conversation = {
        id: activeConvId ?? convId(),
        title: convTitle(messages),
        timestamp: Date.now(),
      };
      setConversations((prev) => {
        const existing = prev.findIndex((x) => x.id === c.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = c;
          return next;
        }
        return [...prev, c];
      });
    }
    // Start fresh
    setMessages([]);
    setActiveConvId(null);
    setError(null);
    clearError();
  }, [messages, activeConvId, clearError]);

  const handleSwitchConversation = useCallback(
    (conv: Conversation) => {
      // Save current messages to previous conversation
      if (messages.length > 0 && activeConvId) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConvId ? { ...c, title: convTitle(messages), timestamp: Date.now() } : c,
          ),
        );
      }
      // Switch to new conversation
      setActiveConvId(conv.id);
      setError(null);
      clearError();
    },
    [messages, activeConvId, clearError],
  );

  const handleDeleteConversation = useCallback(
    (convId: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
    },
    [activeConvId],
  );

  // Persist conversations
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  const toggleDebug = useCallback(() => {
    setShowDebug((prev) => !prev);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // --- Render ---

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
      }}
    >
      {/* Sidebar */}
      {sidebarOpen && (
        <div
          style={{
            width: 260,
            minWidth: 260,
            borderRight: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.surface,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Sidebar header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px",
              borderBottom: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <span
              style={{
                fontFamily: fonts.sans,
                fontSize: fontSizes.sm,
                fontWeight: 600,
                color: colors.text,
              }}
            >
              Conversations
            </span>
            <Button variant="secondary" size="sm" onClick={handleNewConversation}>
              + New
            </Button>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {conversations.length === 0 && (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: colors.muted,
                  fontFamily: fonts.sans,
                  fontSize: fontSizes.sm,
                }}
              >
                No saved conversations
              </div>
            )}
            {conversations.map((conv) => (
              <div
                key={conv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  cursor: "pointer",
                  backgroundColor:
                    activeConvId === conv.id ? colors.surfaceAlt : "transparent",
                  borderLeft:
                    activeConvId === conv.id
                      ? `3px solid ${colors.accent}`
                      : "3px solid transparent",
                }}
                onClick={() => handleSwitchConversation(conv)}
              >
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: fontSizes.sm,
                      color: colors.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {conv.title}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: fontSizes.xs,
                      color: colors.muted,
                      marginTop: 2,
                    }}
                  >
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  aria-label={`Delete conversation ${conv.title}`}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          maxWidth: sidebarOpen ? undefined : 800,
          width: "100%",
          margin: "0 auto",
          padding: "0 16px",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 0",
            paddingTop: "env(safe-area-inset-top, 12px)",
            borderBottom: `1px solid ${colors.borderSubtle}`,
            marginBottom: 12,
            gap: 8,
            position: "sticky",
            top: 0,
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          {/* Sidebar toggle (mobile) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleSidebar}
            style={{ display: window.innerWidth <= 768 ? "block" : "none" }}
          >
            ☰
          </Button>

          <span
            style={{
              fontFamily: fonts.sans,
              fontSize: fontSizes.lg,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            💬 Chat
          </span>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Model selector */}
            <select
              aria-label="Model selector"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.xs,
                color: colors.text,
                padding: "2px 8px",
                backgroundColor: colors.surfaceAlt,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                cursor: "pointer",
                maxWidth: 200,
              }}
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Debug toggle */}
            <button
              onClick={toggleDebug}
              style={{
                background: "none",
                border: `1px solid ${showDebug ? colors.accent : colors.border}`,
                color: showDebug ? colors.accent : colors.muted,
                cursor: "pointer",
                padding: "4px 10px",
                borderRadius: 6,
                fontFamily: fonts.sans,
                fontSize: fontSizes.sm,
              }}
            >
              Debug
            </button>

            <Button variant="secondary" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </header>

        {/* Messages area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: colors.muted,
                fontFamily: fonts.sans,
                fontSize: fontSizes.md,
                marginTop: 80,
                opacity: 0.6,
              }}
            >
              Send a message to start chatting
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              onRetry={msg.error ? handleRetry : undefined}
            />
          ))}
          {streaming && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 4px",
                color: colors.muted,
                fontFamily: fonts.sans,
                fontSize: fontSizes.sm,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: colors.accent,
                  animation: "pulse 1s infinite",
                }}
              />
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {error && !streaming && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 12px",
              marginBottom: 8,
              borderRadius: 8,
              backgroundColor: colors.errorTint,
              color: colors.error,
              fontFamily: fonts.sans,
              fontSize: fontSizes.sm,
            }}
          >
            <span style={{ flex: 1 }}>⚠ {error}</span>
            <Button variant="danger" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          </div>
        )}

        {/* Input area */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 0",
            paddingBottom: "env(safe-area-inset-bottom, 12px)",
            borderTop: `1px solid ${colors.borderSubtle}`,
          }}
        >
          <Input
            data-testid="prompt-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !server
                ? "No server configured..."
                : streaming
                  ? "Waiting for response..."
                  : "ask opencode\u2026"
            }
            disabled={!server || streaming}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              backgroundColor: colors.surface,
              color: colors.text,
              fontSize: fontSizes.md,
            }}
          />
          {streaming ? (
            <Button
              variant="secondary"
              size="md"
              onClick={cancelStream}
              style={{ backgroundColor: colors.error, color: colors.accentText, border: "none" }}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!input.trim() || !server}
            >
              Send
            </Button>
          )}
        </div>

        {/* Debug panel */}
        <DebugPanel visible={showDebug} onToggle={toggleDebug} />

        {/* Pulse animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
