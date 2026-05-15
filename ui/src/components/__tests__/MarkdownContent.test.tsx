/**
 * Tests for MarkdownContent component.
 *
 * These tests verify component renderers with the react-markdown mock.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MarkdownContent, markdownComponents } from "../MarkdownContent";

type Renderer = (props: Record<string, unknown>) => React.JSX.Element;

function getRenderer(name: keyof typeof markdownComponents): Renderer {
  const renderer = markdownComponents[name];
  if (typeof renderer !== "function") {
    throw new Error(`renderer ${String(name)} not available`);
  }
  return renderer as unknown as Renderer;
}

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

  it("uses themed paragraph renderer in mock output", () => {
    render(<MarkdownContent text="paragraph" />);
    const paragraph = screen.getByText("paragraph");
    expect(paragraph.tagName).toBe("P");
    expect(paragraph).toHaveStyle({
      color: "var(--pilot-text)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    });
  });

  it("renders secure link attributes via exported renderer", () => {
    const LinkRenderer = getRenderer("a");
    render(
      LinkRenderer({
        href: "https://example.com",
        children: "Example",
      }),
    );

    const link = screen.getByRole("link", { name: "Example" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders inline code with themed styles via exported renderer", () => {
    const CodeRenderer = getRenderer("code");
    render(CodeRenderer({ children: "const x = 1" }));

    const code = screen.getByText("const x = 1");
    expect(code.tagName).toBe("CODE");
    expect(code).toHaveStyle({
      backgroundColor: "var(--pilot-surface-alt)",
      color: "var(--pilot-accent)",
    });
  });

  it("renders code blocks with passed highlight classes via exported renderer", () => {
    const CodeRenderer = getRenderer("code");
    render(
      CodeRenderer({
        className: "hljs language-ts",
        children: "const x = 1",
      }),
    );

    const code = screen.getByText("const x = 1");
    expect(code).toHaveClass("hljs");
    expect(code).toHaveClass("language-ts");
  });

  it("renders image attributes via exported renderer", () => {
    const ImageRenderer = getRenderer("img");
    render(
      ImageRenderer({
        src: "https://example.com/test.png",
        alt: "diagram",
      }),
    );

    const image = screen.getByRole("img", { name: "diagram" });
    expect(image).toHaveAttribute("src", "https://example.com/test.png");
    expect(image).toHaveAttribute("alt", "diagram");
  });

  it("renders table cell styles via exported renderers", () => {
    const ThRenderer = getRenderer("th");
    const TdRenderer = getRenderer("td");

    render(
      <table>
        <thead>
          <tr>{ThRenderer({ children: "Head" })}</tr>
        </thead>
        <tbody>
          <tr>{TdRenderer({ children: "Cell" })}</tr>
        </tbody>
      </table>,
    );

    expect(screen.getByText("Head")).toHaveStyle({
      backgroundColor: "var(--pilot-surface-alt)",
      color: "var(--pilot-text)",
    });
    expect(screen.getByText("Cell")).toHaveStyle({
      color: "var(--pilot-text)",
    });
  });
});
