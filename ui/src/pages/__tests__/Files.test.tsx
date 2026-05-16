import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock server store
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));

// Mock CodeMirrorViewer
jest.mock("../../components/CodeMirrorViewer", () => ({
  CodeMirrorViewer: ({ content }: any) => (
    <div data-testid="codemirror-viewer">{content}</div>
  ),
}));

jest.mock("../../services/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { useServerStore } from "../../store/server";
import { Files } from "../Files";

const mockedUseServerStore = useServerStore as unknown as jest.Mock;

function setup(server: unknown = null) {
  mockedUseServerStore.mockImplementation(
    (selector: (state: any) => unknown) => {
      const state = { active: () => server };
      return selector(state);
    },
  );
}

const mockFileNode = (name: string, type: "file" | "directory", path?: string) => ({
  name,
  type,
  path: path ?? `/${name}`,
});

describe("Files", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows no-server message when no active server", () => {
    setup(null);
    render(<Files />);
    expect(screen.getByText(/no server configured/i)).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    (global.fetch as jest.Mock).mockResolvedValue(new Promise(() => {}));
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<Files />);
    expect(screen.getByText("loading…")).toBeInTheDocument();
  });

  it("renders file list when loaded", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: () =>
        Promise.resolve([
          mockFileNode("src", "directory"),
          mockFileNode("README.md", "file"),
        ]),
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<Files />);
    await waitFor(() => {
      expect(screen.getByText("README.md")).toBeInTheDocument();
    });
    expect(screen.getByText("src")).toBeInTheDocument();
  });

  it("shows root path indicator when at root", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve([]),
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<Files />);
    await waitFor(() => {
      expect(screen.getByText("/")).toBeInTheDocument();
    });
  });

  it("navigates into directory on click", async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      callCount++;
      const files =
        callCount === 1
          ? [mockFileNode("src", "directory")]
          : [mockFileNode("index.ts", "file", "/src/index.ts")];
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(files),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<Files />);
    await waitFor(() => {
      expect(screen.getByText("src")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("src"));
    await waitFor(() => {
      expect(screen.getByText("index.ts")).toBeInTheDocument();
    });
  });

  it("shows file preview when file clicked", async () => {
    let callCount = 0;
    (global.fetch as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // listFiles
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve([
              mockFileNode("README.md", "file", "/README.md"),
            ]),
        });
      }
      // fileContent
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () =>
          Promise.resolve({ path: "/README.md", content: "# Hello" }),
      });
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<Files />);
    await waitFor(() => {
      expect(screen.getByText("README.md")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("README.md"));
    await waitFor(() => {
      expect(screen.getByTestId("codemirror-viewer")).toBeInTheDocument();
    });
    expect(screen.getByTestId("codemirror-viewer").textContent).toContain(
      "# Hello",
    );
  });

  it("shows empty directory message when no files", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve([]),
    });
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<Files />);
    await waitFor(() => {
      expect(screen.getByText("empty directory")).toBeInTheDocument();
    });
  });

  it("shows error when API call fails", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));
    setup({ id: "s1", url: "http://localhost:4096", name: "Home" });
    render(<Files />);
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
