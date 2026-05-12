# Pilot Benchmark & Audit Suite

A self-contained benchmark suite for the Pilot app backend (OpenCode HTTP/SSE server) and the
Memory Plugin. No extra dependencies — pure Node.js ESM. Produces a single self-contained HTML
audit report.

---

## Quick start

```bash
# Full run against the default server (http://100.81.83.98:4096)
./bench.sh

# Custom server
./bench.sh --url http://localhost:4096

# Custom server + higher load
./bench.sh --url http://localhost:4096 --vus 50

# With Basic Auth
./bench.sh --url http://host:4096 --user alice --pass secret
```

The report path is printed to stdout when done:

```
Audit report:
  /home/you/pilot/pilot-audit-2026-05-08-12-15.html
```

Open that file in any browser — it is fully self-contained (no CDN, no external assets).

---

## npm scripts

| Script                      | What it runs                            |
| --------------------------- | --------------------------------------- |
| `npm run bench`             | Full suite (same as `./bench.sh`)       |
| `npm run bench:correctness` | Correctness suite only                  |
| `npm run bench:load`        | Load test only                          |
| `npm run bench:sse`         | SSE + app flow only                     |
| `npm run bench:memory`      | Memory plugin suite only                |
| `npm run bench:report`      | Re-generate HTML from last JSON results |
| `npm run test:api`          | Original smoke test (`pilot-test.mjs`)  |

Individual suites accept flags:

```bash
node pilot-bench.mjs        --url http://host:4096 --out /tmp/out.json
node pilot-load.mjs         --url http://host:4096 --vus 50 --out /tmp/out.json
node pilot-sse-bench.mjs    --url http://host:4096 --out /tmp/out.json
node pilot-memory-bench.mjs --url http://host:4096 --out /tmp/out.json
node audit-report.mjs       --in /tmp/out.json --out ./pilot-audit.html
```

The script writes the HTML file to `--out` and **prints the absolute path to stdout**. The `bench.sh` wrapper captures this and displays it as the final line of output.

---

## Suite overview

### Phase 1 — Correctness (`pilot-bench.mjs`)

25 tests across 12 suites that validate the API surface once. Each test is independent and idempotent — it creates and cleans up any state it needs.

| Suite                 | What is checked                                                          |
| --------------------- | ------------------------------------------------------------------------ |
| Connectivity & Health | Server reachable; `/global/health` returns `version` field               |
| Latency (10× health)  | p50 < 500 ms, p99 < 2 000 ms under no load                               |
| Config                | `/config/providers`, `/agent`, `/command` return non-empty arrays        |
| Sessions              | Full CRUD: list → create → read → update → status → delete               |
| Messages              | `/session/:id/message` returns array                                     |
| Diff                  | `/session/:id/diff` returns array                                        |
| Files                 | Directory listing, file-name search, text search, file content read      |
| Error Handling        | Malformed session ID → 400; unknown route → SPA HTML (200 + `text/html`) |
| SSE                   | `/event` connects with HTTP 200; receives at least one event             |
| Session Lifecycle     | Abort → delete → verify 404                                              |
| Concurrent Load       | 5 parallel health checks all succeed within 3 s                          |
| Regression            | `OpencodeClient` singleton stability (1 ref / 100 renders)               |

**Result meanings:**

| Symbol   | Meaning                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `✓ pass` | Assertion met                                                                                                              |
| `✗ fail` | Assertion failed — the test message explains exactly what was expected vs. received                                        |
| `– skip` | Test intentionally skipped (e.g. endpoint returned 404 meaning feature is absent, or a known server-side bug was detected) |

**Exit code:** non-zero if any test fails. The full suite continues even on failure so all phases still run.

---

### Phase 2 — Load Test (`pilot-load.mjs`)

Ramps virtual users (VUs) across 6 stages while round-robining 7 endpoints. Each VU fires requests as fast as the server can respond (no artificial sleep).

| Stage     | VUs            | Duration | Purpose                                  |
| --------- | -------------- | -------- | ---------------------------------------- |
| warm-up   | 1              | 5 s      | Establish baseline with zero concurrency |
| ramp      | 1 → peak       | 10 s     | Linearly increase load                   |
| sustain   | peak           | 30 s     | Steady-state throughput measurement      |
| spike     | peak → 2× peak | 10 s     | Burst tolerance                          |
| sustain-2 | 2× peak        | 20 s     | Sustained high-load measurement          |
| cool-down | 2× peak → 0    | 10 s     | Graceful wind-down                       |

Default `--vus 25` means peak = 25, spike = 50.

**Result table columns:**

| Column   | Meaning                                                          |
| -------- | ---------------------------------------------------------------- |
| Requests | Total HTTP requests sent to that endpoint                        |
| Errors   | Requests that failed (network error or HTTP 5xx)                 |
| p50 ms   | Median latency — typical response time                           |
| p95 ms   | 95th-percentile latency — what most users experience at the tail |
| p99 ms   | 99th-percentile latency — worst-case excluding outliers          |
| Err%     | Error rate for that endpoint; 0% is expected in a healthy run    |

**What the numbers mean:**

- **p50 < 100 ms** — healthy for a local/LAN server
- **p95 < 200 ms** — acceptable; values above suggest the server is queuing
- **p99 > 500 ms** — investigate; the server may be resource-constrained under spike
- **Err% > 0%** — the server is dropping or crashing requests; check server logs
- **Peak req/s** — total throughput at maximum concurrency; higher is better

---

### Phase 3 — SSE & App Flow (`pilot-sse-bench.mjs`)

Tests the real-time event stream and simulates the full lifecycle a mobile client follows on startup.

**Section A — Concurrent SSE connections**

Opens 1, 5, and 10 simultaneous SSE connections to `/event`. All must receive HTTP 200 within the timeout.

**Section B — Reconnection resilience**

Runs 10 cycles of: connect → receive first event → force-close → reconnect. Measures average and max recovery time (ms between close and next successful connection).

**Section C — Event throughput (10 s)**

Holds a single SSE connection open for 10 seconds and counts events received and JSON parse errors.

- `events/s` reflects server activity (will be low if the server is idle — this is normal)
- `parse errors: 0` is required — any non-zero value means the server is sending malformed SSE data

**Section D — Full app session flow**

10 sequential steps matching what the Expo client does on boot:

1. Health check (verify server version)
2. Fetch providers
3. Fetch agents
4. List sessions
5. Create a new session
6. Connect SSE stream
7. Fetch session messages
8. Fetch session diff
9. Verify SSE is still connected after session operations
10. Delete test session (cleanup)

All 10 steps must pass. If step 9 fails, the SSE connection dropped during normal API activity — that indicates a server-side stream stability issue.

---

### Phase 4 — Memory Plugin (`pilot-memory-bench.mjs`)

Tests the memory plugin across five suites. Suites 2–5 are fully offline (no network required).
Suite 1 requires a live OpenCode server.

**Suite 1 — Shadow Session Pathway (7 tests)**

Exercises the exact sequence `ExtractionSession` uses to run an extraction:

| Step                   | What is tested                                    |
| ---------------------- | ------------------------------------------------- |
| Create shadow session  | `POST /session` returns a valid id                |
| Send extraction prompt | `POST /session/:id/prompt_async` returns 204      |
| Check status map       | `GET /session/status` includes the shadow session |
| Poll until idle        | Status reaches `idle` within 30 s                 |
| Read response messages | `GET /session/:id/message` returns an array       |
| Delete shadow session  | `DELETE /session/:id` succeeds                    |
| Verify deletion        | `GET /session/:id` returns 4xx after delete       |

**Suite 2 — Extraction JSON Parser (7 tests, offline)**

Validates the inline reimplementation of `parseExtractionResponse` from
`plugin/memory/extraction/MemoryExtractor.ts`:

- Valid array → correctly typed candidates
- Missing `category` → defaults to `"fact"`
- Invalid category string → coerced to `"fact"`
- Content shorter than 10 chars → filtered out
- Confidence below 0.65 → filtered out
- JSON array wrapped in AI prose → still parsed
- Non-JSON response → returns `[]` without throwing

**Suite 3 — Cosine Similarity & TopK (6 tests, offline)**

Unit-tests the vector math from `plugin/memory/embeddings/similarity.ts`:

- Identical vectors → similarity = 1.0
- Orthogonal vectors → similarity = 0
- Opposite vectors → similarity = −1.0
- TopK returns at most K results
- TopK filters below `minScore` threshold
- TopK output is sorted descending by score

**Suite 4 — Config & Schema Defaults (7 tests, offline)**

Parses the DDL from `plugin/memory/db/schema.ts` and asserts that all defaults match the
documented values:

| Column                                           | Expected default                         |
| ------------------------------------------------ | ---------------------------------------- |
| `dedup_threshold`                                | 0.92                                     |
| `top_k`                                          | 5                                        |
| `max_memories`                                   | 2 000                                    |
| `embedding_provider`                             | `ollama`                                 |
| `embedding_model`                                | `nomic-embed-text`                       |
| `enabled` / `extract_enabled` / `inject_enabled` | 1 (true)                                 |
| Valid categories                                 | preference, fact, code_pattern, decision |

**Suite 5 — Injection Context Format (8 tests, offline)**

Validates the output of the inline `buildContext()` function (mirrors `MemoryInjector`):

- `[Memory Context — from previous sessions]` header is present
- `[End Memory Context]` footer is present
- Each memory line starts with `"- "`
- Highest-scoring memory is listed first
- Empty memories array → `""` returned
- Empty embeddings array → `""` returned
- All memories below minScore → `""` returned
- TopK limit is respected in output line count
- Context block ends with `"\n\n"` (prompt separator)

---

## HTML report sections

| Section                     | What it shows                                                                    |
| --------------------------- | -------------------------------------------------------------------------------- |
| Summary scorecard           | Pass / fail / skip counts for correctness + memory; load requests and error rate |
| Correctness results table   | Every test with status, duration, and detail message                             |
| Memory plugin results table | All memory suite tests with status, duration, and detail                         |
| Known failures              | Any `fail` test with the full error message                                      |
| Load — endpoint table       | Per-endpoint latency percentiles and error rate                                  |
| Load — latency chart        | SVG bar chart: p50 / p95 / p99 for each endpoint                                 |
| Load — throughput curve     | SVG line chart: req/s over the full run timeline                                 |
| SSE results                 | Connection, reconnection, throughput, and flow step results                      |

---

## Output files

| File                                | Description                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `/tmp/pilot-correctness.json`       | Per-suite temp results (correctness); overwritten each run                      |
| `/tmp/pilot-load.json`              | Per-suite temp results (load); overwritten each run                             |
| `/tmp/pilot-sse.json`               | Per-suite temp results (SSE); overwritten each run                              |
| `/tmp/pilot-memory.json`            | Per-suite temp results (memory); overwritten each run                           |
| `pilot-audit-YYYY-MM-DD-HH-MM.json` | Merged results from all four suites; one file per run, kept in the project root |
| `pilot-audit-YYYY-MM-DD-HH-MM.html` | Self-contained HTML report; one file per run, kept in the project root          |

---

## Known limitations / expected skips

| Test                                      | Why it may skip or fail                                                                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /find?pattern=package searches text` | Server-side bug: ripgrep fails when the pattern matches binary or cache files in the working directory. The test skips gracefully when it detects the `"invalid ripgrep output"` error so it does not count as a regression in your suite. |
| SSE event throughput (events/s)           | Events are only emitted when the server is actively processing a session. An idle server will show `1 event` (the initial connection event) — this is correct.                                                                             |
| `poll until shadow session is idle`       | The extraction AI may take longer than 30 s on a slow or overloaded server. The test skips gracefully rather than failing when the timeout is exceeded.                                                                                    |
