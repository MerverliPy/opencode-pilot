import * as fs from "fs";
import * as path from "path";

// Mock fs before importing the plugin
jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

// Mock utils with sensible defaults so the plugin can be initialized
jest.mock("../lib/utils", () => ({
  getSessionsDir: jest
    .fn()
    .mockReturnValue("/home/testuser/.config/opencode/sessions"),
  findFiles: jest.fn().mockReturnValue([]),
  getDateString: jest.fn().mockReturnValue("2025-06-15"),
  getTimeString: jest.fn().mockReturnValue("10:30"),
  getDateTimeString: jest.fn().mockReturnValue("2025-06-15 10:30:00"),
  getSessionIdShort: jest.fn().mockReturnValue("12345"),
  ensureDir: jest.fn(),
  writeFile: jest.fn(),
  replaceInFile: jest.fn(),
  appendFile: jest.fn(),
}));

import { SessionManagerPlugin } from "../session-manager";
import * as utils from "../lib/utils";

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedUtils = utils as jest.Mocked<typeof utils>;

const sessionsDir = "/home/testuser/.config/opencode/sessions";

// Mock context
const mockContext: any = {
  project: {},
  client: {},
  $: async () => {},
};

// Mock event with sessionId
const mockEvent = {
  event: {
    properties: {
      sessionId: "test-session-id-12345",
    },
  },
};

describe("SessionManagerPlugin", () => {
  let plugin: Record<string, any>;
  let consoleLogSpy: jest.SpyInstance;

  // Re-initialize plugin before each test so the captured `sessionsDir`
  // variable inside the closure uses the current mock return values.
  beforeEach(async () => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

    // Restore default return values after clearAllMocks
    mockedUtils.getSessionsDir.mockReturnValue(sessionsDir);
    mockedUtils.getDateString.mockReturnValue("2025-06-15");
    mockedUtils.getTimeString.mockReturnValue("10:30");
    mockedUtils.getDateTimeString.mockReturnValue("2025-06-15 10:30:00");
    mockedUtils.getSessionIdShort.mockReturnValue("12345");

    plugin = await SessionManagerPlugin(mockContext);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------
  it("should initialize and register hooks", () => {
    expect(plugin["session.created"]).toBeDefined();
    expect(plugin["session.closed"]).toBeDefined();
    expect(plugin["experimental.session.compacting"]).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // session.created
  // -----------------------------------------------------------------------
  describe("session.created", () => {
    it("should call ensureDir and findFiles on session start", async () => {
      mockedUtils.findFiles.mockReturnValue([
        { path: "/some/recent-session.md", mtime: 1_700_000_000_000 },
      ]);

      await plugin["session.created"](mockEvent);

      expect(mockedUtils.ensureDir).toHaveBeenCalledWith(sessionsDir);
      expect(mockedUtils.findFiles).toHaveBeenCalledWith(
        sessionsDir,
        "*-session.md",
        { maxAge: 7 },
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Found 1 recent session(s)"),
      );
    });

    it("should work when there are no recent sessions", async () => {
      mockedUtils.findFiles.mockReturnValue([]);

      await plugin["session.created"](mockEvent);

      expect(mockedUtils.ensureDir).toHaveBeenCalledWith(sessionsDir);
      expect(mockedUtils.findFiles).toHaveBeenCalledWith(
        sessionsDir,
        "*-session.md",
        { maxAge: 7 },
      );
    });
  });

  // -----------------------------------------------------------------------
  // session.closed
  // -----------------------------------------------------------------------
  describe("session.closed", () => {
    it("should create a new session file when none exists", async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await plugin["session.closed"](mockEvent);

      expect(mockedUtils.ensureDir).toHaveBeenCalledWith(sessionsDir);
      expect(mockedUtils.getDateString).toHaveBeenCalled();
      expect(mockedUtils.getSessionIdShort).toHaveBeenCalledWith(
        "test-session-id-12345",
      );
      expect(mockedUtils.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("2025-06-15-12345-session.md"),
        expect.stringContaining("# Session: 2025-06-15"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Created session file"),
      );
    });

    it("should update an existing session file timestamp", async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedUtils.replaceInFile.mockReturnValue(true);

      await plugin["session.closed"](mockEvent);

      expect(mockedUtils.ensureDir).toHaveBeenCalledWith(sessionsDir);
      expect(mockedUtils.replaceInFile).toHaveBeenCalledWith(
        expect.stringContaining("2025-06-15-12345-session.md"),
        /\*\*Last Updated:\*\*.*/,
        "**Last Updated:** 10:30",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Updated session file"),
      );
    });

    it("should handle missing event properties gracefully", async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedUtils.getSessionIdShort.mockReturnValue("default");

      await plugin["session.closed"]({ event: {} });

      expect(mockedUtils.getSessionIdShort).toHaveBeenCalledWith(undefined);
      expect(mockedUtils.getSessionsDir).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // experimental.session.compacting
  // -----------------------------------------------------------------------
  describe("experimental.session.compacting", () => {
    it("should log compaction and append to session file when sessionId is provided", async () => {
      const input = { sessionId: "test-session-id-12345" };
      mockedFs.existsSync.mockReturnValue(true);

      await plugin["experimental.session.compacting"](input, {});

      expect(mockedUtils.ensureDir).toHaveBeenCalledWith(sessionsDir);
      expect(mockedUtils.appendFile).toHaveBeenCalledWith(
        expect.stringContaining("compaction-log.txt"),
        expect.stringContaining("2025-06-15 10:30:00"),
      );
      expect(mockedUtils.appendFile).toHaveBeenCalledWith(
        expect.stringContaining("2025-06-15-12345-session.md"),
        expect.stringContaining("[Compaction occurred at 10:30]"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[PreCompact] State saved before compaction",
      );
    });

    it("should fall back to finding recent sessions when sessionId is missing", async () => {
      mockedUtils.findFiles.mockReturnValue([
        { path: "/sessions/recent-session.md", mtime: Date.now() },
      ]);

      await plugin["experimental.session.compacting"]({}, {});

      expect(mockedUtils.findFiles).toHaveBeenCalledWith(
        sessionsDir,
        "*-session.md",
        { maxAge: 1 },
      );
      expect(mockedUtils.appendFile).toHaveBeenCalledWith(
        "/sessions/recent-session.md",
        expect.stringContaining("[Compaction occurred at 10:30]"),
      );
    });
  });
});
