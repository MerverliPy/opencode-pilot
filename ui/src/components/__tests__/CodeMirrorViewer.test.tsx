/**
 * Tests for CodeMirrorViewer component.
 *
 * Full CodeMirror DOM initialisation is skipped by mocking the editor packages.
 * The pure helper `getLanguageExtension` is tested directly.
 */
import React from "react";
import { render } from "@testing-library/react";

// Mock CodeMirror packages — they have browser-specific DOM requirements
jest.mock("@codemirror/view", () => {
  const MockEditorView = jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    dispatch: jest.fn(),
    setState: jest.fn(),
    state: { doc: { length: 0, toString: () => "" } },
  }));
  (MockEditorView as unknown as Record<string, unknown>).theme = jest
    .fn()
    .mockReturnValue([]);
  return {
    EditorView: MockEditorView,
    lineNumbers: jest.fn().mockReturnValue([]),
    highlightActiveLine: jest.fn().mockReturnValue([]),
    highlightSpecialChars: jest.fn().mockReturnValue([]),
    drawSelection: jest.fn().mockReturnValue([]),
  };
});

jest.mock("@codemirror/state", () => ({
  EditorState: {
    create: jest.fn().mockReturnValue({}),
    readOnly: { of: jest.fn().mockReturnValue([]) },
  },
}));

jest.mock("@codemirror/lang-javascript", () => ({
  javascript: jest.fn().mockReturnValue([]),
}));
jest.mock("@codemirror/lang-python", () => ({
  python: jest.fn().mockReturnValue([]),
}));
jest.mock("@codemirror/lang-json", () => ({
  json: jest.fn().mockReturnValue([]),
}));
jest.mock("@codemirror/lang-css", () => ({
  css: jest.fn().mockReturnValue([]),
}));
jest.mock("@codemirror/lang-html", () => ({
  html: jest.fn().mockReturnValue([]),
}));
jest.mock("@codemirror/lang-markdown", () => ({
  markdown: jest.fn().mockReturnValue([]),
}));
const mockOneDark = ["oneDarkTheme"];
jest.mock("@codemirror/theme-one-dark", () => ({ oneDark: mockOneDark }));

import { EditorState } from "@codemirror/state";
import { CodeMirrorViewer, getLanguageExtension } from "../CodeMirrorViewer";

describe("getLanguageExtension", () => {
  it("returns javascript for .ts files", () => {
    const { javascript } = require("@codemirror/lang-javascript");
    getLanguageExtension("index.ts");
    expect(javascript).toHaveBeenCalledWith({ typescript: true });
  });

  it("returns javascript with jsx for .tsx", () => {
    const { javascript } = require("@codemirror/lang-javascript");
    javascript.mockClear();
    getLanguageExtension("app.tsx");
    expect(javascript).toHaveBeenCalledWith({ typescript: true, jsx: true });
  });

  it("returns javascript for .js", () => {
    const { javascript } = require("@codemirror/lang-javascript");
    javascript.mockClear();
    getLanguageExtension("script.js");
    expect(javascript).toHaveBeenCalledWith();
  });

  it("returns python for .py", () => {
    const { python } = require("@codemirror/lang-python");
    getLanguageExtension("main.py");
    expect(python).toHaveBeenCalled();
  });

  it("returns json for .json", () => {
    const { json } = require("@codemirror/lang-json");
    getLanguageExtension("data.json");
    expect(json).toHaveBeenCalled();
  });

  it("returns css for .css", () => {
    const { css } = require("@codemirror/lang-css");
    getLanguageExtension("styles.css");
    expect(css).toHaveBeenCalled();
  });

  it("returns html for .html", () => {
    const { html } = require("@codemirror/lang-html");
    getLanguageExtension("index.html");
    expect(html).toHaveBeenCalled();
  });

  it("returns markdown for .md", () => {
    const { markdown } = require("@codemirror/lang-markdown");
    getLanguageExtension("README.md");
    expect(markdown).toHaveBeenCalled();
  });

  it("returns empty array for unknown extensions", () => {
    const result = getLanguageExtension("binary.exe");
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(0);
  });

  it("handles files without extensions", () => {
    const result = getLanguageExtension("Makefile");
    expect(Array.isArray(result)).toBe(true);
  });

  it("handles .mjs and .cjs as javascript", () => {
    const { javascript } = require("@codemirror/lang-javascript");
    javascript.mockClear();
    getLanguageExtension("module.mjs");
    expect(javascript).toHaveBeenCalled();
    javascript.mockClear();
    getLanguageExtension("config.cjs");
    expect(javascript).toHaveBeenCalled();
  });
});

describe("CodeMirrorViewer", () => {
  it("renders the container element", () => {
    const { getByTestId } = render(
      <CodeMirrorViewer content="const x = 1;" filename="test.ts" />,
    );
    expect(getByTestId("codemirror-viewer")).toBeInTheDocument();
  });

  it("renders with empty content", () => {
    const { getByTestId } = render(
      <CodeMirrorViewer content="" filename="empty.txt" />,
    );
    expect(getByTestId("codemirror-viewer")).toBeInTheDocument();
  });

  it("includes oneDark extension when system theme is dark", () => {
    (EditorState.create as jest.Mock).mockClear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    render(<CodeMirrorViewer content="const x = 1;" filename="test.ts" />);

    const create = EditorState.create as jest.Mock;
    const extensions = create.mock.calls[0][0].extensions as unknown[];
    expect(extensions).toContain(mockOneDark);
  });

  it("omits oneDark extension when system theme is light", () => {
    (EditorState.create as jest.Mock).mockClear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    render(<CodeMirrorViewer content="const x = 1;" filename="test.ts" />);

    const create = EditorState.create as jest.Mock;
    const extensions = create.mock.calls[0][0].extensions as unknown[];
    expect(extensions).not.toContain(mockOneDark);
  });
});
