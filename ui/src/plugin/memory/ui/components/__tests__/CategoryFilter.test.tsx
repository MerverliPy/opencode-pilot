/**
 * Tests for the CategoryFilter component.
 *
 * Components are called directly as functions so the returned JSX element
 * tree can be inspected without a DOM or react-test-renderer.
 * Button onClick callbacks are invoked directly to verify behaviour.
 */
import React from "react";
import { CategoryFilter, type FilterCategory } from "../CategoryFilter";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Find all elements of a given HTML type in the JSX tree. */
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
      const buttons = findByType(element, "button");
      expect(buttons).toHaveLength(5);
    });

    it("renders the correct tab labels", () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const texts = collectText(element);
      EXPECTED_TABS.forEach((label) => expect(texts).toContain(label));
    });

    it("wraps tabs in a single root div", () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      expect(element.type).toBe("div");
    });
  });

  describe("onChange callback", () => {
    it('calls onChange with "all" when the all tab is clicked', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "preference", onChange });
      const buttons = findByType(element, "button");
      // First button is "all"
      buttons[0].props.onClick();
      expect(onChange).toHaveBeenCalledWith("all");
    });

    it('calls onChange with "preference" when the pref tab is clicked', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const buttons = findByType(element, "button");
      // Second button is "preference"
      buttons[1].props.onClick();
      expect(onChange).toHaveBeenCalledWith("preference");
    });

    it('calls onChange with "fact" when the fact tab is clicked', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const buttons = findByType(element, "button");
      buttons[2].props.onClick();
      expect(onChange).toHaveBeenCalledWith("fact");
    });

    it('calls onChange with "code_pattern" when the code tab is clicked', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const buttons = findByType(element, "button");
      buttons[3].props.onClick();
      expect(onChange).toHaveBeenCalledWith("code_pattern");
    });

    it('calls onChange with "decision" when the dec tab is clicked', () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const buttons = findByType(element, "button");
      buttons[4].props.onClick();
      expect(onChange).toHaveBeenCalledWith("decision");
    });

    it("calls onChange exactly once per click", () => {
      const onChange = jest.fn();
      const element = CategoryFilter({ value: "all", onChange });
      const buttons = findByType(element, "button");
      buttons[2].props.onClick();
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe("active tab state", () => {
    it("renders five buttons regardless of active value", () => {
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
        const buttons = findByType(element, "button");
        expect(buttons).toHaveLength(5);
      });
    });
  });
});
