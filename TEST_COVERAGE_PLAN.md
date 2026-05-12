# Test Coverage Implementation Plan — 100% Target

> **Goal:** Achieve 100% test coverage across all runtime modules in the Pilot codebase.
> **Current:** 23.7% coverage (118 tests passing, 8 suites).
> **Target:** 100% statements/branches/functions/lines.

---

## Executive Summary

The coverage gap is caused by three categories of untested code:

1. **Configuration bugs** — Jest ignores `.opencode/plugins/__tests__/` and fails to instrument `.tsx` files for coverage.
2. **Missing service tests** — 3 of 6 runtime service files have zero tests.
3. **Missing plugin tests** — The entire `plugin/memory/` module (~2,000+ lines) and `.opencode/plugins/` utilities (~800 lines) have no test coverage.

This plan fixes the configuration first, then adds tests in dependency order (pure logic → DB → network → React → integration).

---

## Phase 0: Fix Jest Configuration (Prerequisite)

**Files:** `jest.config.js`

**Changes:**

1. **Remove duplicate line** — `testPathIgnorePatterns` appears twice; delete one.
2. **Remove `/.opencode/` ignore** — This currently skips `.opencode/plugins/__tests__/` entirely. The existing `testMatch` pattern (`**/__tests__/**/*.test.ts`) already excludes `.opencode/skills/` and `.opencode/rules/` because they have no `__tests__` folders.
3. **Add `.opencode/plugins/` to coverage collection** — `collectCoverageFrom` currently only covers `services/`, `store/`, `plugin/`.
4. **Switch coverage provider to `v8`** — Istanbul's Babel instrumenter fails on JSX in `.tsx` files. Node.js `v8` coverage avoids this entirely.

**Expected diff:**

```diff
-  testPathIgnorePatterns: ["/.opencode/", "/node_modules/"],
-  testPathIgnorePatterns: ["/.opencode/", "/node_modules/"],
+  testPathIgnorePatterns: ["/node_modules/"],
   collectCoverageFrom: [
     "services/**/*.{ts,tsx}",
     "store/**/*.{ts,tsx}",
     "plugin/**/*.{ts,tsx}",
+    ".opencode/plugins/**/*.{ts,tsx}",
     "!**/*.d.ts",
     "!**/node_modules/**",
     "!**/__tests__/**",
     "!**/__mocks__/**",
   ],
+  coverageProvider: "v8",
```

**Validation:**

- `npm test` still passes with 8 suites.
- `npm run test:coverage` no longer throws JSX syntax errors.

---

## Phase 1: Services Layer (Quick Wins — ~400 lines)

These are the highest-ROI tests: small files, clear boundaries, existing mocking patterns.

### 1.1 `services/__tests__/n9router.test.ts`

**What to test:** `N9RouterClient` class (~158 lines)

| Test Case                                    | Input                               | Expected                  |
| -------------------------------------------- | ----------------------------------- | ------------------------- |
| `health()` success                           | `GET /api/health` → `200 {ok:true}` | `{ok:true}`               |
| `health()` failure                           | `GET /api/health` → `500`           | throws                    |
| `models()`                                   | `GET /v1/models` → model list       | parsed array              |
| `combos()`                                   | `GET /api/combos`                   | parsed array              |
| `usageStats("24h")`                          | `GET /api/usage/stats?period=24h`   | parsed stats              |
| `tunnelStatus/Enable/Disable`                | `GET/POST` tunnel endpoints         | correct methods/URLs      |
| `summarizeByProvider()` — single provider    | stats with 3 requests               | 1 summary, count=3        |
| `summarizeByProvider()` — multiple providers | stats from 2 providers              | sorted desc by count      |
| `summarizeByProvider()` — unknown provider   | provider field missing              | falls back to `"unknown"` |
| `summarizeByProvider()` — empty stats        | `[]`                                | returns `[]`              |
| `summarizeByProvider()` — error counting     | 2 success + 1 error                 | `success:2, errors:1`     |

**Mocks:** `global.fetch` (already set up in `jest.setup.js`).

**Estimated tests:** ~12

---

### 1.2 `services/__tests__/sse.test.ts`

**What to test:** `useEventStream()` React hook (~63 lines)

| Test Case                           | Setup                                   | Assertion                               |
| ----------------------------------- | --------------------------------------- | --------------------------------------- |
| Returns early when `server` is null | `server = null`                         | `EventSource` never constructed         |
| Constructs correct URL              | `server.url = "http://host/"`           | connects to `http://host/event`         |
| Passes basic auth header            | `server.username = "u", password = "p"` | header includes `Basic dTpw`            |
| Parses JSON message events          | emits `{data:'{"type":"ping"}'}`        | `onEvent` called with parsed object     |
| Warns on invalid JSON               | emits `{data:'not json'}`               | `log.warn` called, `onEvent` not called |
| Reconnects on error                 | emit error → wait 500ms                 | new `EventSource` created               |
| Backoff doubles                     | emit 2 errors → wait                    | second reconnect delay > first          |
| Cleans up on unmount                | unmount component                       | `EventSource.close()` called            |
| Reconnects on server change         | change `server.id`                      | new connection opened                   |

**Mocks:** `react-native-sse` (mock already exists at `__mocks__/react-native-sse.ts`). May need timer mocking (`jest.useFakeTimers()`).

**Estimated tests:** ~9

---

### 1.3 `services/__tests__/notifications.test.ts`

**What to test:** Push notification functions & hooks (~201 lines)

| Function                         | Test Cases                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registerForPushNotifications()` | Returns early on simulator; returns early on denied permission; creates Android channel; saves token on success; handles error gracefully         |
| `registerPermissionCategory()`   | Registers category with 2 actions; idempotent (safe to call twice)                                                                                |
| `handlePermissionAction()`       | "Allow Once" → calls `respondPermission` with `"once"`; "Deny" → calls with `"deny"`; missing sessionID → `log.warn`; missing server → `log.warn` |
| `useNotificationDeepLink()`      | Notification with `sessionID` → navigates to `/?sessionId=xxx`; without `sessionID` → navigates to `/`                                            |
| `useNotificationActionHandler()` | `enabled=false` → no listener; `enabled=true` + response → calls `handlePermissionAction`; handles "app launched via notification" case           |

**Mocks:** `expo-notifications`, `expo-router` (both already mocked), `expo-device`, `@/services/api`.

**Estimated tests:** ~12

**Note:** `services/types.ts` contains only TypeScript type definitions — no runtime code, skip testing.

---

## Phase 2: plugin/memory — Pure Logic (Foundation — ~300 lines)

These modules have no external dependencies (or only on each other). Test them first so their mocks are available for higher layers.

### 2.1 `plugin/memory/embeddings/__tests__/similarity.test.ts`

**What to test:** `cosineSimilarity()`, `topK()` (~34 lines)

| Test Case                 | Vectors               | Expected                  |
| ------------------------- | --------------------- | ------------------------- |
| Identical vectors         | `[1,1,1]`, `[1,1,1]`  | `1`                       |
| Orthogonal vectors        | `[1,0]`, `[0,1]`      | `0`                       |
| Zero vector               | `[0,0]`, `[1,1]`      | `0`                       |
| Mismatched lengths        | `[1,2]`, `[1,2,3]`    | `0`                       |
| `topK` basic              | 5 items, query vector | returns top 3 sorted desc |
| `topK` with `minScore`    | items below threshold | filtered out              |
| `topK` empty items        | `[]`                  | `[]`                      |
| `topK` `k > items.length` | 2 items, `k=5`        | returns 2                 |

**Mocks:** None (pure math).

**Estimated tests:** ~8

---

### 2.2 `plugin/memory/embeddings/__tests__/ModelRegistry.test.ts`

**What to test:** `ALL_MODELS`, `findModel()`, `modelsForProvider()`, `PROVIDER_DISPLAY` (~650 lines of data, ~10 lines of logic)

| Test Case                                          | Assertion                              |
| -------------------------------------------------- | -------------------------------------- |
| `findModel("openai/text-embedding-3-small")`       | returns correct model object           |
| `findModel("invalid-id")`                          | returns `undefined`                    |
| `modelsForProvider("openai")`                      | returns array with length > 0          |
| `modelsForProvider("invalid")`                     | returns `[]`                           |
| Every `EmbeddingProviderType` has at least 1 model | iterate all providers                  |
| `PROVIDER_DISPLAY` keys match provider types       | keys === `EmbeddingProviderType` union |

**Estimated tests:** ~6

---

### 2.3 `plugin/memory/dedup/__tests__/Deduplicator.test.ts`

**What to test:** `Deduplicator.isDuplicate()` (~49 lines)

| Test Case                         | Setup                               | Expected    |
| --------------------------------- | ----------------------------------- | ----------- |
| No existing memories              | DB returns `[]`                     | `false`     |
| Below threshold                   | similarity = 0.85, threshold = 0.92 | `false`     |
| Above threshold                   | similarity = 0.95, threshold = 0.92 | `true`      |
| Exactly at threshold              | similarity = 0.92                   | `true` (>=) |
| Multiple memories, one duplicate  | 3 memories, 1 above threshold       | `true`      |
| Multiple memories, none duplicate | 3 memories, all below               | `false`     |

**Mocks:** `MemoryRepository`, `EmbeddingRepository`, embedding provider, `cosineSimilarity`.

**Estimated tests:** ~6

---

## Phase 3: plugin/memory — Database Layer (~600 lines)

The DB layer uses `expo-sqlite`. The existing mock (`__mocks__/expo-sqlite.ts`) is too simplistic — it returns `[]` for everything. We need an **in-memory SQLite mock** that can:

1. Execute CREATE TABLE statements
2. Return inserted rows on SELECT
3. Support parameter binding (`?` placeholders)
4. Track call counts for assertions

### 3.1 Enhanced Mock: `__mocks__/expo-sqlite.ts` (Update)

Replace the stub with a real in-memory DB using `better-sqlite3` or a lightweight custom mock that maintains state per test:

```typescript
// __mocks__/expo-sqlite.ts
const databases = new Map<string, any>();

export const openDatabaseSync = jest.fn((name: string) => {
  if (!databases.has(name)) {
    databases.set(name, createInMemoryDb());
  }
  return databases.get(name);
});

export const deleteDatabaseSync = jest.fn((name: string) => {
  databases.delete(name);
});

// Helper for tests
export function __resetDatabases() {
  databases.clear();
}
```

Alternatively, use `sqlite3` (Node built-in) in the mock for a real SQL engine. This is the recommended approach because it tests actual SQL queries.

**Decision:** Use `better-sqlite3` as a dev dependency, or implement a lightweight in-memory SQL parser. Given the simplicity of the queries (mostly `INSERT`, `SELECT`, `UPDATE`, `DELETE`), a custom mock with arrays is sufficient and has zero dependency cost.

**Custom in-memory mock approach:**

```typescript
class MockDatabase {
  tables = new Map<string, any[]>();
  execSync(sql: string) {
    /* parse CREATE TABLE, initialize empty array */
  }
  runSync(sql: string, params: any[]) {
    /* parse INSERT/UPDATE/DELETE, mutate arrays */
  }
  getAllSync(sql: string, params: any[]) {
    /* parse SELECT, filter/sort, return rows */
  }
  getFirstSync(sql: string, params: any[]) {
    return this.getAllSync(sql, params)[0] ?? null;
  }
}
```

This requires ~100 lines of SQL parsing but gives us real query testing without new deps.

---

### 3.2 `plugin/memory/db/__tests__/database.test.ts`

| Test Case                             | Assertion                              |
| ------------------------------------- | -------------------------------------- |
| `getDb()` returns same instance       | two calls, `===`                       |
| `getDb()` runs migrations             | `execSync` called with migration SQL   |
| `closeDb()` clears instance           | after close, new call creates new db   |
| `newId()` returns unique strings      | 100 calls, all unique, looks like UUID |
| `newId()` returns string of length 21 | matches nanoid-like format             |

**Estimated tests:** ~5

---

### 3.3 `plugin/memory/db/__tests__/MemoryRepository.test.ts`

| Method                | Test Cases                                                                             |
| --------------------- | -------------------------------------------------------------------------------------- |
| `insertMemory`        | inserts and returns row; assigns generated ID                                          |
| `getMemoriesByServer` | returns only memories for given `serverId`; returns empty array for unknown server     |
| `getMemoryById`       | returns matching memory; returns `null` for unknown id                                 |
| `updateMemory`        | updates content immutably; returns updated row                                         |
| `deleteMemory`        | removes row; returns `null` on subsequent get                                          |
| `searchMemories`      | LIKE search on content; LIKE search on tags; LIKE search on category; case-insensitive |
| `countMemories`       | returns correct count; returns 0 for empty server                                      |
| `getMemoryConfig`     | returns existing config; inserts defaults when none exist                              |
| `saveMemoryConfig`    | updates existing config; inserts new config                                            |

**Fixtures:** `Memory` objects with various `category`, `tags`, `confidence`, `serverId`.

**Estimated tests:** ~15

---

### 3.4 `plugin/memory/db/__tests__/EmbeddingRepository.test.ts`

| Method                         | Test Cases                                                   |
| ------------------------------ | ------------------------------------------------------------ |
| `insertEmbedding`              | inserts vector; links to memory_id                           |
| `getEmbeddingsByModel`         | returns all for model; filters by optional `serverMemoryIds` |
| `getEmbeddingByMemoryAndModel` | returns single match; returns `null` for no match            |
| `deleteEmbeddingsByMemory`     | removes all embeddings for memory_id                         |
| `upsertEmbedding`              | inserts new; updates existing (same memory_id + model_id)    |

**Fixtures:** `MemoryEmbedding` with `vector: number[]` of length 384.

**Estimated tests:** ~8

---

### 3.5 `plugin/memory/db/__tests__/ProfileRepository.test.ts`

| Method               | Test Cases                                                      |
| -------------------- | --------------------------------------------------------------- |
| `getProfile`         | returns all entries for server; returns `[]` for unknown server |
| `upsertProfileEntry` | inserts new; updates existing key; maintains server isolation   |
| `deleteProfileEntry` | removes entry; no-op for unknown key                            |
| `clearProfile`       | removes all entries for server; leaves other servers intact     |

**Estimated tests:** ~6

---

### 3.6 `plugin/memory/db/__tests__/TimelineRepository.test.ts`

| Method                 | Test Cases                              |
| ---------------------- | --------------------------------------- |
| `insertTimelineEvent`  | inserts event; auto-generates timestamp |
| `getTimeline`          | returns events in chronological order   |
| `getTimelineBySession` | filters by session_id                   |
| `clearTimeline`        | removes all events for server           |

**Estimated tests:** ~5

---

## Phase 4: plugin/memory — Embedding Providers (~500 lines)

All embedding providers make HTTP calls. Mock `global.fetch` (already available).

### 4.1 `plugin/memory/embeddings/__tests__/OpenAICompatibleEmbeddings.test.ts`

| Test Case                                         | Assertion                         |
| ------------------------------------------------- | --------------------------------- |
| `embed()` sends correct POST body                 | `{input: ["text"], model: "xxx"}` |
| `embed()` sends Authorization header with API key | `Bearer sk-...`                   |
| `embed()` handles Jina AI task mapping            | `input_type: "retrieval.query"`   |
| `embed()` handles OpenRouter provider order       | `provider.order` in body          |
| `embed()` returns parsed embeddings               | `number[][]`                      |
| `embed()` with dimension override                 | requests different `dimensions`   |
| `embed()` handles single text                     | wraps in array                    |
| `embed()` handles multiple texts                  | returns multiple vectors          |
| `embed()` throws on HTTP error                    | non-200 → throws                  |

**Estimated tests:** ~9

---

### 4.2 `plugin/memory/embeddings/__tests__/OllamaEmbeddings.test.ts`

| Test Case                               | Assertion                            |
| --------------------------------------- | ------------------------------------ |
| `embed()` sends `{model, input: [...]}` | correct shape                        |
| `embed()` derives URL from base         | replaces path with `/api/embeddings` |
| `embed()` returns `embeddings` array    | `number[][]`                         |
| `embed()` ignores task parameter        | no `task` in body                    |
| `embed()` throws on error               | non-200 → throws                     |

**Estimated tests:** ~5

---

### 4.3 `plugin/memory/embeddings/__tests__/CohereEmbeddings.test.ts`

| Test Case                                                      | Assertion             |
| -------------------------------------------------------------- | --------------------- |
| `embed()` sends `input_type: "search_document"` for embed task | correct mapping       |
| `embed()` sends `input_type: "search_query"` for query task    | correct mapping       |
| `embed()` returns `embeddings.float`                           | extracts nested array |
| `embed()` sends Authorization header                           | `Bearer` prefix       |
| `embed()` throws on error                                      | non-200 → throws      |

**Estimated tests:** ~5

---

### 4.4 `plugin/memory/embeddings/__tests__/EmbeddingProviderFactory.test.ts`

| Test Case                                                   | Assertion                                     |
| ----------------------------------------------------------- | --------------------------------------------- |
| `createProvider("openai", config)`                          | returns `OpenAICompatibleEmbeddings` instance |
| `createProvider("ollama", config)`                          | returns `OllamaEmbeddings` instance           |
| `createProvider("cohere", config)`                          | returns `CohereEmbeddings` instance           |
| `createProvider("invalid", config)`                         | throws `"Unknown provider"`                   |
| `createProviderFromConfig()` loads API key from SecureStore | mocks `SecureStore.getItemAsync`              |
| `createProviderFromConfig("n9router")`                      | reads URL/key from n9router config            |
| `createProviderFromConfig()` without API key                | throws or uses default                        |
| `storeApiKey()` / `deleteApiKey()` / `getStoredApiKey()`    | persist to SecureStore                        |
| `deriveOllamaUrl()`                                         | replaces port with `11434`                    |

**Mocks:** `expo-secure-store`, `@/services/auth`.

**Estimated tests:** ~9

---

## Phase 5: plugin/memory — Zustand Store (~126 lines)

### 5.1 `plugin/memory/store/__tests__/memoryStore.test.ts`

Pattern follows existing `store/__tests__/session.test.ts`.

| Action            | Test Cases                                      |
| ----------------- | ----------------------------------------------- |
| `loadForServer`   | sets `loadedServerId`; loads memories from repo |
| `refreshMemories` | reloads memories; updates `memoryCount`         |
| `loadConfig`      | loads config from repo                          |
| `saveConfig`      | persists config; updates state                  |
| `addMemories`     | appends to list; updates count                  |
| `deleteMemory`    | removes by id; updates count                    |
| `pinMemory`       | toggles `pinned` flag                           |
| `archiveMemory`   | toggles `archived` flag                         |
| `setExtracting`   | boolean flag                                    |
| Immutability      | no direct mutation of state arrays              |

**Mocks:** `MemoryRepository` (or none if store doesn't directly call repo — need to verify actual implementation).

**Estimated tests:** ~12

---

## Phase 6: plugin/memory — Extraction & Injection (~450 lines)

These are orchestration layers with many dependencies. Use deep mocking.

### 6.1 `plugin/memory/extraction/__tests__/prompts.test.ts`

| Function                  | Test Cases                                                                      |
| ------------------------- | ------------------------------------------------------------------------------- |
| `turnsToText()`           | formats user turn; formats assistant turn; formats multiple turns with newlines |
| `buildExtractionPrompt()` | includes system prompt; includes conversation text; wraps in instruction block  |

**Estimated tests:** ~4

---

### 6.2 `plugin/memory/extraction/__tests__/ExtractionSession.test.ts`

| Method                                | Test Cases                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `getOrCreateSessionId()`              | creates new session on first call; returns same ID on second call; recreates if session 404s |
| `sendAndWait(text)`                   | sends prompt; polls until idle; returns last assistant message; handles timeout              |
| `sendAndWait()` with invalid response | handles missing messages gracefully                                                          |

**Mocks:** `OpencodeClient` (from `@/services/api`).

**Estimated tests:** ~6

---

### 6.3 `plugin/memory/extraction/__tests__/MemoryExtractor.test.ts`

| Method                                 | Test Cases                                                    |
| -------------------------------------- | ------------------------------------------------------------- |
| `extract(turns, config)` — happy path  | parses AI response → dedup → insert memory → insert embedding |
| `extract()` with empty turns           | returns early or handles gracefully                           |
| `extract()` with invalid JSON response | catches parse error, logs warning                             |
| `extract()` with duplicate memory      | deduplicator returns `true` → skips insert                    |
| `extract()` embedding failure          | memory inserted but embedding fails gracefully                |
| `resetSession()`                       | creates new session ID on next extract                        |

**Mocks:** `OpencodeClient`, `MemoryRepository`, `EmbeddingRepository`, `EmbeddingProviderFactory`, `ExtractionSession`, `Deduplicator`.

**Estimated tests:** ~7

---

### 6.4 `plugin/memory/injection/__tests__/MemoryInjector.test.ts`

| Method                                       | Test Cases                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `buildContext(query, config)` — with results | embeds query; runs topK; formats `[Memory Context]` block with bullets |
| `buildContext()` — no results                | returns empty string                                                   |
| `buildContext()` — disabled config           | returns empty string                                                   |
| `buildContext()` — results below minScore    | filtered out, returns empty                                            |

**Mocks:** `MemoryRepository`, `EmbeddingRepository`, embedding provider, `topK`.

**Estimated tests:** ~5

---

## Phase 7: plugin/memory — Hooks & UI Components (~320 lines)

### 7.1 `plugin/memory/hooks/__tests__/useMemoryInjection.test.ts`

| Test Case                                   | Assertion                      |
| ------------------------------------------- | ------------------------------ |
| `buildPrefix(query)` returns context string | calls injector, returns result |
| `buildPrefix()` when config disabled        | returns empty string           |
| Re-renders when config changes              | hook updates on store change   |

**Mocks:** `useMemoryStore` (mock zustand), `MemoryInjector`.

**Estimated tests:** ~3

---

### 7.2 `plugin/memory/hooks/__tests__/useMemoryExtraction.test.ts`

| Test Case                                        | Assertion                        |
| ------------------------------------------------ | -------------------------------- |
| Triggers extraction on `busy → idle`             | calls `extractor.extract()` once |
| Does not trigger on `idle → idle`                | no extraction call               |
| Does not trigger on `idle → busy`                | no extraction call               |
| Sets `isExtracting` flag during extraction       | store flag toggles               |
| Updates store with new memories after extraction | `addMemories` called             |

**Mocks:** `useMemoryStore`, `MemoryExtractor`, `OpencodeClient` (for status polling).

**Estimated tests:** ~5

---

### 7.3 `plugin/memory/ui/components/__tests__/EmptyState.test.tsx`

| Test Case               | Assertion                              |
| ----------------------- | -------------------------------------- |
| Renders default message | text contains `"no memories yet"`      |
| Renders custom message  | prop `message="Custom"` → visible text |

**Estimated tests:** ~2

---

### 7.4 `plugin/memory/ui/components/__tests__/CategoryFilter.test.tsx`

| Test Case                 | Assertion                                    |
| ------------------------- | -------------------------------------------- |
| Renders all 5 tabs        | "all", "pref", "fact", "code", "dec" visible |
| Active tab highlighted    | `value="fact"` → "fact" tab has active style |
| `onChange` fired on press | press "code" → `onChange("code")` called     |

**Estimated tests:** ~3

---

### 7.5 `plugin/memory/ui/components/__tests__/MemoryCard.test.tsx`

| Test Case                               | Assertion                           |
| --------------------------------------- | ----------------------------------- |
| Renders memory content                  | text visible                        |
| Shows category badge with correct color | `category="fact"` → blue badge      |
| Shows confidence percentage             | `confidence: 0.85` → "85%"          |
| Calls `onPin` with memory id            | press pin button → callback with id |
| Calls `onArchive`                       | press archive → callback            |
| Calls `onDelete`                        | press delete → callback             |
| Pinned styling                          | `pinned: true` → different style    |

**Estimated tests:** ~7

---

## Phase 8: .opencode/plugins (Currently Ignored by Jest — ~800 lines)

Once Phase 0 fixes the ignore pattern, these tests will run. Some already exist as skeletons.

### 8.1 `.opencode/plugins/__tests__/utils.test.ts`

| Function                              | Test Cases                                                    |
| ------------------------------------- | ------------------------------------------------------------- |
| `getHomeDir()`                        | returns string; contains `/home/` or `C:\\Users`              |
| `getOpenCodeDir()`                    | returns `~/.opencode`                                         |
| `ensureDir()`                         | creates missing dir; no-op if exists                          |
| `writeFile()`                         | writes content; overwrites existing                           |
| `appendFile()`                        | appends to existing; creates new                              |
| `replaceInFile()`                     | replaces regex match; no-op if no match; handles missing file |
| `getDateString()` / `getTimeString()` | returns expected format                                       |
| `isGitRepo()`                         | true in git repo; false outside                               |
| `getGitRepoName()`                    | returns repo folder name                                      |
| `getGitModifiedFiles()`               | returns array of changed files; empty if clean                |
| `findFiles()`                         | finds by glob; respects `maxAge`; respects `recursive`        |
| `runCommand()`                        | executes shell command; returns stdout; throws on failure     |

**Estimated tests:** ~15

---

### 8.2 `.opencode/plugins/__tests__/rtk-compressor.test.ts`

| Filter                | Test Cases                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `autoDetectFilter()`  | detects git diff; detects git status; detects grep; detects find; detects tree; detects ls; returns null for unknown |
| `filterGitDiff`       | truncates to 100 lines; adds "...N more" suffix                                                                      |
| `filterGitStatus`     | summarizes porcelain output                                                                                          |
| `filterGrep`          | caps at 10 results per file                                                                                          |
| `filterFind`          | caps at 10 paths per dir                                                                                             |
| `filterTree`          | limits to 200 lines                                                                                                  |
| `filterLs`            | summarizes with extension breakdown                                                                                  |
| `filterDedupLog`      | deduplicates repeated lines                                                                                          |
| `filterSmartTruncate` | head+tail truncation                                                                                                 |
| Full pipeline         | input >2KB → filter applied; input <2KB → unchanged                                                                  |
| Empty input           | returns empty string                                                                                                 |
| Unicode content       | handles without corruption                                                                                           |

**Estimated tests:** ~15

---

### 8.3 `.opencode/plugins/__tests__/code-quality.test.ts`

| Hook                                                | Test Cases                              |
| --------------------------------------------------- | --------------------------------------- |
| `tool.execute.after` — formats JS file              | calls prettier on `.ts` file            |
| `tool.execute.after` — formats JSON                 | calls prettier on `.json`               |
| `tool.execute.after` — ignores non-formatable       | `.png` → no prettier call               |
| `tool.execute.after` — warns on console.log         | detects `console.log` in content        |
| `tool.execute.after` — no warning if no console.log | clean file → no warning                 |
| `message.updated` — warns on console.log            | modified files with console.log flagged |

**Mocks:** `fs` module, `$` (prettier shell command).

**Estimated tests:** ~6

---

### 8.4 `.opencode/plugins/__tests__/strategic-compact.test.ts`

| Hook                               | Test Cases                      |
| ---------------------------------- | ------------------------------- |
| Counter increments on tool execute | file counter +1                 |
| Warning at 50 calls                | logs suggestion                 |
| Warning at 75 calls                | stronger suggestion             |
| Warning at 100+ calls              | urgent suggestion               |
| Counter persists across runs       | reads from file, writes to file |
| Corrupt counter file               | resets to 0, doesn't crash      |

**Mocks:** `fs` module.

**Estimated tests:** ~5

---

### 8.5 `.opencode/plugins/__tests__/session-manager.test.ts` (Expand Skeleton)

Current test only verifies hook registration. Expand to:

| Hook                              | Test Cases                                                   |
| --------------------------------- | ------------------------------------------------------------ |
| `session.created`                 | writes session metadata to file; creates directory if needed |
| `session.closed`                  | updates session file with end timestamp                      |
| `experimental.session.compacting` | archives old sessions; respects retention policy             |
| Session file format               | JSON with correct schema                                     |

**Mocks:** `fs`, `./utils`.

**Estimated tests:** ~6

---

## Test Count Summary

| Phase     | Module                       | Estimated Tests |
| --------- | ---------------------------- | --------------- |
| 0         | Config fixes                 | —               |
| 1         | services/n9router            | 12              |
| 1         | services/sse                 | 9               |
| 1         | services/notifications       | 12              |
| 2         | embeddings/similarity        | 8               |
| 2         | embeddings/ModelRegistry     | 6               |
| 2         | dedup/Deduplicator           | 6               |
| 3         | db/database                  | 5               |
| 3         | db/MemoryRepository          | 15              |
| 3         | db/EmbeddingRepository       | 8               |
| 3         | db/ProfileRepository         | 6               |
| 3         | db/TimelineRepository        | 5               |
| 4         | embeddings/OpenAICompatible  | 9               |
| 4         | embeddings/Ollama            | 5               |
| 4         | embeddings/Cohere            | 5               |
| 4         | embeddings/ProviderFactory   | 9               |
| 5         | store/memoryStore            | 12              |
| 6         | extraction/prompts           | 4               |
| 6         | extraction/ExtractionSession | 6               |
| 6         | extraction/MemoryExtractor   | 7               |
| 6         | injection/MemoryInjector     | 5               |
| 7         | hooks/useMemoryInjection     | 3               |
| 7         | hooks/useMemoryExtraction    | 5               |
| 7         | ui/EmptyState                | 2               |
| 7         | ui/CategoryFilter            | 3               |
| 7         | ui/MemoryCard                | 7               |
| 8         | plugins/utils                | 15              |
| 8         | plugins/rtk-compressor       | 15              |
| 8         | plugins/code-quality         | 6               |
| 8         | plugins/strategic-compact    | 5               |
| 8         | plugins/session-manager      | 6               |
| **Total** |                              | **~230**        |

Current: 118 tests. **New tests to write: ~112.**

---

## Execution Order & Parallelization

```
Phase 0 (config) ──► Phase 1 (services) ──► Phase 2 (pure logic)
                                                  │
                                                  ▼
Phase 3 (DB) ◄───── Phase 4 (providers) ◄───── Phase 2 done
   │
   ▼
Phase 5 (store) ──► Phase 6 (orchestration) ──► Phase 7 (hooks/ui)
                                                      │
                                                      ▼
                                            Phase 8 (.opencode/plugins)
                                                      │
                                                      ▼
                                            Final: npm run test:coverage
```

**Parallel groups:**

- Phases 1, 2, and 8 are independent of each other and can be worked on in parallel once Phase 0 is done.
- Phase 3 depends on Phase 2 (DB tests may use `similarity` mocks).
- Phase 4 depends on nothing (network mocks only).
- Phase 5, 6, 7 depend on Phase 3 and 4.

**Recommended squad assignment:**

- **Squad A:** Phase 0 + Phase 1 (services) + Phase 8 (.opencode/plugins)
- **Squad B:** Phase 2 (pure logic) + Phase 4 (embedding providers)
- **Squad C:** Phase 3 (DB layer — needs enhanced mock first)
- **Squad D:** Phase 5 + 6 + 7 (store, extraction, injection, hooks, UI)

---

## Validation Checklist

After each phase:

- [ ] `npm test` passes (all suites)
- [ ] `npm run test:coverage` reports no JSX/Babel errors
- [ ] New files have >= 80% coverage (target: 100%)
- [ ] No `console.log` in test files
- [ ] `npm run typecheck` passes

Final validation:

- [ ] Overall coverage >= 80% (target: 100% for all runtime files)
- [ ] All 8 original suites still pass
- [ ] `.opencode/plugins/__tests__/` suites run and pass

---

## Risk Register

| Risk                                                   | Likelihood | Impact | Mitigation                                                                  |
| ------------------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------- |
| Enhanced SQLite mock is complex                        | Medium     | High   | Use `better-sqlite3` dev dep if custom mock grows >200 lines                |
| React Native component testing is flaky                | Medium     | Medium | Keep component tests shallow (props → render); use snapshot tests sparingly |
| Coverage on `.tsx` files still fails after `v8` switch | Low        | High   | If `v8` fails, add `@babel/preset-react` to a `.babelrc` instead            |
| `.opencode/plugins/` tests have hidden failures        | Medium     | Medium | Run them individually first after Phase 0 fix                               |
| Mock drift — tests pass but don't match real behavior  | Medium     | High   | Add integration test in `test:api` that exercises real SQLite + network     |

---

_Plan generated: 2026-05-11_
_Current baseline: 118 tests, 23.7% coverage, 8 suites passing_
_Target: ~230 tests, 100% coverage, ~25 suites passing_
