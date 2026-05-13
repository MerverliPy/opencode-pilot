---

name: pilot-architecture
description: "Use for Pilot repository architecture: TypeScript monorepo, Hono server, React/Vite PWA, shared types, SQLite memory modules, terminal/proxy/tunnel flows."
compatibility: opencode
---

# Pilot architecture

## Package map

- `server/`: Hono + Node APIs, terminal/session/proxy/tunnel/push/memory modules.
- `ui/`: React + Vite PWA, Zustand stores, route pages, UI services, Jest tests.
- `shared/`: shared TypeScript types imported by server and UI.
- `e2e/`: Playwright browser tests.

## Routing guidance

- Shared contracts go in `shared/src/types.ts` only when both server and UI need them.
- Server-only types remain in `server/src/*`.
- UI-only DTO shaping belongs in `ui/src/services/*` or `ui/src/store/*`, not components.
- Hono handlers should stay thin: parse/validate input, call a module/repository, return typed JSON.
- SQLite operations belong in repository/database modules. Do not build SQL strings from raw user input.

## Risk surfaces

- Terminal, proxy, tunnel, SSE/WebSocket, and push code can expose local system capability. Validate inputs and constrain output.
- Browser storage and UI logs may leak provider tokens or session data.
- Memory modules may create unbounded growth; add pagination/limits for read APIs.

## Verification map

- Contract or shared type change: `npm run typecheck -w shared` then affected package typecheck.
- Server API change: `npm run typecheck -w server`.
- UI state/service/component change: `npm run typecheck -w ui` and targeted Jest tests.
- User journey: targeted Playwright test, then `npm run test:e2e` when stable.
