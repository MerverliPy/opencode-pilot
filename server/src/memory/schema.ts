/**
 * SQLite schema for the server-side memory plugin.
 * All DDL is defined here; memoryDb.ts runs these on first open.
 */

export const SCHEMA_VERSION = 2;

export const CREATE_MEMORIES = `
CREATE TABLE IF NOT EXISTS memories (
  id                 TEXT PRIMARY KEY,
  server_id          TEXT NOT NULL,
  content            TEXT NOT NULL,
  category           TEXT NOT NULL DEFAULT 'fact',
  confidence         REAL NOT NULL DEFAULT 0.8,
  tags               TEXT NOT NULL DEFAULT '[]',
  source_session_id  TEXT,
  source_message_id  TEXT,
  is_pinned          INTEGER NOT NULL DEFAULT 0,
  is_archived        INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
)`;

export const CREATE_EMBEDDINGS = `
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id         TEXT PRIMARY KEY,
  memory_id  TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  model_id   TEXT NOT NULL,
  vector     TEXT NOT NULL,
  created_at INTEGER NOT NULL
)`;

export const CREATE_PROFILE = `
CREATE TABLE IF NOT EXISTS user_profile (
  id               TEXT PRIMARY KEY,
  server_id        TEXT NOT NULL,
  key              TEXT NOT NULL,
  value            TEXT NOT NULL,
  confidence       REAL NOT NULL DEFAULT 0.8,
  source_memory_id TEXT,
  updated_at       INTEGER NOT NULL,
  UNIQUE(server_id, key)
)`;

export const CREATE_TIMELINE = `
CREATE TABLE IF NOT EXISTS memory_timeline (
  id          TEXT PRIMARY KEY,
  server_id   TEXT NOT NULL,
  session_id  TEXT,
  message_id  TEXT,
  event_type  TEXT NOT NULL,
  payload     TEXT NOT NULL DEFAULT '{}',
  created_at  INTEGER NOT NULL
)`;

export const CREATE_EMBEDDING_PROVIDERS = `
CREATE TABLE IF NOT EXISTS embedding_providers (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,
  name            TEXT NOT NULL,
  endpoint        TEXT,
  api_key_ref     TEXT,
  is_active       INTEGER NOT NULL DEFAULT 0,
  extra_config    TEXT NOT NULL DEFAULT '{}'
)`;

export const CREATE_MEMORY_CONFIG = `
CREATE TABLE IF NOT EXISTS memory_config (
  server_id            TEXT PRIMARY KEY,
  enabled              INTEGER NOT NULL DEFAULT 1,
  extract_enabled      INTEGER NOT NULL DEFAULT 1,
  inject_enabled       INTEGER NOT NULL DEFAULT 1,
  embedding_provider   TEXT NOT NULL DEFAULT 'ollama',
  embedding_model      TEXT NOT NULL DEFAULT 'nomic-embed-text',
  dedup_threshold      REAL NOT NULL DEFAULT 0.92,
  top_k                INTEGER NOT NULL DEFAULT 5,
  max_memories         INTEGER NOT NULL DEFAULT 2000
)`;

export const CREATE_SCHEMA_VERSION = `
CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
)`;

export const CREATE_FTS5 = `
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
  content,
  tags,
  category,
  content='memories',
  content_rowid='rowid'
)`;

export const CREATE_FTS5_TRIGGERS = `
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content, tags, category)
  VALUES (new.rowid, new.content, new.tags, new.category);
END;

CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, tags, category)
  VALUES ('delete', old.rowid, old.content, old.tags, old.category);
END;

CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, tags, category)
  VALUES ('delete', old.rowid, old.content, old.tags, old.category);
  INSERT INTO memories_fts(rowid, content, tags, category)
  VALUES (new.rowid, new.content, new.tags, new.category);
END;
`;

export const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_memories_server ON memories(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category)`,
  `CREATE INDEX IF NOT EXISTS idx_embeddings_memory ON memory_embeddings(memory_id)`,
  `CREATE INDEX IF NOT EXISTS idx_embeddings_model ON memory_embeddings(model_id)`,
  `CREATE INDEX IF NOT EXISTS idx_profile_server ON user_profile(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_timeline_server ON memory_timeline(server_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_timeline_session ON memory_timeline(session_id)`,
];

/** Ordered list of all DDL to run on DB open. */
export const ALL_MIGRATIONS: string[] = [
  CREATE_SCHEMA_VERSION,
  CREATE_MEMORIES,
  CREATE_EMBEDDINGS,
  CREATE_PROFILE,
  CREATE_TIMELINE,
  CREATE_EMBEDDING_PROVIDERS,
  CREATE_MEMORY_CONFIG,
  ...INDEXES,
  CREATE_FTS5,
  CREATE_FTS5_TRIGGERS,
];

// ── Domain types ──────────────────────────────────────────────────────────────

export type MemoryCategory =
  | "preference"
  | "fact"
  | "code_pattern"
  | "decision";

export type Memory = {
  id: string;
  serverId: string;
  content: string;
  category: MemoryCategory;
  confidence: number;
  tags: string[];
  sourceSessionId?: string;
  sourceMessageId?: string;
  isPinned: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
};

export type MemoryEmbedding = {
  id: string;
  memoryId: string;
  modelId: string;
  vector: number[];
  createdAt: number;
};

export type ProfileEntry = {
  id: string;
  serverId: string;
  key: string;
  value: string;
  confidence: number;
  sourceMemoryId?: string;
  updatedAt: number;
};

export type TimelineEventType =
  | "prompt_sent"
  | "response_received"
  | "memory_extracted"
  | "memory_injected"
  | "memory_created"
  | "memory_deduplicated";

export type TimelineEvent = {
  id: string;
  serverId: string;
  sessionId?: string;
  messageId?: string;
  eventType: TimelineEventType;
  payload: Record<string, unknown>;
  createdAt: number;
};

export type MemoryConfig = {
  serverId: string;
  enabled: boolean;
  extractEnabled: boolean;
  injectEnabled: boolean;
  embeddingProvider: string;
  embeddingModel: string;
  dedupThreshold: number;
  topK: number;
  maxMemories: number;
};
