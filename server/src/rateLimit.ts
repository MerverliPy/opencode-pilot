const rateLimitedPrefixes = [
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
] as const;

export function shouldRateLimitRequest(path: string): boolean {
  return rateLimitedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
