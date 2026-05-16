# Pilot Test Commands

| Command | What it does |
|---|---|
| `npm test` | UI unit tests (Jest) |
| `npm run test:coverage` | UI tests with coverage |
| `npm run test:watch` | UI tests in watch mode |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run test:e2e:fullstack` | Full-stack E2E tests |
| `npm run typecheck` | TypeScript typecheck across all workspaces |
| `npm run lint` | ESLint for UI |
| `npm run benchtest` | All benchmark scenarios |
| `npm run benchtest:quick` | Quick benchmark run |

## Workspace-specific

| Command | Scope |
|---|---|
| `npm run typecheck -w server` | Server typecheck |
| `npm run typecheck -w ui` | UI typecheck |
| `npm run typecheck -w shared` | Shared types typecheck |
| `npm run typecheck -w e2e` | E2E typecheck |
| `npm run test -w ui` | UI tests (Jest) |
| `npm run test -w e2e` | E2E tests (Playwright) |
| `npm run build -w server` | Build server |
| `npm run build -w ui` | Build UI |
| `npm run build -w shared` | Build shared package |
