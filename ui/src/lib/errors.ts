const KNOWN_ERRORS: Record<string, string> = {
  "Failed to fetch": "Unable to connect to server \u2014 check that it\u2019s running",
  "Load failed": "Unable to connect to server \u2014 check that it\u2019s running",
};

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const known = KNOWN_ERRORS[msg];
  if (known) return known;
  if (/^\d+: /.test(msg)) {
    return `Server error: ${msg.replace(/^\d+: /, "")}`;
  }
  return msg;
}
