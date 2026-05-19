import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tool } from "@opencode-ai/plugin";

type Workspace = "root" | "benchtest" | "e2e" | "server" | "shared" | "ui" | "opencode" | "docs" | "scripts";

type RiskLabel =
  | "api-contract"
  | "auth-session"
  | "terminal-stream"
  | "proxy-tunnel"
  | "sqlite-memory"
  | "react-render"
  | "zustand-state"
  | "bundle-build"
  | "e2e-user-flow"
  | "opencode-workflow"
  | "secrets"
  | "docs-only"
  | "low-risk";

interface ToolContext {
  directory?: string;
  worktree?: string;
}

interface FileClassification {
  file: string;
  workspace: Workspace;
  risks: RiskLabel[];
}

function repoRoot(context: ToolContext): string {
  return context.worktree || context.directory || process.cwd();
}

function runGit(root: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function readJson(root: string, path: string): Record<string, unknown> | null {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function workspaceFor(file: string): Workspace {
  if (file.startsWith(".opencode/") || file === "opencode.json.example" || file === "AGENTS.md") return "opencode";
  if (file.startsWith("benchtest/") || file === "benchtest-run.mjs") return "benchtest";
  if (file.startsWith("e2e/")) return "e2e";
  if (file.startsWith("server/")) return "server";
  if (file.startsWith("shared/")) return "shared";
  if (file.startsWith("ui/")) return "ui";
  if (file.startsWith("docs/") || file.startsWith("codemaps/") || /(^|\/)(README|CHANGELOG|CONTRIBUTING|ROADMAP|TASKS|DESIGN|BENCH)\.md$/i.test(file)) return "docs";
  if (file.startsWith("scripts/")) return "scripts";
  return "root";
}

function risksFor(file: string): RiskLabel[] {
  const lower = file.toLowerCase();
  const risks = new Set<RiskLabel>();

  if (file.startsWith(".opencode/") || file === "opencode.json.example" || file === "AGENTS.md") risks.add("opencode-workflow");
  if (file.startsWith("e2e/") || lower.includes("playwright")) risks.add("e2e-user-flow");
  if (/\.env(\.|$)|\.pem$|\.key$|id_rsa|id_ed25519|\.npmrc$|\.pypirc$/i.test(file)) risks.add("secrets");
  if (/shared\/src|server\/src\/.*routes|ui\/src\/(services|store|api)/i.test(file)) risks.add("api-contract");
  if (/auth|session|token|cookie|cors|csrf|permission/i.test(lower)) risks.add("auth-session");
  if (/terminal|pty|xterm|stream|sse|eventsource|websocket|socket/i.test(lower)) risks.add("terminal-stream");
  if (/proxy|tunnel|upstream|opencode_url|cors/i.test(lower)) risks.add("proxy-tunnel");
  if (/sqlite|memory|migration|repository|database|\.sql$/i.test(lower)) risks.add("sqlite-memory");
  if (/ui\/src\/.*\.(tsx|jsx)$|component|render|codemirror|xterm/i.test(file)) risks.add("react-render");
  if (/zustand|store|selector/i.test(lower)) risks.add("zustand-state");
  if (/vite|rollup|bundle|package-lock|package\.json|tsconfig|eslint|workbox/i.test(lower)) risks.add("bundle-build");
  if (workspaceFor(file) === "docs") risks.add("docs-only");

  if (risks.size === 0) risks.add("low-risk");
  return [...risks].sort();
}

function classify(files: string[]): FileClassification[] {
  return unique(files).map((file) => ({ file, workspace: workspaceFor(file), risks: risksFor(file) }));
}

function changedFileList(root: string): string[] {
  const diffFiles = runGit(root, ["diff", "--name-only", "HEAD", "--"])
    .split("\n")
    .map((line) => line.trim());
  const stagedFiles = runGit(root, ["diff", "--cached", "--name-only", "--"])
    .split("\n")
    .map((line) => line.trim());
  const statusFiles = runGit(root, ["status", "--short"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim().replace(/^"|"$/g, ""));
  return unique([...diffFiles, ...stagedFiles, ...statusFiles]);
}

function verificationCommands(classifications: FileClassification[]): string[] {
  const files = classifications.map((entry) => entry.file);
  const workspaces = new Set(classifications.map((entry) => entry.workspace));
  const risks = new Set(classifications.flatMap((entry) => entry.risks));
  const commands: string[] = [];

  if (files.length === 0) return ["git status --short"];
  if (workspaces.has("opencode")) commands.push("npm run check:opencode");
  if (workspaces.has("shared")) commands.push("npm run typecheck -w shared", "npm run build -w shared");
  if (workspaces.has("server")) commands.push("npm run typecheck -w server", "npm run build -w server");
  if (workspaces.has("ui")) commands.push("npm run typecheck -w ui", "npm run test -w ui");
  if (workspaces.has("e2e") || risks.has("e2e-user-flow")) commands.push("npm run typecheck -w e2e", "npm run test:e2e");
  if (workspaces.has("benchtest")) commands.push("npm run benchtest:quick");
  if (risks.has("bundle-build") || workspaces.has("root") || workspaces.has("scripts")) commands.push("npm run typecheck", "npm run build");
  if (risks.has("terminal-stream") || risks.has("proxy-tunnel") || risks.has("auth-session") || risks.has("sqlite-memory")) commands.push("npm run typecheck -w server");
  if (risks.has("react-render") || risks.has("zustand-state")) commands.push("npm run typecheck -w ui", "npm run test -w ui");

  if (commands.length === 0 && classifications.every((entry) => entry.risks.includes("docs-only"))) commands.push("git diff --check");
  return unique(commands);
}

function formatClassifications(classifications: FileClassification[]): string {
  if (classifications.length === 0) return "No changed files detected.";
  return classifications.map((entry) => `- ${entry.file} [${entry.workspace}] risks=${entry.risks.join(",")}`).join("\n");
}

export const changed_files = tool({
  description: "Return compact changed-file, workspace, and risk summary for Pilot.",
  args: {},
  async execute(_args, context) {
    const root = repoRoot(context);
    const files = changedFileList(root);
    const classifications = classify(files);
    const workspaces = unique(classifications.map((entry) => entry.workspace));
    const risks = unique(classifications.flatMap((entry) => entry.risks));
    return [
      "PILOT CHANGED FILES",
      `root: ${root}`,
      `files: ${files.length}`,
      `workspaces: ${workspaces.join(", ") || "none"}`,
      `risks: ${risks.join(", ") || "none"}`,
      "",
      formatClassifications(classifications),
    ].join("\n");
  },
});

export const risk_scan = tool({
  description: "Flag high-risk Pilot file categories and reviewer needs from a file list or current diff.",
  args: {
    files: tool.schema.array(tool.schema.string()).optional(),
  },
  async execute(args, context) {
    const root = repoRoot(context);
    const files = args.files?.length ? args.files : changedFileList(root);
    const classifications = classify(files);
    const risks = unique(classifications.flatMap((entry) => entry.risks));
    const reviewers = new Set<string>();

    if (risks.includes("api-contract")) reviewers.add("api-contract-reviewer");
    if (risks.some((risk) => ["auth-session", "proxy-tunnel", "terminal-stream", "sqlite-memory", "secrets"].includes(risk))) reviewers.add("security-auditor");
    if (risks.includes("terminal-stream")) reviewers.add("terminal-stream-reviewer");
    if (risks.includes("sqlite-memory")) reviewers.add("sqlite-memory-reviewer");
    if (risks.some((risk) => ["react-render", "zustand-state", "bundle-build"].includes(risk))) reviewers.add("performance-reviewer");
    if (risks.some((risk) => ["react-render", "zustand-state"].includes(risk))) reviewers.add("ui-render-reviewer");
    if (risks.includes("opencode-workflow")) reviewers.add("code-reviewer");

    return [
      "PILOT RISK SCAN",
      `risks: ${risks.join(", ") || "none"}`,
      `reviewers: ${[...reviewers].sort().join(", ") || "none"}`,
      "",
      formatClassifications(classifications),
    ].join("\n");
  },
});

export const verify_plan = tool({
  description: "Return the narrowest adequate verification commands for changed Pilot files.",
  args: {
    files: tool.schema.array(tool.schema.string()).optional(),
  },
  async execute(args, context) {
    const root = repoRoot(context);
    const files = args.files?.length ? args.files : changedFileList(root);
    const classifications = classify(files);
    const commands = verificationCommands(classifications);
    return [
      "PILOT VERIFY PLAN",
      `files: ${files.length}`,
      "commands:",
      ...commands.map((command) => `- ${command}`),
      "",
      "basis:",
      formatClassifications(classifications),
    ].join("\n");
  },
});

export const repo_map = tool({
  description: "Return compact Pilot workspace, scripts, and key-directory map.",
  args: {},
  async execute(_args, context) {
    const root = repoRoot(context);
    const rootPackage = readJson(root, "package.json");
    const workspaces = Array.isArray(rootPackage?.workspaces) ? rootPackage.workspaces.map(String) : [];
    const rootScripts = rootPackage?.scripts && typeof rootPackage.scripts === "object" ? Object.keys(rootPackage.scripts as Record<string, unknown>).sort() : [];
    const workspaceLines = workspaces.map((workspace) => {
      const pkg = readJson(root, `${workspace}/package.json`);
      const scripts = pkg?.scripts && typeof pkg.scripts === "object" ? Object.keys(pkg.scripts as Record<string, unknown>).sort() : [];
      return `- ${workspace}: scripts=${scripts.join(",") || "none"}`;
    });

    return [
      "PILOT REPO MAP",
      `root scripts: ${rootScripts.join(", ") || "none"}`,
      "workspaces:",
      ...workspaceLines,
      "key paths:",
      "- server/src: Hono API, proxy, memory, n9router chat, terminal/server boundaries",
      "- shared/src: cross-workspace contracts and DTOs",
      "- ui/src: React/Vite client, state stores, services, terminal UI",
      "- e2e: Playwright flows",
      "- benchtest: OpenCode workflow benchmarks",
      "- .opencode: agents, commands, rules, skills, and plugins",
    ].join("\n");
  },
});
