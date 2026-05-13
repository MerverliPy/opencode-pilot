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
