/**
 * Tests for the WorkdirSheetView component.
 *
 * Components are called directly as functions so the returned JSX element
 * tree can be inspected without a DOM or react-test-renderer.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("react-native", () => ({
  ActivityIndicator: "ActivityIndicator",
  FlatList: "FlatList",
  Modal: "Modal",
  Pressable: "Pressable",
  Text: "Text",
  View: "View",
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
}));

jest.mock("@/theme", () => ({
  colors: {
    background: "#000",
    foreground: "#fff",
    muted: "#888",
    accent: "#f90",
    accentDim: "#c70",
    border: "#333",
    borderSubtle: "#222",
    surface: "#111",
    mutedAlt: "#666",
  },
  fonts: { mono: "Mono" },
  fontSizes: { xs: 10, sm: 12, md: 14 },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { WorkdirSheetView } from "@/components/modals/WorkdirSheet";
import type { FileNode } from "@/services/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Collect all string/number leaf values from a JSX tree. */
function collectText(node: any): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node === "string" || typeof node === "number")
    return [String(node)];
  if (!node.props) return [];
  const { children } = node.props;
  if (Array.isArray(children)) return children.flatMap(collectText);
  return collectText(children);
}

/** Extract props from a FlatList element in the JSX tree. */
function getFlatListProps(node: any): any {
  if (!node || typeof node !== "object") return null;
  if (node.type === "FlatList") return node.props;
  const { children } = node.props || {};
  const childArray = Array.isArray(children)
    ? children
    : children != null
      ? [children]
      : [];
  for (const c of childArray) {
    const found = getFlatListProps(c);
    if (found) return found;
  }
  return null;
}

/** Find all elements of a given type in the JSX tree. */
function findByType(node: any, type: string): any[] {
  if (!node || typeof node !== "object") return [];
  const results: any[] = [];
  if (node.type === type) results.push(node);
  const { children } = node.props || {};
  const childArray = Array.isArray(children)
    ? children
    : children != null
      ? [children]
      : [];
  childArray.forEach((c: any) => results.push(...findByType(c, type)));
  return results;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeNodes(): FileNode[] {
  return [
    { name: "src", path: "src", type: "directory" },
    { name: "README.md", path: "README.md", type: "file" },
  ];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WorkdirSheetView", () => {
  it("renders without throwing", () => {
    expect(() =>
      WorkdirSheetView({
        visible: true,
        repoName: "pilot",
        path: ".",
        parent: null,
        nodes: [],
        loading: false,
        onClose: jest.fn(),
        onSelect: jest.fn(),
        onNavigate: jest.fn(),
      }),
    ).not.toThrow();
  });

  it("shows repo name in title when provided", () => {
    const element = WorkdirSheetView({
      visible: true,
      repoName: "pilot",
      path: ".",
      parent: null,
      nodes: [],
      loading: false,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      onNavigate: jest.fn(),
    });
    const texts = collectText(element);
    expect(texts).toContain("pilot");
  });

  it("shows 'Project Root' fallback when repoName is null at root", () => {
    const element = WorkdirSheetView({
      visible: true,
      repoName: null,
      path: ".",
      parent: null,
      nodes: [],
      loading: false,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      onNavigate: jest.fn(),
    });
    const texts = collectText(element);
    expect(texts).toContain("Project Root");
  });

  it("shows current folder name when not at root", () => {
    const element = WorkdirSheetView({
      visible: true,
      repoName: "pilot",
      path: "src/components",
      parent: "src",
      nodes: [],
      loading: false,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      onNavigate: jest.fn(),
    });
    const texts = collectText(element);
    expect(texts).toContain("components");
  });

  it("renders both files and directories", () => {
    const element = WorkdirSheetView({
      visible: true,
      repoName: "pilot",
      path: ".",
      parent: null,
      nodes: makeNodes(),
      loading: false,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      onNavigate: jest.fn(),
    });
    const flatListProps = getFlatListProps(element);
    expect(flatListProps).toBeDefined();
    expect(flatListProps.data).toHaveLength(2);
    expect(flatListProps.data[0].name).toBe("src");
    expect(flatListProps.data[1].name).toBe("README.md");
  });

  it("renders 'Select This Directory' button", () => {
    const element = WorkdirSheetView({
      visible: true,
      repoName: "pilot",
      path: ".",
      parent: null,
      nodes: [],
      loading: false,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      onNavigate: jest.fn(),
    });
    const texts = collectText(element);
    expect(texts).toContain("Select This Directory");
  });

  it("calls onClose when close button is pressed", () => {
    const onClose = jest.fn();
    const element = WorkdirSheetView({
      visible: true,
      repoName: "pilot",
      path: ".",
      parent: null,
      nodes: [],
      loading: false,
      onClose,
      onSelect: jest.fn(),
      onNavigate: jest.fn(),
    });
    const pressables = findByType(element, "Pressable");
    // First Pressable is the overlay, second is close, last is select
    pressables[1].props.onPress();
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSelect when select button is pressed", () => {
    const onSelect = jest.fn();
    const element = WorkdirSheetView({
      visible: true,
      repoName: "pilot",
      path: ".",
      parent: null,
      nodes: [],
      loading: false,
      onClose: jest.fn(),
      onSelect,
      onNavigate: jest.fn(),
    });
    const pressables = findByType(element, "Pressable");
    // Last Pressable is the select button
    pressables[pressables.length - 1].props.onPress();
    expect(onSelect).toHaveBeenCalled();
  });

  it("calls onNavigate when a directory row is pressed", () => {
    const onNavigate = jest.fn();
    const element = WorkdirSheetView({
      visible: true,
      repoName: "pilot",
      path: ".",
      parent: null,
      nodes: makeNodes(),
      loading: false,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      onNavigate,
    });
    const flatListProps = getFlatListProps(element);
    const renderItem = flatListProps.renderItem;
    const dirRow = renderItem({ item: makeNodes()[0] });
    // The row is a Pressable; invoke its onPress
    dirRow.props.onPress();
    expect(onNavigate).toHaveBeenCalledWith("src");
  });

  it("does not call onNavigate when a file row is pressed", () => {
    const onNavigate = jest.fn();
    const element = WorkdirSheetView({
      visible: true,
      repoName: "pilot",
      path: ".",
      parent: null,
      nodes: makeNodes(),
      loading: false,
      onClose: jest.fn(),
      onSelect: jest.fn(),
      onNavigate,
    });
    const flatListProps = getFlatListProps(element);
    const renderItem = flatListProps.renderItem;
    const fileRow = renderItem({ item: makeNodes()[1] });
    // The row is a Pressable; invoke its onPress
    fileRow.props.onPress();
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
