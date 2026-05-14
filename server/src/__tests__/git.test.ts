import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock simple-git — use jest.fn<() => any>() to avoid TS2345 "never" inference
const mockStatus = jest.fn<() => any>();
const mockRevparse = jest.fn<() => any>();
const mockDiff = jest.fn<() => any>();
const mockAdd = jest.fn<() => any>();
const mockCommit = jest.fn<() => any>();
const mockPush = jest.fn<() => any>();

jest.mock("simple-git", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    status: mockStatus,
    revparse: mockRevparse,
    diff: mockDiff,
    add: mockAdd,
    commit: mockCommit,
    push: mockPush,
  })),
  SimpleGit: {},
}));

import { createGitRouter } from "../git.js";
import { Hono } from "hono";

function createTestApp() {
  const router = createGitRouter();
  const app = new Hono();
  app.route("/git", router);
  return app;
}

describe("git router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /git/status", () => {
    it("returns branch and file lists", async () => {
      mockStatus.mockResolvedValue({
        current: "main",
        modified: ["file1.ts"],
        created: [],
        deleted: [],
        not_added: ["new.ts"],
      });
      mockRevparse.mockResolvedValue("main\n");

      const app = createTestApp();
      const res = await app.request("/git/status");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.branch).toBe("main");
      expect(body.modified).toContain("file1.ts");
      expect(body.untracked).toContain("new.ts");
    });

    it("returns 500 on git error", async () => {
      mockStatus.mockRejectedValue(new Error("not a git repo"));
      const app = createTestApp();
      const res = await app.request("/git/status");
      expect(res.status).toBe(500);
    });
  });

  describe("GET /git/diff", () => {
    it("returns diffs for modified files", async () => {
      mockStatus.mockResolvedValue({
        modified: ["src/index.ts"],
        created: [],
        deleted: [],
        renamed: [],
        not_added: [],
      });
      mockDiff.mockResolvedValue("@@ -1 +1 @@\n-old\n+new");

      const app = createTestApp();
      const res = await app.request("/git/diff");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it("returns 500 on error", async () => {
      mockStatus.mockRejectedValue(new Error("fail"));
      const app = createTestApp();
      const res = await app.request("/git/diff");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /git/commit", () => {
    it("commits with a message", async () => {
      mockStatus.mockResolvedValue({
        modified: ["file.ts"],
        created: [],
        deleted: [],
        renamed: [],
        not_added: [],
      });
      mockAdd.mockResolvedValue(undefined);
      mockCommit.mockResolvedValue({
        commit: "abc123",
        summary: { changes: 1, insertions: 1, deletions: 0 },
      });

      const app = createTestApp();
      const res = await app.request("/git/commit", {
        method: "POST",
        body: JSON.stringify({ message: "fix: test" }),
        headers: { "content-type": "application/json" },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.hash).toBe("abc123");
    });

    it("returns 422 when message is empty", async () => {
      const app = createTestApp();
      const res = await app.request("/git/commit", {
        method: "POST",
        body: JSON.stringify({ message: "" }),
        headers: { "content-type": "application/json" },
      });
      expect(res.status).toBe(422);
    });

    it("returns 422 when no changes to commit", async () => {
      mockStatus.mockResolvedValue({
        modified: [],
        created: [],
        deleted: [],
        renamed: [],
        not_added: [],
      });

      const app = createTestApp();
      const res = await app.request("/git/commit", {
        method: "POST",
        body: JSON.stringify({ message: "fix: nothing" }),
        headers: { "content-type": "application/json" },
      });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toContain("nothing to commit");
    });
  });

  describe("POST /git/push", () => {
    it("pushes successfully", async () => {
      mockPush.mockResolvedValue({ pushed: 1 });
      const app = createTestApp();
      const res = await app.request("/git/push", { method: "POST" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
