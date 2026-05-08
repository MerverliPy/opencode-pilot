/**
 * MemoryExtractor: orchestrates the end-to-end memory extraction pipeline.
 *
 * Flow triggered after session.idle:
 *   1. Convert the last N turns to a conversation string.
 *   2. Ask the shadow OpenCode session to extract memories (JSON).
 *   3. Parse the JSON response.
 *   4. Deduplicate each candidate against existing memories.
 *   5. Insert survivors into the DB and embed them.
 *   6. Return the newly inserted Memory records.
 */
import type { OpencodeClient } from '@/services/api';
import type { Part } from '@/services/types';
import type { Turn } from '@/store/session';
import type { Memory, MemoryCategory, MemoryConfig } from '../db/schema';
import { insertMemory } from '../db/MemoryRepository';
import { insertEmbedding } from '../db/EmbeddingRepository';
import { createProviderFromConfig } from '../embeddings/EmbeddingProviderFactory';
import { ExtractionSession } from './ExtractionSession';
import { Deduplicator } from '../dedup/Deduplicator';
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  turnsToText,
} from './prompts';

/** Maximum number of recent turns to include in the extraction prompt. */
const MAX_TURNS = 20;

type ExtractedMemory = {
  content: string;
  category: MemoryCategory;
  confidence: number;
  tags: string[];
};

const VALID_CATEGORIES: MemoryCategory[] = ['preference', 'fact', 'code_pattern', 'decision'];

function isValidCategory(v: unknown): v is MemoryCategory {
  return VALID_CATEGORIES.includes(v as MemoryCategory);
}

/** Extract plain text from a Part array. */
function partsToText(parts: Part[]): string {
  return parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('');
}

/** Parse the AI's JSON response into typed ExtractedMemory objects. */
function parseExtractionResponse(raw: string): ExtractedMemory[] {
  // Trim any surrounding prose — the AI should return pure JSON but may not.
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]) as unknown[];
    const result: ExtractedMemory[] = [];
    for (const item of arr) {
      if (typeof item !== 'object' || item === null) continue;
      const obj = item as Record<string, unknown>;
      const content   = typeof obj.content    === 'string' ? obj.content.trim()  : '';
      const category  = isValidCategory(obj.category)      ? obj.category        : 'fact';
      const confidence = typeof obj.confidence === 'number' ? Math.min(1, Math.max(0, obj.confidence)) : 0.8;
      const tags = Array.isArray(obj.tags)
        ? (obj.tags as unknown[]).filter((t) => typeof t === 'string') as string[]
        : [];
      if (content.length < 10 || confidence < 0.65) continue; // skip noise
      result.push({ content, category, confidence, tags });
    }
    return result;
  } catch {
    return [];
  }
}

export class MemoryExtractor {
  private extractionSession: ExtractionSession;
  private deduplicator: Deduplicator;

  constructor(
    private client: OpencodeClient,
    private serverId: string,
    private serverUrl?: string,
  ) {
    this.extractionSession = new ExtractionSession(client);
    this.deduplicator = new Deduplicator(serverId, serverUrl);
  }

  /**
   * Run extraction on the most recent turns of a session.
   * Returns the list of Memory records that were newly inserted into the DB.
   */
  async extract(turns: Turn[], config: MemoryConfig): Promise<Memory[]> {
    if (!config.enabled || !config.extractEnabled) return [];
    if (turns.length === 0) return [];

    // Build conversation text from the last N turns.
    const recent = turns.slice(-MAX_TURNS);
    const textTurns = recent.map((t) => ({
      role: t.message.role,
      text: partsToText(t.parts),
    })).filter((t) => t.text.length > 0);

    if (textTurns.length === 0) return [];

    const conversationText = turnsToText(textTurns);
    const userPrompt = buildExtractionPrompt(conversationText);

    // Include system prompt as a prefix in the user prompt, since promptAsync
    // doesn't have a dedicated system-message field.
    const fullPrompt = `${EXTRACTION_SYSTEM_PROMPT}\n\n${userPrompt}`;

    let rawResponse: string;
    try {
      rawResponse = await this.extractionSession.sendAndWait(fullPrompt, {
        timeoutMs: 45_000,
      });
    } catch {
      return []; // Network / server error — skip silently.
    }

    const candidates = parseExtractionResponse(rawResponse);
    if (candidates.length === 0) return [];

    // Create the embedding provider once for this batch.
    let provider;
    try {
      provider = await createProviderFromConfig({
        modelId: config.embeddingModel,
        provider: config.embeddingProvider,
        serverUrl: this.serverUrl,
      });
    } catch {
      // Embedding provider unavailable — still save memories without vectors.
      provider = null;
    }

    const inserted: Memory[] = [];

    for (const candidate of candidates) {
      // Dedup check (skip if embedding not available — allow all).
      const isDup = await this.deduplicator.isDuplicate(candidate.content, config);
      if (isDup) continue;

      const memory = await insertMemory({
        serverId: this.serverId,
        content: candidate.content,
        category: candidate.category,
        confidence: candidate.confidence,
        tags: candidate.tags,
        isPinned: false,
        isArchived: false,
      });

      // Embed and store the vector.
      if (provider) {
        try {
          const vectors = await provider.embed([memory.content], 'document');
          const vec = vectors[0];
          if (vec) {
            await insertEmbedding({
              memoryId: memory.id,
              modelId: config.embeddingModel,
              vector: vec,
            });
          }
        } catch {
          // Continue — memory is saved even without an embedding.
        }
      }

      inserted.push(memory);
    }

    return inserted;
  }

  /** Reset the shadow extraction session (forces a new session on next extract). */
  resetSession(): void {
    this.extractionSession.reset();
  }
}
