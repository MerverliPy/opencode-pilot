/**
 * Git routes for the Pilot server.
 *
 * Provides simple git operations using simple-git.
 *
 * Routes:
 *   GET  /git/status   → branch, modified, added, deleted, untracked files
 *   GET  /git/diff     → array of { path, diff } per changed file
 *   POST /git/commit   → { message } → git add -A + git commit
 *   POST /git/push     → git push (returns stdout/stderr)
 */
import { Hono } from "hono";
import simpleGit, { type SimpleGit } from "simple-git";

export interface GitStatus {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

export interface GitFileDiff {
  path: string;
  diff: string;
}

function getGit(cwd?: string): SimpleGit {
  return simpleGit(cwd ?? process.cwd());
}

export function createGitRouter(cwd?: string) {
  const router = new Hono();

  // GET /git/status
  router.get("/status", async (c) => {
    try {
      const git = getGit(cwd);
      const [status, branch] = await Promise.all([
        git.status(),
        git.revparse(["--abbrev-ref", "HEAD"]).catch(() => "HEAD"),
      ]);

      const result: GitStatus = {
        branch: branch.trim(),
        modified: status.modified,
        added: status.created,
        deleted: status.deleted,
        untracked: status.not_added,
      };

      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[git] status error:", message);
      return c.json({ error: "git status failed", detail: message }, 500);
    }
  });

  // GET /git/diff
  router.get("/diff", async (c) => {
    try {
      const git = getGit(cwd);
      const status = await git.status();

      // Collect all changed files (modified + staged)
      const changedPaths = [
        ...new Set([
          ...status.modified,
          ...status.created,
          ...status.deleted,
          ...status.renamed.map((r) => r.to),
        ]),
      ];

      const diffs: GitFileDiff[] = await Promise.all(
        changedPaths.map(async (filePath) => {
          try {
            // Diff against HEAD for tracked files; empty diff for untracked
            const diff = await git.diff(["HEAD", "--", filePath]).catch(() =>
              // File may be new (untracked vs HEAD) — try diff without HEAD
              git.diff(["--", filePath]).catch(() => ""),
            );
            return { path: filePath, diff };
          } catch {
            return { path: filePath, diff: "" };
          }
        }),
      );

      return c.json(diffs.filter((d) => d.diff.length > 0));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[git] diff error:", message);
      return c.json({ error: "git diff failed", detail: message }, 500);
    }
  });

  // POST /git/commit  { message: string }
  router.post("/commit", async (c) => {
    try {
      const body = await c.req.json<{ message?: string }>();
      const message = (body.message ?? "").trim();

      if (!message) {
        return c.json({ error: "commit message is required" }, 422);
      }

      const git = getGit(cwd);
      const status = await git.status();

      const hasChanges =
        status.modified.length > 0 ||
        status.created.length > 0 ||
        status.deleted.length > 0 ||
        status.renamed.length > 0 ||
        status.not_added.length > 0;

      if (!hasChanges) {
        return c.json({ error: "nothing to commit" }, 422);
      }

      await git.add(".");
      const result = await git.commit(message);

      return c.json({
        success: true,
        hash: result.commit,
        summary: result.summary,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[git] commit error:", message);
      return c.json({ error: "git commit failed", detail: message }, 500);
    }
  });

  // POST /git/push
  router.post("/push", async (c) => {
    try {
      const git = getGit(cwd);
      const result = await git.push();

      return c.json({
        success: true,
        pushed: result.pushed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[git] push error:", message);
      return c.json({ error: "git push failed", detail: message }, 500);
    }
  });

  return router;
}
