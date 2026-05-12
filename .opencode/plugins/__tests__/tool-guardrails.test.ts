import { ToolGuardrailsPlugin } from "../tool-guardrails";

const mockContext: any = { $: async () => {} };

describe("ToolGuardrailsPlugin", () => {
  let plugin: Record<string, any>;
  let warnSpy: jest.SpyInstance;

  beforeAll(async () => {
    plugin = await ToolGuardrailsPlugin(mockContext);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function makeBashInput(command: string) {
    return {
      tool: "bash",
      sessionID: "ses_test",
      callID: "call_1",
      args: { command },
    };
  }

  function makeWriteInput(filePath: string) {
    return {
      tool: "write",
      sessionID: "ses_test",
      callID: "call_2",
      args: { filePath },
    };
  }

  // -----------------------------------------------------------------------
  // Block dev servers outside tmux
  // -----------------------------------------------------------------------
  describe("dev server guardrails", () => {
    const devCommands = [
      { label: "npm run dev", cmd: "npm run dev" },
      { label: "pnpm dev", cmd: "pnpm dev" },
      { label: "yarn dev", cmd: "yarn dev" },
      { label: "bun dev", cmd: "bun dev" },
    ];

    describe.each(devCommands)("$label", ({ cmd }) => {
      it("blocks the command outside tmux", async () => {
        const originalTmux = process.env.TMUX;
        delete process.env.TMUX;

        const input = makeBashInput(cmd);
        const hook = plugin["tool.execute.before"];
        if (!hook) throw new Error("Hook not found");

        await expect(hook(input, {})).rejects.toThrow(
          "Dev server must run in tmux",
        );

        if (originalTmux) process.env.TMUX = originalTmux;
      });

      it("allows the command inside tmux", async () => {
        process.env.TMUX = "/tmp/tmux-1000";

        const input = makeBashInput(cmd);
        const hook = plugin["tool.execute.before"];
        if (!hook) throw new Error("Hook not found");

        await expect(hook(input, {})).resolves.toBeUndefined();

        delete process.env.TMUX;
      });
    });
  });

  // -----------------------------------------------------------------------
  // Safe commands pass through
  // -----------------------------------------------------------------------
  describe("safe commands", () => {
    it("allows ls regardless of tmux", async () => {
      delete process.env.TMUX;
      const hook = plugin["tool.execute.before"];

      await expect(hook(makeBashInput("ls -la"), {})).resolves.toBeUndefined();
    });

    it("allows echo regardless of tmux", async () => {
      delete process.env.TMUX;
      const hook = plugin["tool.execute.before"];

      await expect(
        hook(makeBashInput("echo hello"), {}),
      ).resolves.toBeUndefined();
    });

    it("allows rm -rf without error (does not match any guardrail)", async () => {
      delete process.env.TMUX;
      const hook = plugin["tool.execute.before"];

      // Should not throw - rm -rf doesn't match dev server patterns
      await expect(
        hook(makeBashInput("rm -rf /tmp/test"), {}),
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Write tool guardrails
  // -----------------------------------------------------------------------
  describe("write tool guardrails", () => {
    it("blocks unnecessary .md file creation", async () => {
      const hook = plugin["tool.execute.before"];
      const input = makeWriteInput("random-notes.md");

      await expect(hook(input, {})).rejects.toThrow(
        "Unnecessary documentation file creation blocked",
      );
    });

    it("blocks unnecessary .txt file creation", async () => {
      const hook = plugin["tool.execute.before"];
      const input = makeWriteInput("notes.txt");

      await expect(hook(input, {})).rejects.toThrow(
        "Unnecessary documentation file creation blocked",
      );
    });

    it("allows README.md", async () => {
      const hook = plugin["tool.execute.before"];

      await expect(
        hook(makeWriteInput("README.md"), {}),
      ).resolves.toBeUndefined();
    });

    it("allows files inside .opencode/ directory", async () => {
      const hook = plugin["tool.execute.before"];

      await expect(
        hook(makeWriteInput("/project/.opencode/rules/custom.md"), {}),
      ).resolves.toBeUndefined();
    });

    it("allows files inside docs/ directory", async () => {
      const hook = plugin["tool.execute.before"];

      await expect(
        hook(makeWriteInput("/project/docs/guide.md"), {}),
      ).resolves.toBeUndefined();
    });

    it("allows files starting with CLAUDE", async () => {
      const hook = plugin["tool.execute.before"];

      await expect(
        hook(makeWriteInput("CLAUDE.md"), {}),
      ).resolves.toBeUndefined();
    });

    it("returns early when input.tool is not write", async () => {
      const hook = plugin["tool.execute.before"];

      // Should not throw for non-write tools
      await expect(
        hook(makeBashInput("echo hello"), {}),
      ).resolves.toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Long-running command warnings
  // -----------------------------------------------------------------------
  describe("long-running command warnings", () => {
    it("warns about running npm install without tmux", async () => {
      delete process.env.TMUX;
      const hook = plugin["tool.execute.before"];

      await hook(makeBashInput("npm install express"), {});

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Consider running in tmux"),
      );
    });

    it("warns about running docker without tmux", async () => {
      delete process.env.TMUX;
      const hook = plugin["tool.execute.before"];

      await hook(makeBashInput("docker compose up"), {});

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Consider running in tmux"),
      );
    });

    it("does not warn about long-running commands inside tmux", async () => {
      process.env.TMUX = "/tmp/tmux-1000";
      const hook = plugin["tool.execute.before"];

      await hook(makeBashInput("npm install express"), {});

      expect(warnSpy).not.toHaveBeenCalled();
      delete process.env.TMUX;
    });
  });

  // -----------------------------------------------------------------------
  // git push reminder
  // -----------------------------------------------------------------------
  describe("git push reminder", () => {
    it("warns before git push", async () => {
      const hook = plugin["tool.execute.before"];

      await hook(makeBashInput("git push origin main"), {});

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Review changes before push"),
      );
    });
  });

  // -----------------------------------------------------------------------
  // tool.execute.after
  // -----------------------------------------------------------------------
  describe("tool.execute.after", () => {
    it("logs PR url when gh pr create succeeds", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation();
      const hook = plugin["tool.execute.after"];

      await hook(makeBashInput("gh pr create --title 'test'"), {
        output: "https://github.com/user/repo/pull/42",
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("PR created"),
      );
      logSpy.mockRestore();
    });

    it("does not log for non-PR commands", async () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation();
      const hook = plugin["tool.execute.after"];

      await hook(makeBashInput("echo hello"), {});

      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  it("returns early when input is null or missing tool", async () => {
    const hook = plugin["tool.execute.before"];

    await expect(hook(null, {})).resolves.toBeUndefined();
    await expect(hook({}, {})).resolves.toBeUndefined();
  });
});
