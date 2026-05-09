/**
 * RTK Compressor Plugin
 *
 * Conservative port of n9router's RealToolKit (RTK) context-compression system.
 * Only activates when tool output exceeds COMPRESS_THRESHOLD bytes.
 * Auto-detects output format and applies the appropriate filter.
 *
 * Filters ported from: open-sse/rtk/ (n9router)
 * Detection order: git-diff → git-status → grep → find → tree → ls → dedup-log → smart-truncate
 */

import type { Plugin } from "@opencode-ai/plugin";

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPRESS_THRESHOLD = 2048; // bytes — skip outputs smaller than this
const DETECT_WINDOW = 1024; // chars — peek window for format detection
const SMART_TRUNCATE_HEAD = 120; // lines kept from top
const SMART_TRUNCATE_TAIL = 60; // lines kept from bottom
const SMART_TRUNCATE_MIN_LINES = 250; // only kick in above this
const GIT_DIFF_HUNK_MAX_LINES = 100; // lines per git-diff hunk
const GIT_DIFF_CONTEXT_KEEP = 3; // context lines around changes
const GREP_PER_FILE_MAX = 10; // max matches shown per file
const FIND_PER_DIR_MAX = 10; // max paths per directory
const TREE_MAX_LINES = 200; // max tree output lines
const LS_EXT_SUMMARY_TOP = 5; // top-N extensions shown in ls summary
const DEDUP_LINE_MAX = 2000; // dedup-log truncation cap

// ─── Auto-detect ─────────────────────────────────────────────────────────────

const RE_GIT_DIFF = /^diff --git /m;
const RE_GIT_DIFF_HUNK = /^@@ /m;
const RE_GIT_STATUS =
  /^On branch |^nothing to commit|^Changes (not |to be )|^Untracked files:/m;
const RE_PORCELAIN = /^[ MADRCU?!][ MADRCU?!] \S/m;
const RE_TREE_GLYPH = /[├└]──|│  /;
const RE_LS_ROW = /^[-dlbcps][rwx-]{9}/m;
const RE_LS_TOTAL = /^total \d+$/m;

type FilterFn = (text: string) => string;

function autoDetectFilter(text: string): FilterFn | null {
  const head =
    text.length > DETECT_WINDOW ? text.slice(0, DETECT_WINDOW) : text;

  if (RE_GIT_DIFF.test(head) || RE_GIT_DIFF_HUNK.test(head))
    return filterGitDiff;
  if (RE_GIT_STATUS.test(head) || isMostlyPorcelain(head))
    return filterGitStatus;

  const lines = head.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const first5 = nonEmpty.slice(0, 5);

  if (first5.some(isGrepLine)) return filterGrep;
  if (nonEmpty.length >= 3 && nonEmpty.every(isPathLike)) return filterFind;
  if (RE_TREE_GLYPH.test(head)) return filterTree;
  if (RE_LS_TOTAL.test(head) || countMatches(head, RE_LS_ROW) >= 3)
    return filterLs;

  const allLines = text.split("\n");
  if (allLines.length >= SMART_TRUNCATE_MIN_LINES) return filterDedupLog;

  return null;
}

// ─── Detection helpers ────────────────────────────────────────────────────────

function isGrepLine(line: string): boolean {
  const first = line.indexOf(":");
  if (first === -1) return false;
  const second = line.indexOf(":", first + 1);
  if (second === -1) return false;
  return /^\d+$/.test(line.slice(first + 1, second));
}

function isPathLike(line: string): boolean {
  const t = line.trim();
  if (!t || t.includes(":")) return false;
  return t.startsWith(".") || t.startsWith("/") || t.includes("/");
}

function isMostlyPorcelain(head: string): boolean {
  const lines = head.split("\n").filter((l) => l.trim());
  if (lines.length < 3) return false;
  const hits = lines.filter((l) => RE_PORCELAIN.test(l)).length;
  return hits / lines.length >= 0.6;
}

function countMatches(text: string, re: RegExp): number {
  const g = new RegExp(
    re.source,
    re.flags.includes("g") ? re.flags : re.flags + "g",
  );
  return (text.match(g) || []).length;
}

// ─── Filters ──────────────────────────────────────────────────────────────────

/** Trim git-diff hunks that exceed GIT_DIFF_HUNK_MAX_LINES lines */
function filterGitDiff(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let hunkLines = 0;
  let hunkSkipped = 0;
  let inHunk = false;

  for (const line of lines) {
    if (
      line.startsWith("diff --git") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    ) {
      // flush any pending skip notice
      if (hunkSkipped > 0) {
        out.push(`... [${hunkSkipped} lines omitted] ...`);
        hunkSkipped = 0;
      }
      inHunk = false;
      hunkLines = 0;
      out.push(line);
      continue;
    }
    if (line.startsWith("@@")) {
      if (hunkSkipped > 0) {
        out.push(`... [${hunkSkipped} lines omitted] ...`);
        hunkSkipped = 0;
      }
      inHunk = true;
      hunkLines = 0;
      out.push(line);
      continue;
    }
    if (inHunk) {
      hunkLines++;
      if (hunkLines <= GIT_DIFF_HUNK_MAX_LINES) {
        out.push(line);
      } else {
        hunkSkipped++;
      }
    } else {
      out.push(line);
    }
  }
  if (hunkSkipped > 0) out.push(`... [${hunkSkipped} lines omitted] ...`);
  return out.join("\n");
}

/** Summarise git-status porcelain output */
function filterGitStatus(text: string): string {
  const lines = text.split("\n");
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  const other: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    if (RE_PORCELAIN.test(line)) {
      const xy = line.slice(0, 2);
      const file = line.slice(3);
      if (xy[0] !== " " && xy[0] !== "?") staged.push(`  ${xy[0]} ${file}`);
      if (xy[1] !== " " && xy[1] !== "?") unstaged.push(`  ${xy[1]} ${file}`);
      if (xy === "??") untracked.push(`  ${file}`);
    } else {
      other.push(line);
    }
  }

  const parts: string[] = [];
  if (other.length) parts.push(other.join("\n"));
  if (staged.length)
    parts.push(`Staged (${staged.length}):\n${staged.join("\n")}`);
  if (unstaged.length)
    parts.push(`Unstaged (${unstaged.length}):\n${unstaged.join("\n")}`);
  if (untracked.length)
    parts.push(`Untracked (${untracked.length}):\n${untracked.join("\n")}`);
  return parts.join("\n\n");
}

/** Cap grep results per file */
function filterGrep(text: string): string {
  const lines = text.split("\n");
  const fileCounts: Map<string, number> = new Map();
  const out: string[] = [];
  let totalSkipped = 0;

  for (const line of lines) {
    if (!line.trim()) {
      out.push(line);
      continue;
    }
    const colon1 = line.indexOf(":");
    if (colon1 === -1) {
      out.push(line);
      continue;
    }
    const colon2 = line.indexOf(":", colon1 + 1);
    if (colon2 === -1) {
      out.push(line);
      continue;
    }
    const file = line.slice(0, colon1);
    const count = (fileCounts.get(file) || 0) + 1;
    fileCounts.set(file, count);
    if (count <= GREP_PER_FILE_MAX) {
      out.push(line);
    } else {
      totalSkipped++;
    }
  }

  if (totalSkipped > 0) {
    out.push(
      `... [${totalSkipped} additional matches omitted (>${GREP_PER_FILE_MAX} per file)] ...`,
    );
  }
  return out.join("\n");
}

/** Cap find output paths */
function filterFind(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length <= FIND_PER_DIR_MAX * 2) return text;
  const kept = lines.slice(0, FIND_PER_DIR_MAX);
  const skipped = lines.length - kept.length;
  return kept.join("\n") + `\n... [${skipped} paths omitted] ...`;
}

/** Cap tree output lines */
function filterTree(text: string): string {
  const lines = text.split("\n");
  if (lines.length <= TREE_MAX_LINES) return text;
  const kept = lines.slice(0, TREE_MAX_LINES);
  const skipped = lines.length - TREE_MAX_LINES;
  return kept.join("\n") + `\n... [${skipped} lines omitted] ...`;
}

/** Summarise ls -la output */
function filterLs(text: string): string {
  const lines = text.split("\n");
  const rows = lines.filter((l) => /^[-dlbcps][rwx-]{9}/.test(l));
  if (rows.length === 0) return text;

  // Count by extension
  const extCount: Map<string, number> = new Map();
  let dirs = 0;
  for (const row of rows) {
    const parts = row.split(/\s+/);
    const name = parts[parts.length - 1];
    if (row.startsWith("d")) {
      dirs++;
      continue;
    }
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? name.slice(dot) : "(no ext)";
    extCount.set(ext, (extCount.get(ext) || 0) + 1);
  }

  const topExts = [...extCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, LS_EXT_SUMMARY_TOP)
    .map(([e, n]) => `${e}:${n}`)
    .join("  ");

  const header = lines.find((l) => /^total/.test(l)) || "";
  return [
    header,
    `${dirs} dir(s), ${rows.length - dirs} file(s)`,
    topExts ? `Top types: ${topExts}` : "",
    "",
    ...rows.slice(0, 20),
    rows.length > 20 ? `... [${rows.length - 20} more entries] ...` : "",
  ]
    .filter((l) => l !== undefined)
    .join("\n");
}

/** Deduplicate repetitive log lines + cap total */
function filterDedupLog(text: string): string {
  const lines = text.split("\n");
  if (lines.length <= SMART_TRUNCATE_MIN_LINES) return text;

  const seen: Map<string, number> = new Map();
  const out: string[] = [];

  for (const line of lines) {
    const key = line.trim();
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    if (count === 1) {
      out.push(line);
    } else if (count === 2) {
      out.push(`  [line repeated, further duplicates suppressed]`);
    }
    if (out.length >= DEDUP_LINE_MAX) {
      const remaining = lines.length - lines.indexOf(line) - 1;
      if (remaining > 0) out.push(`... [${remaining} lines omitted] ...`);
      break;
    }
  }

  return out.join("\n");
}

/** Smart truncate: keep head + tail, drop middle */
function filterSmartTruncate(text: string): string {
  const lines = text.split("\n");
  if (lines.length < SMART_TRUNCATE_MIN_LINES) return text;
  const head = lines.slice(0, SMART_TRUNCATE_HEAD);
  const tail = lines.slice(-SMART_TRUNCATE_TAIL);
  const omitted = lines.length - SMART_TRUNCATE_HEAD - SMART_TRUNCATE_TAIL;
  return [...head, ``, `... [${omitted} lines omitted] ...`, ``, ...tail].join(
    "\n",
  );
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const RtkCompressorPlugin: Plugin = async ({ $ }) => {
  return {
    "tool.execute.after": async (input, output) => {
      // Only process tools that return text output
      const raw: unknown =
        (output as any)?.output ?? (output as any)?.content ?? output;
      if (typeof raw !== "string") return;
      if (raw.length < COMPRESS_THRESHOLD) return;

      const filter = autoDetectFilter(raw) ?? filterSmartTruncate;
      const compressed = filter(raw);

      // Only replace if we actually saved bytes
      if (compressed.length >= raw.length) return;

      const saved = raw.length - compressed.length;
      const filterName =
        filter === filterGitDiff
          ? "git-diff"
          : filter === filterGitStatus
            ? "git-status"
            : filter === filterGrep
              ? "grep"
              : filter === filterFind
                ? "find"
                : filter === filterTree
                  ? "tree"
                  : filter === filterLs
                    ? "ls"
                    : filter === filterDedupLog
                      ? "dedup-log"
                      : "smart-truncate";

      const annotated = `${compressed}\n\n[RTK: ${filterName} ${raw.length}→${compressed.length} bytes (-${saved})]`;

      // Mutate the output in place
      if ((output as any)?.output !== undefined) {
        (output as any).output = annotated;
      } else if ((output as any)?.content !== undefined) {
        (output as any).content = annotated;
      }
    },
  };
};
