import { RtkCompressorPlugin } from "../rtk-compressor";

const mockContext: any = { $: async () => {} };

/** Standard input that satisfies the hook type */
const mockInput: any = {
  tool: "bash",
  sessionID: "ses_test",
  callID: "call_1",
  args: {},
};

/** Pad text to a minimum length by appending lines */
function padToMinLen(text: string, minLen: number = 2200): string {
  if (text.length >= minLen) return text;
  const lines = text.split("\n");
  const last = lines[lines.length - 1] || " padding";
  const needed = Math.ceil((minLen - text.length) / (last.length + 1));
  for (let i = 0; i < needed; i++) {
    text += "\n" + last + " x" + i;
  }
  return text;
}

// ─── Suite ────────────────────────────────────────────────────────────────

describe("RtkCompressorPlugin", () => {
  const getHook = async () => {
    const plugin = await RtkCompressorPlugin(mockContext);
    const hook = plugin["tool.execute.after"];
    if (!hook) throw new Error("Hook not found");
    return hook;
  };

  it("skips output < 2048 bytes", async () => {
    const hook = await getHook();

    const small = "small output";
    const output: any = { output: small };

    await hook(mockInput, output);

    expect(output.output).toBe(small);
  });

  it("skips non-string output", async () => {
    const hook = await getHook();

    const numOut: any = { output: 12345 };
    const nullOut: any = { output: null };
    const objOut: any = { output: { key: "value" } };

    await hook(mockInput, numOut);
    await hook(mockInput, nullOut);
    await hook(mockInput, objOut);

    expect(numOut.output).toBe(12345);
    expect(nullOut.output).toBeNull();
    expect(objOut.output).toEqual({ key: "value" });
  });

  it("returns early for empty input", async () => {
    const hook = await getHook();

    const output: any = { output: "" };

    await hook(mockInput, output);

    expect(output.output).toBe("");
  });

  it("detects git-diff and truncates long hunks > 100 lines", async () => {
    const hook = await getHook();

    const hunkLines = Array.from(
      { length: 150 },
      (_, i) => ` line${i} const val = ${i};`,
    );
    const diff = [
      "diff --git a/src/file.ts b/src/file.ts",
      "index abc123..def456 100644",
      "--- a/src/file.ts",
      "+++ b/src/file.ts",
      "@@ -1,3 +1,5 @@",
      ...hunkLines,
    ].join("\n");

    const text = padToMinLen(diff);
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: git-diff");
    expect(output.output).toContain("lines omitted");
    expect(output.output!.length).toBeLessThan(text.length);
  });

  it("detects git-status and summarizes porcelain", async () => {
    const hook = await getHook();

    // Need compressible data: untracked files save 1 char/line vs staged +1.
    // Mix: many untracked + few staged/unstaged so grouping saves bytes.
    const staged = Array.from(
      { length: 30 },
      (_, i) => `M  src/staged/file${i}.ts`,
    );
    const unstaged = Array.from(
      { length: 20 },
      (_, i) => ` M src/unstaged/file${i}.ts`,
    );
    const untracked = Array.from(
      { length: 300 },
      (_, i) => `?? src/untracked/file${i}.ts`,
    );
    const text = [...staged, ...unstaged, ...untracked].join("\n");
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: git-status");
    expect(output.output).toContain("Unstaged (20)");
    expect(output.output).toContain("Untracked (300)");
  });

  it("detects grep and caps at 10 per file", async () => {
    const hook = await getHook();

    const lines: string[] = [];
    for (let i = 0; i < 50; i++) {
      lines.push(`src/a.ts:${i}:export function foo${i}() {}`);
    }
    for (let i = 0; i < 50; i++) {
      lines.push(`src/b.ts:${i}:export function bar${i}() {}`);
    }
    const text = padToMinLen(lines.join("\n"));
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: grep");
    expect(output.output).toContain("additional matches omitted");
    expect(output.output!.length).toBeLessThan(text.length);
  });

  it("detects find and caps paths", async () => {
    const hook = await getHook();

    const lines = Array.from(
      { length: 50 },
      (_, i) => `./src/modules/${i}/file${i}.ts`,
    );
    const text = padToMinLen(lines.join("\n"));
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: find");
    expect(output.output).toContain("paths omitted");
  });

  it("detects tree and caps at 200 lines", async () => {
    const hook = await getHook();

    const lines = Array.from({ length: 300 }, (_, i) => `├── file${i}.ts`);
    const text = lines.join("\n");
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: tree");
    expect(output.output).toContain("lines omitted");
  });

  it("detects ls and summarizes extensions", async () => {
    const hook = await getHook();

    const entries = Array.from(
      { length: 50 },
      (_, i) =>
        `-rw-r--r--  1 user user  ${100 + i} Jan 1 12:00 file${i % 3}.${
          ["ts", "js", "json"][i % 3]
        }`,
    );
    const text = "total 256\n" + entries.join("\n");
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: ls");
    expect(output.output).toContain("Top types");
  });

  it("applies filterDedupLog for large repetitive unknown text", async () => {
    const hook = await getHook();

    const lines: string[] = [];
    for (let i = 0; i < 300; i++) {
      lines.push(`Processing item ${i % 5}`);
    }
    const text = lines.join("\n");
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: dedup-log");
    expect(output.output).toContain("[line repeated");
    expect(output.output!.length).toBeLessThan(text.length);
  });

  it("falls back to filterSmartTruncate for large unknown text (< 250 lines)", async () => {
    const hook = await getHook();

    const lines = Array.from(
      { length: 200 },
      (_, i) => `Some unique log line ${i}: value=${i * 100}`,
    );
    const text = lines.join("\n");
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    // filterSmartTruncate returns original for < 250 lines, so no change
    expect(output.output).toBe(text);
  });

  it("does not replace if compressed >= raw length", async () => {
    const hook = await getHook();

    const lines = Array.from(
      { length: 150 },
      (_, i) => `UniqueLine${i}_${"x".repeat(20)}`,
    );
    const text = lines.join("\n");
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toBe(text);
  });

  it("annotates output with RTK tag in correct format", async () => {
    const hook = await getHook();

    const hunkLines = Array.from(
      { length: 150 },
      (_, i) => ` line${i} ${"x".repeat(15)}`,
    );
    const text =
      "diff --git a/file.ts b/file.ts\n@@ -1,3 +1,5 @@\n" +
      hunkLines.join("\n");

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toMatch(/\[RTK: git-diff \d+→\d+ bytes \(-\d+\)\]/);
  });

  it("mutates output.content when present", async () => {
    const hook = await getHook();

    const hunkLines = Array.from(
      { length: 150 },
      (_, i) => ` line${i} ${"x".repeat(15)}`,
    );
    const text =
      "diff --git a/file.ts b/file.ts\n@@ -1,3 +1,5 @@\n" +
      hunkLines.join("\n");

    const output: any = { content: text };
    await hook(mockInput, output);

    expect(output.content).toContain("[RTK: git-diff");
    expect(output.output).toBeUndefined();
  });

  it("mutates output.output when present", async () => {
    const hook = await getHook();

    const hunkLines = Array.from(
      { length: 150 },
      (_, i) => ` line${i} ${"x".repeat(15)}`,
    );
    const text =
      "diff --git a/file.ts b/file.ts\n@@ -1,3 +1,5 @@\n" +
      hunkLines.join("\n");

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: git-diff");
    expect(output.content).toBeUndefined();
  });

  it("suppresses repeated lines with filterDedupLog in large repetitive output", async () => {
    const hook = await getHook();

    // Use data without colon-number-colon pattern (avoid grep detection)
    const lines: string[] = [];
    for (let i = 0; i < 350; i++) {
      const status = i % 3 === 0 ? "ok" : "waiting";
      lines.push(`status ${status} iteration ${i % 5}`);
    }
    const text = lines.join("\n");
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toContain("[RTK: dedup-log");
    expect(output.output).toContain("[line repeated");
    expect(output.output!.length).toBeLessThan(text.length);
  });

  it("filterSmartTruncate does not change < 250 line unknown text", async () => {
    const hook = await getHook();

    const lines = Array.from(
      { length: 240 },
      (_, i) =>
        `Custom metric ${i}: p50=${i % 100}ms p99=${(i % 100) * 3}ms count=${i * 10}`,
    );
    const text = lines.join("\n");
    expect(text.length).toBeGreaterThan(2048);

    const output: any = { output: text };
    await hook(mockInput, output);

    expect(output.output).toBe(text);
  });
});
