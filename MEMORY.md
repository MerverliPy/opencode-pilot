# Memory Plugin

Automatic extraction, storage, and injection of per-project memories across OpenCode sessions.

---

## Overview

The memory plugin silently learns from every session and remembers facts, code patterns,
preferences, and decisions. The next time you ask a question, relevant memories are
automatically prepended to your prompt so the AI has context it would otherwise have forgotten.

**Key capabilities:**

- **Auto-extraction** — after each session ends, a shadow AI session reads the last 20 turns
  and extracts structured memories
- **Semantic deduplication** — new memories are checked against all existing ones using cosine
  similarity (threshold 0.92); near-duplicates are discarded
- **Server-side SQLite storage** — all memories are stored on the Hono server, scoped per OpenCode server
  (project-isolated)
- **Auto-injection** — the top-5 most relevant memories (cosine score ≥ 0.5) are prepended
  to every new prompt as a `[Memory Context]` block
- **8 embedding providers, 37+ models** — defaults to Ollama `nomic-embed-text` (zero config,
  no API key required)
- **Full UI** — browse, filter, pin, archive, delete, and configure from the Memory screen

---

## Quick start (zero config)

The default path requires only Ollama running on the same host as the OpenCode server.

**1. Start Ollama with the default embedding model**

```bash
ollama pull nomic-embed-text
ollama serve   # usually already running
```

**2. Open the app and navigate to Memory**

From the left sidebar, click **Memory**. The badge on the nav item shows how
many memories exist for the active project.

**3. Enable the plugin**

Tap the **config** tab and turn on **memory enabled**. The two sub-toggles (**auto-extract**
and **auto-inject**) are on by default.

**4. Have a coding conversation**

When the session goes idle, extraction runs automatically. The sidebar badge updates and new
memories appear in the **memories** tab within a few seconds.

**5. Send the next message**

The input automatically prepends a `[Memory Context — from previous sessions]` block before
your text. No action needed.

---

## How it works

```
Session ends (idle)
        │
        ▼
ExtractionSession.sendAndWait()
  ├─ POST /session/:id/prompt_async   (shadow OpenCode session)
  ├─ poll GET /session/status  until idle  (600 ms interval, 45 s timeout)
  └─ GET /session/:id/message          (read AI JSON response)
        │
        ▼
parseExtractionResponse()
  ├─ skip: content < 10 chars
  └─ skip: confidence < 0.65
        │
        ▼
Deduplicator.isDuplicate()
  └─ cosine similarity vs. all existing memories
     └─ skip if score ≥ 0.92  (near-duplicate)
        │
        ▼
insertMemory()  +  insertEmbedding()
  ├─ stored in server-side SQLite (better-sqlite3)
  └─ scoped to active server_id
        │
        ▼  (at prompt time)
MemoryInjector.buildContext(query)
  ├─ embed query with configured model
  ├─ cosine search across stored embeddings
  ├─ take top-5 results with score ≥ 0.5
  └─ prepend [Memory Context — from previous sessions] block
```

| Parameter             | Default  | Notes                                         |
| --------------------- | -------- | --------------------------------------------- |
| Extraction window     | 20 turns | Most recent turns of the session              |
| Extraction timeout    | 45 s     | Per-run; fails silently on timeout            |
| Dedup threshold       | 0.92     | Stored in `memory_config.dedup_threshold`     |
| Injection top-K       | 5        | Stored in `memory_config.top_k`               |
| Injection min score   | 0.50     | Hard-coded cosine threshold                   |
| Max stored memories   | 2 000    | Stored in `memory_config.max_memories`        |
| Confidence filter     | 0.65     | Memories below this are skipped at extraction |
| Content length filter | 10 chars | Memories shorter than this are skipped        |

---

## Memory categories

Memories are automatically assigned one of four categories by the extraction AI:

| Category       | What it captures                                               |
| -------------- | -------------------------------------------------------------- |
| `preference`   | How you like code formatted, styled, or structured             |
| `fact`         | Project facts, library versions, constraints, domain knowledge |
| `code_pattern` | Recurring patterns, idioms, conventions used in the project    |
| `decision`     | Architectural or design decisions made during sessions         |

Use the category filter bar in the **memories** tab to browse by type.

---

## Embedding providers

| Provider              | Key required | Best for     | Notes                                                        |
| --------------------- | ------------ | ------------ | ------------------------------------------------------------ |
| **Ollama (local)**    | No           | Default      | Zero config; same host as OpenCode, port 11434               |
| **LM Studio (local)** | No           | Custom       | Uses whatever model is loaded in LM Studio                   |
| **OpenAI**            | Yes          | Quality      | `text-embedding-3-small` best price/quality ratio            |
| **Voyage AI**         | Yes          | Code         | `voyage-code-3` — 13.8% better than OpenAI on code retrieval |
| **Jina AI**           | Yes          | Multilingual | Task-specific LoRA adapters, 89 languages, 32K context       |
| **Mistral**           | Yes          | Speed        | Fast, balanced quality                                       |
| **OpenRouter**        | Yes          | Flexibility  | 1 key → 25+ models; free tier via NVIDIA Nemotron            |
| **Cohere**            | Yes          | Long docs    | `embed-v4.0` has 128K context — can embed entire files       |

API keys are entered in the **config → api key** section and stored server-side in the Hono
server's environment (never sent to the browser).

The Ollama base URL is derived automatically from the OpenCode server URL (same host, port 11434).

---

## Model reference

### Ollama (local, no key)

| Model                        | Dims  | Context | Note                             |
| ---------------------------- | ----- | ------- | -------------------------------- |
| `nomic-embed-text` ★         | 768   | 8 192   | **Default** — zero config        |
| `all-minilm`                 | 384   | 512     | Ultra-fast, smallest             |
| `mxbai-embed-large`          | 1 024 | 512     | Good general quality             |
| `snowflake-arctic-embed`     | 1 024 | 512     | Strong retrieval                 |
| `snowflake-arctic-embed2`    | 1 024 | 8 192   | Latest Snowflake, longer context |
| `bge-large`                  | 1 024 | 512     | Strong English retrieval         |
| `bge-m3`                     | 1 024 | 8 192   | Multilingual + multi-function    |
| `e5-large`                   | 1 024 | 512     | Instruction-following            |
| `jina-embeddings-v2-base-en` | 768   | 8 192   | 8K context window                |
| `paraphrase-multilingual`    | 768   | 512     | 50+ languages                    |
| `granite-embedding`          | 768   | 512     | IBM Granite family               |

### OpenAI

| Model                      | Dims  | Note               |
| -------------------------- | ----- | ------------------ |
| `text-embedding-3-small` ★ | 1 536 | Best price/quality |
| `text-embedding-3-large`   | 3 072 | Highest quality    |
| `text-embedding-ada-002`   | 1 536 | Legacy — cheapest  |

### Voyage AI (best for code)

| Model             | Dims  | Context | Note                        |
| ----------------- | ----- | ------- | --------------------------- |
| `voyage-code-3` ★ | 1 024 | 32 000  | Best for code retrieval     |
| `voyage-3-large`  | 1 024 | 32 000  | Best general + multilingual |
| `voyage-3.5`      | 1 024 | 32 000  | Optimized general-purpose   |
| `voyage-3.5-lite` | 1 024 | 32 000  | Latency/cost optimized      |

### Jina AI

| Model                           | Dims  | Context | Note                             |
| ------------------------------- | ----- | ------- | -------------------------------- |
| `jina-embeddings-v3`            | 1 024 | 8 192   | Task-specific LoRA, 89 languages |
| `jina-embeddings-v5-text-small` | 1 024 | 32 768  | 5th gen, 32K context             |
| `jina-embeddings-v5-text-nano`  | 768   | 8 192   | Fastest Jina model               |

### Mistral

| Model           | Dims  | Context | Note                   |
| --------------- | ----- | ------- | ---------------------- |
| `mistral-embed` | 1 024 | 8 192   | Fast, balanced quality |

### OpenRouter (1 key → 25+ models)

| Model                                     | Dims  | Note                           |
| ----------------------------------------- | ----- | ------------------------------ |
| `nvidia/llama-nemotron-embed-vl-1b-v2` ★  | 4 096 | **Free tier**, multimodal      |
| `openai/text-embedding-3-small`           | 1 536 | OpenAI via OpenRouter          |
| `openai/text-embedding-3-large`           | 3 072 | OpenAI large via OpenRouter    |
| `google/gemini-embedding-2-preview`       | 3 072 | Multimodal text + image        |
| `perplexity/pplx-embed-v1-4b`             | 1 024 | Web-scale retrieval, 4B params |
| `perplexity/pplx-embed-v1-0.6b`           | 1 024 | Lightweight, low-latency       |
| `qwen/qwen3-embedding-0.6b`               | 1 024 | Fast, code-aware               |
| `thenlper/gte-large`                      | 1 024 | Strong retrieval quality       |
| `intfloat/multilingual-e5-large`          | 1 024 | 90+ languages                  |
| `sentence-transformers/all-minilm-l12-v2` | 384   | Ultra-fast, tiny footprint     |

### Cohere

| Model                           | Dims  | Context | Note                   |
| ------------------------------- | ----- | ------- | ---------------------- |
| `embed-v4.0` ★                  | 1 536 | 128 000 | Embed whole files      |
| `embed-english-v3.0`            | 1 024 | 512     | High quality English   |
| `embed-english-light-v3.0`      | 384   | 512     | English — fast + cheap |
| `embed-multilingual-v3.0`       | 1 024 | 512     | 100+ languages         |
| `embed-multilingual-light-v3.0` | 384   | 512     | Multilingual — fast    |

---

## UI walkthrough

### Sidebar badge

The memory count badge on the sidebar nav item updates live after each extraction run. A `⟳`
spinner is shown next to the nav item while extraction is in progress.

### Memories tab

| Control                   | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| **search bar**            | Full-text search across memory content and tags                      |
| **category filter**       | All / preference / fact / code_pattern / decision                    |
| **↺ (top-right)**         | Manually trigger a refresh of the memory list                        |
| **⟳ banner**              | Shown while extraction is running                                    |
| **Pin** (card action)     | Pinned memories are always included in injection regardless of score |
| **Archive** (card action) | Hides from the active list without deleting                          |
| **Delete** (card action)  | Permanent deletion with confirmation alert                           |

### Config tab

| Section                | Controls                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **general**            | `memory enabled` master toggle; `auto-extract` toggle; `auto-inject` toggle                                           |
| **embedding provider** | Radio-style list of all 8 providers                                                                                   |
| **model**              | Radio-style list of all models for the selected provider                                                              |
| **api key**            | Secure text entry; hidden by default (show/hide toggle); `save key` stored server-side in the Hono server environment |
| **danger zone**        | `clear all memories` — permanently deletes all memories for the active server                                         |

Config is persisted in SQLite (`memory_config` table, keyed by `server_id`) so each connected
OpenCode server has its own independent configuration.

---

## Database schema

The plugin creates 6 tables in a local SQLite file on first app launch:

| Table                 | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `memories`            | Core memory records (content, category, confidence, tags, pin/archive state) |
| `memory_embeddings`   | Embedding vectors associated with each memory                                |
| `user_profile`        | Key-value profile facts derived from memories                                |
| `memory_timeline`     | Audit log of extraction, injection, and dedup events                         |
| `embedding_providers` | Registered provider configurations                                           |
| `memory_config`       | Per-server plugin configuration                                              |

All tables include a `server_id` column for project isolation.

---

## Troubleshooting

**No memories are being extracted**

1. Verify **memory enabled** and **auto-extract** are both on in the config tab.
2. Extraction only runs when the session reaches `idle` state — short or aborted sessions
   may not trigger it.
3. If using Ollama, verify it's reachable from the OpenCode server host:
   ```bash
   curl http://localhost:11434/api/embeddings \
     -d '{"model":"nomic-embed-text","prompt":"test"}'
   ```
4. Extraction fails silently on network/timeout errors. Check OpenCode server logs for
   shadow session activity (look for sessions titled starting with `__memory_extract`).

**Memories are extracted but not appearing in prompts**

1. Verify **auto-inject** is on.
2. Memories without embeddings (Ollama was unavailable during extraction) are stored but
   cannot be scored for injection. Re-running extraction after Ollama is reachable will
   add embeddings to existing memories.
3. The injection threshold is cosine ≥ 0.5. If the active query is semantically unrelated
   to stored memories, none will score high enough. Try searching in the memories tab to
   confirm the memories exist.

**Duplicate or near-duplicate memories**

The dedup threshold is 0.92. Memories with cosine similarity 0.85–0.91 are considered
distinct and both stored. This is intentional for slightly-varied phrasings of the same
fact. The threshold is stored in `memory_config.dedup_threshold` and can be adjusted
manually if needed in a future version.

**`clear all memories` deleted everything by accident**

This action is irreversible. There is currently no export or undo functionality. Clearing
only affects the active server — other servers retain their memories.

**Wrong provider selected after app restart**

Config is persisted in SQLite per server. If it appears reset, check that the active server
in the server store matches the server you configured memory for.
