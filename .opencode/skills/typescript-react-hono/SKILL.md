---

name: typescript-react-hono
description: "Use for TypeScript implementation in Pilot, especially React 19, Vite, Zustand stores, Hono handlers, service clients, and strict cross-package types."
compatibility: opencode
---

# TypeScript, React, Hono patterns

## TypeScript

- Avoid `any`; prefer unknown + validation, generics, discriminated unions, and explicit return types for exported functions.
- Do not silence type errors with broad casts. Localize unavoidable casts next to validated boundaries.
- Keep shared types serializable and browser-safe.
- Preserve workspace import boundaries: UI imports shared types, not server internals.

## React/Vite UI

- Keep components presentational when possible; place API calls in `ui/src/services/*` and cross-page state in `ui/src/store/*`.
- Effects must have correct dependencies and cleanup for subscriptions, timers, streams, and event listeners.
- Avoid render-time mutation, unbounded arrays in state, and repeated expensive transforms without memoization.
- Prefer accessible controls and visible error states over console-only failures.

## Hono server

- Validate query/body/path params before use.
- Return consistent status codes and JSON error shape.
- Never send stack traces, raw provider errors with secrets, cookies, or bearer tokens to the browser.
- Use parameterized SQLite queries and explicit limits.

## Minimal implementation loop

1. Read existing nearby pattern.
2. Add/adjust type contract.
3. Implement smallest behavior change.
4. Add or update focused test.
5. Run workspace typecheck/test.
