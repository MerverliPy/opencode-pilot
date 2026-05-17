/**
 * Tests for the ProfilePanel component.
 *
 * Uses @testing-library/react for DOM rendering because the component
 * manages internal state via hooks (useState, useEffect).
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryApi } from "../../../../../services/memoryApi";
import type { ServerConfig } from "../../../../../services/auth";
import type { ProfileEntry } from "../../../db/schema";
import { ProfilePanel } from "../ProfilePanel";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("../../../../../services/memoryApi");
const mockGetProfile = jest.fn();
(createMemoryApi as jest.Mock).mockReturnValue({
  getProfile: mockGetProfile,
});

// ── Fixtures ───────────────────────────────────────────────────────────────────

const mockServer: ServerConfig = {
  id: "test-server",
  name: "Test Server",
  url: "http://localhost:9999",
};

function mockProfileEntry(
  overrides: Partial<ProfileEntry> = {},
): ProfileEntry {
  return {
    id: "entry-1",
    serverId: "s1",
    key: "name",
    value: "Alice",
    confidence: 0.9,
    updatedAt: Date.now() - 60_000,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("ProfilePanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state initially", async () => {
    // Return a pending promise so the component stays in loading state
    mockGetProfile.mockReturnValue(new Promise(() => {}));

    render(<ProfilePanel serverId="s1" server={mockServer} />);

    expect(screen.getByTestId("profile-panel")).toBeInTheDocument();
    expect(screen.getByText("loading profile\u2026")).toBeInTheDocument();
  });

  it("renders profile entries after loading", async () => {
    mockGetProfile.mockResolvedValue([
      mockProfileEntry({
        id: "e1",
        key: "name",
        value: "Alice",
        confidence: 0.95,
      }),
      mockProfileEntry({
        id: "e2",
        key: "role",
        value: "Engineer",
        confidence: 0.6,
      }),
    ]);

    render(<ProfilePanel serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-entry-e1")).toBeInTheDocument();
    });

    // Both entries rendered
    expect(screen.getByTestId("profile-entry-e2")).toBeInTheDocument();

    // Key labels
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("role")).toBeInTheDocument();

    // Values
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();

    // Confidence percentages
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders confidence bars with proportional widths", async () => {
    mockGetProfile.mockResolvedValue([
      mockProfileEntry({
        id: "high",
        key: "a",
        value: "A",
        confidence: 0.95,
      }),
      mockProfileEntry({
        id: "mid",
        key: "b",
        value: "B",
        confidence: 0.6,
      }),
      mockProfileEntry({
        id: "low",
        key: "c",
        value: "C",
        confidence: 0.3,
      }),
    ]);

    render(<ProfilePanel serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-entry-high")).toBeInTheDocument();
    });

    // Verify percentage labels for each confidence level
    expect(screen.getByText("95%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();

    // Verify bar inner widths are proportional to confidence
    // Structure per entry: entry-div > key > value > bar-track > bar-inner
    const panel = screen.getByTestId("profile-panel");
    const innerBars = panel.querySelectorAll<HTMLDivElement>(
      '[data-testid^="profile-entry-"] > div:nth-child(3) > div',
    );

    expect(innerBars).toHaveLength(3);
    expect(innerBars[0].style.width).toBe("95%");
    expect(innerBars[1].style.width).toBe("60%");
    expect(innerBars[2].style.width).toBe("30%");
  });

  it("shows empty state when no profile entries", async () => {
    mockGetProfile.mockResolvedValue([]);

    render(<ProfilePanel serverId="s1" server={mockServer} />);

    // Wait for loading to finish and empty state to appear
    await waitFor(() => {
      expect(screen.getByText("no profile data yet")).toBeInTheDocument();
    });

    expect(screen.getByTestId("profile-panel")).toBeInTheDocument();
  });

  it("shows error state", async () => {
    mockGetProfile.mockRejectedValue(new Error("Network error"));

    render(<ProfilePanel serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });

    // The panel testid is still present in error state
    expect(screen.getByTestId("profile-panel")).toBeInTheDocument();
  });

  it("sorts entries by confidence descending", async () => {
    mockGetProfile.mockResolvedValue([
      mockProfileEntry({
        id: "low",
        key: "low",
        value: "v",
        confidence: 0.3,
      }),
      mockProfileEntry({
        id: "high",
        key: "high",
        value: "v",
        confidence: 0.9,
      }),
      mockProfileEntry({
        id: "mid",
        key: "mid",
        value: "v",
        confidence: 0.5,
      }),
    ]);

    render(<ProfilePanel serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-entry-high")).toBeInTheDocument();
    });

    // Verify DOM order matches confidence descending: high (0.9), mid (0.5), low (0.3)
    const panel = screen.getByTestId("profile-panel");
    const entries = panel.querySelectorAll(
      '[data-testid^="profile-entry-"]',
    );

    expect(entries[0].getAttribute("data-testid")).toBe("profile-entry-high");
    expect(entries[1].getAttribute("data-testid")).toBe("profile-entry-mid");
    expect(entries[2].getAttribute("data-testid")).toBe("profile-entry-low");

    // Also verify percentages are in descending order
    const percentages = screen.getAllByText(/%/);
    expect(percentages).toHaveLength(3);
    expect(percentages[0].textContent).toBe("90%");
    expect(percentages[1].textContent).toBe("50%");
    expect(percentages[2].textContent).toBe("30%");
  });

  it("shows source memory link when sourceMemoryId exists", async () => {
    mockGetProfile.mockResolvedValue([
      mockProfileEntry({
        id: "e1",
        key: "preference",
        value: "dark mode",
        confidence: 0.85,
        sourceMemoryId: "mem-abc123456789",
      }),
    ]);

    render(<ProfilePanel serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-entry-e1")).toBeInTheDocument();
    });

    // "source:" prefix with truncated ID (first 8 chars)
    expect(screen.getByText(/source: mem-abc1/)).toBeInTheDocument();
  });

  it("omits source memory link when sourceMemoryId is absent", async () => {
    mockGetProfile.mockResolvedValue([
      mockProfileEntry({
        id: "e1",
        key: "preference",
        value: "dark mode",
        confidence: 0.85,
        // no sourceMemoryId
      }),
    ]);

    render(<ProfilePanel serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("profile-entry-e1")).toBeInTheDocument();
    });

    // "source:" should NOT be rendered
    expect(screen.queryByText(/source:/)).not.toBeInTheDocument();
  });
});
