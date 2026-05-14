/**
 * Mock for react-markdown — renders children as a plain div.
 * Tests don't need actual markdown rendering.
 */
import React from "react";

type Props = {
  children?: string;
  remarkPlugins?: unknown[];
  rehypePlugins?: unknown[];
  components?: Record<string, unknown>;
};

export default function ReactMarkdown({
  children,
  components: _components,
  remarkPlugins: _remarkPlugins,
  rehypePlugins: _rehypePlugins,
  ..._props
}: Props) {
  return <div data-testid="markdown">{children}</div>;
}
