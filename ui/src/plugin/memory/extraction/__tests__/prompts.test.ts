/**
 * Tests for the memory extraction prompt helpers.
 * Pure functions — no mocks needed.
 */
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  turnsToText,
} from "../prompts";

describe("turnsToText", () => {
  it("formats a single turn as [ROLE]: text", () => {
    const result = turnsToText([{ role: "user", text: "hello world" }]);
    expect(result).toBe("[USER]: hello world");
  });

  it("trims whitespace from each turn text", () => {
    const result = turnsToText([{ role: "user", text: "  hello   " }]);
    expect(result).toBe("[USER]: hello");
  });

  it("formats multiple turns with double-newline separators", () => {
    const result = turnsToText([
      { role: "user", text: "Hello" },
      { role: "assistant", text: "Hi there" },
      { role: "user", text: "How are you?" },
    ]);
    expect(result).toBe(
      "[USER]: Hello\n\n[ASSISTANT]: Hi there\n\n[USER]: How are you?",
    );
  });

  it("uppercases the role", () => {
    const result = turnsToText([{ role: "system", text: "be helpful" }]);
    expect(result).toBe("[SYSTEM]: be helpful");
  });

  it("handles empty array", () => {
    expect(turnsToText([])).toBe("");
  });
});

describe("buildExtractionPrompt", () => {
  it("wraps conversation text in the instruction block", () => {
    const conversation = "[USER]: Hello\n\n[ASSISTANT]: Hi";
    const result = buildExtractionPrompt(conversation);

    expect(result).toContain("Conversation to analyze:");
    expect(result).toContain(conversation);
    expect(result).toContain("Extract memories as a JSON array:");
  });

  it("includes the conversation between --- delimiters", () => {
    const conversation = "some text";
    const result = buildExtractionPrompt(conversation);
    expect(result).toMatch(/---\n.*some text.*\n---/s);
  });
});

describe("EXTRACTION_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof EXTRACTION_SYSTEM_PROMPT).toBe("string");
    expect(EXTRACTION_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("mentions memory extraction in its description", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("memory extraction");
  });
});
