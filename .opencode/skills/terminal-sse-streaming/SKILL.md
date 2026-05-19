---
name: terminal-sse-streaming
description: "Use for Pilot terminal, PTY, SSE, EventSource, WebSocket, proxy, tunnel, cancellation, cleanup, and streaming backpressure review."
compatibility: opencode
---

# Terminal and SSE streaming

## Scope

Use this skill for terminal sessions, PTY process lifecycle, xterm output, SSE/EventSource, WebSocket, proxy/tunnel streaming, upstream cancellation, and stream fanout.

## Checklist

- Close streams on client disconnect, upstream failure, timeout, and process exit.
- Avoid unbounded output buffers; cap retained terminal/log history.
- Handle duplicate subscribers and reconnects idempotently.
- Preserve backpressure and avoid synchronous high-volume writes where possible.
- Validate terminal/session identifiers before attaching or killing processes.
- Do not forward local secrets, cookies, or privileged headers through proxy/tunnel paths.
- Keep browser-visible errors sanitized but actionable.

## Verification

Run `npm run typecheck -w server` and `npm run typecheck -w ui` when both stream producer and client consumer change. Add targeted E2E when user-facing terminal/proxy behavior changes.
