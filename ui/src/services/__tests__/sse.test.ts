/**
 * Tests for the SSE client (fetch + ReadableStream implementation).
 *
 * The implementation in sse.ts uses `fetch` + `ReadableStream` + async
 * generator (`readSSEEvents`) instead of native `EventSource` so it can
 * send `Authorization: Bearer` headers for protected Pilot servers.
 */
import { useEventStream } from "../sse";
import type { ServerConfig } from "../auth";

jest.mock("../logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Track useEffect callbacks and cleanups
let effectCallbacks: Array<{ callback: Function; cleanup?: Function }> = [];

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useEffect: (callback: Function, _deps: any[]) => {
    effectCallbacks.push({ callback });
    const cleanup = callback();
    if (cleanup) {
      effectCallbacks[effectCallbacks.length - 1].cleanup = cleanup;
    }
  },
  useRef: (value: any) => ({ current: value }),
}));

/** Encode a string as a Uint8Array chunk for ReadableStream simulation. */
const encoder = new TextEncoder();
function chunk(s: string): Uint8Array {
  return encoder.encode(s);
}

/** Flush all pending microtasks. The async generator in sse.ts involves
 *  multiple `await` boundaries (fetch → reader.read → yield → read again)
 *  so 2 Promise.resolve() calls aren't enough. */
async function flush(): Promise<void> {
  // Each tick advances one microtask boundary; 5 covers fetch + read + yield
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

interface MockReader {
  read: () => Promise<{ done: boolean; value?: Uint8Array }>;
  releaseLock: jest.Mock;
}

interface MockResponse {
  ok: boolean;
  status: number;
  body: { getReader: () => MockReader };
}

/**
 * Create a mock fetch that returns a successful SSE response streaming
 * the given data chunks in sequence.
 */
function mockSSEStream(chunks: string[], status = 200): jest.Mock {
  let index = 0;
  const releaseLock = jest.fn();

  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    body: {
      getReader: () => ({
        read: jest
          .fn()
          .mockImplementation(() => {
            if (index >= chunks.length) {
              return Promise.resolve({ done: true, value: undefined });
            }
            return Promise.resolve({ done: false, value: chunk(chunks[index++]) });
          }),
        releaseLock,
      }),
    },
  } as MockResponse);
}

/** Create a mock fetch that rejects with an error. */
function mockFetchRejects(error: Error): jest.Mock {
  return jest.fn().mockRejectedValue(error);
}

/** Create a mock fetch that returns a non-ok response (no body). */
function mockFetchErrorStatus(status: number): jest.Mock {
  return jest.fn().mockResolvedValue({
    ok: false,
    status,
    body: null,
  } as unknown as MockResponse);
}

/** SSE data framing helper. */
function sseData(json: unknown): string {
  return "data: " + JSON.stringify(json) + "\n\n";
}

describe("useEventStream", () => {
  const server: ServerConfig = {
    id: "s1",
    name: "Home",
    url: "http://localhost:4096",
    username: "alice",
    password: "secret",
  };

  const serverWithToken: ServerConfig = {
    ...server,
    authToken: "pilot-secret-token",
  };

  let mockAbort: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    effectCallbacks = [];
    mockAbort = jest.fn();
    (global as any).AbortController = jest.fn(() => ({
      signal: { aborted: false },
      abort: mockAbort,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).fetch;
    delete (global as any).AbortController;
  });

  // ── null server ──────────────────────────────────────────────────────

  it("returns early when server is null", () => {
    (global as any).fetch = jest.fn();
    useEventStream(null, jest.fn());
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  // ── URL construction ─────────────────────────────────────────────────

  it("connects to /event with stripped trailing slash", () => {
    (global as any).fetch = mockSSEStream([]);
    useEventStream({ ...server, url: "http://host/" }, jest.fn());
    expect((global as any).fetch).toHaveBeenCalledWith(
      "http://host/event",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "text/event-stream" }),
        signal: expect.any(Object),
      }),
    );
  });

  // ── Auth header ──────────────────────────────────────────────────────

  it("sends Authorization header when authToken is set", () => {
    (global as any).fetch = mockSSEStream([]);
    useEventStream(serverWithToken, jest.fn());
    expect((global as any).fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${serverWithToken.authToken}`,
        }),
      }),
    );
  });

  it("does not send Authorization header when authToken is unset", () => {
    (global as any).fetch = mockSSEStream([]);
    useEventStream(server, jest.fn());
    const callArgs = ((global as any).fetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBeUndefined();
  });

  // ── Event dispatch (happy path) ──────────────────────────────────────

  it("dispatches parsed message events", async () => {
    const onEvent = jest.fn();
    (global as any).fetch = mockSSEStream([sseData({ type: "ping" })]);
    useEventStream(server, onEvent);

    await flush();

    expect(onEvent).toHaveBeenCalledWith({ type: "ping" });
  });

  it("dispatches multiple events from a single chunk", async () => {
    const onEvent = jest.fn();
    const multi = sseData({ type: "a" }) + sseData({ type: "b" });
    (global as any).fetch = mockSSEStream([multi]);
    useEventStream(server, onEvent);

    await flush();

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenCalledWith({ type: "a" });
    expect(onEvent).toHaveBeenCalledWith({ type: "b" });
  });

  it("handles events split across chunk boundaries", async () => {
    const onEvent = jest.fn();
    const json = JSON.stringify({ type: "split" });
    const part1 = "data: " + json.slice(0, 10);
    const part2 = json.slice(10) + "\n\n";
    (global as any).fetch = mockSSEStream([part1, part2]);
    useEventStream(server, onEvent);

    await flush();

    expect(onEvent).toHaveBeenCalledWith({ type: "split" });
  });

  // ── Malformed data ───────────────────────────────────────────────────

  it("warns on malformed JSON", async () => {
    const onEvent = jest.fn();
    const { log } = require("../logger");
    (global as any).fetch = mockSSEStream(["data: not-json\n\n"]);
    useEventStream(server, onEvent);

    await flush();

    expect(onEvent).not.toHaveBeenCalled();
    // Third arg is the raw data slice
    expect(log.warn).toHaveBeenCalledWith(
      "sse",
      expect.stringContaining("malformed event"),
      expect.any(String),
    );
  });

  it("ignores [DONE] marker", async () => {
    const onEvent = jest.fn();
    (global as any).fetch = mockSSEStream(["data: [DONE]\n\n"]);
    useEventStream(server, onEvent);

    await flush();

    expect(onEvent).not.toHaveBeenCalled();
  });

  it("ignores lines without data prefix", async () => {
    const onEvent = jest.fn();
    (global as any).fetch = mockSSEStream(["event: ping\n\n"]);
    useEventStream(server, onEvent);

    await flush();

    expect(onEvent).not.toHaveBeenCalled();
  });

  // ── Auth rejection (401 / 403) ───────────────────────────────────────

  it("logs error and stops on 401", async () => {
    const onEvent = jest.fn();
    const { log } = require("../logger");
    (global as any).fetch = mockFetchErrorStatus(401);

    useEventStream(serverWithToken, onEvent);
    await flush();

    expect(onEvent).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalledWith(
      "sse",
      expect.stringContaining("auth rejected"),
    );
  });

  it("logs error and stops on 403", async () => {
    const onEvent = jest.fn();
    const { log } = require("../logger");
    (global as any).fetch = mockFetchErrorStatus(403);

    useEventStream(serverWithToken, onEvent);
    await flush();

    expect(log.error).toHaveBeenCalledWith(
      "sse",
      expect.stringContaining("auth rejected"),
    );
  });

  // ── Reconnection ─────────────────────────────────────────────────────

  it("connects successfully and resets backoff", async () => {
    const onEvent = jest.fn();
    const { log } = require("../logger");
    (global as any).fetch = mockSSEStream([sseData({ type: "hello" })]);

    useEventStream(server, onEvent);
    await flush();

    expect(log.info).toHaveBeenCalledWith(
      "sse",
      expect.stringContaining("connected"),
    );
    expect(onEvent).toHaveBeenCalledWith({ type: "hello" });
  });

  it("reconnects after stream ends", async () => {
    const onEvent = jest.fn();
    (global as any).fetch = mockSSEStream([sseData({ type: "first" })]);

    useEventStream(server, onEvent);
    await flush();

    expect(onEvent).toHaveBeenCalledWith({ type: "first" });

    // Stream ended — reconnect should be scheduled
    jest.advanceTimersByTime(2000); // past initial 500ms backoff
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
  });

  // ── Cleanup ──────────────────────────────────────────────────────────

  it("aborts fetch on cleanup", () => {
    (global as any).fetch = mockSSEStream([]);
    useEventStream(server, jest.fn());

    const cleanup = effectCallbacks[0]?.cleanup;
    expect(cleanup).toBeDefined();
    cleanup!();

    expect(mockAbort).toHaveBeenCalled();
  });

  it("does not reconnect after cleanup", async () => {
    (global as any).fetch = mockSSEStream([sseData({ type: "ok" })]);
    useEventStream(server, jest.fn());

    await flush();

    const fetchCalls = ((global as any).fetch as jest.Mock).mock.calls.length;

    // Cleanup and advance past any backoff
    const cleanup = effectCallbacks[0]?.cleanup;
    cleanup!();
    jest.advanceTimersByTime(30_000);

    expect((global as any).fetch).toHaveBeenCalledTimes(fetchCalls);
  });
});
