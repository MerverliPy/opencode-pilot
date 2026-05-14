/**
 * Tests for MarkdownContent component.
 *
 * These tests verify integration with react-markdown mocks.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MarkdownContent } from "../MarkdownContent";

describe("MarkdownContent", () => {
  it("renders plain text", () => {
    render(<MarkdownContent text="hello world" />);
    expect(screen.getByTestId("markdown")).toHaveTextContent("hello world");
  });

  it("renders multiline text", () => {
    render(<MarkdownContent text={"line1\n\nline2\n\nline3"} />);
    expect(screen.getByTestId("markdown")).toHaveTextContent("line1");
    expect(screen.getByTestId("markdown")).toHaveTextContent("line2");
  });

  it("renders text with markdown symbols", () => {
    render(<MarkdownContent text="**bold** and *italic* and `code`" />);
    expect(screen.getByTestId("markdown")).toHaveTextContent("**bold** and *italic* and `code`");
  });

  it("handles empty text", () => {
    render(<MarkdownContent text="" />);
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
  });
});
