import type { Plugin } from "@opencode-ai/plugin";

const MIN_BYTES = 800;
const MAX_ISSUES = 40;
const MAX_CONTEXT_LINES = 3;

const RE_TSC = /error TS\d+:/;
const RE_ESLINT = /\s+\d+:\d+\s+(error|warning)\s+/;
const RE_JEST = /(^|\n)(FAIL|PASS)\s+.*\.(test|spec)\.[jt]sx?/;
const RE_PLAYWRIGHT = /\b(playwright|Error:\s+expect\(|trace\.zip|test-results|locator\(|page\.)\b/i;
const RE_VITE = /\b(vite v|RollupError|dist\/|built in|transforming \(|rendering chunks)\b/i;
const RE_NPM = /(^|\n)>\s+[^\n]+\n>\s+(build|typecheck|lint|test|test:e2e|benchtest)/;

type NamedFilter = {
  name: string;
  test: (text: string) => boolean;
  filter: (text: string) => string;
};

function firstMatchingLines(text: string, predicate: (line: string) => boolean): string[] {
  const lines = text.split("\n");
  const out: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!predicate(line)) continue;
    const start = Math.max(0, index - MAX_CONTEXT_LINES);
    const end = Math.min(lines.length, index + MAX_CONTEXT_LINES + 1);
    out.push(...lines.slice(start, end), "---");
    if (out.length > MAX_ISSUES * (MAX_CONTEXT_LINES * 2 + 2)) break;
  }
  return out.slice(0, MAX_ISSUES * (MAX_CONTEXT_LINES * 2 + 2));
}

function uniqueLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.trim();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(line);
  }
  return out;
}

function filterTsc(text: string): string {
  const lines = firstMatchingLines(text, (line) => RE_TSC.test(line));
  return ["TypeScript errors:", ...uniqueLines(lines)].join("\n");
}

function filterEslint(text: string): string {
  const lines = firstMatchingLines(text, (line) => RE_ESLINT.test(line) || /✖ \d+ problems?/.test(line));
  return ["ESLint findings:", ...uniqueLines(lines)].join("\n");
}

function filterJest(text: string): string {
  const lines = firstMatchingLines(text, (line) => /(^|\s)(FAIL|●|Expected|Received|at\s+)/.test(line));
  return ["Jest output summary:", ...uniqueLines(lines)].join("\n");
}

function filterPlaywright(text: string): string {
  const lines = firstMatchingLines(text, (line) => /\b(Error:|Timeout|expect\(|locator\(|trace\.zip|test-results|failed)\b/i.test(line));
  return ["Playwright output summary:", ...uniqueLines(lines)].join("\n");
}

function filterVite(text: string): string {
  const lines = firstMatchingLines(text, (line) => /\b(RollupError|error during build|failed to resolve|Could not resolve|built in|dist\/)\b/i.test(line));
  return ["Vite/Rollup output summary:", ...uniqueLines(lines)].join("\n");
}

function filterNpm(text: string): string {
  const lines = text
    .split("\n")
    .filter((line) => /^(>|npm ERR!|npm error|Error:|FAIL|error TS\d+:|\s*\d+:\d+\s+(error|warning))/.test(line))
    .slice(0, MAX_ISSUES * 2);
  return ["npm workspace output summary:", ...uniqueLines(lines)].join("\n");
}

const FILTERS: NamedFilter[] = [
  { name: "tsc-error", test: (text) => RE_TSC.test(text), filter: filterTsc },
  { name: "eslint-error", test: (text) => RE_ESLINT.test(text), filter: filterEslint },
  { name: "jest-failure", test: (text) => RE_JEST.test(text), filter: filterJest },
  { name: "playwright-failure", test: (text) => RE_PLAYWRIGHT.test(text), filter: filterPlaywright },
  { name: "vite-build", test: (text) => RE_VITE.test(text), filter: filterVite },
  { name: "npm-workspace-log", test: (text) => RE_NPM.test(text), filter: filterNpm },
];

function getRawOutput(output: unknown): string | null {
  const raw: unknown = (output as any)?.output ?? (output as any)?.content ?? output;
  return typeof raw === "string" ? raw : null;
}

function setOutput(output: unknown, value: string): void {
  if ((output as any)?.output !== undefined) {
    (output as any).output = value;
  } else if ((output as any)?.content !== undefined) {
    (output as any).content = value;
  }
}

export const BuildLogCompressorPlugin: Plugin = async () => {
  return {
    "tool.execute.after": async (_input: unknown, output: unknown) => {
      const raw = getRawOutput(output);
      if (!raw || raw.length < MIN_BYTES) return;
      if (raw.includes("[RTK: build-log")) return;

      const selected = FILTERS.find((entry) => entry.test(raw));
      if (!selected) return;

      const compressed = selected.filter(raw).trim();
      if (!compressed || compressed.length >= raw.length) return;

      const saved = raw.length - compressed.length;
      setOutput(output, `${compressed}\n\n[RTK: build-log/${selected.name} ${raw.length}→${compressed.length} bytes (-${saved})]`);
    },
  };
};
