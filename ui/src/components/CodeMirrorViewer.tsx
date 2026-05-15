/**
 * Read-only CodeMirror 6 file viewer component.
 *
 * Detects language from the filename extension and loads the appropriate
 * language support package. The editor is always read-only.
 */
import { useEffect, useRef } from "react";
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightSpecialChars,
  drawSelection,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Extension } from "@codemirror/state";
import { getResolvedColors } from "../theme";

interface CodeMirrorViewerProps {
  content: string;
  filename: string;
}

/**
 * Determine the CodeMirror language extension from a filename.
 * Exported for unit testing.
 */
function getLanguageExtension(filename: string): Extension {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ typescript: true, jsx: true });
    case "js":
      return javascript();
    case "jsx":
      return javascript({ jsx: true });
    case "mjs":
    case "cjs":
      return javascript();
    case "py":
      return python();
    case "json":
    case "jsonc":
      return json();
    case "css":
    case "scss":
    case "less":
      return css();
    case "html":
    case "htm":
      return html();
    case "md":
    case "mdx":
      return markdown();
    default:
      return [];
  }
}

function buildEditorTheme() {
  const palette = getResolvedColors();
  return EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "13px",
      backgroundColor: palette.surface,
      color: palette.text,
    },
    ".cm-scroller": { overflow: "auto", fontFamily: "inherit" },
    ".cm-gutters": {
      backgroundColor: palette.surfaceAlt,
      color: palette.muted,
      borderRight: `1px solid ${palette.border}`,
    },
    ".cm-activeLine": {
      backgroundColor: palette.selectionBackground,
    },
    ".cm-activeLineGutter": {
      backgroundColor: palette.selectionBackground,
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: palette.selectionBackground,
    },
    ".cm-content": {
      caretColor: palette.accent,
    },
  });
}

function buildExtensions(filename: string): Extension[] {
  const theme =
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : "dark";
  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLine(),
    highlightSpecialChars(),
    drawSelection(),
    getLanguageExtension(filename),
    EditorState.readOnly.of(true),
    buildEditorTheme(),
  ];

  if (theme === "dark") {
    extensions.splice(5, 0, oneDark);
  }

  return extensions;
}

export function CodeMirrorViewer({ content, filename }: CodeMirrorViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Create the editor once on mount
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const state = EditorState.create({
      doc: content,
      extensions: buildExtensions(filename),
    });

    const view = new EditorView({ state, parent: container });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update content and language when they change without recreating the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content,
      },
    });
  }, [content]);

  // Update language when filename changes — requires full state reconfigure
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const state = EditorState.create({
      doc: view.state.doc.toString(),
      extensions: buildExtensions(filename),
    });
    view.setState(state);
  }, [filename]);

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", overflow: "hidden" }}
      data-testid="codemirror-viewer"
    />
  );
}
