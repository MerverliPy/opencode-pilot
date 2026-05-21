const rateLimitedPrefixes = [
  "/auth",
  "/api",
  "/event",
  "/session",
  "/file",
  "/find",
  "/config",
  "/agent",
  "/command",
  "/global",
  "/push",
  "/tunnel",
  "/terminal",
  "/git",
  "/memory",
  "/session-tags",
] as const;

export function shouldRateLimitRequest(path: string): boolean {
  return rateLimitedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
