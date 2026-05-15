/**
 * Tests for CodeMirrorViewer component.
 *
 * Full CodeMirror DOM initialisation is skipped by mocking the editor packages.
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
import { CodeMirrorViewer } from "../CodeMirrorViewer";

function getExtensionsFromCreateCall() {
  const create = EditorState.create as jest.Mock;
  return create.mock.calls[0][0].extensions as unknown[];
}

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

    expect(getExtensionsFromCreateCall()).toContain(mockOneDark);
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

    expect(getExtensionsFromCreateCall()).not.toContain(mockOneDark);
  });
});
