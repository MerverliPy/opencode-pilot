/**
 * Tool executor — runs tool calls and returns results.
 * Security: resolves paths against workspace root, blocks traversal.
 */
import { readFileSync, statSync, readdirSync, existsSync } from "node:fs";
import { resolve, relative, normalize } from "node:path";
import { spawnSync } from "node:child_process";

const WORKSPACE_ROOT = resolve(process.cwd());
const MAX_FILE_SIZE = 100 * 1024; // 100KB
const MAX_SEARCH_RESULTS = 50;
const MAX_TREE_DEPTH = 5;

/**
 * Resolve a user-provided path safely within workspace.
 * Throws if path escapes workspace.
 */
function resolvePath(userPath: string): string {
  const resolved = resolve(WORKSPACE_ROOT, normalize(userPath));
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Path traversal blocked: ${userPath}`);
  }
  return resolved;
}

/**
 * Sanitize a regex pattern to prevent injection and ReDoS.
 * Strips null bytes, limits length, and validates input.
 */
function sanitizePattern(pattern: string): string {
  if (!pattern || pattern.length === 0) {
    throw new Error("pattern is required");
  }
  // Strip null bytes
  let sanitized = pattern.replace(/\0/g, "");
  // Limit pattern length
  if (sanitized.length > 1000) {
    sanitized = sanitized.slice(0, 1000);
  }
  return sanitized;
}

/**
 * Tool: read_file - Read file contents.
 */
function readFileTool(args: Record<string, unknown>): string {
  const path = String(args.path ?? "");
  if (!path) throw new Error("path is required");
  const fullPath = resolvePath(path);
  if (!existsSync(fullPath)) throw new Error(`File not found: ${path}`);
  const stat = statSync(fullPath);
  if (!stat.isFile()) throw new Error(`Not a file: ${path}`);
  if (stat.size > MAX_FILE_SIZE) {
    return `[File too large: ${(stat.size / 1024).toFixed(0)}KB. Max ${MAX_FILE_SIZE / 1024}KB. Use offset/limit to read parts.]`;
  }
  const content = readFileSync(fullPath, "utf-8");
  const lines = content.split("\n");
  const offset = Number(args.offset ?? 0);
  const limit = args.limit !== undefined ? Number(args.limit) : lines.length;
  const sliced = lines.slice(offset, offset + limit);
  const header = `File: ${relative(WORKSPACE_ROOT, fullPath)} (${lines.length} lines)`;
  const lineNums = sliced.map((line: string, i: number) => `${offset + i + 1}: ${line}`).join("\n");
  return `${header}\n${lineNums}`;
}

/**
 * Tool: search_code - Grep for regex pattern.
 */
function searchCodeTool(args: Record<string, unknown>): string {
  const pattern = sanitizePattern(String(args.pattern ?? ""));
  const include = args.include ? sanitizePattern(String(args.include)) : "";
  const searchPath = args.path ? resolvePath(String(args.path)) : WORKSPACE_ROOT;
  const relPath = relative(WORKSPACE_ROOT, searchPath) || ".";

  const rgArgs: string[] = [];
  if (include) {
    rgArgs.push("-g", include);
  }
  rgArgs.push("--line-number", "--with-filename", "-i", "--", pattern, relPath);
  const result = spawnSync("rg", rgArgs, {
    cwd: WORKSPACE_ROOT,
    encoding: "utf-8",
    maxBuffer: MAX_FILE_SIZE,
    timeout: 10_000,
  });
  if (result.status === 0 || result.status === 1) {
    const lines = result.stdout.trim().split("\n").filter(Boolean).slice(0, MAX_SEARCH_RESULTS);
    if (lines.length === 0) return "No results found.";
    const summary = `Found ${lines.length} result${lines.length === 1 ? "" : "s"}`;
    return `${summary}\n${lines.join("\n")}`;
  }
  // rg exit code 2 = error; return error details
  if (result.stderr) {
    return `Search error: ${result.stderr.trim()}`;
  }
  return `Search error: rg exited with status ${result.status}`;
}

/**
 * Tool: list_directory - List files and directories.
 */
function listDirectoryTool(args: Record<string, unknown>): string {
  const dirPath = args.path ? String(args.path) : ".";
  const fullPath = resolvePath(dirPath);
  if (!existsSync(fullPath)) throw new Error(`Directory not found: ${dirPath}`);
  const stat = statSync(fullPath);
  if (!stat.isDirectory()) throw new Error(`Not a directory: ${dirPath}`);
  const entries = readdirSync(fullPath, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => `📁 ${e.name}/`);
  const files = entries.filter((e) => e.isFile()).map((e) => `📄 ${e.name}`);
  const header = `Directory: ${relative(WORKSPACE_ROOT, fullPath) || "."} (${entries.length} items)`;
  return [header, ...dirs, ...files].join("\n");
}

/**
 * Build a tree string recursively.
 */
function buildTree(dirPath: string, prefix: string, depth: number, maxDepth: number): string[] {
  if (depth > maxDepth) return [`${prefix}└── ...`];
  const entries = readdirSync(dirPath, { withFileTypes: true }).sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });
  const lines: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    lines.push(`${prefix}${connector}${e.name}${e.isDirectory() ? "/" : ""}`);
    if (e.isDirectory()) {
      const childPath = resolve(dirPath, e.name);
      lines.push(...buildTree(childPath, `${prefix}${childPrefix}`, depth + 1, maxDepth));
    }
  }
  return lines;
}

/**
 * Tool: get_project_tree - Show project tree structure.
 */
function getProjectTreeTool(args: Record<string, unknown>): string {
  const treePath = args.path ? String(args.path) : ".";
  const depth = Math.min(MAX_TREE_DEPTH, Math.max(1, Number(args.depth ?? 2)));
  const fullPath = resolvePath(treePath);
  if (!existsSync(fullPath)) throw new Error(`Path not found: ${treePath}`);
  const relPath = relative(WORKSPACE_ROOT, fullPath) || ".";
  const header = `Project tree: ${relPath} (depth=${depth})`;
  const tree = buildTree(fullPath, "", 0, depth);
  return [header, ...tree].join("\n");
}

/** Map of tool name to executor function. */
const TOOL_EXECUTORS: Record<string, (args: Record<string, unknown>) => string> = {
  read_file: readFileTool,
  search_code: searchCodeTool,
  list_directory: listDirectoryTool,
  get_project_tree: getProjectTreeTool,
};

/** Execute a tool call and return the result string. */
export function executeToolCall(name: string, args: Record<string, unknown>): string {
  const executor = TOOL_EXECUTORS[name];
  if (!executor) {
    return `[Error: Unknown tool "${name}". Available: ${Object.keys(TOOL_EXECUTORS).join(", ")}]`;
  }
  try {
    return executor(args);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `[Error executing ${name}: ${msg}]`;
  }
}

export { WORKSPACE_ROOT };
