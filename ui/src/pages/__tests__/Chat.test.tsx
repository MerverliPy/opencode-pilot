import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  mockUseParams,
  mockUseServerStore,
  mockUseEventStream,
  mockUseMemoryExtraction,
  mockUseMemoryInjection,
  mockListMessages,
  mockGetSession,
  mockCreateSession,
  mockUpdateSession,
  mockPromptAsync,
  mockRespondPermission,
  mockSetSession,
  mockSetStatus,
  mockHydrateTurns,
  mockUpsertMessage,
  mockUpsertPart,
  mockRemoveMessage,
  mockRemovePart,
  mockPushPermission,
  mockResolvePermission,
  mockReset,
} from "./helpers/chatMocks";

let mockSession = {
  id: "session-1",
  title: "Initial title",
  time: { created: 1, updated: 1 },
};

jest.mock("react-router-dom", () => ({
  useParams: () => mockUseParams(),
}));

jest.mock("../../store/server", () => ({
  useServerStore: (selector: (state: { active: () => { id: string; url: string; username?: string; password?: string } | null }) => unknown) =>
    mockUseServerStore(selector),
}));

jest.mock("../../store/session", () => ({
  useSessionStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      session: mockSession,
      status: "idle",
      turns: [],
      permissions: [],
      setSession: mockSetSession,
      setStatus: mockSetStatus,
      hydrateTurns: mockHydrateTurns,
      upsertMessage: mockUpsertMessage,
      upsertPart: mockUpsertPart,
      removeMessage: mockRemoveMessage,
      removePart: mockRemovePart,
      pushPermission: mockPushPermission,
      resolvePermission: mockResolvePermission,
      reset: mockReset,
    }),
}));

jest.mock("../../services/sse", () => ({
  useEventStream: (...args: unknown[]) => mockUseEventStream(...args),
}));

jest.mock("../../plugin/memory/hooks/useMemoryExtraction", () => ({
  useMemoryExtraction: (...args: unknown[]) => mockUseMemoryExtraction(...args),
}));

jest.mock("../../plugin/memory/hooks/useMemoryInjection", () => ({
  useMemoryInjection: (...args: unknown[]) => {
    mockUseMemoryInjection(...args);
    return { buildPrefix: jest.fn().mockResolvedValue("") };
  },
}));

jest.mock("../../components/MessageList", () => ({
  MessageList: () => <div data-testid="message-list-content" />,
}));

jest.mock("../../components/PromptInput", () => ({
  PromptInput: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="prompt-input" data-disabled={String(Boolean(disabled))} />
  ),
}));

jest.mock("../../components/PermissionCard", () => ({
  PermissionCard: () => <div data-testid="permission-card" />,
}));

jest.mock("../../services/api", () => ({
  OpencodeClient: jest.fn().mockImplementation(() => ({
    listMessages: mockListMessages,
    getSession: mockGetSession,
    createSession: mockCreateSession,
    updateSession: mockUpdateSession,
    promptAsync: mockPromptAsync,
    respondPermission: mockRespondPermission,
  })),
}));

import { Chat } from "../Chat";

describe("Chat title editing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = {
      id: "session-1",
      title: "Initial title",
      time: { created: 1, updated: 1 },
    };
    mockUseParams.mockReturnValue({});
    mockUseServerStore.mockImplementation((selector) =>
      selector({
        active: () => ({
          id: "server-1",
          url: "http://localhost:3000",
          username: "user",
          password: "pass",
        }),
      }),
    );
    mockListMessages.mockResolvedValue([]);
    mockGetSession.mockResolvedValue(mockSession);
    mockCreateSession.mockResolvedValue(mockSession);
    mockUpdateSession.mockResolvedValue({
      ...mockSession,
      title: "Renamed title",
      time: { created: 1, updated: 2 },
    });
  });

  it("starts editing and cancels without saving", async () => {
    render(<Chat />);

    const editButton = await screen.findByRole("button", { name: /edit session title/i });
    fireEvent.click(editButton);

    const input = screen.getByTestId("session-title-input");
    expect(input).toHaveValue("Initial title");

    fireEvent.change(input, { target: { value: "Draft title" } });
    fireEvent.keyDown(input, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("session-title-input")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Initial title")).toBeInTheDocument();
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it("saves trimmed title on Enter", async () => {
    render(<Chat />);

    fireEvent.click(await screen.findByRole("button", { name: /edit session title/i }));
    const input = screen.getByTestId("session-title-input");

    fireEvent.change(input, { target: { value: "  Renamed title  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockUpdateSession).toHaveBeenCalledWith("session-1", {
        title: "Renamed title",
      });
    });
    expect(mockSetSession).toHaveBeenCalledWith({
      ...mockSession,
      title: "Renamed title",
      time: { created: 1, updated: 2 },
    });
  });

  it("skips PATCH when trimmed title is unchanged", async () => {
    render(<Chat />);

    fireEvent.click(await screen.findByRole("button", { name: /edit session title/i }));
    const input = screen.getByTestId("session-title-input");

    fireEvent.change(input, { target: { value: "  Initial title  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.queryByTestId("session-title-input")).not.toBeInTheDocument();
    });
    expect(mockUpdateSession).not.toHaveBeenCalled();
  });

  it("keeps draft when store-backed session title changes during editing", async () => {
    const { rerender } = render(<Chat />);

    fireEvent.click(await screen.findByRole("button", { name: /edit session title/i }));
    const input = screen.getByTestId("session-title-input");

    fireEvent.change(input, { target: { value: "Local draft" } });
    mockSession = {
      ...mockSession,
      title: "Server title",
      time: { created: 1, updated: 3 },
    };

    rerender(<Chat />);

    expect(screen.getByTestId("session-title-input")).toHaveValue("Local draft");
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("session-title-input")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Server title")).toBeInTheDocument();
  });
});
