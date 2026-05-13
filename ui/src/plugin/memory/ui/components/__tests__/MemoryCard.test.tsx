/**
 * Tests for the MemoryCard component.
 *
 * Components are called directly as functions so the returned JSX element
 * tree can be inspected without a DOM or react-test-renderer.
 * Pressable onPress callbacks are invoked directly to verify action wiring.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("react-native", () => ({
  Text: "Text",
  View: "View",
  Pressable: "Pressable",
  StyleSheet: { create: (s: any) => s },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import React from "react";
import { MemoryCard } from "../MemoryCard";
import type { Memory } from "../../../db/schema";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "m1",
    serverId: "srv-1",
    content: "User prefers TypeScript",
    category: "preference",
    confidence: 0.95,
    tags: [],
    isPinned: false,
    isArchived: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** Render MemoryCard with given memory and mocked handlers. */
function render(
  memory: Memory,
  handlers?: {
    onPin?: jest.Mock;
    onArchive?: jest.Mock;
    onDelete?: jest.Mock;
  },
) {
  const onPin = handlers?.onPin ?? jest.fn();
  const onArchive = handlers?.onArchive ?? jest.fn();
  const onDelete = handlers?.onDelete ?? jest.fn();
  const element = MemoryCard({ memory, onPin, onArchive, onDelete });
  return { element, onPin, onArchive, onDelete };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MemoryCard", () => {
  describe("rendering", () => {
    it("renders without throwing", () => {
      expect(() => render(makeMemory())).not.toThrow();
    });

    it("renders the memory content text", () => {
      const { element } = render(
        makeMemory({ content: "Prefers strict TypeScript" }),
      );
      const texts = collectText(element);
      expect(texts).toContain("Prefers strict TypeScript");
    });

    it("renders the confidence percentage", () => {
      const { element } = render(makeMemory({ confidence: 0.87 }));
      const texts = collectText(element);
      expect(texts).toContain("87%");
    });

    it("rounds confidence to the nearest integer", () => {
      const { element } = render(makeMemory({ confidence: 0.956 }));
      const texts = collectText(element);
      expect(texts).toContain("96%");
    });

    it("renders three action Pressables (pin, archive, delete)", () => {
      const { element } = render(makeMemory());
      const pressables = findByType(element, "Pressable");
      expect(pressables).toHaveLength(3);
    });
  });

  describe("category badge", () => {
    it('renders "PREF" badge for preference category', () => {
      const { element } = render(makeMemory({ category: "preference" }));
      const texts = collectText(element);
      expect(texts).toContain("PREF");
    });

    it('renders "FACT" badge for fact category', () => {
      const { element } = render(makeMemory({ category: "fact" }));
      const texts = collectText(element);
      expect(texts).toContain("FACT");
    });

    it('renders "CODE" badge for code_pattern category', () => {
      const { element } = render(makeMemory({ category: "code_pattern" }));
      const texts = collectText(element);
      expect(texts).toContain("CODE");
    });

    it('renders "DEC" badge for decision category', () => {
      const { element } = render(makeMemory({ category: "decision" }));
      const texts = collectText(element);
      expect(texts).toContain("DEC");
    });
  });

  describe("pin state", () => {
    it('shows "pin" label when memory is not pinned', () => {
      const { element } = render(makeMemory({ isPinned: false }));
      const texts = collectText(element);
      expect(texts).toContain("pin");
    });

    it('shows "unpin" label when memory is pinned', () => {
      const { element } = render(makeMemory({ isPinned: true }));
      const texts = collectText(element);
      expect(texts).toContain("unpin");
    });

    it("shows the star indicator (★) when memory is pinned", () => {
      const { element } = render(makeMemory({ isPinned: true }));
      const texts = collectText(element);
      expect(texts).toContain("★");
    });

    it("does not show the star indicator when memory is not pinned", () => {
      const { element } = render(makeMemory({ isPinned: false }));
      const texts = collectText(element);
      expect(texts).not.toContain("★");
    });
  });

  describe("tags", () => {
    it("renders tags when present", () => {
      const { element } = render(
        makeMemory({ tags: ["typescript", "react-native"] }),
      );
      const texts = collectText(element);
      expect(texts).toContain("#typescript");
      expect(texts).toContain("#react-native");
    });

    it("renders no tag elements when tags array is empty", () => {
      const { element } = render(makeMemory({ tags: [] }));
      const texts = collectText(element);
      // No hash-prefixed texts should appear
      expect(texts.some((t) => t.startsWith("#"))).toBe(false);
    });

    it('renders each tag with a "#" prefix', () => {
      const { element } = render(makeMemory({ tags: ["node", "jest"] }));
      const texts = collectText(element);
      expect(texts).toContain("#node");
      expect(texts).toContain("#jest");
    });
  });

  describe("action callbacks", () => {
    it("calls onPin with memory id and true when pin is pressed (unpinned memory)", () => {
      const onPin = jest.fn();
      const { element } = render(
        makeMemory({ id: "mem-42", isPinned: false }),
        { onPin },
      );
      const pressables = findByType(element, "Pressable");
      // First action Pressable is pin/unpin
      pressables[0].props.onPress();
      expect(onPin).toHaveBeenCalledWith("mem-42", true);
    });

    it("calls onPin with memory id and false when unpin is pressed (pinned memory)", () => {
      const onPin = jest.fn();
      const { element } = render(makeMemory({ id: "mem-7", isPinned: true }), {
        onPin,
      });
      const pressables = findByType(element, "Pressable");
      pressables[0].props.onPress();
      expect(onPin).toHaveBeenCalledWith("mem-7", false);
    });

    it("calls onArchive with memory id when archive is pressed", () => {
      const onArchive = jest.fn();
      const { element } = render(makeMemory({ id: "mem-99" }), { onArchive });
      const pressables = findByType(element, "Pressable");
      // Second action Pressable is archive
      pressables[1].props.onPress();
      expect(onArchive).toHaveBeenCalledWith("mem-99");
    });

    it("calls onDelete with memory id when delete is pressed", () => {
      const onDelete = jest.fn();
      const { element } = render(makeMemory({ id: "mem-3" }), { onDelete });
      const pressables = findByType(element, "Pressable");
      // Third action Pressable is delete
      pressables[2].props.onPress();
      expect(onDelete).toHaveBeenCalledWith("mem-3");
    });

    it("calls each handler exactly once per press", () => {
      const onPin = jest.fn();
      const onArchive = jest.fn();
      const onDelete = jest.fn();
      const { element } = render(makeMemory(), { onPin, onArchive, onDelete });
      const pressables = findByType(element, "Pressable");

      pressables[0].props.onPress();
      pressables[1].props.onPress();
      pressables[2].props.onPress();

      expect(onPin).toHaveBeenCalledTimes(1);
      expect(onArchive).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("action labels", () => {
    it('renders "archive" label', () => {
      const { element } = render(makeMemory());
      const texts = collectText(element);
      expect(texts).toContain("archive");
    });

    it('renders "delete" label', () => {
      const { element } = render(makeMemory());
      const texts = collectText(element);
      expect(texts).toContain("delete");
    });
  });
});
