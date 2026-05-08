/**
 * MemoryInjector: retrieves the most relevant memories for a given user query
 * and formats them as a context prefix to prepend to the prompt.
 */
import { getMemoriesByServer } from '../db/MemoryRepository';
import { getEmbeddingsByModel } from '../db/EmbeddingRepository';
import { topK } from '../embeddings/similarity';
import { createProviderFromConfig } from '../embeddings/EmbeddingProviderFactory';
import type { MemoryConfig } from '../db/schema';

const CONTEXT_HEADER = '[Memory Context — from previous sessions]';
const CONTEXT_FOOTER = '[End Memory Context]';

export class MemoryInjector {
  constructor(
    private serverId: string,
    private serverUrl?: string,
  ) {}

  /**
   * Build a context prefix string for the given user query.
   * Returns an empty string if injection is disabled, no embeddings exist,
   * or the embedding call fails.
   */
  async buildContext(query: string, config: MemoryConfig): Promise<string> {
    if (!config.enabled || !config.injectEnabled) return '';

    try {
      const memories = await getMemoriesByServer(this.serverId);
      if (memories.length === 0) return '';

      const memoryIds = memories.map((m) => m.id);
      const embeddings = await getEmbeddingsByModel(config.embeddingModel, memoryIds);
      if (embeddings.length === 0) return '';

      // Embed the user query.
      const provider = await createProviderFromConfig({
        modelId: config.embeddingModel,
        provider: config.embeddingProvider,
        serverUrl: this.serverUrl,
      });
      const vectors = await provider.embed([query], 'query');
      const queryVec = vectors[0];
      if (!queryVec) return '';

      // Build a lookup from memoryId → memory.
      const memoryById = Object.fromEntries(memories.map((m) => [m.id, m]));

      // Find top-K embeddings by cosine similarity.
      const scored = topK(
        queryVec,
        embeddings,
        (e) => e.vector,
        config.topK,
        0.5, // minimum relevance threshold
      );
      if (scored.length === 0) return '';

      // Format context block.
      const lines = scored
        .map(({ item }) => {
          const mem = memoryById[item.memoryId];
          return mem ? `- ${mem.content}` : null;
        })
        .filter(Boolean) as string[];

      if (lines.length === 0) return '';
      return `${CONTEXT_HEADER}\n${lines.join('\n')}\n${CONTEXT_FOOTER}\n\n`;
    } catch {
      // Never block the prompt due to injection failure.
      return '';
    }
  }
}
