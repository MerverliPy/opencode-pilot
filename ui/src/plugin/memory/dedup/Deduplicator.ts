/**
 * Deduplicator: checks whether a piece of text is semantically similar to any
 * memory already stored for this server, using cosine similarity on embeddings.
 */
import { getMemoriesByServer } from '../db/MemoryRepository';
import { getEmbeddingsByModel } from '../db/EmbeddingRepository';
import { cosineSimilarity } from '../embeddings/similarity';
import { createProviderFromConfig } from '../embeddings/EmbeddingProviderFactory';
import type { MemoryConfig } from '../db/schema';

export class Deduplicator {
  constructor(
    private serverId: string,
    private serverUrl?: string,
  ) {}

  /**
   * Returns true if `content` is a near-duplicate of an existing memory.
   * Embeds `content`, then compares against all embeddings stored under the
   * current model. Falls back to false (allow insert) on any error.
   */
  async isDuplicate(content: string, config: MemoryConfig): Promise<boolean> {
    try {
      // Load existing memory IDs for this server.
      const memories = await getMemoriesByServer(this.serverId);
      if (memories.length === 0) return false;

      // Get embeddings for those memories under the current model.
      const memoryIds = memories.map((m) => m.id);
      const embeddings = await getEmbeddingsByModel(config.embeddingModel, memoryIds);
      if (embeddings.length === 0) return false;

      // Embed the candidate.
      const provider = await createProviderFromConfig({
        modelId: config.embeddingModel,
        provider: config.embeddingProvider,
        serverUrl: this.serverUrl,
      });
      const vectors = await provider.embed([content], 'document');
      const queryVec = vectors[0];
      if (!queryVec) return false;

      // Check similarity against all stored vectors.
      return embeddings.some(
        (e) => cosineSimilarity(queryVec, e.vector) >= config.dedupThreshold,
      );
    } catch {
      // Never block insertion due to dedup error.
      return false;
    }
  }
}
