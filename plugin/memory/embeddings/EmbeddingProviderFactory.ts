/**
 * Factory that maps an EmbeddingModel to the right provider class.
 * Also handles Ollama base-URL derivation from the OpenCode server URL.
 */
import * as SecureStore from 'expo-secure-store';
import type { EmbeddingModel, EmbeddingProvider, EmbeddingProviderConfig } from './types';
import { findModel } from './ModelRegistry';
import { OllamaEmbeddings } from './OllamaEmbeddings';
import { CohereEmbeddings } from './CohereEmbeddings';
import { OpenAICompatibleEmbeddings } from './OpenAICompatibleEmbeddings';

/** SecureStore key for a provider's API key. */
export function apiKeyStoreKey(provider: string): string {
  return `memory_apikey_${provider}`;
}

export async function getStoredApiKey(provider: string): Promise<string | null> {
  return SecureStore.getItemAsync(apiKeyStoreKey(provider));
}

export async function storeApiKey(provider: string, key: string): Promise<void> {
  await SecureStore.setItemAsync(apiKeyStoreKey(provider), key);
}

export async function deleteStoredApiKey(provider: string): Promise<void> {
  await SecureStore.deleteItemAsync(apiKeyStoreKey(provider));
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
    return 'http://localhost:11434';
  }
}

/** Instantiate the right EmbeddingProvider for a model + config. */
export function createProvider(model: EmbeddingModel, config: EmbeddingProviderConfig): EmbeddingProvider {
  switch (model.provider) {
    case 'ollama':
      return new OllamaEmbeddings(model, config);
    case 'cohere':
      return new CohereEmbeddings(model, config);
    default:
      return new OpenAICompatibleEmbeddings(model, config);
  }
}

/**
 * Build an EmbeddingProvider from config values, loading the API key from
 * SecureStore automatically for providers that need one.
 */
export async function createProviderFromConfig(opts: {
  modelId: string;
  provider: string;
  serverUrl?: string;
  dimensions?: number;
}): Promise<EmbeddingProvider> {
  const model = findModel(opts.modelId);
  if (!model) throw new Error(`[memory] unknown embedding model: ${opts.modelId}`);

  const apiKey = model.requiresApiKey
    ? (await getStoredApiKey(opts.provider)) ?? undefined
    : undefined;

  const config: EmbeddingProviderConfig = {
    apiKey,
    dimensions: opts.dimensions,
    baseUrl: model.provider === 'ollama'
      ? deriveOllamaUrl(opts.serverUrl ?? '')
      : undefined,
  };

  return createProvider(model, config);
}
