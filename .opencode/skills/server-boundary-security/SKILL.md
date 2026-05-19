---
name: server-boundary-security
description: "Use for Pilot server API, proxy, tunnel, terminal, filesystem, auth/session, CORS, and secret-handling security review."
compatibility: opencode
---

# Server boundary security

## Scope

Use this skill for Hono routes, upstream proxying, tunnel/session handling, terminal APIs, filesystem/tool execution, CORS, cookies, auth/session checks, and secret handling.

## Checklist

- Validate request input before calling modules or repositories.
- Keep Hono handlers thin and return consistent typed JSON errors.
- Do not expose host filesystem, shell, terminal, or upstream capability without explicit bounds.
- Restrict CORS/origin behavior to intended clients.
- Never read, log, echo, or write `.env`, private keys, `.npmrc`, tokens, or provider credentials.
- For proxy/tunnel code, preserve only required headers and avoid forwarding sensitive local headers.
- For terminal/PTY code, handle cancellation, lifecycle cleanup, and bounded output.

## Verification

Use `npm run typecheck -w server` first. Add targeted E2E only when the boundary is user-visible or crosses browser/server behavior.
