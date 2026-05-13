import { useEventStream } from "../sse";
import type { ServerConfig } from "../auth";

jest.mock("../logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
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

describe("useEventStream", () => {
  const server: ServerConfig = {
    id: "s1",
    name: "Home",
    url: "http://localhost:4096",
    username: "alice",
    password: "secret",
  };

  let mockEventSource: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    effectCallbacks = [];

    // Create a mock EventSource instance that sse.ts will receive
    mockEventSource = {
      onopen: null as Function | null,
      onmessage: null as Function | null,
      onerror: null as Function | null,
      close: jest.fn(),
    };

    // Install a jest constructor so `new EventSource(url)` returns mockEventSource
    (global as any).EventSource = jest.fn(() => mockEventSource);
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (global as any).EventSource;
  });

  /** Trigger an on* callback the way the browser would */
  const emit = (event: "open" | "message" | "error", data?: any) => {
    const handler = mockEventSource[`on${event}`] as Function | null;
    if (handler) handler(data ?? {});
  };

  it("returns early when server is null", () => {
    const onEvent = jest.fn();
    useEventStream(null, onEvent);
    expect((global as any).EventSource).not.toHaveBeenCalled();
  });

  it("connects to /event with stripped trailing slash", () => {
    const onEvent = jest.fn();
    useEventStream({ ...server, url: "http://host/" }, onEvent);
    expect((global as any).EventSource).toHaveBeenCalledWith(
      "http://host/event",
    );
  });

  it("dispatches parsed message events", () => {
    const onEvent = jest.fn();
    useEventStream(server, onEvent);
    emit("message", { data: JSON.stringify({ type: "ping" }) });
    expect(onEvent).toHaveBeenCalledWith({ type: "ping" });
  });

  it("warns on malformed JSON", () => {
    const onEvent = jest.fn();
    const { log } = require("../logger");
    useEventStream(server, onEvent);
    emit("message", { data: "not json" });
    expect(onEvent).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  it("ignores empty message data", () => {
    const onEvent = jest.fn();
    useEventStream(server, onEvent);
    emit("message", { data: null });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("closes connection on error", () => {
    const onEvent = jest.fn();
    useEventStream(server, onEvent);
    emit("error");
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("logs reconnect with backoff on error", () => {
    const onEvent = jest.fn();
    const { log } = require("../logger");
    useEventStream(server, onEvent);
    emit("error");
    expect(log.warn).toHaveBeenCalledWith(
      "sse",
      expect.stringContaining("reconnecting"),
    );
  });

  it("resets backoff on successful open", () => {
    const onEvent = jest.fn();
    useEventStream(server, onEvent);
    emit("open");
    const { log } = require("../logger");
    expect(log.info).toHaveBeenCalledWith("sse", expect.any(String));
  });

  it("closes connection on cleanup", () => {
    const onEvent = jest.fn();
    useEventStream(server, onEvent);
    const cleanup = effectCallbacks[0]?.cleanup;
    if (cleanup) cleanup();
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("does not reconnect after cleanup", () => {
    const onEvent = jest.fn();
    useEventStream(server, onEvent);
    const cleanup = effectCallbacks[0]?.cleanup;
    if (cleanup) cleanup();

    const callCount = ((global as any).EventSource as jest.Mock).mock.calls
      .length;
    jest.advanceTimersByTime(10_000);
    expect((global as any).EventSource).toHaveBeenCalledTimes(callCount);
  });
});
