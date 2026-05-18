/**
 * MessageList: renders the conversation turn stream.
 *
 * Auto-scrolls to the bottom when new content arrives.
 */
import { memo, useEffect, useRef } from "react";
import type { Message } from "@pilot-shared/types";
import type { Turn } from "../store/session";
import { colors, fonts, fontSizes } from "../theme";
import { MarkdownContent } from "./MarkdownContent";

function formatTokenCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

function MessageCostFooter({ message }: { message: Message }) {
  if (message.cost === undefined && message.tokens === undefined) {
    return null;
  }

  const parts: string[] = [];

  if (message.cost !== undefined) {
    parts.push(`$${message.cost}`);
  }

  if (message.tokens) {
    const tokenParts: string[] = [];
    tokenParts.push(`${formatTokenCount(message.tokens.input)} in`);
    tokenParts.push(`${formatTokenCount(message.tokens.output)} out`);
    if (message.tokens.reasoning && message.tokens.reasoning > 0) {
      tokenParts.push(`${formatTokenCount(message.tokens.reasoning)} reason`);
    }
    parts.push(tokenParts.join(" · "));
  }

  return (
    <div
      style={{
        fontFamily: fonts.mono,
        fontSize: fontSizes.xs,
        color: colors.muted,
        marginTop: 4,
        textAlign: "right",
      }}
    >
      {parts.join(" · ")}
    </div>
  );
}

const TurnView = memo(function TurnView({ turn }: { turn: Turn }) {
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
          color: isUser ? colors.accentText : colors.text,
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
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: fontSizes.xs,
                        color: colors.tool,
                        marginBottom: 4,
                      }}
                    >
                      <div>
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
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(part.state.output ?? "").catch(() => {});
                          }}
                          style={{
                            background: "none",
                            border: `1px solid ${colors.border}`,
                            borderRadius: 4,
                            color: colors.muted,
                            fontSize: fontSizes.xs,
                            cursor: "pointer",
                            padding: "2px 6px",
                            fontFamily: fonts.mono,
                          }}
                          title="Copy output to clipboard"
                        >
                          copy
                        </button>
                      )}
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
              case "file": {
                const isImage = part.mime?.startsWith("image/") && part.url;
                if (isImage) {
                  return (
                    <div key={part.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <img
                        src={part.url}
                        alt={part.filename ?? "image"}
                        style={{
                          maxWidth: "100%",
                          maxHeight: 400,
                          borderRadius: 6,
                          margin: "8px 0",
                          display: "block",
                          objectFit: "contain",
                        }}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          navigator.clipboard.writeText(part.filename ?? "file").catch(() => {});
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            navigator.clipboard.writeText(part.filename ?? "file").catch(() => {});
                          }
                        }}
                        style={{
                          color: colors.accent,
                          textDecoration: "underline",
                          cursor: "pointer",
                          fontSize: fontSizes.xs,
                        }}
                        title="Copy filename to clipboard"
                      >
                        {part.filename ?? "file"}
                      </div>
                    </div>
                  );
                }
                return (
                  <div
                    key={part.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      navigator.clipboard.writeText(part.filename ?? "file").catch(() => {});
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigator.clipboard.writeText(part.filename ?? "file").catch(() => {});
                      }
                    }}
                    style={{
                      color: colors.accent,
                      textDecoration: "underline",
                      cursor: "pointer",
                      display: "inline-block",
                    }}
                    title="Copy filename to clipboard"
                  >
                    {part.filename ?? "file"}
                  </div>
                );
              }
              case "step-start":
              case "step-finish":
                return null;
              default:
                return null;
            }
          })
        )}
      </div>
      {!isUser && <MessageCostFooter message={turn.message} />}
    </div>
  );
});

export function MessageList({ turns }: { turns: Turn[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      isNearBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
    <div ref={scrollRef} style={{ padding: "16px 16px 8px" }}>
      {turns.map((turn) => (
        <TurnView key={turn.message.id} turn={turn} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
