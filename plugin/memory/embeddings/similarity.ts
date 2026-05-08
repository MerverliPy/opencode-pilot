/** Cosine similarity utilities for embedding vectors. */

/** Cosine similarity in [−1, 1]. Returns 0 for zero-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export type ScoredItem<T> = { item: T; score: number };

/**
 * Return up to `k` items with the highest cosine similarity to `query`.
 * Items scoring below `minScore` are excluded.
 */
export function topK<T>(
  query: number[],
  items: T[],
  getVector: (item: T) => number[],
  k: number,
  minScore = 0,
): ScoredItem<T>[] {
  return items
    .map((item) => ({ item, score: cosineSimilarity(query, getVector(item)) }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
