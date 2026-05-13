---

name: security-review
description: "Use for security-sensitive Pilot changes: Hono routes, auth/session flows, proxy/tunnel/terminal code, SSE/WebSocket, SQLite, provider secrets, browser storage, and dependency exposure."
compatibility: opencode
---

# Security review

## Boundary checks

- Treat request params, request body, query strings, terminal input, SSE/WebSocket payloads, uploaded/imported data, and browser storage as untrusted.
- Validate shape, length, enum values, and path-like input before use.
- Use parameterized SQLite queries only.
- Avoid shell interpolation. If shell execution is necessary, pass fixed commands and validated args.

## Secret handling

- Do not log bearer tokens, cookies, API keys, provider credentials, request bodies containing credentials, or full provider error objects.
- Do not expose server environment variables to UI bundles.
- Redact tokens in UI logs and API responses.

## Web risks

- Check XSS via dangerously-set HTML, markdown rendering, CodeMirror content, terminal output, and diff viewers.
- Check SSRF/open-proxy behavior in proxy/tunnel/fetch code.
- Check CORS, origin assumptions, and unauthenticated local-network exposure.

## Output priorities

- Critical: exploitable secret leak, command execution, arbitrary file access, auth bypass, SQL injection.
- High: unsafe user-controlled network/file/path behavior, persistent XSS, token exposure.
- Medium: weak validation, noisy logs, missing rate limits on expensive endpoints.
