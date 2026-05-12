import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// Mock built-in modules before importing the module under test
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

jest.mock("child_process", () => ({
  execSync: jest.fn(),
}));

jest.mock("os", () => ({
  homedir: jest.fn().mockReturnValue("/home/testuser"),
  tmpdir: jest.fn().mockReturnValue("/tmp"),
}));

import {
  getHomeDir,
  getOpenCodeDir,
  getSessionsDir,
  getLearnedSkillsDir,
  ensureDir,
  getDateString,
  getTimeString,
  getDateTimeString,
  findFiles,
  writeFile,
  appendFile,
  replaceInFile,
  runCommand,
  getGitRepoName,
  getProjectName,
  getSessionIdShort,
  isGitRepo,
  getGitModifiedFiles,
} from "../lib/utils";

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedOs = os as jest.Mocked<typeof os>;
const mockedExecSync = execSync as jest.Mock;

describe("utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedOs.homedir.mockReturnValue("/home/testuser");
  });

  // -------------------------------------------------------------------------
  // Path helpers
  // -------------------------------------------------------------------------
  describe("getHomeDir", () => {
    it("returns os.homedir()", () => {
      expect(getHomeDir()).toBe("/home/testuser");
      expect(os.homedir).toHaveBeenCalled();
    });
  });

  describe("getOpenCodeDir", () => {
    it("returns path under home", () => {
      const result = getOpenCodeDir();
      expect(result).toBe(path.join("/home/testuser", ".config", "opencode"));
    });
  });

  describe("getSessionsDir", () => {
    it("returns sessions dir under opencode config", () => {
      const result = getSessionsDir();
      expect(result).toBe(
        path.join("/home/testuser", ".config", "opencode", "sessions"),
      );
    });
  });

  describe("getLearnedSkillsDir", () => {
    it("returns learned skills dir under opencode config", () => {
      const result = getLearnedSkillsDir();
      expect(result).toBe(
        path.join("/home/testuser", ".config", "opencode", "skills", "learned"),
      );
    });
  });

  // -------------------------------------------------------------------------
  // ensureDir
  // -------------------------------------------------------------------------
  describe("ensureDir", () => {
    it("creates directory when it does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = ensureDir("/some/path");

      expect(result).toBe("/some/path");
      expect(mockedFs.existsSync).toHaveBeenCalledWith("/some/path");
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith("/some/path", {
        recursive: true,
      });
    });

    it("is a no-op when directory already exists", () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = ensureDir("/existing/path");

      expect(result).toBe("/existing/path");
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });

    it("returns empty string for non-string input", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = ensureDir(undefined as unknown as string);

      expect(result).toBe("");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ensureDir: dirPath must be a string"),
        undefined,
      );
      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Date / time helpers
  // -------------------------------------------------------------------------
  describe("getDateString", () => {
    it("returns date in YYYY-MM-DD format", () => {
      jest.useFakeTimers().setSystemTime(new Date("2025-06-15T10:30:00"));

      const result = getDateString();

      expect(result).toBe("2025-06-15");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      jest.useRealTimers();
    });
  });

  describe("getTimeString", () => {
    it("returns time in HH:MM format", () => {
      jest.useFakeTimers().setSystemTime(new Date("2025-06-15T08:05:00"));

      const result = getTimeString();

      expect(result).toBe("08:05");
      expect(result).toMatch(/^\d{2}:\d{2}$/);
      jest.useRealTimers();
    });
  });

  describe("getDateTimeString", () => {
    it("returns datetime in YYYY-MM-DD HH:MM:SS format", () => {
      jest.useFakeTimers().setSystemTime(new Date("2025-06-15T14:30:45"));

      const result = getDateTimeString();

      expect(result).toBe("2025-06-15 14:30:45");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      jest.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // findFiles
  // -------------------------------------------------------------------------
  describe("findFiles", () => {
    const sessionDir = "/home/testuser/.config/opencode/sessions";
    const baseTime = 1_700_000_000_000;

    it("finds files matching glob pattern", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        {
          name: "2025-01-01-session.md",
          isFile: () => true,
          isDirectory: () => false,
        },
        {
          name: "notes.txt",
          isFile: () => true,
          isDirectory: () => false,
        },
      ] as any[]);
      mockedFs.statSync.mockReturnValue({
        mtimeMs: baseTime,
      } as fs.Stats);

      const results = findFiles(sessionDir, "*-session.md");

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(
        path.join(sessionDir, "2025-01-01-session.md"),
      );
    });

    it("respects maxAge filter", () => {
      const now = Date.now();
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        {
          name: "old-session.md",
          isFile: () => true,
          isDirectory: () => false,
        },
        {
          name: "new-session.md",
          isFile: () => true,
          isDirectory: () => false,
        },
      ] as any[]);
      mockedFs.statSync
        .mockReturnValueOnce({
          mtimeMs: now - 10 * 24 * 60 * 60 * 1000,
        } as fs.Stats) // 10 days old
        .mockReturnValueOnce({
          mtimeMs: now - 1 * 24 * 60 * 60 * 1000,
        } as fs.Stats); // 1 day old

      const results = findFiles(sessionDir, "*.md", { maxAge: 7 });

      expect(results).toHaveLength(1);
      expect(results[0].path).toContain("new-session");
    });

    it("respects recursive option and explores subdirectories", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync
        .mockReturnValueOnce([
          {
            name: "subdir",
            isFile: () => false,
            isDirectory: () => true,
          },
        ] as any[])
        .mockReturnValueOnce([
          {
            name: "nested-session.md",
            isFile: () => true,
            isDirectory: () => false,
          },
        ] as any[]);
      mockedFs.statSync.mockReturnValue({ mtimeMs: baseTime } as fs.Stats);

      const results = findFiles(sessionDir, "*.md", { recursive: true });

      expect(results).toHaveLength(1);
      expect(results[0].path).toContain("nested-session");
    });

    it("returns empty array when directory does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);

      const results = findFiles(sessionDir, "*.md");

      expect(results).toEqual([]);
    });

    it("handles permission errors gracefully", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error("EACCES: permission denied");
      });

      const results = findFiles(sessionDir, "*.md");

      expect(results).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // writeFile / appendFile / replaceInFile
  // -------------------------------------------------------------------------
  describe("writeFile", () => {
    it("creates directory and writes file content", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockedFs.existsSync.mockReturnValue(false);

      writeFile("/tmp/test/hello.txt", "hello world");

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith("/tmp/test", {
        recursive: true,
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "/tmp/test/hello.txt",
        "hello world",
        "utf8",
      );
      consoleErrorSpy.mockRestore();
    });

    it("returns early for invalid arguments", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      writeFile("", "content");

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("appendFile", () => {
    it("creates directory and appends content to file", () => {
      mockedFs.existsSync.mockReturnValue(true);

      appendFile("/tmp/test/log.txt", "new line");

      expect(mockedFs.appendFileSync).toHaveBeenCalledWith(
        "/tmp/test/log.txt",
        "new line",
        "utf8",
      );
    });

    it("returns early for invalid arguments", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      appendFile("/tmp/test/log.txt", 123 as unknown as string);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockedFs.appendFileSync).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("replaceInFile", () => {
    it("replaces regex match and returns true", () => {
      mockedFs.readFileSync.mockReturnValue("Hello **Old:** value");
      mockedFs.existsSync.mockReturnValue(true);

      const result = replaceInFile(
        "/tmp/test/file.md",
        /\*\*Old:\*\*/,
        "**New:**",
      );

      expect(result).toBe(true);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        "/tmp/test/file.md",
        "utf8",
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "/tmp/test/file.md",
        "Hello **New:** value",
        "utf8",
      );
    });

    it("returns false when file cannot be read", () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const result = replaceInFile("/nonexistent/file.md", /foo/, "bar");

      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // runCommand
  // -------------------------------------------------------------------------
  describe("runCommand", () => {
    it("returns success + trimmed output", () => {
      mockedExecSync.mockReturnValue("  some output\n");

      const result = runCommand("echo hello");

      expect(result).toEqual({ success: true, output: "some output" });
      expect(mockedExecSync).toHaveBeenCalledWith("echo hello", {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
    });

    it("returns failure + stderr on error", () => {
      mockedExecSync.mockImplementation(() => {
        const err: any = new Error("command not found");
        err.stderr = "bash: bad-command: command not found";
        throw err;
      });

      const result = runCommand("bad-command");

      expect(result).toEqual({
        success: false,
        output: "bash: bad-command: command not found",
      });
    });

    it("falls back to error.message when stderr is missing", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const result = runCommand("nonexistent");

      expect(result).toEqual({ success: false, output: "ENOENT" });
    });
  });

  // -------------------------------------------------------------------------
  // Git helpers
  // -------------------------------------------------------------------------
  describe("getGitRepoName", () => {
    it("returns basename of git toplevel directory", () => {
      mockedExecSync.mockReturnValue("/home/user/projects/my-repo\n");

      const result = getGitRepoName();

      expect(result).toBe("my-repo");
    });

    it("returns null when not in a git repo", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("fatal: not a git repository");
      });

      const result = getGitRepoName();

      expect(result).toBeNull();
    });
  });

  describe("getProjectName", () => {
    it("returns git repo name when available", () => {
      mockedExecSync.mockReturnValue("/home/user/my-project\n");

      const result = getProjectName();

      expect(result).toBe("my-project");
    });
  });

  describe("getSessionIdShort", () => {
    it("returns last 8 chars of sessionId when provided", () => {
      const result = getSessionIdShort("session-abc12345");
      // "session-abc12345" has 17 chars, slice(-8) = "abc12345"
      expect(result).toBe("abc12345");
    });

    it("returns fallback when sessionId is empty and getProjectName returns null", () => {
      // Make execSync throw so getGitRepoName returns null
      mockedExecSync.mockImplementation(() => {
        throw new Error("not a git repo");
      });
      // Make path.basename(process.cwd()) return falsy so getProjectName returns null
      const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue("/");

      const result = getSessionIdShort("", "custom-fallback");

      expect(result).toBe("custom-fallback");
      cwdSpy.mockRestore();
    });

    it("returns default fallback when getProjectName also returns null", () => {
      // Without a git repo, getProjectName returns null
      mockedExecSync.mockImplementation(() => {
        throw new Error("not a git repo");
      });
      // Make path.basename(process.cwd()) return falsy so getProjectName returns null
      const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue("/");

      const result = getSessionIdShort("");

      expect(result).toBe("default");
      cwdSpy.mockRestore();
    });
  });

  describe("isGitRepo", () => {
    it("returns true when git rev-parse --git-dir succeeds", () => {
      mockedExecSync.mockReturnValue(".git\n");

      const result = isGitRepo();

      expect(result).toBe(true);
    });

    it("returns false when git rev-parse --git-dir fails", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("fatal: not a git repository");
      });

      const result = isGitRepo();

      expect(result).toBe(false);
    });
  });

  describe("getGitModifiedFiles", () => {
    it("returns empty array when not in a git repo", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("not a git repository");
      });

      const result = getGitModifiedFiles();

      expect(result).toEqual([]);
    });

    it("returns filtered files matching given patterns", () => {
      mockedExecSync
        .mockReturnValueOnce(".git\n") // isGitRepo success
        .mockReturnValueOnce("src/index.ts\nsrc/utils.ts\nREADME.md\n"); // git diff output

      const result = getGitModifiedFiles(["\\.ts$"]);

      expect(result).toEqual(["src/index.ts", "src/utils.ts"]);
    });

    it("returns all modified files when no patterns given", () => {
      mockedExecSync
        .mockReturnValueOnce(".git\n") // isGitRepo success
        .mockReturnValueOnce("file1.ts\nfile2.ts\n"); // git diff output

      const result = getGitModifiedFiles();

      expect(result).toEqual(["file1.ts", "file2.ts"]);
    });

    it("returns empty array when git diff fails", () => {
      mockedExecSync
        .mockReturnValueOnce(".git\n") // isGitRepo success
        .mockImplementationOnce(() => {
          throw new Error("fatal: ambiguous argument");
        });

      const result = getGitModifiedFiles();

      expect(result).toEqual([]);
    });
  });
});
