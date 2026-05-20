/**
 * MarkdownContent: renders text with full Markdown + GFM + syntax highlighting.
 *
 * Wraps react-markdown with system-aware theme styling.
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { markdownComponents } from "./markdownComponents";

export function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypePrettyCode]}
      components={markdownComponents}
    >
      {text}
    </ReactMarkdown>
  );
}
