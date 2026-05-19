# Pilot Auth Story

End-to-end bearer token authentication for Pilot server.

## Overview

Pilot uses a single bearer token (`PILOT_AUTH_TOKEN` env var) to protect all sensitive server routes. When set, every API, SSE, WebSocket, and proxy request must present this token. When unset, auth is disabled (all requests allowed).

## Token source

```
PILOT_AUTH_TOKEN="pilot-abc123..."  # env var on server
```

Server reads it via `getConfiguredAuthToken()` in `server/src/auth.ts`.

## Routes protected

`server/src/index.ts` calls `protectRoute(path)` for each sensitive path. This registers `requireBearerAuth()` middleware via `app.use()`.

Protected paths: `/terminal/*`, `/git/*`, `/tunnel/*`, `/api/*`, `/event`, `/session`, `/session/*`, `/file`, `/file/*`, `/find`, `/find/*`, `/config/*`, `/agent`, `/agent/*`, `/command`, `/command/*`, `/global/*`, `/push/*`, `/memory/*`, `/api/chat/*`, `/session-tags`, `/session-tags/*`.

Unprotected: `/health`, static assets (`/assets/*`, `/*`).

## Client side

### SSE (`ui/src/services/sse.ts`)
- Uses `fetch()` + `ReadableStream` (NOT native `EventSource` which can't set headers)
- Passes `Authorization: Bearer <token>` from `server.authToken`
- On 401/403: logs error, stops permanently (no reconnect loop)
- Cleans up via `AbortController` on unmount

### Other services
Auth token flows through proxy. Client services (`push.ts`, `tunnel.ts`, etc.) use `serverUrl` from Zustand store — requests pass through Hono middleware which validates the bearer token.

## WebSocket terminal auth

`server/src/terminal.ts`:
- WS upgrade handled by raw Node HTTP `upgrade` event (NOT Hono middleware)
- `isAuthorizedNodeRequest()` reads `req.headers.authorization`, extracts Bearer token, compares to expected token
- On mismatch: writes HTTP 401 response with `WWW-Authenticate: Bearer`, destroys socket
- Token passed from `startServer()` at `server/src/index.ts:262`

## Proxy auth

### Inbound
Proxy routes (`/api/*`, `/event`, `/file/*`, etc.) are protected by Hono auth middleware BEFORE reaching the proxy handler. Auth check runs first — 401 returned before proxy fetch.

### Outbound (token isolation)
`server/src/proxy.ts` `copyHeaders()`:
- Strips Pilot bearer token before forwarding upstream (prevents leaking local auth to upstream)
- Injects Basic auth from server config (`username`/`password`) when no client `Authorization` header present
- If client sends a different Bearer token (not Pilot token), it passes through to upstream (enables direct upstream auth)

## Auth middleware (`server/src/auth.ts`)

| Export | Purpose |
|--------|---------|
| `getConfiguredAuthToken()` | Read `PILOT_AUTH_TOKEN` env var |
| `isAuthEnabled()` | Check if token is configured |
| `requireBearerAuth()` | Hono middleware — validates `Authorization` header |
| `isAuthorizedNodeRequest()` | Raw Node HTTP request check (for WS upgrades) |
| `getBearerTokenFromHeader()` | Extract Bearer token from header value |

## Browser storage

Tokens are encrypted via AES-GCM-256 (Web Crypto API) before storing in IndexedDB (`ui/src/services/crypto.ts`). Raw tokens never touch localStorage.

## Key files

| File | Role |
|------|------|
| `server/src/auth.ts` | Auth middleware, token helpers |
| `server/src/index.ts` | Route protection, WS setup |
| `server/src/proxy.ts` | Token isolation, upstream auth |
| `server/src/terminal.ts` | WS upgrade auth |
| `ui/src/services/sse.ts` | SSE client with Bearer auth |
| `ui/src/services/crypto.ts` | Browser token encryption |
