/** Shared types for all embedding providers. */

export type EmbeddingTaskType = "query" | "document";

export interface EmbeddingProvider {
  /** Embed one or more texts. Returns parallel array of float vectors. */
  embed(texts: string[], task?: EmbeddingTaskType): Promise<number[][]>;
  /** The model definition this provider instance is configured for. */
  readonly model: EmbeddingModel;
}

export type EmbeddingProviderType =
  | "openai"
  | "voyage"
  | "jina"
  | "mistral"
  | "openrouter"
  | "cohere"
  | "ollama"
  | "lmstudio"
  | "n9router";

export type EmbeddingModel = {
  /** Stable ID used in DB and config */
  id: string;
  /** Human-readable name */
  displayName: string;
  /** Which adapter handles this model */
  provider: EmbeddingProviderType;
  /** Default output dimensions */
  dimensions: number;
  /** Max input tokens */
  contextLength: number;
  /** Needs an API key */
  requiresApiKey: boolean;
  /** No network egress (runs on same host as OpenCode) */
  isLocal: boolean;
  /** Supports variable output dimensions (Matryoshka) */
  matryoshka: boolean;
  /** Supports task-type hints (retrieval.query vs retrieval.passage) */
  supportsTaskType: boolean;
  /** Best use-case tag for UI display */
  bestFor?: "code" | "multilingual" | "speed" | "quality" | "free";
  /** Short note shown in picker */
  note?: string;
};

export type EmbeddingProviderConfig = {
  apiKey?: string;
  /** Override base URL (LM Studio, Ollama on non-default port, etc.) */
  baseUrl?: string;
  /** OpenRouter-specific: preferred provider order */
  routerProviderOrder?: string[];
  /** Dimension override (Matryoshka models) */
  dimensions?: number;
};
