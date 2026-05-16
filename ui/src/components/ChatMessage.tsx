/**
 * ChatMessage — single message bubble in the SimpleChat UI.
 *
 * User messages right-aligned, assistant messages left-aligned with model name header.
 */

import { colors, fonts, fontSizes } from "../theme";
import type { ChatMessage as ChatMessageType } from "../services/n9routerChat";

type Props = {
  message: ChatMessageType;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  const sender = isUser ? "You" : message.model ?? "Assistant";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: 16,
        maxWidth: "100%",
      }}
    >
      {/* Sender + timestamp */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
          padding: "0 4px",
        }}
      >
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.sm,
            fontWeight: 600,
            color: isUser ? colors.accent : colors.success,
          }}
        >
          {sender}
        </span>
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.xs,
            color: colors.muted,
          }}
        >
          {formatTime(message.timestamp)}
        </span>
      </div>

      {/* Bubble */}
      <div
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          borderRadius: 12,
          backgroundColor: isUser ? colors.accent : colors.surfaceAlt,
          color: isUser ? colors.accentText : colors.text,
          fontFamily: fonts.sans,
          fontSize: fontSizes.md,
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          borderBottomRightRadius: isUser ? 4 : 12,
          borderBottomLeftRadius: isUser ? 12 : 4,
        }}
      >
        {message.content}
      </div>

      {/* Error banner */}
      {message.error && (
        <div
          style={{
            marginTop: 4,
            padding: "6px 10px",
            borderRadius: 6,
            backgroundColor: colors.errorTint,
            color: colors.error,
            fontFamily: fonts.sans,
            fontSize: fontSizes.sm,
          }}
        >
          ⚠ {message.error}
        </div>
      )}
    </div>
  );
}
