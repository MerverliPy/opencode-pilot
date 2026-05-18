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

  it("renames session when rename button clicked and saved", async () => {
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve([mockSession("ses_1", "Old Title")]),
        });
      }
      // updateSession PATCH
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () =>
          Promise.resolve(mockSession("ses_1", "New Title")),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Old Title")).toBeInTheDocument();
    });

    // Click rename
    fireEvent.click(screen.getByTestId("rename-session-ses_1"));

    // Input should appear
    const input = screen.getByTestId("rename-input-ses_1");
    expect(input).toBeInTheDocument();

    // Change value and blur to save
    fireEvent.change(input, { target: { value: "New Title" } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText("New Title")).toBeInTheDocument();
    });
  });

  it("cancels rename on Escape key", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: () =>
        Promise.resolve([mockSession("ses_1", "Original Title")]),
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(
      <MemoryRouter>
        <Sessions />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText("Original Title")).toBeInTheDocument();
    });

    // Click rename
    fireEvent.click(screen.getByTestId("rename-session-ses_1"));

    const input = screen.getByTestId("rename-input-ses_1");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    // Original title should still be shown
    expect(screen.getByText("Original Title")).toBeInTheDocument();
  });
});

describe("Session tags", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and displays tags on session rows", async () => {
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        // listSessions
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve([mockSession("ses_1", "Tagged Session")]),
        });
      }
      // getSessionTags
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([{ sessionId: "ses_1", tags: ["important", "bug"], folder: "Project A", updatedAt: Date.now() }]),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<MemoryRouter><Sessions /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("Tagged Session")).toBeInTheDocument();
    });
    // Tag chips should be visible
    expect(screen.getByText("important")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();
    // Folder should be shown
    const folderEls = screen.getAllByText(/Project A/);
    expect(folderEls.length).toBeGreaterThanOrEqual(1);
  });

  it("shows folder filter when folders exist", async () => {
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve([mockSession("ses_1", "S1"), mockSession("ses_2", "S2")]),
        });
      }
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([
          { sessionId: "ses_1", tags: [], folder: "Work", updatedAt: Date.now() },
          { sessionId: "ses_2", tags: [], folder: "Personal", updatedAt: Date.now() },
        ]),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<MemoryRouter><Sessions /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("Folder:")).toBeInTheDocument();
    });
    // Dropdown should have folder options
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("filters sessions by selected folder", async () => {
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve([mockSession("ses_1", "Work Session"), mockSession("ses_2", "Personal Session")]),
        });
      }
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([
          { sessionId: "ses_1", tags: [], folder: "Work", updatedAt: Date.now() },
          { sessionId: "ses_2", tags: [], folder: "Personal", updatedAt: Date.now() },
        ]),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<MemoryRouter><Sessions /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("Work Session")).toBeInTheDocument();
      expect(screen.getByText("Personal Session")).toBeInTheDocument();
    });
    // Select "Work" folder
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Work" } });
    // Should only show Work session
    expect(screen.getByText("Work Session")).toBeInTheDocument();
    expect(screen.queryByText("Personal Session")).not.toBeInTheDocument();
  });

  it("shows tag editor when tags button clicked", async () => {
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve([mockSession("ses_1", "Editable Session")]),
        });
      }
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([{ sessionId: "ses_1", tags: ["old"], folder: "", updatedAt: Date.now() }]),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<MemoryRouter><Sessions /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("Editable Session")).toBeInTheDocument();
    });
    // Click tags button
    fireEvent.click(screen.getByTestId("edit-tags-ses_1"));
    // Tag editor inputs should appear
    expect(screen.getByTestId("tag-input-ses_1")).toBeInTheDocument();
    expect(screen.getByTestId("folder-input-ses_1")).toBeInTheDocument();
  });

  it("saves tags and folder when Save clicked", async () => {
    let fetchCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      fetchCount++;
      if (fetchCount === 1) {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve([mockSession("ses_1", "Save Test")]),
        });
      }
      if (fetchCount === 2) {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve([{ sessionId: "ses_1", tags: [], folder: "", updatedAt: Date.now() }]),
        });
      }
      // setSessionTags (PUT)
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ sessionId: "ses_1", tags: ["newtag"], folder: "NewFolder", updatedAt: Date.now() }),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<MemoryRouter><Sessions /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText("Save Test")).toBeInTheDocument();
    });
    // Open tag editor
    fireEvent.click(screen.getByTestId("edit-tags-ses_1"));
    // Type new tag
    fireEvent.change(screen.getByTestId("tag-input-ses_1"), { target: { value: "newtag" } });
    // Type new folder
    fireEvent.change(screen.getByTestId("folder-input-ses_1"), { target: { value: "NewFolder" } });
    // Click Save
    fireEvent.click(screen.getByTestId("save-tags-ses_1"));
    await waitFor(() => {
      expect(screen.getByText("newtag")).toBeInTheDocument();
      const folderEls = screen.getAllByText(/NewFolder/);
      expect(folderEls.length).toBeGreaterThanOrEqual(1);
    });
  });
});
