import { StrategicCompactPlugin } from "../strategic-compact";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ─── Module-level mocks ──────────────────────────────────────────────────

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock("os", () => ({
  tmpdir: jest.fn().mockReturnValue("/tmp"),
}));

// ─── Suite ────────────────────────────────────────────────────────────────

describe("StrategicCompactPlugin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getHook = async () => {
    const context: any = { $: async () => {} };
    const plugin = await StrategicCompactPlugin(context);
    const hook = plugin["tool.execute.after"];
    if (!hook) throw new Error("Hook not found");
    return hook;
  };

  const expectedCounterPath = () =>
    path.join(os.tmpdir(), `opencode-tool-count-${process.pid}`);

  const stubFileExists = (exists: boolean) => {
    (fs.existsSync as jest.Mock).mockImplementation(
      (p: string) => p === expectedCounterPath() && exists,
    );
  };

  const mockInput: any = {
    tool: "bash",
    sessionID: "test",
    callID: "test",
    args: {},
  };

  const mockOutput: any = { title: "", output: "", metadata: {} };

  it("increments counter on tool.execute.after", async () => {
    const hook = await getHook();
    stubFileExists(false);

    await hook(mockInput, mockOutput);
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedCounterPath(), "1");

    await hook(mockInput, mockOutput);
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedCounterPath(), "2");
  });

  it("warns at 50 tool calls", async () => {
    const hook = await getHook();
    stubFileExists(false);

    for (let i = 0; i < 49; i++) {
      await hook(mockInput, mockOutput);
    }

    expect(console.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("50 tool calls"),
    );

    await hook(mockInput, mockOutput);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("50 tool calls"),
    );
  });

  it("warns at 75 tool calls (50 + 25 interval)", async () => {
    const hook = await getHook();
    stubFileExists(false);

    for (let i = 0; i < 75; i++) {
      await hook(mockInput, mockOutput);
    }

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("75 tool calls"),
    );
  });

  it("warns at 100+ tool calls (every 25 after 50)", async () => {
    const hook = await getHook();
    stubFileExists(false);

    for (let i = 0; i < 100; i++) {
      await hook(mockInput, mockOutput);
    }

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("100 tool calls"),
    );
    expect(
      (console.warn as jest.Mock).mock.calls.length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("persists counter across plugin invocations via counter file", async () => {
    const expectedPath = expectedCounterPath();

    (fs.existsSync as jest.Mock).mockImplementation(
      (p: string) => p === expectedPath,
    );
    (fs.readFileSync as jest.Mock).mockReturnValue("42");

    const context1: any = { $: async () => {} };
    const plugin1 = await StrategicCompactPlugin(context1);
    const hook1 = plugin1["tool.execute.after"];
    if (!hook1) throw new Error("Hook not found");

    (fs.writeFileSync as jest.Mock).mockClear();

    await hook1(mockInput, mockOutput);
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, "43");
  });

  it("handles corrupt counter file gracefully (NaN counter)", async () => {
    const expectedPath = expectedCounterPath();
    (fs.existsSync as jest.Mock).mockImplementation(
      (p: string) => p === expectedPath,
    );
    (fs.readFileSync as jest.Mock).mockReturnValue("not-a-number");

    const context: any = { $: async () => {} };
    const plugin = await StrategicCompactPlugin(context);
    const hook = plugin["tool.execute.after"];
    if (!hook) throw new Error("Hook not found");

    await expect(hook(mockInput, mockOutput)).resolves.toBeUndefined();
    expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, "NaN");
  });
});
