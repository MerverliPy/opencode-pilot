import {
  ALL_MODELS,
  MODELS_BY_PROVIDER,
  PROVIDER_DISPLAY,
  findModel,
  modelsForProvider,
} from "@/plugin/memory/embeddings/ModelRegistry";
import type { EmbeddingProviderType } from "@/plugin/memory/embeddings/types";

describe("ModelRegistry", () => {
  describe("ALL_MODELS", () => {
    it("contains at least 30 models", () => {
      expect(ALL_MODELS.length).toBeGreaterThanOrEqual(30);
    });

    it("every model has required fields", () => {
      for (const m of ALL_MODELS) {
        expect(m.id).toBeTruthy();
        expect(m.provider).toBeTruthy();
        expect(m.dimensions).toBeGreaterThanOrEqual(0);
        expect(m.contextLength).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("findModel", () => {
    it("finds an existing model by id", () => {
      const m = findModel("text-embedding-3-small");
      expect(m).toBeDefined();
      expect(m?.provider).toBe("openai");
    });

    it("returns undefined for unknown id", () => {
      expect(findModel("nonexistent-model")).toBeUndefined();
    });
  });

  describe("modelsForProvider", () => {
    it("returns models for openai", () => {
      const models = modelsForProvider("openai");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === "openai")).toBe(true);
    });

    it("returns models for ollama", () => {
      const models = modelsForProvider("ollama");
      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === "ollama")).toBe(true);
    });

    it("returns empty array for invalid provider", () => {
      expect(modelsForProvider("invalid" as EmbeddingProviderType)).toEqual([]);
    });

    it("all providers in MODELS_BY_PROVIDER have at least one model", () => {
      const providers = Object.keys(
        MODELS_BY_PROVIDER,
      ) as EmbeddingProviderType[];
      for (const p of providers) {
        expect(MODELS_BY_PROVIDER[p].length).toBeGreaterThan(0);
      }
    });
  });

  describe("PROVIDER_DISPLAY", () => {
    it("has an entry for every provider type", () => {
      const providers = Object.keys(
        MODELS_BY_PROVIDER,
      ) as EmbeddingProviderType[];
      for (const p of providers) {
        expect(PROVIDER_DISPLAY[p]).toBeDefined();
        expect(PROVIDER_DISPLAY[p].label).toBeTruthy();
      }
    });
  });
});
