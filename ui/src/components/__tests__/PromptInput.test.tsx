/**
 * Tests for PromptInput component.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PromptInput } from "../PromptInput";

describe("PromptInput", () => {
  it("renders textarea and send button", () => {
    render(<PromptInput onSubmit={jest.fn()} />);
    expect(screen.getByPlaceholderText("ask opencode…")).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
  });

  it("calls onSubmit with trimmed text when send clicked", async () => {
    const onSubmit = jest.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText("ask opencode…");
    fireEvent.change(textarea, { target: { value: "hello world" } });
    fireEvent.click(screen.getByText("Send"));
    expect(onSubmit).toHaveBeenCalledWith("hello world");
  });

  it("clears input after submit", () => {
    const onSubmit = jest.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText(
      "ask opencode…",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.click(screen.getByText("Send"));
    expect(textarea.value).toBe("");
  });

  it("does not submit empty text", () => {
    const onSubmit = jest.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Send"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit whitespace-only text", () => {
    const onSubmit = jest.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText("ask opencode…");
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByText("Send"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits on Enter key", () => {
    const onSubmit = jest.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText("ask opencode…");
    fireEvent.change(textarea, { target: { value: "enter test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(onSubmit).toHaveBeenCalledWith("enter test");
  });

  it("does not submit on Shift+Enter", () => {
    const onSubmit = jest.fn();
    render(<PromptInput onSubmit={onSubmit} />);
    const textarea = screen.getByPlaceholderText("ask opencode…");
    fireEvent.change(textarea, { target: { value: "multiline" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables input and button when disabled prop is true", () => {
    render(<PromptInput onSubmit={jest.fn()} disabled />);
    expect(screen.getByPlaceholderText("ask opencode…")).toBeDisabled();
    expect(screen.getByText("Send")).toBeDisabled();
  });

  it("disables send button when input is empty", () => {
    render(<PromptInput onSubmit={jest.fn()} />);
    expect(screen.getByText("Send")).toBeDisabled();
  });

  it("shows > prefix", () => {
    render(<PromptInput onSubmit={jest.fn()} />);
    expect(screen.getByText(">")).toBeInTheDocument();
  });
});
