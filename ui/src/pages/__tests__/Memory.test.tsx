import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock stores
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));

jest.mock("../../plugin/memory/store/memoryStore", () => ({
  useMemoryStore: jest.fn(),
}));

// Mock plugin UI components
jest.mock("../../plugin/memory/ui/components/MemoryCard", () => ({
  MemoryCard: ({ memory, onPin, onArchive, onDelete }: any) => (
    <div data-testid="memory-card">
      <span>{memory.content}</span>
      <button data-testid="pin-btn" onClick={() => onPin(memory.id, !memory.isPinned)}>
        {memory.isPinned ? "unpin" : "pin"}
      </button>
      <button data-testid="archive-btn" onClick={() => onArchive(memory.id)}>archive</button>
      <button data-testid="delete-btn" onClick={() => onDelete(memory.id)}>delete</button>
    </div>
  ),
}));

jest.mock("../../plugin/memory/ui/components/CategoryFilter", () => ({
  CategoryFilter: ({ value, onChange }: any) => (
    <div data-testid="category-filter">
      <button onClick={() => onChange("all")}>all</button>
      <button onClick={() => onChange("fact")}>fact</button>
      <button onClick={() => onChange("preference")}>preference</button>
    </div>
  ),
}));

jest.mock("../../plugin/memory/ui/components/EmptyState", () => ({
  EmptyState: ({ message }: any) => (
    <div data-testid="empty-state">{message ?? "no memories yet"}</div>
  ),
}));

import { useServerStore } from "../../store/server";
import { useMemoryStore } from "../../plugin/memory/store/memoryStore";
import { Memory } from "../Memory";

const mockedUseServerStore = useServerStore as unknown as jest.Mock;
const mockedUseMemoryStore = useMemoryStore as unknown as jest.Mock;

const mockMemory = (id: string, content: string, overrides = {}) => ({
  id,
  serverId: "s1",
  content,
  category: "fact",
  confidence: 0.9,
  tags: [],
  isPinned: false,
  isArchived: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

type MemStore = {
  memories: ReturnType<typeof mockMemory>[];
  memoryCount: number;
  isExtracting: boolean;
  loadForServer: jest.Mock;
  deleteMemory: jest.Mock;
  pinMemory: jest.Mock;
  archiveMemory: jest.Mock;
};

function createMemStore(overrides?: Partial<MemStore>): MemStore {
  return {
    memories: [],
    memoryCount: 0,
    isExtracting: false,
    loadForServer: jest.fn().mockResolvedValue(undefined),
    deleteMemory: jest.fn().mockResolvedValue(undefined),
    pinMemory: jest.fn().mockResolvedValue(undefined),
    archiveMemory: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

type SvrStore = {
  servers: any[];
  activeId: string | null;
  hydrated: boolean;
  hydrate: jest.Mock;
};

function createSvrStore(overrides?: Partial<SvrStore>): SvrStore {
  return {
    servers: [],
    activeId: null,
    hydrated: true,
    hydrate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setupStores(memOverrides?: Partial<MemStore>, svrOverrides?: Partial<SvrStore>) {
  const mem = createMemStore(memOverrides);
  const svr = createSvrStore(svrOverrides);
  mockedUseMemoryStore.mockImplementation(
    (selector: (s: MemStore) => unknown) => selector(mem),
  );
  mockedUseServerStore.mockImplementation(
    (selector: (s: SvrStore) => unknown) => selector(svr),
  );
  return { mem, svr };
}

describe("Memory", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows no-server message when no active server", () => {
    setupStores();
    render(<Memory />);
    expect(screen.getByText(/no server configured/i)).toBeInTheDocument();
  });

  it("renders Memory heading when server active", () => {
    setupStores(undefined, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    expect(screen.getByText("Memory")).toBeInTheDocument();
  });

  it("shows count badge", () => {
    setupStores({ memoryCount: 5 }, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows empty state when no memories", () => {
    setupStores(undefined, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders memory cards when populated", () => {
    setupStores({
      memories: [
        mockMemory("m1", "First memory"),
        mockMemory("m2", "Second memory"),
      ],
      memoryCount: 2,
    }, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    expect(screen.getByText("First memory")).toBeInTheDocument();
    expect(screen.getByText("Second memory")).toBeInTheDocument();
  });

  it("calls pinMemory when pin is clicked", () => {
    const { mem } = setupStores({
      memories: [mockMemory("m1", "Test", { isPinned: false })],
      memoryCount: 1,
    }, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    fireEvent.click(screen.getByTestId("pin-btn"));
    expect(mem.pinMemory).toHaveBeenCalledWith("m1", true, expect.any(Object));
  });

  it("calls archiveMemory when archive is clicked", () => {
    const { mem } = setupStores({
      memories: [mockMemory("m1", "To archive")],
      memoryCount: 1,
    }, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    fireEvent.click(screen.getByTestId("archive-btn"));
    expect(mem.archiveMemory).toHaveBeenCalledWith("m1", expect.any(Object));
  });

  it("calls deleteMemory when delete is clicked", () => {
    const { mem } = setupStores({
      memories: [mockMemory("m1", "To delete")],
      memoryCount: 1,
    }, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    fireEvent.click(screen.getByTestId("delete-btn"));
    expect(mem.deleteMemory).toHaveBeenCalledWith("m1", expect.any(Object));
  });

  it("shows extracting indicator when extracting", () => {
    setupStores({ isExtracting: true }, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    expect(screen.getByText("extracting…")).toBeInTheDocument();
  });

  it("calls loadForServer on mount with active server", () => {
    const { mem } = setupStores(undefined, {
      servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
      activeId: "s1",
    });
    render(<Memory />);
    expect(mem.loadForServer).toHaveBeenCalledWith("s1", expect.objectContaining({ id: "s1" }));
  });
});
