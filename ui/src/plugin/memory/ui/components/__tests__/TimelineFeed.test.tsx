/**
 * Tests for the TimelineFeed component.
 *
 * Uses @testing-library/react for DOM rendering because the component
 * manages internal state via hooks (useState, useEffect, useCallback).
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { createMemoryApi } from "../../../../../services/memoryApi";
import type { ServerConfig } from "../../../../../services/auth";
import type { TimelineEvent } from "../../../db/schema";
import { TimelineFeed } from "../TimelineFeed";

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock("../../../../../services/memoryApi");
const mockGetTimeline = jest.fn();
(createMemoryApi as jest.Mock).mockReturnValue({
  getTimeline: mockGetTimeline,
});

// ── Fixtures ───────────────────────────────────────────────────────────────────

const mockServer: ServerConfig = {
  id: "test-server",
  name: "Test Server",
  url: "http://localhost:9999",
};

function mockTimelineEvent(
  overrides: Partial<TimelineEvent> = {},
): TimelineEvent {
  return {
    id: "evt-1",
    serverId: "s1",
    eventType: "memory_created",
    payload: { key: "value" },
    createdAt: Date.now() - 60_000, // 1 minute ago
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("TimelineFeed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading spinner initially", async () => {
    // Return a pending promise so the component stays in loading state
    mockGetTimeline.mockReturnValue(new Promise(() => {}));

    render(<TimelineFeed serverId="s1" server={mockServer} />);

    expect(screen.getByTestId("timeline-loading")).toBeInTheDocument();
    expect(screen.getByText("loading timeline\u2026")).toBeInTheDocument();
  });

  it("renders timeline events after loading", async () => {
    mockGetTimeline.mockResolvedValue([
      mockTimelineEvent({
        id: "evt-1",
        eventType: "prompt_sent",
        payload: { query: "hello" },
        createdAt: Date.now() - 30_000,
      }),
      mockTimelineEvent({
        id: "evt-2",
        eventType: "response_received",
        payload: { text: "hi" },
        createdAt: Date.now() - 120_000,
      }),
    ]);

    render(<TimelineFeed serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("timeline-feed")).toBeInTheDocument();
    });

    // Event rows rendered
    expect(screen.getByTestId("timeline-event-evt-1")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-event-evt-2")).toBeInTheDocument();

    // Event type labels
    expect(screen.getByText("prompt")).toBeInTheDocument();
    expect(screen.getByText("response")).toBeInTheDocument();

    // Relative time (any variant like "30s ago" or "2m ago")
    const timeTexts = screen.getAllByText(/ago/);
    expect(timeTexts.length).toBeGreaterThanOrEqual(2);
  });

  it("shows empty state when no events", async () => {
    mockGetTimeline.mockResolvedValue([]);

    render(<TimelineFeed serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("timeline-empty")).toBeInTheDocument();
    });

    expect(screen.getByText("no timeline events yet")).toBeInTheDocument();
  });

  it("shows error state and retry button", async () => {
    mockGetTimeline.mockRejectedValue(new Error("Network error"));

    render(<TimelineFeed serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("timeline-error")).toBeInTheDocument();
    });

    expect(screen.getByText("Network error")).toBeInTheDocument();

    const retryBtn = screen.getByTestId("timeline-retry");
    expect(retryBtn).toBeInTheDocument();

    // Reset mock and click retry — should call getTimeline from scratch
    mockGetTimeline.mockClear();
    // Use a fresh pending promise so the component re-enters loading
    mockGetTimeline.mockReturnValue(new Promise(() => {}));

    fireEvent.click(retryBtn);

    expect(mockGetTimeline).toHaveBeenCalledTimes(1);
    expect(mockGetTimeline).toHaveBeenCalledWith("s1", {
      limit: 20,
      offset: 0,
    });
  });

  it("shows load more button and paginates", async () => {
    // First page: exactly PAGE_SIZE (20) events → hasMore = true
    const firstPage = Array.from({ length: 20 }, (_, i) =>
      mockTimelineEvent({
        id: `evt-${i}`,
        createdAt: Date.now() - i * 60_000,
      }),
    );
    mockGetTimeline.mockResolvedValueOnce(firstPage);

    render(<TimelineFeed serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("timeline-feed")).toBeInTheDocument();
    });

    // "Load more" button should be visible
    const loadMoreBtn = screen.getByTestId("timeline-load-more");
    expect(loadMoreBtn).toBeInTheDocument();
    expect(screen.getByText("load more")).toBeInTheDocument();

    // Second page: fewer events → hasMore = false after
    const secondPage = Array.from({ length: 5 }, (_, i) =>
      mockTimelineEvent({
        id: `evt-page2-${i}`,
        createdAt: Date.now() - (20 + i) * 60_000,
      }),
    );
    mockGetTimeline.mockResolvedValueOnce(secondPage);

    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      // getTimeline called twice total (initial + load more)
      expect(mockGetTimeline).toHaveBeenCalledTimes(2);
    });

    // Second call uses offset based on accumulated length
    expect(mockGetTimeline).toHaveBeenLastCalledWith("s1", {
      limit: 20,
      offset: 20,
    });
  });

  it("renders correct event type labels for all types", async () => {
    mockGetTimeline.mockResolvedValue([
      mockTimelineEvent({ id: "evt-prompt", eventType: "prompt_sent" }),
      mockTimelineEvent({
        id: "evt-response",
        eventType: "response_received",
      }),
      mockTimelineEvent({
        id: "evt-extracted",
        eventType: "memory_extracted",
      }),
      mockTimelineEvent({
        id: "evt-injected",
        eventType: "memory_injected",
      }),
      mockTimelineEvent({
        id: "evt-created",
        eventType: "memory_created",
      }),
      mockTimelineEvent({
        id: "evt-dedup",
        eventType: "memory_deduplicated",
      }),
    ]);

    render(<TimelineFeed serverId="s1" server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByTestId("timeline-feed")).toBeInTheDocument();
    });

    // Each event type has a distinct label
    expect(screen.getByText("prompt")).toBeInTheDocument();
    expect(screen.getByText("response")).toBeInTheDocument();
    expect(screen.getByText("extracted")).toBeInTheDocument();
    expect(screen.getByText("injected")).toBeInTheDocument();
    expect(screen.getByText("created")).toBeInTheDocument();
    expect(screen.getByText("dedup")).toBeInTheDocument();

    // Each event row rendered with correct testid
    expect(
      screen.getByTestId("timeline-event-evt-prompt"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("timeline-event-evt-dedup"),
    ).toBeInTheDocument();
  });
});
