/**
 * Tests for the CategoryFilter component.
 *
 * Components are called directly as functions so the returned JSX element
 * tree can be inspected without a DOM or react-test-renderer.
 * Pressable onPress callbacks are invoked directly to verify behaviour.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("react-native", () => ({
  Text: "Text",
  View: "View",
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: any) => s },
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import React from "react";
import { CategoryFilter, type FilterCategory } from "../CategoryFilter";

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

/** Collect all string text leaves from a JSX tree. */
function collectText(node: any): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node === "string" || typeof node === "number")
    return [String(node)];
  if (!node.props) return [];
  const { children } = node.props;
  if (Array.isArray(children)) return children.flatMap(collectText);
  return collectText(children);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const EXPECTED_TABS = ["all", "pref", "fact", "code", "dec"];

describe("CategoryFilter", () => {
  describe("rendering", () => {
    it("renders without throwing", () => {
      const onChange = jest.fn();
      expect(() => CategoryFilter({ value: "all", onChange })).not.toThrow();
    });

    it("renders all 5 tabs", () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const pressables = findByType(element, "Pressable");
      expect(pressables).toHaveLength(5);
    });

    it("renders the correct tab labels", () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const texts = collectText(element);
      EXPECTED_TABS.forEach((label) => expect(texts).toContain(label));
    });

    it("wraps tabs in a ScrollView", () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const scrollViews = findByType(element, "ScrollView");
      expect(scrollViews.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("onChange callback", () => {
    it('calls onChange with "all" when the all tab is pressed', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "preference", onChange });
      const pressables = findByType(element, "Pressable");
      // First pressable is "all"
      pressables[0].props.onPress();
      expect(onChange).toHaveBeenCalledWith("all");
    });

    it('calls onChange with "preference" when the pref tab is pressed', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const pressables = findByType(element, "Pressable");
      // Second pressable is "preference"
      pressables[1].props.onPress();
      expect(onChange).toHaveBeenCalledWith("preference");
    });

    it('calls onChange with "fact" when the fact tab is pressed', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const pressables = findByType(element, "Pressable");
      pressables[2].props.onPress();
      expect(onChange).toHaveBeenCalledWith("fact");
    });

    it('calls onChange with "code_pattern" when the code tab is pressed', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const pressables = findByType(element, "Pressable");
      pressables[3].props.onPress();
      expect(onChange).toHaveBeenCalledWith("code_pattern");
    });

    it('calls onChange with "decision" when the dec tab is pressed', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const pressables = findByType(element, "Pressable");
      pressables[4].props.onPress();
      expect(onChange).toHaveBeenCalledWith("decision");
    });

    it("calls onChange exactly once per press", () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const pressables = findByType(element, "Pressable");
      pressables[2].props.onPress();
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("active tab state", () => {
    it("renders five pressable tabs regardless of active value", () => {
      const categories: FilterCategory[] = [
        "all",
        "preference",
        "fact",
        "code_pattern",
        "decision",
      ];
      categories.forEach((value) => {
        const onChange = jest.fn();
        const element = CategoryFilter({ value, onChange });
        const pressables = findByType(element, "Pressable");
        expect(pressables).toHaveLength(5);
      });
    });
  });
});
