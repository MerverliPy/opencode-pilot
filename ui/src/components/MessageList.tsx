/**
 * MessageList: renders the conversation turn stream.
 *
 * Auto-scrolls to the bottom when new content arrives.
 */
import { useEffect, useRef } from "react";
import type { Turn } from "../store/session";
import { colors, fonts, fontSizes } from "../theme";
import { MarkdownContent } from "./MarkdownContent";

function TurnView({ turn }: { turn: Turn }) {
  const isUser = turn.message.role === "user";
  return (
    <div
      style={{
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
      }}
    >
      {/* Role label */}
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          color: colors.muted,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {isUser ? "user" : "assistant"}
      </div>

      {/* Message bubble */}
      <div
        style={{
          maxWidth: "85%",
          padding: "10px 14px",
          borderRadius: 10,
          backgroundColor: isUser ? colors.accent : colors.surface,
          color: isUser ? "#000" : colors.text,
          fontFamily: fonts.sans,
          fontSize: fontSizes.sm,
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {turn.parts.length === 0 ? (
          <span style={{ color: colors.muted }}>…</span>
        ) : (
          turn.parts.map((part) => {
            switch (part.type) {
              case "text":
                return (
                  <div key={part.id}>
                    <MarkdownContent text={part.text} />
                  </div>
                );
              case "reasoning":
                return (
                  <div
                    key={part.id}
                    style={{
                      color: colors.muted,
                      fontStyle: "italic",
                      borderLeft: `2px solid ${colors.mutedAlt}`,
                      paddingLeft: 8,
                      marginTop: 4,
                    }}
                  >
                    {part.text}
                  </div>
                );
              case "tool":
                return (
                  <div
                    key={part.id}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: 6,
                      padding: 8,
                      marginTop: 4,
                      backgroundColor: colors.bg,
                    }}
                  >
                    <div
                      style={{
                        fontSize: fontSizes.xs,
                        color: colors.tool,
                        marginBottom: 4,
                      }}
                    >
                      {part.state.title ?? part.tool}
                      <span
                        style={{
                          marginLeft: 8,
                          color:
                            part.state.status === "completed"
                              ? colors.success
                              : part.state.status === "error"
                                ? colors.error
                                : colors.accent,
                        }}
                      >
                        {part.state.status}
                      </span>
                    </div>
                    {part.state.output && (
                      <pre
                        style={{
                          margin: 0,
                          fontSize: fontSizes.xs,
                          color: colors.muted,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {part.state.output}
                      </pre>
                    )}
                  </div>
                );
              case "file":
                return (
                  <div
                    key={part.id}
                    style={{
                      color: colors.accent,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    {part.filename ?? "file"}
                  </div>
                );
              case "step-start":
              case "step-finish":
                return null;
              default:
                return null;
            }
          })
        )}
      </div>
    </div>
  );
}

export function MessageList({ turns }: { turns: Turn[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  if (turns.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: colors.accent,
            fontFamily: fonts.mono,
            fontSize: 28,
            marginBottom: 8,
          }}
        >
          ◆
        </div>
        <div
          style={{
            color: colors.text,
            fontFamily: fonts.mono,
            fontSize: fontSizes.md,
          }}
        >
          new session
        </div>
        <div
          style={{
            color: colors.muted,
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            marginTop: 8,
            lineHeight: 1.6,
          }}
        >
          ask anything · use <span style={{ color: colors.accent }}>/</span> for
          commands · <span style={{ color: colors.accent }}>@</span> to mention
          files
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 8px" }}>
      {turns.map((turn) => (
        <TurnView key={turn.message.id} turn={turn} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
