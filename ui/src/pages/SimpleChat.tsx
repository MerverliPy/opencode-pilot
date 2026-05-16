/**
 * SimpleChat — streaming chat UI using direct n9router completions.
 *
 * No agent orchestration. Model name as sender. Input always available.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerStore } from "../store/server";
import { useN9RouterStore } from "../store/n9router";
import {
  N9RouterChatClient,
  N9RouterChatError,
  type ChatMessage,
} from "../services/n9routerChat";
import { useChatStream } from "../services/useChatStream";
import { ChatMessage as ChatMessageBubble } from "../components/ChatMessage";
import { colors, fonts, fontSizes } from "../theme";
import { friendlyError } from "../lib/errors";

const STORAGE_KEY = "pilot.simplechat.messages";
const DEFAULT_MODEL = "ds/deepseek-v4-flash";

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ChatMessage[];
  } catch {
    // ignore corrupt storage
  }
  return [];
}

function saveMessages(messages: ChatMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // storage full or unavailable
  }
}

export function SimpleChat() {
  const server = useServerStore((s) => s.active());
  const n9routerUrl = useN9RouterStore((s) => s.url);

  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [error, setError] = useState<string | null>(null);

  const { streaming, streamError, startStream, cancelStream, clearError } =
    useChatStream();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist messages on change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show stream errors
  useEffect(() => {
    if (streamError) {
      setError(streamError);
    }
  }, [streamError]);

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

    // Add user message
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add empty assistant message
    const assistantId = generateId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      model,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    // Get formatted messages
    const chatMessages = [...messages, userMsg].map((m) => ({
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
          // Update finish reason if available
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
                ? { ...m, error: friendlyError(err) }
                : m,
            ),
          );
        },
      });
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
        const msg = friendlyError(err);
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, error: msg } : m,
          ),
        );
      }
    }
  }, [input, client, streaming, messages, model, startStream, clearError]);

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
  }, [clearError]);

  const handleClear = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setError(null);
    clearError();
  }, [clearError]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxWidth: 800,
        width: "100%",
        margin: "0 auto",
        padding: "0 16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 0",
          borderBottom: `1px solid ${colors.borderSubtle}`,
          marginBottom: 12,
        }}
      >
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
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              color: colors.muted,
              padding: "2px 8px",
              backgroundColor: colors.surfaceAlt,
              borderRadius: 4,
            }}
          >
            {model}
          </span>
          <button
            onClick={handleClear}
            style={{
              background: "none",
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: 6,
              fontFamily: fonts.sans,
              fontSize: fontSizes.sm,
            }}
          >
            Clear
          </button>
        </div>
      </div>

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
          <ChatMessageBubble key={msg.id} message={msg} />
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
          <button
            onClick={handleRetry}
            style={{
              background: "none",
              border: `1px solid ${colors.error}`,
              color: colors.error,
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: 6,
              fontFamily: fonts.sans,
              fontSize: fontSizes.sm,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Input area */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 0",
          borderTop: `1px solid ${colors.borderSubtle}`,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !server
              ? "No server configured..."
              : streaming
                ? "Waiting for response..."
                : "Type a message... (Enter to send)"
          }
          disabled={!server || streaming}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.text,
            fontFamily: fonts.sans,
            fontSize: fontSizes.md,
            outline: "none",
          }}
        />
        {streaming ? (
          <button
            onClick={cancelStream}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              backgroundColor: colors.error,
              color: colors.accentText,
              cursor: "pointer",
              fontFamily: fonts.sans,
              fontSize: fontSizes.md,
              fontWeight: 600,
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || !server}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              backgroundColor:
                !input.trim() || !server ? colors.surfaceAlt : colors.accent,
              color:
                !input.trim() || !server ? colors.muted : colors.accentText,
              cursor:
                !input.trim() || !server ? "not-allowed" : "pointer",
              fontFamily: fonts.sans,
              fontSize: fontSizes.md,
              fontWeight: 600,
            }}
          >
            Send
          </button>
        )}
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function classifyError(status: number, message: string): string {
  switch (status) {
    case 401:
      return "Authentication failed — check your API key and n9router config";
    case 402:
      return "Payment required — your n9router account needs funds";
    case 429:
      return "Rate limited — too many requests, please wait";
    case 503:
      return "Provider unavailable — the model provider may be down";
    case 504:
      return "Request timed out — n9router took too long to respond";
    default:
      return message || `n9router error (${status})`;
  }
}
