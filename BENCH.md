# Pilot Benchmark & Audit Suite

A self-contained benchmark suite for the Pilot app backend (OpenCode HTTP/SSE server). No extra dependencies — pure Node.js ESM. Produces a single self-contained HTML audit report.

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

| Script | What it runs |
|---|---|
| `npm run bench` | Full suite (same as `./bench.sh`) |
| `npm run bench:correctness` | Correctness suite only |
| `npm run bench:load` | Load test only |
| `npm run bench:sse` | SSE + app flow only |
| `npm run bench:report` | Re-generate HTML from last JSON results |
| `npm run test:api` | Original smoke test (`pilot-test.mjs`) |

Individual suites accept flags:

```bash
node pilot-bench.mjs   --url http://host:4096 --json /tmp/out.json
node pilot-load.mjs    --url http://host:4096 --vus 50 --out /tmp/out.json
node pilot-sse-bench.mjs --url http://host:4096 --out /tmp/out.json
node audit-report.mjs  --in /tmp/out.json --out ./report.html
```

---

## Suite overview

### Phase 1 — Correctness (`pilot-bench.mjs`)

25 tests across 12 suites that validate the API surface once. Each test is independent and idempotent — it creates and cleans up any state it needs.

| Suite | What is checked |
|---|---|
| Connectivity & Health | Server reachable; `/global/health` returns `version` field |
| Latency (10× health) | p50 < 500 ms, p99 < 2 000 ms under no load |
| Config | `/config/providers`, `/agent`, `/command` return non-empty arrays |
| Sessions | Full CRUD: list → create → read → update → status → delete |
| Messages | `/session/:id/message` returns array |
| Diff | `/session/:id/diff` returns array |
| Files | Directory listing, file-name search, text search, file content read |
| Error Handling | Malformed session ID → 400; unknown route → SPA HTML (200 + `text/html`) |
| SSE | `/event` connects with HTTP 200; receives at least one event |
| Session Lifecycle | Abort → delete → verify 404 |
| Concurrent Load | 5 parallel health checks all succeed within 3 s |
| Regression | `OpencodeClient` singleton stability (1 ref / 100 renders) |

**Result meanings:**

| Symbol | Meaning |
|---|---|
| `✓ pass` | Assertion met |
| `✗ fail` | Assertion failed — the test message explains exactly what was expected vs. received |
| `– skip` | Test intentionally skipped (e.g. endpoint returned 404 meaning feature is absent, or a known server-side bug was detected) |

**Exit code:** non-zero if any test fails. The full suite continues even on failure so all phases still run.

---

### Phase 2 — Load Test (`pilot-load.mjs`)

Ramps virtual users (VUs) across 6 stages while round-robining 7 endpoints. Each VU fires requests as fast as the server can respond (no artificial sleep).

| Stage | VUs | Duration | Purpose |
|---|---|---|---|
| warm-up | 1 | 5 s | Establish baseline with zero concurrency |
| ramp | 1 → peak | 10 s | Linearly increase load |
| sustain | peak | 30 s | Steady-state throughput measurement |
| spike | peak → 2× peak | 10 s | Burst tolerance |
| sustain-2 | 2× peak | 20 s | Sustained high-load measurement |
| cool-down | 2× peak → 0 | 10 s | Graceful wind-down |

Default `--vus 25` means peak = 25, spike = 50.

**Result table columns:**

| Column | Meaning |
|---|---|
| Requests | Total HTTP requests sent to that endpoint |
| Errors | Requests that failed (network error or HTTP 5xx) |
| p50 ms | Median latency — typical response time |
| p95 ms | 95th-percentile latency — what most users experience at the tail |
| p99 ms | 99th-percentile latency — worst-case excluding outliers |
| Err% | Error rate for that endpoint; 0% is expected in a healthy run |

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

## HTML report sections

| Section | What it shows |
|---|---|
| Summary scorecard | Pass / fail / skip counts across all three phases |
| Correctness results table | Every test with status, duration, and detail message |
| Known failures | Any `fail` test with the full error message |
| Load — endpoint table | Per-endpoint latency percentiles and error rate |
| Load — latency chart | SVG bar chart: p50 / p95 / p99 for each endpoint |
| Load — throughput curve | SVG line chart: req/s over the full run timeline |
| SSE results | Connection, reconnection, throughput, and flow step results |

---

## Output files

| File | Description |
|---|---|
| `/tmp/pilot-results.json` | Raw merged results from all three suites; overwritten each full run |
| `pilot-audit-YYYY-MM-DD-HH-MM.html` | Self-contained HTML report; one file per run, kept in the project root |

---

## Known limitations / expected skips

| Test | Why it may skip or fail |
|---|---|
| `GET /find?pattern=package searches text` | Server-side bug: ripgrep fails when the pattern matches binary or cache files in the working directory. The test skips gracefully when it detects the `"invalid ripgrep output"` error so it does not count as a regression in your suite. |
| SSE event throughput (events/s) | Events are only emitted when the server is actively processing a session. An idle server will show `1 event` (the initial connection event) — this is correct. |
