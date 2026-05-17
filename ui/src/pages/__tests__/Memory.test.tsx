import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock stores
jest.mock("../../store/server", () => ({
  useServerStore: jest.fn(),
}));

jest.mock("../../plugin/memory/store/memoryStore", () => ({
  useMemoryStore: jest.fn(),
}));

// Mock embedding provider factory (avoids actual network calls)
jest.mock("../../plugin/memory/embeddings/EmbeddingProviderFactory", () => ({
  createProviderFromConfig: jest.fn().mockResolvedValue({
    embed: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
    model: { id: "test-model" },
  }),
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

jest.mock("../../plugin/memory/ui/components/TimelineFeed", () => ({
  TimelineFeed: ({ serverId }: { serverId: string }) => (
    <div data-testid="timeline-feed">Timeline for {serverId}</div>
  ),
}));

jest.mock("../../plugin/memory/ui/components/ProfilePanel", () => ({
  ProfilePanel: ({ serverId }: { serverId: string }) => (
    <div data-testid="profile-panel">Profile for {serverId}</div>
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
  config: { serverId: string; enabled: boolean; extractEnabled: boolean; injectEnabled: boolean; embeddingProvider: string; embeddingModel: string; dedupThreshold: number; topK: number; maxMemories: number } | null;
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
    config: null,
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

  describe("semantic search mode", () => {
    function activeServerOverride() {
      return {
        servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
        activeId: "s1",
      };
    }

    it("renders text/semantic toggle buttons", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      expect(screen.getByTestId("search-mode-text")).toBeInTheDocument();
      expect(screen.getByTestId("search-mode-semantic")).toBeInTheDocument();
    });

    it("shows semantic placeholder when semantic mode is active", () => {
      setupStores({
        config: { serverId: "s1", enabled: true, extractEnabled: true, injectEnabled: true, embeddingProvider: "ollama", embeddingModel: "nomic-embed-text", dedupThreshold: 0.92, topK: 5, maxMemories: 2000 },
      }, activeServerOverride());
      render(<Memory />);
      fireEvent.click(screen.getByTestId("search-mode-semantic"));
      const input = screen.getByTestId("memory-search") as HTMLInputElement;
      expect(input.placeholder).toBe("semantic search…");
    });

    it("disables semantic toggle when config is null", () => {
      setupStores({ config: null }, activeServerOverride());
      render(<Memory />);
      const btn = screen.getByTestId("search-mode-semantic") as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    it("enables semantic toggle when config is loaded", () => {
      setupStores({
        config: { serverId: "s1", enabled: true, extractEnabled: true, injectEnabled: true, embeddingProvider: "ollama", embeddingModel: "nomic-embed-text", dedupThreshold: 0.92, topK: 5, maxMemories: 2000 },
      }, activeServerOverride());
      render(<Memory />);
      const btn = screen.getByTestId("search-mode-semantic") as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
  });

  describe("timeline view toggle", () => {
    function activeServerOverride() {
      return {
        servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
        activeId: "s1",
      };
    }

    it("renders memories/timeline view toggle buttons", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      expect(screen.getByTestId("view-mode-memories")).toBeInTheDocument();
      expect(screen.getByTestId("view-mode-timeline")).toBeInTheDocument();
    });

    it("shows timeline content when timeline view is selected", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      fireEvent.click(screen.getByTestId("view-mode-timeline"));
      // Timeline Feed mocked component is shown
      expect(screen.getByTestId("timeline-feed")).toBeInTheDocument();
      // Search input and filter are NOT visible in timeline mode
      expect(screen.queryByTestId("memory-search")).not.toBeInTheDocument();
      expect(screen.queryByTestId("category-filter")).not.toBeInTheDocument();
      expect(screen.queryByTestId("search-mode-text")).not.toBeInTheDocument();
      expect(screen.queryByTestId("search-mode-semantic")).not.toBeInTheDocument();
    });

    it("defaults to memories view", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      expect(screen.getByTestId("category-filter")).toBeInTheDocument();
      expect(screen.getByTestId("memory-search")).toBeInTheDocument();
      expect(screen.queryByTestId("timeline-feed")).not.toBeInTheDocument();
    });
  });

  describe("profile view toggle", () => {
    function activeServerOverride() {
      return {
        servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
        activeId: "s1",
      };
    }

    it("renders profile view toggle button", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      expect(screen.getByTestId("view-mode-profile")).toBeInTheDocument();
    });

    it("shows profile content when profile view is selected", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      fireEvent.click(screen.getByTestId("view-mode-profile"));
      // Profile Panel mocked component is shown
      expect(screen.getByTestId("profile-panel")).toBeInTheDocument();
      // Search input, category filter, and search mode toggles are NOT visible
      expect(screen.queryByTestId("memory-search")).not.toBeInTheDocument();
      expect(screen.queryByTestId("category-filter")).not.toBeInTheDocument();
      expect(screen.queryByTestId("search-mode-text")).not.toBeInTheDocument();
      expect(screen.queryByTestId("search-mode-semantic")).not.toBeInTheDocument();
    });

    it("returns to memories view after switching back", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      // Switch to profile
      fireEvent.click(screen.getByTestId("view-mode-profile"));
      expect(screen.getByTestId("profile-panel")).toBeInTheDocument();

      // Switch back to memories
      fireEvent.click(screen.getByTestId("view-mode-memories"));
      expect(screen.queryByTestId("profile-panel")).not.toBeInTheDocument();
      expect(screen.getByTestId("category-filter")).toBeInTheDocument();
      expect(screen.getByTestId("memory-search")).toBeInTheDocument();
    });
  });

  describe("export/import buttons", () => {
    function activeServerOverride() {
      return {
        servers: [{ id: "s1", name: "Home", url: "http://localhost:4096" }],
        activeId: "s1",
      };
    }

    it("renders export and import buttons in memories view", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      expect(screen.getByTestId("export-memories")).toBeInTheDocument();
      expect(screen.getByTestId("import-memories")).toBeInTheDocument();
    });

    it("hides export/import buttons in timeline view", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      fireEvent.click(screen.getByTestId("view-mode-timeline"));
      expect(screen.queryByTestId("export-memories")).not.toBeInTheDocument();
      expect(screen.queryByTestId("import-memories")).not.toBeInTheDocument();
    });

    it("hides export/import buttons in profile view", () => {
      setupStores(undefined, activeServerOverride());
      render(<Memory />);
      fireEvent.click(screen.getByTestId("view-mode-profile"));
      expect(screen.queryByTestId("export-memories")).not.toBeInTheDocument();
      expect(screen.queryByTestId("import-memories")).not.toBeInTheDocument();
    });
  });
});
