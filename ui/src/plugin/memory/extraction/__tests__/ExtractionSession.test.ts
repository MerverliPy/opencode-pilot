/**
 * Tests for ExtractionSession.
 *
 * Polling is tested with jest.useFakeTimers() and advanceTimersByTimeAsync.
 */

// ── Mock client shared across all tests ──────────────────────────────────────
const mockClient = {
  createSession: jest.fn(),
  getSession: jest.fn(),
  promptAsync: jest.fn(),
  sessionStatus: jest.fn(),
  listMessages: jest.fn(),
};

jest.mock("../../../../services/api", () => ({
  OpencodeClient: jest.fn().mockImplementation(() => mockClient),
}));

import { ExtractionSession } from "../ExtractionSession";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMessage(
  role: "user" | "assistant" | "system",
  text: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    info: { role, ...overrides },
    parts: [{ type: "text", text }],
  };
}

const shadowSession = {
  id: "shadow-1",
  title: "(memory extraction — do not use)",
};

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default happy-path mocks
  mockClient.createSession.mockResolvedValue(shadowSession);
  mockClient.getSession.mockResolvedValue(shadowSession);
  mockClient.promptAsync.mockResolvedValue(undefined);
  mockClient.sessionStatus.mockResolvedValue({ "shadow-1": "idle" });
  mockClient.listMessages.mockResolvedValue([
    makeMessage("user", "test"),
    makeMessage("assistant", "Final response"),
  ]);
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("getOrCreateSessionId", () => {
  it("creates a new session when sessionId is null", async () => {
    const session = new ExtractionSession(mockClient as any);
    const id = await session.getOrCreateSessionId();

    expect(id).toBe("shadow-1");
    expect(mockClient.createSession).toHaveBeenCalledWith({
      title: "(memory extraction — do not use)",
    });
    // getSession should NOT be called for a fresh session
    expect(mockClient.getSession).not.toHaveBeenCalled();
  });

  it("reuses an existing valid session", async () => {
    const session = new ExtractionSession(mockClient as any);
    // First call creates the session
    await session.getOrCreateSessionId();
    expect(mockClient.createSession).toHaveBeenCalledTimes(1);

    // Second call should reuse it
    const id = await session.getOrCreateSessionId();
    expect(id).toBe("shadow-1");
    expect(mockClient.createSession).toHaveBeenCalledTimes(1); // not called again
    expect(mockClient.getSession).toHaveBeenCalledWith("shadow-1");
  });

  it("recreates session when getSession throws", async () => {
    const session = new ExtractionSession(mockClient as any);
    // First call creates the session
    await session.getOrCreateSessionId();

    // Second call: getSession throws → should recreate
    mockClient.getSession.mockRejectedValueOnce(new Error("session gone"));
    mockClient.createSession.mockResolvedValueOnce({ id: "shadow-2" });

    const id = await session.getOrCreateSessionId();
    expect(id).toBe("shadow-2");
    expect(mockClient.createSession).toHaveBeenCalledTimes(2);
  });
});

describe("sendAndWait", () => {
  it("sends a prompt and polls until idle, returning the last assistant message", async () => {
    jest.useFakeTimers();

    const session = new ExtractionSession(mockClient as any);

    // First poll returns busy, second returns idle
    mockClient.sessionStatus
      .mockResolvedValueOnce({ "shadow-1": "busy" })
      .mockResolvedValue({ "shadow-1": "idle" });

    // Start the async operation
    const promise = session.sendAndWait("test prompt");

    // Advance past the first sleep(600) → busy, loop continues
    await jest.advanceTimersByTimeAsync(600);
    // Advance past the second sleep(600) → idle, loop breaks
    await jest.advanceTimersByTimeAsync(600);

    const result = await promise;

    expect(result).toBe("Final response");
    expect(mockClient.promptAsync).toHaveBeenCalledWith(
      "shadow-1",
      expect.objectContaining({
        parts: [{ type: "text", text: "test prompt" }],
      }),
    );
    expect(mockClient.sessionStatus).toHaveBeenCalled();
    expect(mockClient.listMessages).toHaveBeenCalledWith("shadow-1");
  });

  it("returns empty string when no assistant message exists", async () => {
    jest.useFakeTimers();

    // Only user messages, no assistant
    mockClient.listMessages.mockResolvedValue([makeMessage("user", "hello")]);

    const session = new ExtractionSession(mockClient as any);
    const promise = session.sendAndWait("prompt");

    await jest.advanceTimersByTimeAsync(600);
    const result = await promise;

    expect(result).toBe("");
  });

  it("respects the timeout and still returns messages", async () => {
    jest.useFakeTimers();

    // Always busy — will time out
    mockClient.sessionStatus.mockResolvedValue({ "shadow-1": "busy" });

    // Use a short timeout for testing
    const session = new ExtractionSession(mockClient as any);
    const promise = session.sendAndWait("prompt", { timeoutMs: 2000 });

    // Advance past the deadline (2000ms in 600ms steps = 4 steps)
    await jest.advanceTimersByTimeAsync(2400);

    const result = await promise;
    expect(result).toBe("Final response");
    expect(mockClient.listMessages).toHaveBeenCalled();
  });

  it("stops polling on error status", async () => {
    jest.useFakeTimers();

    mockClient.sessionStatus.mockResolvedValueOnce({ "shadow-1": "busy" });
    mockClient.sessionStatus.mockResolvedValueOnce({ "shadow-1": "error" });

    const session = new ExtractionSession(mockClient as any);
    const promise = session.sendAndWait("prompt");

    await jest.advanceTimersByTimeAsync(600); // first poll → busy
    await jest.advanceTimersByTimeAsync(600); // second poll → error → break

    const result = await promise;
    expect(result).toBe("Final response");
  });

  it("handles transient sessionStatus errors gracefully", async () => {
    jest.useFakeTimers();

    // First call throws, second returns idle
    mockClient.sessionStatus
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValue({ "shadow-1": "idle" });

    const session = new ExtractionSession(mockClient as any);
    const promise = session.sendAndWait("prompt");

    await jest.advanceTimersByTimeAsync(600); // throws → caught, loop continues
    await jest.advanceTimersByTimeAsync(600); // idle → break

    const result = await promise;
    expect(result).toBe("Final response");
  });
});

describe("reset", () => {
  it("clears the sessionId so the next call creates a fresh session", async () => {
    const session = new ExtractionSession(mockClient as any);
    await session.getOrCreateSessionId();
    expect(mockClient.createSession).toHaveBeenCalledTimes(1);

    session.reset();
    await session.getOrCreateSessionId();
    expect(mockClient.createSession).toHaveBeenCalledTimes(2);
  });
});
