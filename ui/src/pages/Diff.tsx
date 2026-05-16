/**
 * Diff page — Git status + diff viewer with diff2html, plus commit form.
 *
 * Fetches:
 *   GET /git/status  → branch, modified/added/deleted/untracked files
 *   GET /git/diff    → per-file unified diffs
 *
 * Allows staging + committing via POST /git/commit.
 */
import { useEffect, useState, useCallback } from "react";
import { html as diff2html } from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { useServerStore } from "../store/server";
import { colors, fonts, fontSizes } from "../theme";
import { log } from "../services/logger";
import { friendlyError } from "../lib/errors";

interface GitStatus {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

interface GitFileDiff {
  path: string;
  diff: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function StatusBadge({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  if (count === 0) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 10,
        backgroundColor: `${color}22`,
        border: `1px solid ${color}44`,
        color,
        fontFamily: fonts.mono,
        fontSize: fontSizes.xs,
      }}
    >
      {label}: {count}
    </span>
  );
}

function DiffBlock({ fileDiff }: { fileDiff: GitFileDiff }) {
  const rendered = diff2html(fileDiff.diff, {
    outputFormat: "line-by-line",
    drawFileList: false,
  });

  return (
    <div
      style={{
        marginBottom: 16,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      {/* File path header */}
      <div
        style={{
          padding: "6px 12px",
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          fontFamily: fonts.mono,
          fontSize: fontSizes.xs,
          color: colors.muted,
        }}
      >
        {fileDiff.path}
      </div>
      <div
        className="diff2html-wrapper"
        dangerouslySetInnerHTML={{ __html: rendered }}
        style={{ overflowX: "auto" }}
      />
    </div>
  );
}

export function Diff() {
  const server = useServerStore((s) => s.active());

  const [status, setStatus] = useState<GitStatus | null>(null);
  const [diffs, setDiffs] = useState<GitFileDiff[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    setCommitResult(null);
    try {
      const st = await fetchJson<GitStatus>("/git/status");
      setStatus(st);
    } catch (err) {
      setError(friendlyError(err));
      log.error("diff", "status failed", err);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadDiffs = useCallback(async () => {
    setLoadingDiff(true);
    try {
      const d = await fetchJson<GitFileDiff[]>("/git/diff");
      setDiffs(d);
    } catch (err) {
      setError(friendlyError(err));
      log.error("diff", "diff failed", err);
    } finally {
      setLoadingDiff(false);
    }
  }, []);

  useEffect(() => {
    if (!server) return;
    void refresh();
    void loadDiffs();
  }, [server, refresh, loadDiffs]);

  const handleCommit = useCallback(async () => {
    const msg = commitMessage.trim();
    if (!msg) return;
    setCommitting(true);
    setCommitResult(null);
    setError(null);
    try {
      const result = await postJson<{ success: boolean; hash: string }>(
        "/git/commit",
        { message: msg },
      );
      setCommitMessage("");
      await refresh();
      await loadDiffs();
      setCommitResult(`committed ${result.hash}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setCommitting(false);
    }
  }, [commitMessage, refresh, loadDiffs]);

  if (!server) {
    return (
      <div data-testid="diff-no-server"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: 0,
          color: colors.muted,
          fontFamily: fonts.mono,
          fontSize: fontSizes.md,
        }}
      >
        no server configured — go to settings
      </div>
    );
  }

  const totalChanged =
    (status?.modified.length ?? 0) +
    (status?.added.length ?? 0) +
    (status?.deleted.length ?? 0) +
    (status?.untracked.length ?? 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div data-testid="diff-header"
        style={{
          padding: "12px 20px",
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 data-testid="diff-heading"
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSizes.md,
            color: colors.text,
            margin: 0,
          }}
        >
          Git
        </h1>

        {status && (
          <>
            <span data-testid="diff-branch"
              style={{
                fontFamily: fonts.mono,
                fontSize: fontSizes.sm,
                color: colors.accent,
              }}
            >
              {status.branch}
            </span>
            <StatusBadge
              count={status.modified.length}
              label="modified"
              color={colors.warning}
            />
            <StatusBadge
              count={status.added.length}
              label="added"
              color={colors.success}
            />
            <StatusBadge
              count={status.deleted.length}
              label="deleted"
              color={colors.error}
            />
            <StatusBadge
              count={status.untracked.length}
              label="untracked"
              color={colors.muted}
            />
          </>
        )}

        {loadingStatus && (
          <span data-testid="diff-refreshing"
            style={{
              fontFamily: fonts.mono,
              fontSize: fontSizes.xs,
              color: colors.muted,
            }}
          >
            refreshing…
          </span>
        )}

        <button data-testid="diff-refresh-button"
          onClick={() => {
            void refresh();
            void loadDiffs();
          }}
          style={{
            marginLeft: "auto",
            backgroundColor: "transparent",
            border: `1px solid ${colors.border}`,
            color: colors.text,
            borderRadius: 4,
            padding: "4px 12px",
            fontFamily: fonts.mono,
            fontSize: fontSizes.xs,
            cursor: "pointer",
          }}
        >
          refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div data-testid="diff-error"
          style={{
            padding: "8px 20px",
            backgroundColor: colors.errorTint,
            borderBottom: `1px solid ${colors.error}`,
            color: colors.error,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      {/* Commit form */}
      {totalChanged > 0 && (
        <div
          style={{
            padding: "12px 20px",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            data-testid="commit-message-input"
            type="text"
            placeholder="Commit message…"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !committing) void handleCommit();
            }}
            style={{
              flex: 1,
              padding: "6px 12px",
              backgroundColor: colors.surfaceAlt,
              border: `1px solid ${colors.border}`,
              borderRadius: 4,
              color: colors.text,
              fontFamily: fonts.mono,
              fontSize: fontSizes.sm,
              outline: "none",
            }}
          />
          <button
            data-testid="commit-button"
            onClick={() => void handleCommit()}
            disabled={committing || !commitMessage.trim()}
            style={{
              padding: "6px 16px",
              backgroundColor: colors.accent,
              border: "none",
              borderRadius: 4,
              color: colors.accentText,
              fontFamily: fonts.sans,
              fontSize: fontSizes.sm,
              fontWeight: 600,
              cursor:
                committing || !commitMessage.trim() ? "default" : "pointer",
              opacity: committing || !commitMessage.trim() ? 0.5 : 1,
            }}
          >
            {committing ? "committing…" : "commit"}
          </button>
        </div>
      )}

      {/* Success message */}
      {commitResult && (
        <div data-testid="diff-success"
          style={{
            padding: "8px 20px",
            backgroundColor: colors.successTint,
            borderBottom: `1px solid ${colors.success}`,
            color: colors.success,
            fontFamily: fonts.mono,
            fontSize: fontSizes.sm,
            flexShrink: 0,
          }}
        >
          {commitResult}
        </div>
      )}

      {/* Diff content */}
      <div data-testid="diff-content" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {loadingStatus && !status ? (
          <div data-testid="diff-loading"
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.md,
              textAlign: "center",
              padding: 40,
            }}
          >
            loading…
          </div>
        ) : totalChanged === 0 && !loadingStatus ? (
          <div data-testid="diff-clean"
            style={{
              color: colors.muted,
              fontFamily: fonts.mono,
              fontSize: fontSizes.md,
              textAlign: "center",
              padding: 40,
            }}
          >
            working tree clean
          </div>
        ) : (
          <>
            {loadingDiff && diffs.length === 0 && (
              <div data-testid="diff-loading-diffs"
                style={{
                  color: colors.muted,
                  fontFamily: fonts.mono,
                  fontSize: fontSizes.sm,
                  marginBottom: 12,
                }}
              >
                loading diffs…
              </div>
            )}
            {diffs.map((d) => (
              <DiffBlock key={d.path} fileDiff={d} />
            ))}
            {/* Files with no diff output (new/untracked) */}
            {status?.untracked
              .filter((p) => !diffs.find((d) => d.path === p))
              .map((p) => (
                <div
                  key={p}
                  style={{
                    marginBottom: 12,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 12px",
                      backgroundColor: colors.surface,
                      fontFamily: fonts.mono,
                      fontSize: fontSizes.xs,
                      color: colors.muted,
                    }}
                  >
                    {p}{" "}
                    <span style={{ color: colors.success }}>(untracked)</span>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>

      {/* diff2html dark-theme overrides */}
      <style>{`
        .diff2html-wrapper .d2h-wrapper { font-family: ${fonts.mono}; font-size: 12px; color: ${colors.text}; }
        .diff2html-wrapper .d2h-file-header,
        .diff2html-wrapper .d2h-file-name,
        .diff2html-wrapper .d2h-file-stats,
        .diff2html-wrapper .d2h-info { background: ${colors.surface}; border-color: ${colors.border}; color: ${colors.text}; }
        .diff2html-wrapper .d2h-code-linenumber,
        .diff2html-wrapper .d2h-code-side-linenumber,
        .diff2html-wrapper .d2h-code-side-emptyplaceholder { background: ${colors.surface}; border-color: ${colors.border}; color: ${colors.muted}; }
        .diff2html-wrapper .d2h-code-line,
        .diff2html-wrapper .d2h-code-side-line,
        .diff2html-wrapper .d2h-code-line-ctn,
        .diff2html-wrapper .d2h-tag { background: ${colors.bg}; color: ${colors.text}; }
        .diff2html-wrapper .d2h-ins { background: color-mix(in srgb, ${colors.success} 12%, transparent); }
        .diff2html-wrapper .d2h-del { background: color-mix(in srgb, ${colors.error} 12%, transparent); }
        .diff2html-wrapper .d2h-ins ins,
        .diff2html-wrapper .d2h-ins.d2h-change { background: color-mix(in srgb, ${colors.success} 28%, transparent); }
        .diff2html-wrapper .d2h-del del,
        .diff2html-wrapper .d2h-del.d2h-change { background: color-mix(in srgb, ${colors.error} 28%, transparent); }
        .diff2html-wrapper table { width: 100%; border-collapse: collapse; }
        .diff2html-wrapper td { border-color: ${colors.borderSubtle}; }
      `}</style>
    </div>
  );
}
