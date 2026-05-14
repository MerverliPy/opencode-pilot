/**
 * MarkdownContent: renders text with full Markdown + GFM + syntax highlighting.
 *
 * Wraps react-markdown with the project's dark theme styling.
 */
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { colors, fonts, fontSizes } from "../theme";

// highlight.js dark theme for code blocks
import "highlight.js/styles/atom-one-dark.css";

const components: Components = {
  h1: ({ children, ...props }) => (
    <h1 style={{ fontSize: fontSizes.lg, fontWeight: 700, margin: "12px 0 6px", color: colors.text, fontFamily: fonts.sans }} {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 style={{ fontSize: fontSizes.md, fontWeight: 700, margin: "10px 0 5px", color: colors.text, fontFamily: fonts.sans }} {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 style={{ fontSize: fontSizes.sm, fontWeight: 700, margin: "8px 0 4px", color: colors.text, fontFamily: fonts.sans }} {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 style={{ fontSize: fontSizes.sm, fontWeight: 600, margin: "6px 0 4px", color: colors.text, fontFamily: fonts.sans }} {...props}>{children}</h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 style={{ fontSize: fontSizes.xs, fontWeight: 600, margin: "4px 0 2px", color: colors.muted, fontFamily: fonts.sans }} {...props}>{children}</h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 style={{ fontSize: fontSizes.xs, fontWeight: 600, margin: "4px 0 2px", color: colors.mutedAlt, fontFamily: fonts.sans }} {...props}>{children}</h6>
  ),
  p: ({ children, ...props }) => (
    <p style={{ margin: "4px 0", lineHeight: 1.6, fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.text }} {...props}>
      {children}
    </p>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          style={{
            backgroundColor: colors.surfaceAlt,
            padding: "2px 6px",
            borderRadius: 4,
            fontFamily: fonts.mono,
            fontSize: "0.9em",
            color: colors.accent,
          }}
          {...props}
        >
          {children}
        </code>
      );
    }
    // Code blocks are rendered as <pre> by react-markdown default
    // We style the <pre> and pass through the highlight.js classes
    return (
      <code className={className} style={{ fontFamily: fonts.mono, fontSize: fontSizes.xs, lineHeight: 1.5 }} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      style={{
        backgroundColor: colors.surfaceAlt,
        padding: 12,
        borderRadius: 8,
        overflow: "auto",
        margin: "8px 0",
        border: `1px solid ${colors.border}`,
      }}
    >
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: colors.accent, textDecoration: "underline" }}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: "4px 0", paddingLeft: 20, lineHeight: 1.7, fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.text }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: "4px 0", paddingLeft: 20, lineHeight: 1.7, fontFamily: fonts.sans, fontSize: fontSizes.sm, color: colors.text }}>{children}</ol>
  ),
  li: ({ children }) => <li style={{ margin: "2px 0" }}>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      style={{
        margin: "8px 0",
        padding: "4px 12px",
        borderLeft: `3px solid ${colors.accent}`,
        color: colors.muted,
        fontStyle: "italic",
        fontFamily: fonts.sans,
        fontSize: fontSizes.sm,
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr
      style={{
        margin: "12px 0",
        border: "none",
        borderTop: `1px solid ${colors.border}`,
      }}
    />
  ),
  table: ({ children }) => (
    <div style={{ overflow: "auto", margin: "8px 0" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: fontSizes.xs,
          fontFamily: fonts.sans,
        }}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th
      style={{
        border: `1px solid ${colors.border}`,
        padding: "6px 10px",
        backgroundColor: colors.surfaceAlt,
        textAlign: "left",
        fontWeight: 600,
        color: colors.text,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        border: `1px solid ${colors.border}`,
        padding: "6px 10px",
        color: colors.text,
      }}
    >
      {children}
    </td>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt ?? ""}
      style={{ maxWidth: "100%", borderRadius: 6, margin: "8px 0" }}
    />
  ),
};

export function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {text}
    </ReactMarkdown>
  );
}
