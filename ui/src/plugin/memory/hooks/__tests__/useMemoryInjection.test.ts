/**
 * Tests for useMemoryInjection hook.
 *
 * React's useCallback is mocked as an identity function so the returned
 * buildPrefix can be called directly in the node test environment.
 * All heavy lifting is delegated to MemoryInjector (tested separately).
 */

// ── Mocks (must be above imports) ────────────────────────────────────────────

jest.mock("react", () => ({
  useCallback: (fn: any, _deps: any[]) => fn,
}));

jest.mock("../../store/memoryStore", () => ({
  useMemoryStore: jest.fn(),
}));

jest.mock("../../injection/MemoryInjector", () => ({
  MemoryInjector: jest.fn(),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { useMemoryInjection } from "../useMemoryInjection";
import { useMemoryStore } from "../../store/memoryStore";
import { MemoryInjector } from "../../injection/MemoryInjector";
import type { MemoryConfig } from "../../db/schema";

const MockMemoryInjector = MemoryInjector as jest.MockedClass<
  typeof MemoryInjector
>;

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function setConfig(config: MemoryConfig | null) {
  (useMemoryStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: any) => any) => selector({ config }),
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useMemoryInjection", () => {
  describe("return value", () => {
    it("returns an object with a buildPrefix function", () => {
      setConfig(defaultConfig);
      const result = useMemoryInjection({ serverId: "srv-1" });
      expect(typeof result.buildPrefix).toBe("function");
    });
  });

  describe("buildPrefix guard clauses", () => {
    it("returns empty string when serverId is null", async () => {
      setConfig(defaultConfig);
      const { buildPrefix } = useMemoryInjection({ serverId: null });
      const result = await buildPrefix("query");
      expect(result).toBe("");
      expect(MockMemoryInjector).not.toHaveBeenCalled();
    });

    it("returns empty string when config is null", async () => {
      setConfig(null);
      const { buildPrefix } = useMemoryInjection({ serverId: "srv-1" });
      const result = await buildPrefix("query");
      expect(result).toBe("");
      expect(MockMemoryInjector).not.toHaveBeenCalled();
    });

    it("returns empty string when config.enabled is false", async () => {
      setConfig({ ...defaultConfig, enabled: false });
      const { buildPrefix } = useMemoryInjection({ serverId: "srv-1" });
      const result = await buildPrefix("query");
      expect(result).toBe("");
      expect(MockMemoryInjector).not.toHaveBeenCalled();
    });

    it("returns empty string when config.injectEnabled is false", async () => {
      setConfig({ ...defaultConfig, injectEnabled: false });
      const { buildPrefix } = useMemoryInjection({ serverId: "srv-1" });
      const result = await buildPrefix("query");
      expect(result).toBe("");
      expect(MockMemoryInjector).not.toHaveBeenCalled();
    });

    it("returns empty string when both enabled flags are false", async () => {
      setConfig({ ...defaultConfig, enabled: false, injectEnabled: false });
      const { buildPrefix } = useMemoryInjection({ serverId: "srv-1" });
      const result = await buildPrefix("query");
      expect(result).toBe("");
      expect(MockMemoryInjector).not.toHaveBeenCalled();
    });
  });

  describe("buildPrefix happy path", () => {
    it("creates MemoryInjector and delegates to buildContext", async () => {
      const mockBuildContext = jest
        .fn()
        .mockResolvedValue("[Memory Context]\n- fact\n");
      MockMemoryInjector.mockImplementation(
        () => ({ buildContext: mockBuildContext }) as any,
      );
      setConfig(defaultConfig);

      const { buildPrefix } = useMemoryInjection({
        serverId: "srv-1",
        serverUrl: "http://localhost:4096",
      });
      const result = await buildPrefix("test query");

      expect(result).toBe("[Memory Context]\n- fact\n");
      expect(MockMemoryInjector).toHaveBeenCalledWith(
        "srv-1",
        "http://localhost:4096",
      );
      expect(mockBuildContext).toHaveBeenCalledWith(
        "test query",
        defaultConfig,
      );
    });

    it("passes undefined serverUrl when not provided", async () => {
      const mockBuildContext = jest.fn().mockResolvedValue("ctx");
      MockMemoryInjector.mockImplementation(
        () => ({ buildContext: mockBuildContext }) as any,
      );
      setConfig(defaultConfig);

      const { buildPrefix } = useMemoryInjection({ serverId: "srv-1" });
      await buildPrefix("query");

      expect(MockMemoryInjector).toHaveBeenCalledWith("srv-1", undefined);
    });

    it("returns full memory context block from MemoryInjector", async () => {
      const expected =
        "[Memory Context — from previous sessions]\n- pref\n[End Memory Context]\n\n";
      MockMemoryInjector.mockImplementation(
        () =>
          ({
            buildContext: jest.fn().mockResolvedValue(expected),
          }) as any,
      );
      setConfig(defaultConfig);

      const { buildPrefix } = useMemoryInjection({ serverId: "srv-1" });
      const result = await buildPrefix("any query");

      expect(result).toBe(expected);
    });

    it("creates a new MemoryInjector on each buildPrefix call", async () => {
      const mockBuildContext = jest.fn().mockResolvedValue("ctx");
      MockMemoryInjector.mockImplementation(
        () => ({ buildContext: mockBuildContext }) as any,
      );
      setConfig(defaultConfig);

      const { buildPrefix } = useMemoryInjection({ serverId: "srv-1" });
      await buildPrefix("q1");
      await buildPrefix("q2");

      // One MemoryInjector per buildPrefix call
      expect(MockMemoryInjector).toHaveBeenCalledTimes(2);
      expect(mockBuildContext).toHaveBeenCalledTimes(2);
    });
  });
});
