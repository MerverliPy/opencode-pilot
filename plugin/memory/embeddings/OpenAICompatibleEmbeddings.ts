/**
 * Adapter for any OpenAI-compatible /v1/embeddings endpoint.
 * Handles: OpenAI, Voyage AI, Jina AI, Mistral, OpenRouter, LM Studio, Azure OpenAI.
 */
import type { EmbeddingModel, EmbeddingProvider, EmbeddingProviderConfig, EmbeddingTaskType } from './types';

type OAIEmbedRequest = {
  model: string;
  input: string | string[];
  dimensions?: number;
  encoding_format?: 'float' | 'base64';
  // Jina-specific
  task?: string;
  // OpenRouter-specific
  provider?: { order?: string[]; allow_fallbacks?: boolean };
};

type OAIEmbedResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  usage?: { prompt_tokens: number; total_tokens: number };
};

const BASE_URLS: Record<string, string> = {
  openai:      'https://api.openai.com/v1',
  voyage:      'https://api.voyageai.com/v1',
  jina:        'https://api.jina.ai/v1',
  mistral:     'https://api.mistral.ai/v1',
  openrouter:  'https://openrouter.ai/api/v1',
};

const JINA_TASK_MAP: Record<EmbeddingTaskType, string> = {
  query:    'retrieval.query',
  document: 'retrieval.passage',
};

export class OpenAICompatibleEmbeddings implements EmbeddingProvider {
  readonly model: EmbeddingModel;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly dimensions?: number;
  private readonly routerProviderOrder?: string[];

  constructor(model: EmbeddingModel, config: EmbeddingProviderConfig) {
    this.model = model;
    this.apiKey = config.apiKey ?? '';
    this.baseUrl =
      config.baseUrl ??
      BASE_URLS[model.provider] ??
      'https://api.openai.com/v1';
    this.dimensions = config.dimensions;
    this.routerProviderOrder = config.routerProviderOrder;
  }

  async embed(texts: string[], task?: EmbeddingTaskType): Promise<number[][]> {
    const body: OAIEmbedRequest = {
      model: this.model.id,
      input: texts,
    };

    if (this.dimensions) {
      body.dimensions = this.dimensions;
    }

    // Jina task-specific LoRA activation
    if (this.model.supportsTaskType && task) {
      body.task = JINA_TASK_MAP[task];
    }

    // OpenRouter provider routing
    if (this.model.provider === 'openrouter' && this.routerProviderOrder?.length) {
      body.provider = {
        order: this.routerProviderOrder,
        allow_fallbacks: true,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    // OpenRouter requires these headers
    if (this.model.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://opencode.ai';
      headers['X-Title'] = 'pilot';
    }

    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`[${this.model.provider}] embed failed ${res.status}: ${msg}`);
    }

    const json = (await res.json()) as OAIEmbedResponse;
    // Sort by index to guarantee order matches input
    return json.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }
}
