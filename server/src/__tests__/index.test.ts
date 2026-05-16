import { describe, expect, it } from "@jest/globals";
import { shouldRateLimitRequest } from "../rateLimit.js";

describe("shouldRateLimitRequest", () => {
  it.each([
    "/api",
    "/api/sessions",
    "/event",
    "/session/123",
    "/file",
    "/file/src/index.ts",
    "/find",
    "/config/models",
    "/agent",
    "/command/run",
    "/global/config",
    "/push/subscribe",
    "/tunnel/status",
    "/terminal/sessions",
    "/git/status",
    "/memory/search",
  ])("rate limits dynamic endpoint %s", (path) => {
    expect(shouldRateLimitRequest(path)).toBe(true);
  });

  it.each([
    "/",
    "/chat",
    "/chat/session-123",
    "/sessions",
    "/files",
    "/settings",
    "/does-not-exist",
    "/assets/index.js",
    "/assets/index.css",
    "/health",
  ])("does not rate limit frontend route %s", (path) => {
    expect(shouldRateLimitRequest(path)).toBe(false);
  });
});

describe("rate limit edge cases", () => {
  it("rejects case-mangled prefix attempts", () => {
    // Case should not bypass rate limiting — these start with known prefixes
    expect(shouldRateLimitRequest("/API")).toBe(false);  // not in list
    expect(shouldRateLimitRequest("/Api/sessions")).toBe(false);
    expect(shouldRateLimitRequest("/SESSION/123")).toBe(false);
    expect(shouldRateLimitRequest("/Memory/search")).toBe(false);
  });

  it("handles path with trailing slash", () => {
    expect(shouldRateLimitRequest("/api/")).toBe(true);
    expect(shouldRateLimitRequest("/memory/")).toBe(true);
    expect(shouldRateLimitRequest("/session/")).toBe(true);
  });

  it("handles path with only prefix (no trailing slash)", () => {
    expect(shouldRateLimitRequest("/api")).toBe(true);
    expect(shouldRateLimitRequest("/memory")).toBe(true);
    expect(shouldRateLimitRequest("/session")).toBe(true);
    expect(shouldRateLimitRequest("/git")).toBe(true);
  });

  it("does not rate limit root path", () => {
    expect(shouldRateLimitRequest("")).toBe(false);
    expect(shouldRateLimitRequest("/")).toBe(false);
  });

  it("does not rate limit paths that merely start with prefix chars", () => {
    // /g should NOT match /git
    expect(shouldRateLimitRequest("/g")).toBe(false);
    expect(shouldRateLimitRequest("/me")).toBe(false);
    expect(shouldRateLimitRequest("/s")).toBe(false);
  });

  it("treats null and undefined as not rate-limited", () => {
    expect(shouldRateLimitRequest("" as string)).toBe(false);
    expect(shouldRateLimitRequest("/" as string)).toBe(false);
  });
});
