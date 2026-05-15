/**
 * RTK Compressor Plugin
 *
 * Port of n9router's RealToolKit (RTK) context-compression system.
 * Activates when tool output exceeds COMPRESS_THRESHOLD bytes.
 * Auto-detects output format and applies the appropriate filter.
 *
 * Filters ported from: decolua/9router rtk/
 * Detection order:
 *   git-diff → git-status → grep → find → tree → ls
 *   → search-list → read-numbered → dedup-log → smart-truncate
 */

import type { Plugin } from "@opencode-ai/plugin";

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPRESS_THRESHOLD = 500;       // bytes — skip outputs smaller than this
const RAW_CAP = 10 * 1024 * 1024;    // 10 MiB — skip blobs too large to be useful
const DETECT_WINDOW = 1024;           // chars — peek window for format detection
const SMART_TRUNCATE_HEAD = 120;      // lines kept from top
const SMART_TRUNCATE_TAIL = 60;       // lines kept from bottom
const SMART_TRUNCATE_MIN_LINES = 250; // smart-truncate minimum line threshold
const GIT_DIFF_HUNK_MAX_LINES = 100; // lines per git-diff hunk
const GIT_DIFF_CONTEXT_KEEP = 3;     // context lines kept around changes
const GREP_PER_FILE_MAX = 10;         // max matches shown per file
const FIND_PER_DIR_MAX = 10;          // max paths per directory
const FIND_TOTAL_DIR_MAX = 20;        // max total paths shown
const TREE_MAX_LINES = 200;           // max tree output lines
const LS_EXT_SUMMARY_TOP = 5;         // top-N extensions shown in ls summary
const DEDUP_LINE_MAX = 2000;          // dedup-log truncation cap
const STATUS_MAX_FILES = 10;          // max staged/unstaged files shown
const STATUS_MAX_UNTRACKED = 10;      // max untracked files shown
const SEARCH_LIST_MAX = 50;           // max files shown in search-list output

// Suppress unused-variable warning for GIT_DIFF_CONTEXT_KEEP (parity constant)
void GIT_DIFF_CONTEXT_KEEP;

// ─── Regexes ─────────────────────────────────────────────────────────────────

const RE_GIT_DIFF = /^diff --git /m;
const RE_GIT_DIFF_HUNK = /^@@ /m;
const RE_GIT_STATUS =
  /^On branch |^nothing to commit|^Changes (not |to be )|^Untracked files:/m;
const RE_PORCELAIN = /^[ MADRCU?!][ MADRCU?!] \S/m;
const RE_TREE_GLYPH = /[├└]──|│  /;
const RE_LS_ROW = /^[-dlbcps][rwx-]{9}/m;
const RE_LS_TOTAL = /^total \d+$/m;
const RE_SEARCH_LIST = /^Result of search in '.+' \(total \d+ files?\):/m;
const RE_LINE_NUMBERED = /^\s*\d+\|/;

// ─── Auto-detect ─────────────────────────────────────────────────────────────

type FilterFn = (text: string) => string;

function autoDetectFilter(text: string): FilterFn | null {
  const head =
    text.length > DETECT_WINDOW ? text.slice(0, DETECT_WINDOW) : text;

  if (RE_GIT_DIFF.test(head) || RE_GIT_DIFF_HUNK.test(head))
    return filterGitDiff;
  if (RE_GIT_STATUS.test(head) || isMostlyPorcelain(head))
    return filterGitStatus;

  const headLines = head.split("\n");
  const headNonEmpty = headLines.filter((l) => l.trim().length > 0);
  const first5 = headNonEmpty.slice(0, 5);

  if (first5.some(isGrepLine)) return filterGrep;
  if (headNonEmpty.length >= 3 && headNonEmpty.every(isPathLike))
    return filterFind;
  if (RE_TREE_GLYPH.test(head)) return filterTree;
  if (RE_LS_TOTAL.test(head) || countMatches(head, RE_LS_ROW) >= 3)
    return filterLs;

  // Check against full text for less-common formats
  if (RE_SEARCH_LIST.test(text)) return filterSearchList;

  const allLines = text.split("\n");
  const allNonEmpty = allLines.filter((l) => l.trim().length > 0);

  // Cursor-style line-numbered file reads (N|content)
  if (
    allNonEmpty.length >= SMART_TRUNCATE_MIN_LINES &&
    allNonEmpty.slice(0, 10).every((l) => RE_LINE_NUMBERED.test(l))
  )
    return filterReadNumbered;

  // Dedup fires for any output with 5+ non-empty lines (matches upstream 9router behavior)
  if (allNonEmpty.length >= 5) return filterDedupLog;

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

// ─── Filters ─────────────────────────────────────────────────────────────────

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

/** Summarise git-status output, capping staged/unstaged/untracked lists */
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

  const capList = (arr: string[], max: number, label: string): string[] => {
    if (arr.length <= max) return arr;
    return [
      ...arr.slice(0, max),
      `  ... [${arr.length - max} more ${label} files]`,
    ];
  };

  const parts: string[] = [];
  if (other.length) parts.push(other.join("\n"));
  const stagedCapped = capList(staged, STATUS_MAX_FILES, "staged");
  const unstagedCapped = capList(unstaged, STATUS_MAX_FILES, "unstaged");
  const untrackedCapped = capList(untracked, STATUS_MAX_UNTRACKED, "untracked");
  if (stagedCapped.length)
    parts.push(`Staged (${staged.length}):\n${stagedCapped.join("\n")}`);
  if (unstagedCapped.length)
    parts.push(`Unstaged (${unstaged.length}):\n${unstagedCapped.join("\n")}`);
  if (untrackedCapped.length)
    parts.push(
      `Untracked (${untracked.length}):\n${untrackedCapped.join("\n")}`,
    );
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

/** Cap find/glob output to FIND_TOTAL_DIR_MAX total paths */
function filterFind(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length <= FIND_TOTAL_DIR_MAX) return text;
  const kept = lines.slice(0, FIND_TOTAL_DIR_MAX);
  const skipped = lines.length - kept.length;
  return (
    kept.join("\n") +
    `\n... [${skipped} paths omitted (>${FIND_PER_DIR_MAX}/dir, ${FIND_TOTAL_DIR_MAX} total max)] ...`
  );
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

/** Cap Cursor-style "Result of search in '...' (total N files):" output */
function filterSearchList(text: string): string {
  const lines = text.split("\n");
  const headerIdx = lines.findIndex((l) => RE_SEARCH_LIST.test(l));
  if (headerIdx === -1) return text;

  const header = lines.slice(0, headerIdx + 1);
  const results = lines.slice(headerIdx + 1).filter((l) => l.trim());
  if (results.length <= SEARCH_LIST_MAX) return text;

  const kept = results.slice(0, SEARCH_LIST_MAX);
  const skipped = results.length - SEARCH_LIST_MAX;
  return [
    ...header,
    ...kept,
    `... [${skipped} files omitted] ...`,
  ].join("\n");
}

/** Strip line numbers from Cursor-style N|content reads, then dedup */
function filterReadNumbered(text: string): string {
  const lines = text.split("\n");
  const stripped = lines.map((l) => {
    const m = l.match(/^\s*\d+\|(.*)/);
    return m ? m[1] : l;
  });
  return filterDedupLog(stripped.join("\n"));
}

/** Deduplicate repetitive log lines + cap total (no minimum line guard) */
function filterDedupLog(text: string): string {
  const lines = text.split("\n");
  const seen: Map<string, number> = new Map();
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = line.trim();
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    if (count === 1) {
      out.push(line);
    } else if (count === 2) {
      out.push(`  [line repeated, further duplicates suppressed]`);
    }
    if (out.length >= DEDUP_LINE_MAX) {
      const remaining = lines.length - i - 1;
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

// ─── Filter name lookup ───────────────────────────────────────────────────────

const FILTER_NAMES = new Map<FilterFn, string>([
  [filterGitDiff, "git-diff"],
  [filterGitStatus, "git-status"],
  [filterGrep, "grep"],
  [filterFind, "find"],
  [filterTree, "tree"],
  [filterLs, "ls"],
  [filterSearchList, "search-list"],
  [filterReadNumbered, "read-numbered"],
  [filterDedupLog, "dedup-log"],
  [filterSmartTruncate, "smart-truncate"],
]);

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const RtkCompressorPlugin: Plugin = async ({ $ }) => {
  return {
    "tool.execute.after": async (input, output) => {
      // Only process tools that return text output
      const raw: unknown =
        (output as any)?.output ?? (output as any)?.content ?? output;
      if (typeof raw !== "string") return;
      if (raw.length < COMPRESS_THRESHOLD) return;
      if (raw.length > RAW_CAP) return; // skip blobs too large to be useful

      const filter = autoDetectFilter(raw) ?? filterSmartTruncate;
      const compressed = filter(raw);

      // Only replace if we actually saved bytes
      if (compressed.length >= raw.length) return;

      const saved = raw.length - compressed.length;
      const filterName = FILTER_NAMES.get(filter) ?? "unknown";

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
