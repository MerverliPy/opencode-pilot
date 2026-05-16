import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock server store
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));

import { useServerStore } from "../../store/server";
import { Sessions } from "../Sessions";

const mockedUseServerStore = useServerStore as unknown as jest.Mock;

const mockSession = (id: string, title: string) => ({
  id,
  title,
  time: { created: Date.now() - 10000 },
  status: "idle" as const,
});

function setup(server: unknown = null) {
  mockedUseServerStore.mockImplementation(
    (selector: (state: unknown) => unknown) => {
      const state = { active: () => server };
      return selector(state);
    },
  );
}

describe("Sessions", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows no-server message when no active server", () => {
    setup(null);
    render(<Sessions />);
    expect(screen.getByText(/no server configured/i)).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    // Return a promise that never resolves to keep loading
    (global.fetch as jest.Mock).mockResolvedValue(
      new Promise(() => {}), // never resolves
    );
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    expect(screen.getByText("loading…")).toBeInTheDocument();
  });

  it("shows empty state when no sessions", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve([]),
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("no sessions yet")).toBeInTheDocument();
    });
  });

  it("renders session list when populated", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: () =>
        Promise.resolve([
          mockSession("ses_1", "First Session"),
          mockSession("ses_2", "Second Session"),
        ]),
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("First Session")).toBeInTheDocument();
    });
    expect(screen.getByText("Second Session")).toBeInTheDocument();
  });

  it("creates new session when + New Session clicked", async () => {
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        // First call: listSessions
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve([]),
        });
      }
      // Second call: createSession
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(mockSession("ses_new", "new session")),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("no sessions yet")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("+ New Session"));
    await waitFor(() => {
      expect(screen.getByText("new session")).toBeInTheDocument();
    });
  });

  it("deletes session when delete button clicked", async () => {
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        // listSessions
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve([mockSession("ses_1", "To Delete")]),
        });
      }
      // deleteSession (returns 200 with true)
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(true),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("To Delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("delete"));
    await waitFor(() => {
      expect(screen.getByText("no sessions yet")).toBeInTheDocument();
    });
  });

  it("shows error when API call fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });
});
