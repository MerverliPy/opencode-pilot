import { useEventStream } from "@/services/sse";
import type { ServerConfig } from "@/services/auth";

jest.mock("react-native-sse");

jest.mock("@/services/logger", () => ({
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
  let listeners: Record<string, Function[]>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    effectCallbacks = [];
    listeners = {};

    mockEventSource = {
      addEventListener: jest.fn((event: string, handler: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(handler);
      }),
      removeEventListener: jest.fn(),
      close: jest.fn(),
    };

    const EventSource = require("react-native-sse").default;
    EventSource.mockImplementation(() => mockEventSource);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const emit = (event: string, data: any) => {
    (listeners[event] ?? []).forEach((h) => h(data));
  };

  it("returns early when server is null", () => {
    const onEvent = jest.fn();
    const EventSource = require("react-native-sse").default;
    useEventStream(null, onEvent);
    expect(EventSource).not.toHaveBeenCalled();
  });

  it("connects to /event with stripped trailing slash", () => {
    const onEvent = jest.fn();
    const EventSource = require("react-native-sse").default;
    useEventStream({ ...server, url: "http://host/" }, onEvent);
    expect(EventSource).toHaveBeenCalledWith(
      "http://host/event",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
        pollingInterval: 0,
      }),
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
    const { log } = require("@/services/logger");
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

    emit("error", {});
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("logs reconnect with backoff on error", () => {
    const onEvent = jest.fn();
    const { log } = require("@/services/logger");
    useEventStream(server, onEvent);

    emit("error", {});
    expect(log.warn).toHaveBeenCalledWith(
      "sse",
      expect.stringContaining("reconnecting"),
    );
  });

  it("resets backoff on successful open", () => {
    const onEvent = jest.fn();
    useEventStream(server, onEvent);

    emit("open", {});
    const { log } = require("@/services/logger");
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
    const EventSource = require("react-native-sse").default;
    useEventStream(server, onEvent);
    const cleanup = effectCallbacks[0]?.cleanup;
    if (cleanup) cleanup();

    const callCount = EventSource.mock.calls.length;
    jest.advanceTimersByTime(10_000);
    expect(EventSource).toHaveBeenCalledTimes(callCount);
  });
});
