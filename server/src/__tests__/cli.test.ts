import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";

jest.mock("../index.js");

describe("parseArgs", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.PORT;
    delete process.env.OPENCODE_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults to port 3000 when no args or env", async () => {
    const { parseArgs } = await import("../cli.js");
    const result = parseArgs(["node", "cli.js"]);
    expect(result.port).toBe(3000);
    expect(result.openCodeUrl).toBeUndefined();
  });

  it("--port flag overrides port", async () => {
    const { parseArgs } = await import("../cli.js");
    const result = parseArgs(["node", "cli.js", "--port", "8080"]);
    expect(result.port).toBe(8080);
  });

  it("--opencode-url flag sets URL", async () => {
    const { parseArgs } = await import("../cli.js");
    const result = parseArgs([
      "node",
      "cli.js",
      "--opencode-url",
      "http://example.com:4096",
    ]);
    expect(result.openCodeUrl).toBe("http://example.com:4096");
    expect(result.port).toBe(3000);
  });

  it("--help prints help and calls process.exit(0)", async () => {
    const exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    const { parseArgs } = await import("../cli.js");
    parseArgs(["node", "cli.js", "--help"]);

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("invalid port after parsing defaults to 3000", async () => {
    const { parseArgs } = await import("../cli.js");
    const result = parseArgs(["node", "cli.js", "--port", "abc"]);
    expect(result.port).toBe(3000);
  });

  it("PORT env var sets default port", async () => {
    process.env.PORT = "4000";
    const { parseArgs } = await import("../cli.js");
    const result = parseArgs(["node", "cli.js"]);
    expect(result.port).toBe(4000);
  });
});
