/**
 * Tests for the memory Zustand store (M5 rewrite — HTTP API).
 */
import { useMemoryStore } from "../memoryStore";
import type { Memory, MemoryConfig } from "../../db/schema";
import type { ServerConfig } from "../../../../services/auth";

// ── Mock the memory API service ───────────────────────────────────────────────

const mockApi = {
  listMemories: jest.fn(),
  getConfig: jest.fn(),
  saveConfig: jest.fn(),
  deleteMemory: jest.fn(),
  updateMemory: jest.fn(),
};

jest.mock("../../../../services/memoryApi", () => ({
  createMemoryApi: jest.fn(() => mockApi),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockServer: ServerConfig = {
  id: "srv-1",
  name: "Test Server",
  url: "http://localhost:3000",
};

const mockMemory = (overrides: Partial<Memory> = {}): Memory => ({
  id: "m1",
  serverId: "srv-1",
  content: "User prefers TypeScript",
  category: "preference",
  confidence: 0.95,
  tags: ["language"],
  sourceSessionId: undefined,
  sourceMessageId: undefined,
  isPinned: false,
  isArchived: false,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

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

const initialState = {
  memories: [],
  memoryCount: 0,
  config: null,
  isExtracting: false,
  loadedServerId: null,
};

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useMemoryStore.setState(initialState);
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("default state", () => {
  it("has the expected initial state", () => {
    const s = useMemoryStore.getState();
    expect(s.memories).toEqual([]);
    expect(s.memoryCount).toBe(0);
    expect(s.config).toBeNull();
    expect(s.isExtracting).toBe(false);
    expect(s.loadedServerId).toBeNull();
  });
});

describe("loadForServer", () => {
  it("loads memories, config, and count for the given server", async () => {
    const memories = [mockMemory()];
    mockApi.listMemories.mockResolvedValue({ memories, count: 1 });
    mockApi.getConfig.mockResolvedValue(defaultConfig);

    await useMemoryStore.getState().loadForServer("srv-1", mockServer);

    const s = useMemoryStore.getState();
    expect(s.memories).toEqual(memories);
    expect(s.config).toEqual(defaultConfig);
    expect(s.memoryCount).toBe(1);
    expect(s.loadedServerId).toBe("srv-1");

    expect(mockApi.listMemories).toHaveBeenCalledWith("srv-1");
    expect(mockApi.getConfig).toHaveBeenCalledWith("srv-1");
  });
});

describe("refreshMemories", () => {
  it("reloads memories and count without changing serverId", async () => {
    useMemoryStore.setState({ loadedServerId: "srv-1" });

    const memories = [mockMemory({ id: "m2", content: "Refreshed memory" })];
    mockApi.listMemories.mockResolvedValue({ memories, count: 1 });

    await useMemoryStore.getState().refreshMemories(mockServer);

    const s = useMemoryStore.getState();
    expect(s.memories).toEqual(memories);
    expect(s.memoryCount).toBe(1);
    expect(s.loadedServerId).toBe("srv-1"); // unchanged
  });

  it("does nothing when loadedServerId is null", async () => {
    useMemoryStore.setState({ loadedServerId: null });
    await useMemoryStore.getState().refreshMemories(mockServer);

    expect(mockApi.listMemories).not.toHaveBeenCalled();
  });
});

describe("loadConfig", () => {
  it("loads config from server, updates store, and returns it", async () => {
    mockApi.getConfig.mockResolvedValue(defaultConfig);

    const result = await useMemoryStore
      .getState()
      .loadConfig("srv-1", mockServer);

    expect(result).toEqual(defaultConfig);
    expect(useMemoryStore.getState().config).toEqual(defaultConfig);
    expect(mockApi.getConfig).toHaveBeenCalledWith("srv-1");
  });
});

describe("saveConfig", () => {
  it("persists config to server and updates store", async () => {
    mockApi.saveConfig.mockResolvedValue(defaultConfig);

    await useMemoryStore.getState().saveConfig(defaultConfig, mockServer);

    expect(mockApi.saveConfig).toHaveBeenCalledWith("srv-1", defaultConfig);
    expect(useMemoryStore.getState().config).toEqual(defaultConfig);
  });
});

describe("addMemories", () => {
  it("prepends new memories and increments memoryCount", () => {
    useMemoryStore.setState({
      memories: [mockMemory({ id: "existing" })],
      memoryCount: 1,
    });

    const newMemories = [
      mockMemory({ id: "new1", content: "New memory 1" }),
      mockMemory({ id: "new2", content: "New memory 2" }),
    ];
    useMemoryStore.getState().addMemories(newMemories);

    const s = useMemoryStore.getState();
    expect(s.memories).toHaveLength(3);
    expect(s.memories[0].id).toBe("new1");
    expect(s.memories[1].id).toBe("new2");
    expect(s.memories[2].id).toBe("existing");
    expect(s.memoryCount).toBe(3);
  });
});

describe("deleteMemory", () => {
  it("removes the memory from list and decrements count", async () => {
    useMemoryStore.setState({
      memories: [mockMemory({ id: "keep" }), mockMemory({ id: "remove" })],
      memoryCount: 2,
      loadedServerId: "srv-1",
    });
    mockApi.deleteMemory.mockResolvedValue(undefined);

    await useMemoryStore.getState().deleteMemory("remove", mockServer);

    const s = useMemoryStore.getState();
    expect(s.memories).toHaveLength(1);
    expect(s.memories[0].id).toBe("keep");
    expect(s.memoryCount).toBe(1);
    expect(mockApi.deleteMemory).toHaveBeenCalledWith("srv-1", "remove");
  });

  it("does not go below zero for memoryCount", async () => {
    useMemoryStore.setState({
      memories: [mockMemory({ id: "only" })],
      memoryCount: 0,
      loadedServerId: "srv-1",
    });
    mockApi.deleteMemory.mockResolvedValue(undefined);

    await useMemoryStore.getState().deleteMemory("only", mockServer);

    expect(useMemoryStore.getState().memoryCount).toBe(0);
  });
});

describe("pinMemory", () => {
  it("updates isPinned immutably for the target memory", async () => {
    const m1 = mockMemory({ id: "m1", isPinned: false });
    const m2 = mockMemory({ id: "m2", isPinned: false });
    useMemoryStore.setState({ memories: [m1, m2], loadedServerId: "srv-1" });
    mockApi.updateMemory.mockResolvedValue({ ...m1, isPinned: true });

    await useMemoryStore.getState().pinMemory("m1", true, mockServer);

    const s = useMemoryStore.getState();
    expect(s.memories[0].isPinned).toBe(true);
    expect(s.memories[1].isPinned).toBe(false);
    // Verify immutability — original objects unchanged
    expect(m1.isPinned).toBe(false);
    expect(mockApi.updateMemory).toHaveBeenCalledWith("srv-1", "m1", {
      isPinned: true,
    });
  });
});

describe("archiveMemory", () => {
  it("removes memory from list and decrements count", async () => {
    useMemoryStore.setState({
      memories: [mockMemory({ id: "m1" }), mockMemory({ id: "m2" })],
      memoryCount: 2,
      loadedServerId: "srv-1",
    });
    mockApi.updateMemory.mockResolvedValue(undefined);

    await useMemoryStore.getState().archiveMemory("m1", mockServer);

    const s = useMemoryStore.getState();
    expect(s.memories).toHaveLength(1);
    expect(s.memories[0].id).toBe("m2");
    expect(s.memoryCount).toBe(1);
    expect(mockApi.updateMemory).toHaveBeenCalledWith("srv-1", "m1", {
      isArchived: true,
    });
  });
});

describe("setExtracting", () => {
  it("sets the extracting flag to true", () => {
    useMemoryStore.setState({ isExtracting: false });
    useMemoryStore.getState().setExtracting(true);
    expect(useMemoryStore.getState().isExtracting).toBe(true);
  });

  it("sets the extracting flag to false", () => {
    useMemoryStore.setState({ isExtracting: true });
    useMemoryStore.getState().setExtracting(false);
    expect(useMemoryStore.getState().isExtracting).toBe(false);
  });
});
