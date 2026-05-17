/**
 * ChatMessage — single message bubble in the SimpleChat UI.
 *
 * User messages right-aligned, assistant messages left-aligned with model name header.
 * Assistant content rendered as markdown with code block copy buttons.
 */

import { useCallback, useState } from "react";
import { colors, fonts, fontSizes } from "../theme";
import type { ChatMessage as ChatMessageType } from "../services/n9routerChat";

type Props = {
  message: ChatMessageType;
  onRetry?: () => void;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Simple markdown renderer — handles code blocks, bold, lists.
 */
function renderMarkdown(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const code = codeLines.join("\n");
      nodes.push(
        <CodeBlock key={key++} code={code} lang={lang} />,
      );
      continue;
    }

    // Bold (**text**)
    const rendered = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, "<code>$1</code>");

    if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(
        <li key={key++} style={{ marginLeft: 16, color: colors.text, fontFamily: fonts.sans, fontSize: fontSizes.md, lineHeight: 1.6 }}>
          <span dangerouslySetInnerHTML={{ __html: rendered.slice(2) }} />
        </li>,
      );
    } else if (line.trim() === "") {
      nodes.push(<div key={key++} style={{ height: 8 }} />);
    } else {
      nodes.push(
        <p
          key={key++}
          style={{
            margin: 0,
            color: colors.text,
            fontFamily: fonts.sans,
            fontSize: fontSizes.md,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
          dangerouslySetInnerHTML={{ __html: rendered }}
        />,
      );
    }
    i++;
  }

  return nodes;
}

/**
 * Code block with copy button.
 */
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // clipboard unavailable
    });
  }, [code]);

  return (
    <div
      style={{
        position: "relative",
        margin: "8px 0",
        borderRadius: 8,
        backgroundColor: "#1e1e2e",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 12px",
          backgroundColor: "#2d2d3d",
          fontFamily: fonts.sans,
          fontSize: fontSizes.xs,
          color: "#a0a0b0",
        }}
      >
        <span>{lang || "code"}</span>
        <button
          onClick={handleCopy}
          style={{
            background: "none",
            border: "none",
            color: copied ? "#4ade80" : "#a0a0b0",
            cursor: "pointer",
            fontSize: fontSizes.xs,
            padding: "2px 8px",
            borderRadius: 4,
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {/* Code */}
      <pre
        style={{
          margin: 0,
          padding: "12px 16px",
          overflowX: "auto",
          fontFamily: fonts.mono,
          fontSize: fontSizes.sm,
          color: "#cdd6f4",
          lineHeight: 1.5,
        }}
      >
        {code}
      </pre>
    </div>
  );
}

export function ChatMessage({ message, onRetry }: Props) {
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
          wordBreak: "break-word",
          borderBottomRightRadius: isUser ? 4 : 12,
          borderBottomLeftRadius: isUser ? 12 : 4,
        }}
      >
        {isUser ? (
          <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
        ) : (
          renderMarkdown(message.content)
        )}
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
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>⚠ {message.error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                background: "none",
                border: `1px solid ${colors.error}`,
                color: colors.error,
                cursor: "pointer",
                padding: "2px 8px",
                borderRadius: 4,
                fontFamily: fonts.sans,
                fontSize: fontSizes.xs,
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
