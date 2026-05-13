/**
 * Tests for the Diff page (Git status + diff2html viewer + commit form).
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

function setupFetch({
  status = mockStatus,
  diffs = mockDiffs,
  commitResult = { success: true, hash: "abc1234" },
}: {
  status?: typeof mockStatus;
  diffs?: typeof mockDiffs;
  commitResult?: { success: boolean; hash: string };
} = {}) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url === "/git/status") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(status),
      });
    }
    if (url === "/git/diff") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(diffs),
      });
    }
    if (url === "/git/commit") {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(commitResult),
      });
    }
    return Promise.resolve({
      ok: false,
      text: () => Promise.resolve("not found"),
    });
  }) as jest.Mock;
}

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
    setupFetch();

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
    setupFetch();

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
    setupFetch();

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
    setupFetch();

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
    setupFetch();

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
    setupFetch({
      status: {
        branch: "main",
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
      },
      diffs: [],
    });

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
    setupFetch();

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

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    }) as jest.Mock;

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByText(/500/)).toBeInTheDocument();
    });
  });

  it("refresh button triggers reload", async () => {
    mockedUseServerStore.mockReturnValue({
      id: "s1",
      url: "http://localhost:3000",
      name: "Local",
    });
    setupFetch();

    render(<Diff />);

    await waitFor(() => {
      expect(screen.getByText("main")).toBeInTheDocument();
    });

    const callCountBefore = (global.fetch as jest.Mock).mock.calls.length;
    fireEvent.click(screen.getByText("refresh"));

    // After clicking refresh, fetch should be called again
    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(
        callCountBefore,
      );
    });
  });
});
