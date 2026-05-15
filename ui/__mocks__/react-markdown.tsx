/**
 * Mock for react-markdown — renders children as a plain div.
 * Tests don't need actual markdown rendering.
 */
import React from "react";
import type { ReactNode } from "react";

type Props = {
  children?: string;
  remarkPlugins?: unknown[];
  rehypePlugins?: unknown[];
  components?: Record<string, (props: Record<string, unknown>) => React.JSX.Element>;
};

function renderParagraph(
  components: Props["components"],
  children: ReactNode,
) {
  const Paragraph = components?.p;
  if (!Paragraph) {
    return <p>{children}</p>;
  }
  return <Paragraph>{children}</Paragraph>;
};

export default function ReactMarkdown({
  children,
  components,
  remarkPlugins: _remarkPlugins,
  rehypePlugins: _rehypePlugins,
  ..._props
}: Props) {
  return <div data-testid="markdown">{renderParagraph(components, children)}</div>;
}
