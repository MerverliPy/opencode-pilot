/**
 * Adapter for Ollama's /api/embeddings endpoint.
 * Ollama uses a different request/response shape from the OpenAI standard.
 * The base URL defaults to port 11434 on the same host as the OpenCode server.
 */
import type { EmbeddingModel, EmbeddingProvider, EmbeddingProviderConfig, EmbeddingTaskType } from './types';

type OllamaEmbedRequest = {
  model: string;
  input: string[];
};

type OllamaEmbedResponse = {
  embeddings: number[][];
};

export class OllamaEmbeddings implements EmbeddingProvider {
  readonly model: EmbeddingModel;
  private readonly baseUrl: string;

  constructor(model: EmbeddingModel, config: EmbeddingProviderConfig) {
    this.model = model;
    // Use provided baseUrl, or derive from OpenCode server URL by replacing port with 11434
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async embed(texts: string[], _task?: EmbeddingTaskType): Promise<number[][]> {
    const body: OllamaEmbedRequest = {
      model: this.model.id,
      input: texts,
    };

    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`[ollama] embed failed ${res.status}: ${msg}`);
    }

    const json = (await res.json()) as OllamaEmbedResponse;
    return json.embeddings;
  }
}
