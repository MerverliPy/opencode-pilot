/**
 * Tests for the Diff page (Git status + diff2html viewer + commit form).
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Mock diff2html before importing Diff
jest.mock("diff2html", () => ({
  html: jest.fn().mockReturnValue("<div class='d2h-wrapper'>mocked diff</div>"),
}));

// Mock server store
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));

import { useServerStore } from "../../store/server";
import { Diff } from "../Diff";

const mockedUseServerStore = useServerStore as unknown as jest.Mock;

const mockStatus = {
  branch: "main",
  modified: ["src/index.ts"],
  added: [],
  deleted: [],
  untracked: [],
};

const mockDiffs = [
  {
    path: "src/index.ts",
    diff: "--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1 @@\n-old\n+new\n",
  },
];

const server = setupServer(
  http.get("*/git/status", () => HttpResponse.json(mockStatus)),
  http.get("*/git/diff", () => HttpResponse.json(mockDiffs)),
  http.post("*/git/commit", () => HttpResponse.json({ success: true, hash: "abc1234" })),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Diff", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows 'no server configured' when no active server", () => {
    mockedUseServerStore.mockReturnValue(null);
    render(<Diff />);
    expect(screen.getByText(/no server configured/)).toBeInTheDocument();
  });

  it("renders branch name from git status", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByText("main")).toBeInTheDocument();
    });
  });

  it("shows modified file count badge", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByText(/modified: 1/)).toBeInTheDocument();
    });
  });

  it("shows commit form when there are changes", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByTestId("commit-message-input")).toBeInTheDocument();
    });
    expect(screen.getByTestId("commit-button")).toBeInTheDocument();
  });

  it("commit button is disabled when message is empty", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByTestId("commit-button")).toBeInTheDocument();
    });

    expect(screen.getByTestId("commit-button")).toBeDisabled();
  });

  it("enables commit button when message is entered", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByTestId("commit-message-input")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("commit-message-input"), {
      target: { value: "feat: add tests" },
    });

    expect(screen.getByTestId("commit-button")).not.toBeDisabled();
  });

  it("shows 'working tree clean' when no changes", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });
    server.use(
      http.get("*/git/status", () =>
        HttpResponse.json({
          branch: "main",
          modified: [],
          added: [],
          deleted: [],
          untracked: [],
        }),
      ),
      http.get("*/git/diff", () => HttpResponse.json([])),
    );

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByText("working tree clean")).toBeInTheDocument();
    });
  });

  it("shows commit result after successful commit", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByTestId("commit-message-input")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("commit-message-input"), {
      target: { value: "feat: add feature" },
    });

    fireEvent.click(screen.getByTestId("commit-button"));

    await waitFor(() => {
      expect(screen.getByText(/committed abc1234/)).toBeInTheDocument();
    });
  });

  it("shows error when fetch fails", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });
    server.use(
      http.get("*/git/status", () =>
        new HttpResponse("Internal Server Error", { status: 500 }),
      ),
    );

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it("refresh button triggers reload", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    let requestCount = 0;
    server.use(
      http.get("*/git/status", () => {
        requestCount++;
        return HttpResponse.json(mockStatus);
      }),
    );

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByText("main")).toBeInTheDocument();
    });

    const callCountBefore = requestCount;
    fireEvent.click(screen.getByText("refresh"));

    await waitFor(() => {
      expect(requestCount).toBeGreaterThan(callCountBefore);
    });
  });

  it("renders theme-aware diff2html override styles", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });

    const { container } = render(<Diff />);

    await waitFor(() => {
      expect(screen.getByText("main")).toBeInTheDocument();
    });

    const styleTag = Array.from(container.querySelectorAll("style")).find((node) =>
      node.textContent?.includes(".diff2html-wrapper .d2h-wrapper"),
    );

    expect(styleTag?.textContent).toContain(".d2h-code-side-line");
    expect(styleTag?.textContent).toContain("color-mix");
    expect(styleTag?.textContent).toContain("var(--pilot-success)");
    expect(styleTag?.textContent).toContain("var(--pilot-error)");
  });
});
