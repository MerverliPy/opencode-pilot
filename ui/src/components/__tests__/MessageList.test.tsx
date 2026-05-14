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

describe("MessageCostFooter", () => {
  it("renders cost footer for assistant message with cost", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
          cost: 0.003,
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
    expect(screen.getByText("$0.003")).toBeInTheDocument();
  });

  it("renders token counts for assistant message", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
          tokens: { input: 1200, output: 500 },
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
    expect(screen.getByText("1.2k in · 500 out")).toBeInTheDocument();
  });

  it("renders cost and tokens together", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
          cost: 0.003,
          tokens: { input: 1200, output: 500 },
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
    expect(screen.getByText("$0.003 · 1.2k in · 500 out")).toBeInTheDocument();
  });

  it("renders reasoning tokens when present", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "assistant",
          time: { created: 1 },
          tokens: { input: 1000, output: 500, reasoning: 300 },
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
    expect(screen.getByText("1k in · 500 out · 300 reason")).toBeInTheDocument();
  });

  it("does not render cost footer for user messages", () => {
    const turns: Turn[] = [
      {
        message: {
          id: "m1",
          sessionID: "s1",
          role: "user",
          time: { created: 1 },
          cost: 0.003,
          tokens: { input: 1200, output: 500 },
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
    expect(screen.queryByText(/\$0\.003/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1\.2k in/)).not.toBeInTheDocument();
  });

  it("does not render cost footer when no cost or tokens", () => {
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
            text: "hello",
          },
        ],
      },
    ];
    render(<MessageList turns={turns} />);
    // No cost/token footer should be rendered — only "assistant" label and text
    expect(screen.getByText("assistant")).toBeInTheDocument();
    expect(screen.getByText("hello")).toBeInTheDocument();
    // No element with cost/token text patterns
    expect(screen.queryByText(/\$[\d.]+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+(\.\d+)?k? in/)).not.toBeInTheDocument();
  });
});
