import { CodeQualityPlugin } from "../code-quality";
import * as fs from "fs";
import { getGitModifiedFiles } from "../lib/utils";

// ─── Module-level mocks (hoisted by jest) ─────────────────────────────────

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

jest.mock("../lib/utils", () => ({
  getGitModifiedFiles: jest.fn(),
}));

// ─── Suite ────────────────────────────────────────────────────────────────

describe("CodeQualityPlugin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getHook = async (name: "tool.execute.after" | "message.updated") => {
    const mock$ = jest.fn().mockResolvedValue(undefined);
    const context: any = { $: mock$ };
    const plugin = await CodeQualityPlugin(context);
    const hook = plugin[name];
    if (!hook) throw new Error(`Hook "${name}" not found`);
    return { hook, mock$ };
  };

  // ── tool.execute.after ────────────────────────────────────────────────

  it("formats ts file with prettier on tool.execute.after", async () => {
    const { hook, mock$ } = await getHook("tool.execute.after");
    (fs.readFileSync as jest.Mock).mockReturnValue("const x = 1;\n");

    const input: any = {
      tool: "write",
      sessionID: "test",
      callID: "test",
      args: { filePath: "/test/file.ts" },
    };
    const output: any = {};

    await hook(input, output);

    // Prettier should have been invoked
    expect(mock$).toHaveBeenCalled();
    // Should log that it formatted
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("[Hook] Formatted:"),
    );
  });

  it("ignores non-code files (e.g. png) on tool.execute.after", async () => {
    const { hook, mock$ } = await getHook("tool.execute.after");

    const input: any = {
      tool: "write",
      sessionID: "test",
      callID: "test",
      args: { filePath: "/test/image.png" },
    };
    const output: any = {};

    await hook(input, output);

    // prettier should NOT have been called for .png
    expect(mock$).not.toHaveBeenCalled();
  });

  it("warns on console.log in written file", async () => {
    const { hook } = await getHook("tool.execute.after");
    (fs.readFileSync as jest.Mock).mockReturnValue(
      'const x = 1;\nconsole.log("debug");\n',
    );

    const input: any = {
      tool: "edit",
      sessionID: "test",
      callID: "test",
      args: { filePath: "/test/file.ts" },
    };
    const output: any = {};

    await hook(input, output);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("WARNING: console.log found"),
    );
  });

  it("does not warn on no console.log", async () => {
    const { hook } = await getHook("tool.execute.after");
    (fs.readFileSync as jest.Mock).mockReturnValue(
      "const x = 1;\nconst y = 2;\n",
    );

    const input: any = {
      tool: "edit",
      sessionID: "test",
      callID: "test",
      args: { filePath: "/test/file.ts" },
    };
    const output: any = {};

    await hook(input, output);

    expect(console.warn).not.toHaveBeenCalled();
  });

  // ── message.updated ──────────────────────────────────────────────────

  it("checks modified files for console.log on message.updated", async () => {
    const { hook } = await getHook("message.updated");
    (getGitModifiedFiles as jest.Mock).mockReturnValue([
      "src/file1.ts",
      "src/file2.ts",
    ]);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockImplementation((file: string) => {
      if (file === "src/file1.ts") return "const a = 1;\nconsole.log(a);\n";
      return "const b = 2;\n";
    });

    await hook({ event: { properties: {} } });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("REMINDER: console.log still present"),
    );
  });

  it("handles missing files gracefully on message.updated", async () => {
    const { hook } = await getHook("message.updated");
    (getGitModifiedFiles as jest.Mock).mockReturnValue(["src/deleted.ts"]);
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await hook({ event: { properties: {} } });

    // Should not throw and no warnings about console.log
    expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("REMINDER"),
    );
  });
});
