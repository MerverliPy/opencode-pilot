/**
 * Tests for the Terminal page.
 *
 * xterm.js and WebSocket are mocked to avoid browser-only APIs in jsdom.
 */
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock xterm.js before importing Terminal
const matchMediaListeners: Array<() => void> = [];

const mockTermInstance = {
  loadAddon: jest.fn(),
  open: jest.fn(),
  write: jest.fn(),
  onData: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  dispose: jest.fn(),
  cols: 80,
  rows: 24,
  options: {},
};

const mockFitAddon = {
  fit: jest.fn(),
};

jest.mock("@xterm/xterm", () => ({
  Terminal: jest.fn().mockImplementation(() => mockTermInstance),
}));

jest.mock("@xterm/addon-fit", () => ({
  FitAddon: jest.fn().mockImplementation(() => mockFitAddon),
}));

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn();
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

// Mock server store
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));

import { useServerStore } from "../../store/server";
import { Terminal } from "../Terminal";

const mockedUseServerStore = useServerStore as unknown as jest.Mock;

describe("Terminal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    matchMediaListeners.length = 0;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: jest.fn((event, listener) => {
          if (event === "change") matchMediaListeners.push(listener);
        }),
        removeEventListener: jest.fn((event, listener) => {
          if (event === "change") {
            const index = matchMediaListeners.indexOf(listener);
            if (index >= 0) matchMediaListeners.splice(index, 1);
          }
        }),
      })),
    });
    mockTermInstance.loadAddon.mockClear();
    mockFitAddon.fit.mockClear();
    mockTermInstance.options = {};
  });

  it("shows 'no server configured' when no active server", () => {
    mockedUseServerStore.mockReturnValue(null);
    render(<Terminal />);
    expect(screen.getByText(/no server configured/)).toBeInTheDocument();
  });

  it("renders tab bar with '+ New' button when server is configured", () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });
    render(<Terminal />);
    expect(
      screen.getByRole("button", { name: /New terminal tab/ }),
    ).toBeInTheDocument();
  });

  it("renders the terminal container area", () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });
    const { container } = render(<Terminal />);
    // Tab bar is rendered
    expect(
      container.querySelector("[aria-label='New terminal tab']"),
    ).toBeInTheDocument();
  });

  it("updates open terminal theme when system theme changes", () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    render(<Terminal />);

    expect(matchMediaListeners).toHaveLength(1);
    matchMediaListeners[0]();

    expect((mockTermInstance.options as { theme?: unknown }).theme).toEqual(
      expect.objectContaining({
        background: expect.any(String),
        foreground: expect.any(String),
        cursor: expect.any(String),
      }),
    );
  });
});
