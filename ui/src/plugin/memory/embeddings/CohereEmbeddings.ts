/**
 * Adapter for Cohere's /v2/embed endpoint.
 * Cohere requires an `input_type` field ('search_document' | 'search_query')
 * which differs from the OpenAI wire format.
 */
import type { EmbeddingModel, EmbeddingProvider, EmbeddingProviderConfig, EmbeddingTaskType } from './types';

type CohereEmbedRequest = {
  model: string;
  texts: string[];
  input_type: 'search_document' | 'search_query';
  embedding_types: ['float'];
  truncate?: 'START' | 'END' | 'NONE';
};

type CohereEmbedResponse = {
  embeddings: {
    float: number[][];
  };
};

const TASK_MAP: Record<EmbeddingTaskType, 'search_document' | 'search_query'> = {
  document: 'search_document',
  query:    'search_query',
};

export class CohereEmbeddings implements EmbeddingProvider {
  readonly model: EmbeddingModel;
  private readonly apiKey: string;

  constructor(model: EmbeddingModel, config: EmbeddingProviderConfig) {
    this.model = model;
    this.apiKey = config.apiKey ?? '';
  }

  async embed(texts: string[], task: EmbeddingTaskType = 'document'): Promise<number[][]> {
    const body: CohereEmbedRequest = {
      model: this.model.id,
      texts,
      input_type: TASK_MAP[task],
      embedding_types: ['float'],
      truncate: 'END',
    };

    const res = await fetch('https://api.cohere.com/v2/embed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(`[cohere] embed failed ${res.status}: ${msg}`);
    }

    const json = (await res.json()) as CohereEmbedResponse;
    return json.embeddings.float;
  }
}
