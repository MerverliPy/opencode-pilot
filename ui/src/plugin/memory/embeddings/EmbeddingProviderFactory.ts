/**
 * Factory that maps an EmbeddingModel to the right provider class.
 * Also handles Ollama base-URL derivation from the OpenCode server URL,
 * and n9router URL/key loading from the n9router localStorage config.
 */
import type {
  EmbeddingModel,
  EmbeddingProvider,
  EmbeddingProviderConfig,
} from "./types";
import { findModel } from "./ModelRegistry";
import { OllamaEmbeddings } from "./OllamaEmbeddings";
import { CohereEmbeddings } from "./CohereEmbeddings";
import { OpenAICompatibleEmbeddings } from "./OpenAICompatibleEmbeddings";
import { loadN9RouterConfig } from "../../../services/auth";

/** SecureStore key for a provider's API key. */
export function apiKeyStoreKey(provider: string): string {
  return `memory_apikey_${provider}`;
}

export async function getStoredApiKey(
  provider: string,
): Promise<string | null> {
  return localStorage.getItem(apiKeyStoreKey(provider));
}

export async function storeApiKey(
  provider: string,
  key: string,
): Promise<void> {
  localStorage.setItem(apiKeyStoreKey(provider), key);
}

export async function deleteStoredApiKey(provider: string): Promise<void> {
  localStorage.removeItem(apiKeyStoreKey(provider));
}

/**
 * Derive the Ollama base URL from the OpenCode server URL.
 * Same host, port 11434.
 */
export function deriveOllamaUrl(serverUrl: string): string {
  try {
    const u = new URL(serverUrl);
    return `${u.protocol}//${u.hostname}:11434`;
  } catch {
    return "http://localhost:11434";
  }
}

/** Instantiate the right EmbeddingProvider for a model + config. */
export function createProvider(
  model: EmbeddingModel,
  config: EmbeddingProviderConfig,
): EmbeddingProvider {
  switch (model.provider) {
    case "ollama":
      return new OllamaEmbeddings(model, config);
    case "cohere":
      return new CohereEmbeddings(model, config);
    default:
      return new OpenAICompatibleEmbeddings(model, config);
  }
}

/**
 * Build an EmbeddingProvider from config values, loading the API key from
 * SecureStore automatically for providers that need one.
 *
 * For n9router, the base URL and API key are read from the n9router SecureStore
 * config (set in Settings → n9router) rather than the per-provider key store.
 * The model ID is stripped of its "n9router/" prefix before forwarding to the
 * n9router /v1/embeddings endpoint.
 */
export async function createProviderFromConfig(opts: {
  modelId: string;
  provider: string;
  serverUrl?: string;
  dimensions?: number;
}): Promise<EmbeddingProvider> {
  const model = findModel(opts.modelId);
  if (!model)
    throw new Error(`[memory] unknown embedding model: ${opts.modelId}`);

  // ── n9router: use its own URL/key from SecureStore config ──────────────────
  if (model.provider === "n9router") {
    const n9cfg = await loadN9RouterConfig();
    if (!n9cfg.url)
      throw new Error(
        "[memory] n9router URL not configured — set it in Settings → n9router",
      );

    // Strip the "n9router/" prefix so the real provider/model ID is forwarded.
    const forwardId = model.id.replace(/^n9router\//, "");
    const forwardModel: EmbeddingModel = { ...model, id: forwardId };

    const config: EmbeddingProviderConfig = {
      apiKey: n9cfg.key || undefined,
      baseUrl: n9cfg.url.replace(/\/$/, ""),
      dimensions: opts.dimensions,
    };
    return new OpenAICompatibleEmbeddings(forwardModel, config);
  }

  // ── All other providers ────────────────────────────────────────────────────
  const apiKey = model.requiresApiKey
    ? ((await getStoredApiKey(opts.provider)) ?? undefined)
    : undefined;

  const config: EmbeddingProviderConfig = {
    apiKey,
    dimensions: opts.dimensions,
    baseUrl:
      model.provider === "ollama"
        ? deriveOllamaUrl(opts.serverUrl ?? "")
        : undefined,
  };

  return createProvider(model, config);
}
