import { cosineSimilarity, topK } from "@/plugin/memory/embeddings/similarity";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 1, 1], [1, 1, 1])).toBeCloseTo(1, 10);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it("returns 0 for zero vectors", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns correct value for known vectors", () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    const dot = 1 * 4 + 2 * 5 + 3 * 6;
    const normA = Math.sqrt(1 + 4 + 9);
    const normB = Math.sqrt(16 + 25 + 36);
    const expected = dot / (normA * normB);
    expect(cosineSimilarity(a, b)).toBeCloseTo(expected, 10);
  });
});

describe("topK", () => {
  type Item = { id: string; vec: number[] };
  const items: Item[] = [
    { id: "a", vec: [1, 0] },
    { id: "b", vec: [0, 1] },
    { id: "c", vec: [1, 1] },
    { id: "d", vec: [-1, 0] },
  ];

  it("returns top k sorted by score descending", () => {
    const query = [1, 0];
    const result = topK(query, items, (i) => i.vec, 2);
    expect(result).toHaveLength(2);
    expect(result[0].item.id).toBe("a");
    expect(result[0].score).toBe(1);
    expect(result[1].item.id).toBe("c");
  });

  it("respects minScore threshold", () => {
    const query = [1, 0];
    const result = topK(query, items, (i) => i.vec, 10, 0.5);
    expect(result.every((r) => r.score >= 0.5)).toBe(true);
    expect(result.map((r) => r.item.id)).toEqual(["a", "c"]);
  });

  it("returns empty array when no items match", () => {
    const query = [1, 0];
    const result = topK(query, [] as Item[], (i) => i.vec, 5);
    expect(result).toEqual([]);
  });

  it("returns fewer than k when items.length < k", () => {
    const query = [1, 0];
    const fewItems: Item[] = [
      { id: "a", vec: [1, 0] },
      { id: "b", vec: [0, 1] },
    ];
    const result = topK(query, fewItems, (i) => i.vec, 10);
    expect(result).toHaveLength(2);
  });

  it("filters out items below minScore", () => {
    const query = [1, 0];
    const result = topK(query, items, (i) => i.vec, 10, 0.99);
    expect(result).toHaveLength(1);
    expect(result[0].item.id).toBe("a");
  });
});
