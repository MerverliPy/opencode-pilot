/**
 * Tests for ChatMessage component.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage } from "../ChatMessage";
import type { ChatMessage as ChatMessageType } from "../../services/n9routerChat";

describe("ChatMessage", () => {
  it("renders user message as plain text", () => {
    const msg: ChatMessageType = {
      id: "m1",
      role: "user",
      content: "hello world",
      timestamp: 1,
    };
    render(<ChatMessage message={msg} />);
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("renders assistant message with bold markdown", () => {
    const msg: ChatMessageType = {
      id: "m1",
      role: "assistant",
      content: "**bold** text",
      timestamp: 1,
    };
    render(<ChatMessage message={msg} />);
    expect(screen.getByText("bold")).toBeInTheDocument();
    expect(screen.getByText(/text/)).toBeInTheDocument();
  });

  it("renders assistant message with code block", () => {
    const msg: ChatMessageType = {
      id: "m1",
      role: "assistant",
      content: "```\nconsole.log('hi')\n```",
      timestamp: 1,
    };
    render(<ChatMessage message={msg} />);
    expect(screen.getByText("console.log('hi')")).toBeInTheDocument();
  });

  it("renders markdown image as img element", () => {
    const msg: ChatMessageType = {
      id: "m1",
      role: "assistant",
      content: "![test image](https://example.com/img.png)",
      timestamp: 1,
    };
    render(<ChatMessage message={msg} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/img.png");
    expect(img).toHaveAttribute("alt", "test image");
  });

  it("renders user message with markdown image as plain text", () => {
    const msg: ChatMessageType = {
      id: "m1",
      role: "user",
      content: "![alt](https://example.com/img.png)",
      timestamp: 1,
    };
    render(<ChatMessage message={msg} />);
    // User messages render as plain text <span>, not markdown
    expect(screen.getByText("![alt](https://example.com/img.png)")).toBeInTheDocument();
    // No <img> should be rendered
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders error banner with retry button", () => {
    const msg: ChatMessageType = {
      id: "m1",
      role: "assistant",
      content: "some response",
      timestamp: 1,
      error: "Something failed",
    };
    const onRetry = jest.fn();
    render(<ChatMessage message={msg} onRetry={onRetry} />);
    expect(screen.getByText(/Something failed/)).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("calls onRetry when retry button clicked", () => {
    const msg: ChatMessageType = {
      id: "m1",
      role: "assistant",
      content: "some response",
      timestamp: 1,
      error: "Something failed",
    };
    const onRetry = jest.fn();
    render(<ChatMessage message={msg} onRetry={onRetry} />);
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalled();
  });
});
