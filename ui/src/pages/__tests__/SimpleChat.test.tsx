import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock dependencies
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));
jest.mock("../../store/n9router", () => ({
  useN9RouterStore: jest.fn(),
}));
jest.mock("../../services/useChatStream", () => ({
  useChatStream: jest.fn(),
}));
jest.mock("../../components/ChatMessage", () => ({
  ChatMessage: jest.fn(({ message, onRetry }: { message: { role: string; error?: string }; onRetry?: () => void }) => (
    <div data-testid={`chat-message-${message.role}`}>
      <span>{message.role}</span>
      {message.error && <span data-testid="msg-error">{message.error}</span>}
      {message.error && onRetry && <button data-testid="msg-retry-btn" onClick={onRetry}>Retry</button>}
    </div>
  )),
}));
jest.mock("../../components/DebugPanel", () => ({
  DebugPanel: () => <div data-testid="debug-panel" />,
}));

import { useServerStore } from "../../store/server";
import { useN9RouterStore } from "../../store/n9router";
import { useChatStream } from "../../services/useChatStream";
import { SimpleChat } from "../SimpleChat";

const mockedUseServerStore = useServerStore as unknown as jest.Mock;
const mockedUseN9RouterStore = useN9RouterStore as unknown as jest.Mock;
const mockedUseChatStream = useChatStream as unknown as jest.Mock;

function setup() {
  const mockServer = {
    id: "s1",
    url: "http://localhost:4096",
    name: "Home",
  };
  mockedUseServerStore.mockImplementation(
    (selector: (state: unknown) => unknown) => {
      const state = {
        servers: [mockServer],
        activeId: "s1",
        active: () => mockServer,
      };
      return selector(state);
    },
  );
  mockedUseN9RouterStore.mockImplementation(
    (selector: (state: unknown) => unknown) => {
      const state = {
        url: "http://localhost:20128/v1",
        key: "test-key",
        hydrated: true,
      };
      return selector(state);
    },
  );
  mockedUseChatStream.mockReturnValue({
    streaming: false,
    streamError: null,
    startStream: jest.fn(),
    cancelStream: jest.fn(),
    clearError: jest.fn(),
  });
}

describe("SimpleChat", () => {
  it("renders sidebar with conversation header", () => {
    setup();
    render(
      <MemoryRouter>
        <SimpleChat />
      </MemoryRouter>,
    );
    expect(screen.getByText("Conversations")).toBeInTheDocument();
  });

  it("renders prompt input with placeholder", () => {
    setup();
    render(
      <MemoryRouter>
        <SimpleChat />
      </MemoryRouter>,
    );
    expect(screen.getByPlaceholderText(/ask opencode/)).toBeInTheDocument();
  });
});
