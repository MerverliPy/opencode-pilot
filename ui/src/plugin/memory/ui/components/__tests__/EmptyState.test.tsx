/**
 * Tests for the EmptyState component.
 *
 * Components are called directly as functions so the returned JSX element
 * tree can be inspected without a DOM or react-test-renderer.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("react-native", () => ({
  Text: "Text",
  View: "View",
  StyleSheet: { create: (s: any) => s },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import React from "react";
import { EmptyState } from "../EmptyState";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Collect all string/number leaf values from a React element tree. */
function collectText(node: any): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node === "string" || typeof node === "number")
    return [String(node)];
  if (!node.props) return [];
  const { children } = node.props;
  if (Array.isArray(children)) {
    return children.flatMap(collectText);
  }
  return collectText(children);
}

/** Find all elements of a given type in the tree. */
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("EmptyState", () => {
  describe("default rendering", () => {
    it("renders without throwing", () => {
      expect(() => EmptyState({})).not.toThrow();
    });

    it('shows the default "no memories yet" message', () => {
      const element = EmptyState({});
      const texts = collectText(element);
      expect(texts).toContain("no memories yet");
    });

    it("shows the subtitle instructional text", () => {
      const element = EmptyState({});
      const texts = collectText(element);
      expect(
        texts.some((t) => t.includes("memories are extracted automatically")),
      ).toBe(true);
    });

    it("renders two Text elements", () => {
      const element = EmptyState({});
      const textNodes = findByType(element, "Text");
      expect(textNodes).toHaveLength(2);
    });
  });

  describe("custom message prop", () => {
    it("renders the provided custom message", () => {
      const element = EmptyState({ message: "nothing here yet" });
      const texts = collectText(element);
      expect(texts).toContain("nothing here yet");
    });

    it("does not show default message when custom message is provided", () => {
      const element = EmptyState({ message: "custom text" });
      const texts = collectText(element);
      expect(texts).not.toContain("no memories yet");
      expect(texts).toContain("custom text");
    });

    it("still renders the subtitle with custom message", () => {
      const element = EmptyState({ message: "custom text" });
      const texts = collectText(element);
      expect(
        texts.some((t) => t.includes("memories are extracted automatically")),
      ).toBe(true);
    });
  });

  describe("structure", () => {
    it("wraps content in a View", () => {
      const element = EmptyState({});
      expect(element.type).toBe("View");
    });

    it("applies flex:1 style to the root View", () => {
      const element = EmptyState({});
      expect((element.props as any).style).toMatchObject({ flex: 1 });
    });
  });
});
