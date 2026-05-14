/**
 * Tests for MessageList component.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MessageList } from "../MessageList";
import type { Turn } from "../../store/session";

describe("MessageList", () => {
  it("renders empty state when no turns", () => {
    render(<MessageList turns={[]} />);
    expect(screen.getByText("new session")).toBeInTheDocument();
    expect(screen.getByText(/ask anything/)).toBeInTheDocument();
  });

  it("renders user turn", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "user",
          time: { created: 1 },
        },
        parts: [
          {
            id: "p1",
            messageID: "m1",
            sessionID: "s1",
            type: "text",
            text: "hello",
          },
        ],
      },
    ];
    render(<MessageList turns={turns} />);
    expect(screen.getByText("user")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders assistant turn", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
        },
        parts: [
          {
            id: "p1",
            messageID: "m1",
            sessionID: "s1",
            type: "text",
            text: "hi there",
          },
        ],
      },
    ];
    render(<MessageList turns={turns} />);
    expect(screen.getByText("assistant")).toBeInTheDocument();
    expect(screen.getByText("hi there")).toBeInTheDocument();
  });

  it("renders reasoning part", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
        },
        parts: [
          {
            id: "p1",
            messageID: "m1",
            sessionID: "s1",
            type: "reasoning",
            text: "thinking…",
          },
        ],
      },
    ];
    render(<MessageList turns={turns} />);
    expect(screen.getByText("thinking…")).toBeInTheDocument();
  });

  it("renders tool part with status", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
        },
        parts: [
          {
            id: "p1",
            messageID: "m1",
            sessionID: "s1",
            type: "tool",
            tool: "write_file",
            state: { status: "completed", title: "write_file" },
          },
        ],
      },
    ];
    render(<MessageList turns={turns} />);
    expect(screen.getByText("write_file")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
  });

  it("renders multiple turns in order", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "user",
          time: { created: 1 },
        },
        parts: [
          {
            id: "p1",
            messageID: "m1",
            sessionID: "s1",
            type: "text",
            text: "q1",
          },
        ],
      },
      {
        message: {
          id: "m2",
          sessionID: "s1",
          role: "assistant",
          time: { created: 2 },
        },
        parts: [
          {
            id: "p2",
            messageID: "m2",
            sessionID: "s1",
            type: "text",
            text: "a1",
          },
        ],
      },
    ];
    render(<MessageList turns={turns} />);
    const items = screen.getAllByText(/q1|a1/);
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("q1");
    expect(items[1]).toHaveTextContent("a1");
  });

  it("shows ellipsis placeholder for turn with no parts", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
        },
        parts: [],
      },
    ];
    render(<MessageList turns={turns} />);
    expect(screen.getByText("…")).toBeInTheDocument();
  });

  it("renders file part", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
        },
        parts: [
          {
            id: "p1",
            messageID: "m1",
            sessionID: "s1",
            type: "file",
            filename: "test.ts",
          },
        ],
      },
    ];
    render(<MessageList turns={turns} />);
    expect(screen.getByText("test.ts")).toBeInTheDocument();
  });
});

it("renders text part with markdown content", () => {
  const turns: Turn[] = [
    {
      message: {
        id: "m1",
        sessionID: "s1",
        role: "assistant",
        time: { created: 1 },
      },
      parts: [
        {
          id: "p1",
          messageID: "m1",
          sessionID: "s1",
          type: "text",
          text: "**bold** text and `code`",
        },
      ],
    },
  ];
  render(<MessageList turns={turns} />);
  // MarkdownContent mock renders children in a div
  const markdown = screen.getByTestId("markdown");
  expect(markdown).toHaveTextContent("**bold** text and `code`");
});
