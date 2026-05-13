/**
 * Tests for useMemoryExtraction hook.
 *
 * React's useEffect and useRef are mocked so effects can be driven
 * synchronously in the node test environment. Refs persist across simulated
 * re-renders, matching real React lifecycle behaviour.
 *
 * Mock state is kept inside the jest.mock factory to avoid TDZ issues with
 * module hoisting, and exposed via a __state accessor for test control.
 */

// ── Mocks (must be above imports) ────────────────────────────────────────────

jest.mock("react", () => {
  const state = {
    refs: [] as { current: any }[],
    effects: [] as Array<() => void | (() => void)>,
    refIdx: 0,
  };

  return {
    useEffect: (fn: () => void | (() => void), _deps?: any[]) => {
      state.effects.push(fn);
    },
    useRef: (init?: any) => {
      if (state.refIdx >= state.refs.length) {
        state.refs.push({ current: init });
      }
      return state.refs[state.refIdx++];
    },
    __state: state,
  };
});

jest.mock("../../store/memoryStore", () => ({
  useMemoryStore: jest.fn(),
}));

jest.mock("../../extraction/MemoryExtractor", () => ({
  MemoryExtractor: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { useMemoryExtraction } from "../useMemoryExtraction";
import { useMemoryStore } from "../../store/memoryStore";
import { MemoryExtractor } from "../../extraction/MemoryExtractor";
import type { MemoryConfig } from "../../db/schema";
import type { Turn } from "../../../../store/session";
import type { SessionStatus } from "../../../../services/types";

const MockMemoryExtractor = MemoryExtractor as jest.MockedClass<
  typeof MemoryExtractor
>;

// Access the hook state injected into the react mock
const reactMock = jest.requireMock("react") as {
  useEffect: (fn: () => void) => void;
  useRef: (init?: any) => { current: any };
  __state: {
    refs: { current: any }[];
    effects: Array<() => void | (() => void)>;
    refIdx: number;
  };
};

// ── Fixtures ─────────────────────────────────────────────────────────────────

const defaultConfig: MemoryConfig = {
  serverId: "srv-1",
  enabled: true,
  extractEnabled: true,
  injectEnabled: true,
  embeddingProvider: "ollama",
  embeddingModel: "nomic-embed-text",
  dedupThreshold: 0.92,
  topK: 5,
  maxMemories: 2000,
};

const mockTurn: Turn = {
  message: {
    id: "msg-1",
    sessionID: "sess-1",
    role: "user",
    time: { created: 1000 },
    parts: [],
  } as any,
  parts: [{ type: "text", text: "hello" } as any],
};

const mockClient = {} as any;

// ── Helpers ───────────────────────────────────────────────────────────────────

let mockSetExtracting: jest.Mock;
let mockAddMemories: jest.Mock;
let mockRefreshMemories: jest.Mock;

function setupStore(config: MemoryConfig | null) {
  mockSetExtracting = jest.fn();
  mockAddMemories = jest.fn();
  mockRefreshMemories = jest.fn().mockResolvedValue(undefined);

  (useMemoryStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: any) => any) =>
      selector({
        config,
        setExtracting: mockSetExtracting,
        addMemories: mockAddMemories,
        refreshMemories: mockRefreshMemories,
      }),
  );
}

/** Reset refs for a fresh component instance (first render). */
function resetAll() {
  reactMock.__state.refs.length = 0;
  reactMock.__state.effects.length = 0;
  reactMock.__state.refIdx = 0;
}

/**
 * Simulate a hook render. On re-renders, refs persist (refIdx is reset to 0
 * so the same objects are returned in order) but effects are re-registered.
 */
function simulateRender(opts: {
  client?: any;
  serverId?: string | null;
  serverUrl?: string;
  status?: SessionStatus;
  turns?: Turn[];
}) {
  reactMock.__state.refIdx = 0;
  reactMock.__state.effects.length = 0;
  useMemoryExtraction({
    client: opts.client !== undefined ? opts.client : mockClient,
    serverId: opts.serverId !== undefined ? opts.serverId : "srv-1",
    serverUrl: opts.serverUrl,
    status: opts.status ?? "idle",
    turns: opts.turns ?? [],
  });
}

/** Run all currently captured effects synchronously. */
function runEffects() {
  [...reactMock.__state.effects].forEach((fn) => fn());
}

/** Flush the microtask queue so async extraction completes. */
const flushPromises = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetAll();
  jest.clearAllMocks();
  setupStore(defaultConfig);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("extractor setup (first effect)", () => {
  it("creates MemoryExtractor when client and serverId are provided", () => {
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: jest.fn() }) as any,
    );
    simulateRender({
      client: mockClient,
      serverId: "srv-1",
      serverUrl: "http://localhost:4096",
    });
    runEffects();

    expect(MockMemoryExtractor).toHaveBeenCalledWith(
      mockClient,
      "srv-1",
      "http://localhost:4096",
    );
    // extractorRef.current should be truthy (refs[0] is the extractorRef)
    expect(reactMock.__state.refs[0]?.current).toBeTruthy();
  });

  it("sets extractorRef to null when client is null", () => {
    simulateRender({ client: null, serverId: "srv-1" });
    runEffects();

    expect(MockMemoryExtractor).not.toHaveBeenCalled();
    expect(reactMock.__state.refs[0]?.current).toBeNull();
  });

  it("sets extractorRef to null when serverId is null", () => {
    simulateRender({ client: mockClient, serverId: null });
    runEffects();

    expect(MockMemoryExtractor).not.toHaveBeenCalled();
    expect(reactMock.__state.refs[0]?.current).toBeNull();
  });

  it("sets extractorRef to null when both client and serverId are null", () => {
    simulateRender({ client: null, serverId: null });
    runEffects();

    expect(MockMemoryExtractor).not.toHaveBeenCalled();
    expect(reactMock.__state.refs[0]?.current).toBeNull();
  });
});

describe("busy→idle extraction trigger", () => {
  it("triggers extraction when status transitions from busy to idle", async () => {
    const mockMemoryResult = {
      id: "new-m",
      serverId: "srv-1",
      content: "learned something",
      category: "fact" as const,
      confidence: 0.9,
      tags: [],
      isPinned: false,
      isArchived: false,
      createdAt: 1000,
      updatedAt: 1000,
    };
    const mockExtract = jest.fn().mockResolvedValue([mockMemoryResult]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    // Render 1: busy — sets up extractor, prevStatusRef becomes 'busy'
    simulateRender({ status: "busy", turns: [mockTurn] });
    runEffects();

    // Render 2: idle — wasActive=true, status=idle → triggers extraction
    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockSetExtracting).toHaveBeenCalledWith(true);
    expect(mockExtract).toHaveBeenCalledWith([mockTurn], defaultConfig);
    expect(mockAddMemories).toHaveBeenCalledWith([mockMemoryResult]);
    expect(mockSetExtracting).toHaveBeenCalledWith(false);
    expect(mockRefreshMemories).toHaveBeenCalled();
  });

  it("does not trigger extraction when status stays idle", async () => {
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();
    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockSetExtracting).not.toHaveBeenCalled();
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("does not trigger extraction on idle→busy transition", async () => {
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "idle", turns: [] });
    runEffects();
    simulateRender({ status: "busy", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockExtract).not.toHaveBeenCalled();
    expect(mockSetExtracting).not.toHaveBeenCalled();
  });

  it("does not trigger extraction on initial render with idle status", async () => {
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    // First render starts with prevStatusRef='idle', wasActive = false → skip
    expect(mockExtract).not.toHaveBeenCalled();
  });
});

describe("config guards", () => {
  it("skips extraction when config is null", async () => {
    setupStore(null);
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "busy", turns: [mockTurn] });
    runEffects();
    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("skips extraction when config.enabled is false", async () => {
    setupStore({ ...defaultConfig, enabled: false });
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "busy", turns: [mockTurn] });
    runEffects();
    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockExtract).not.toHaveBeenCalled();
  });

  it("skips extraction when config.extractEnabled is false", async () => {
    setupStore({ ...defaultConfig, extractEnabled: false });
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "busy", turns: [mockTurn] });
    runEffects();
    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockExtract).not.toHaveBeenCalled();
  });
});

describe("empty turns guard", () => {
  it("skips extraction when turns array is empty on busy→idle", async () => {
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "busy", turns: [] });
    runEffects();
    simulateRender({ status: "idle", turns: [] });
    runEffects();

    await flushPromises();

    expect(mockExtract).not.toHaveBeenCalled();
  });
});

describe("error handling", () => {
  it("calls setExtracting(false) in finally even when extraction throws", async () => {
    const mockExtract = jest.fn().mockRejectedValue(new Error("network fail"));
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "busy", turns: [mockTurn] });
    runEffects();
    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockSetExtracting).toHaveBeenCalledWith(true);
    expect(mockSetExtracting).toHaveBeenCalledWith(false);
    expect(mockAddMemories).not.toHaveBeenCalled();
    expect(mockRefreshMemories).toHaveBeenCalled();
  });

  it("calls refreshMemories in finally when extraction succeeds", async () => {
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "busy", turns: [mockTurn] });
    runEffects();
    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockRefreshMemories).toHaveBeenCalled();
    expect(mockSetExtracting).toHaveBeenCalledWith(false);
  });

  it("does not call addMemories when extraction returns empty array", async () => {
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    simulateRender({ status: "busy", turns: [mockTurn] });
    runEffects();
    simulateRender({ status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockSetExtracting).toHaveBeenCalledWith(true);
    expect(mockAddMemories).not.toHaveBeenCalled();
    expect(mockSetExtracting).toHaveBeenCalledWith(false);
  });
});

describe("no extractor guard", () => {
  it("skips extraction when no client is set (extractorRef is null)", async () => {
    const mockExtract = jest.fn().mockResolvedValue([]);
    MockMemoryExtractor.mockImplementation(
      () => ({ extract: mockExtract }) as any,
    );

    // First render: client=null so extractor is never set
    simulateRender({ client: null, status: "busy", turns: [mockTurn] });
    runEffects();
    simulateRender({ client: null, status: "idle", turns: [mockTurn] });
    runEffects();

    await flushPromises();

    expect(mockExtract).not.toHaveBeenCalled();
    expect(mockSetExtracting).not.toHaveBeenCalled();
  });
});
