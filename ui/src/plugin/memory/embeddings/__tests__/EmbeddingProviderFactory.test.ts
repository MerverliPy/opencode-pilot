import type { EmbeddingModel } from "../types";
import { OllamaEmbeddings } from "../OllamaEmbeddings";
import { CohereEmbeddings } from "../CohereEmbeddings";
import { OpenAICompatibleEmbeddings } from "../OpenAICompatibleEmbeddings";
import {
  apiKeyStoreKey,
  deriveOllamaUrl,
  createProvider,
  createProviderFromConfig,
  storeApiKey,
  getStoredApiKey,
  deleteStoredApiKey,
} from "../EmbeddingProviderFactory";

// ---------------------------------------------------------------------------
// Mocks for module-level dependencies
// ---------------------------------------------------------------------------
jest.mock("../ModelRegistry", () => ({
  findModel: jest.fn(),
}));

jest.mock("../../../../services/auth", () => ({
  loadN9RouterConfig: jest.fn(),
}));

import { findModel } from "../ModelRegistry";
import { loadN9RouterConfig } from "../../../../services/auth";

// ---------------------------------------------------------------------------
// Model fixtures
// ---------------------------------------------------------------------------
const openaiModel: EmbeddingModel = {
  id: "text-embedding-3-small",
  provider: "openai",
  displayName: "text-embedding-3-small",
  dimensions: 1536,
  contextLength: 8191,
  requiresApiKey: true,
  isLocal: false,
  matryoshka: true,
  supportsTaskType: false,
};

const ollamaModel: EmbeddingModel = {
  id: "nomic-embed-text",
  provider: "ollama",
  displayName: "nomic-embed-text",
  dimensions: 768,
  contextLength: 8192,
  requiresApiKey: false,
  isLocal: true,
  matryoshka: false,
  supportsTaskType: false,
};

const cohereModel: EmbeddingModel = {
  id: "embed-english-v3.0",
  provider: "cohere",
  displayName: "embed-english-v3.0",
  dimensions: 1024,
  contextLength: 512,
  requiresApiKey: true,
  isLocal: false,
  matryoshka: false,
  supportsTaskType: true,
};

const n9routerModel: EmbeddingModel = {
  id: "n9router/openai/text-embedding-3-small",
  provider: "n9router",
  displayName: "openai/text-embedding-3-small",
  dimensions: 1536,
  contextLength: 8191,
  requiresApiKey: false,
  isLocal: false,
  matryoshka: true,
  supportsTaskType: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("EmbeddingProviderFactory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.spyOn(Storage.prototype, "getItem");
    jest.spyOn(Storage.prototype, "setItem");
    jest.spyOn(Storage.prototype, "removeItem");
  });

  // ── createProvider ─────────────────────────────────────────────────────
  describe("createProvider", () => {
    it("returns OllamaEmbeddings for ollama provider", () => {
      const provider = createProvider(ollamaModel, {});
      expect(provider).toBeInstanceOf(OllamaEmbeddings);
      expect(provider.model.id).toBe("nomic-embed-text");
    });

    it("returns CohereEmbeddings for cohere provider", () => {
      const provider = createProvider(cohereModel, {});
      expect(provider).toBeInstanceOf(CohereEmbeddings);
      expect(provider.model.id).toBe("embed-english-v3.0");
    });

    it("returns OpenAICompatibleEmbeddings for openai provider", () => {
      const provider = createProvider(openaiModel, {});
      expect(provider).toBeInstanceOf(OpenAICompatibleEmbeddings);
      expect(provider.model.id).toBe("text-embedding-3-small");
    });

    it("returns OpenAICompatibleEmbeddings for unknown provider (default)", () => {
      const unknownModel: EmbeddingModel = {
        ...openaiModel,
        provider: "lmstudio",
      };
      const provider = createProvider(unknownModel, {});
      expect(provider).toBeInstanceOf(OpenAICompatibleEmbeddings);
    });
  });

  // ── deriveOllamaUrl ────────────────────────────────────────────────────
  describe("deriveOllamaUrl", () => {
    it("parses URL and replaces port with 11434", () => {
      const result = deriveOllamaUrl("https://myserver.example.com:8080");
      expect(result).toBe("https://myserver.example.com:11434");
    });

    it("preserves protocol", () => {
      const result = deriveOllamaUrl("http://192.168.1.100:3000");
      expect(result).toBe("http://192.168.1.100:11434");
    });

    it("returns fallback on invalid URL", () => {
      const result = deriveOllamaUrl("not-a-valid-url");
      expect(result).toBe("http://localhost:11434");
    });

    it("returns fallback on empty string", () => {
      const result = deriveOllamaUrl("");
      expect(result).toBe("http://localhost:11434");
    });
  });

  // ── API key helpers ────────────────────────────────────────────────────
  describe("api key helpers", () => {
    it("apiKeyStoreKey returns correct key format", () => {
      expect(apiKeyStoreKey("openai")).toBe("memory_apikey_openai");
      expect(apiKeyStoreKey("cohere")).toBe("memory_apikey_cohere");
    });

    it("storeApiKey writes the key to localStorage", async () => {
      await storeApiKey("openai", "sk-test");

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "memory_apikey_openai",
        "sk-test",
      );
    });

    it("getStoredApiKey reads from localStorage and returns stored value", async () => {
      localStorage.setItem("memory_apikey_cohere", "sk-stored");

      const key = await getStoredApiKey("cohere");

      expect(localStorage.getItem).toHaveBeenCalledWith("memory_apikey_cohere");
      expect(key).toBe("sk-stored");
    });

    it("deleteStoredApiKey removes the key from localStorage", async () => {
      await deleteStoredApiKey("openai");

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "memory_apikey_openai",
      );
    });
  });

  // ── createProviderFromConfig ───────────────────────────────────────────
  describe("createProviderFromConfig", () => {
    it("throws on unknown modelId", async () => {
      (findModel as jest.Mock).mockReturnValue(undefined);

      await expect(
        createProviderFromConfig({
          modelId: "nonexistent",
          provider: "openai",
        }),
      ).rejects.toThrow("[memory] unknown embedding model: nonexistent");

      expect(findModel).toHaveBeenCalledWith("nonexistent");
    });

    it("for n9router: loads n9router config, strips prefix, returns OpenAICompatibleEmbeddings", async () => {
      (findModel as jest.Mock).mockReturnValue(n9routerModel);
      (loadN9RouterConfig as jest.Mock).mockResolvedValue({
        url: "http://n9router:4000/v1/",
        key: "n9-key-123",
      });

      const provider = await createProviderFromConfig({
        modelId: "n9router/openai/text-embedding-3-small",
        provider: "n9router",
        dimensions: 256,
      });

      expect(provider).toBeInstanceOf(OpenAICompatibleEmbeddings);
      // Model ID should have the n9router/ prefix stripped
      expect(provider.model.id).toBe("openai/text-embedding-3-small");
      expect((provider as unknown as { baseUrl: string }).baseUrl).toBe(
        "http://n9router:4000/v1",
      );
      expect((provider as unknown as { apiKey: string }).apiKey).toBe(
        "n9-key-123",
      );

      expect(findModel).toHaveBeenCalledWith(
        "n9router/openai/text-embedding-3-small",
      );
      expect(loadN9RouterConfig).toHaveBeenCalled();
    });

    it("for non-n9router: loads api key from localStorage, returns OpenAICompatibleEmbeddings", async () => {
      (findModel as jest.Mock).mockReturnValue(openaiModel);
      localStorage.setItem("memory_apikey_openai", "sk-openai");

      const provider = await createProviderFromConfig({
        modelId: "text-embedding-3-small",
        provider: "openai",
        dimensions: 512,
      });

      expect(provider).toBeInstanceOf(OpenAICompatibleEmbeddings);
      expect(provider.model.id).toBe("text-embedding-3-small");
      expect((provider as unknown as { apiKey: string }).apiKey).toBe(
        "sk-openai",
      );
      expect(
        (provider as unknown as { dimensions: number | undefined }).dimensions,
      ).toBe(512);

      expect(findModel).toHaveBeenCalledWith("text-embedding-3-small");
      expect(localStorage.getItem).toHaveBeenCalledWith("memory_apikey_openai");
    });

    it("for ollama: derives ollama URL, returns OllamaEmbeddings, no localStorage read for key", async () => {
      (findModel as jest.Mock).mockReturnValue(ollamaModel);

      const provider = await createProviderFromConfig({
        modelId: "nomic-embed-text",
        provider: "ollama",
        serverUrl: "https://my-opencode-server.com:8080",
      });

      expect(provider).toBeInstanceOf(OllamaEmbeddings);
      expect((provider as unknown as { baseUrl: string }).baseUrl).toBe(
        "https://my-opencode-server.com:11434",
      );
      // ollama models don't require API key → localStorage.getItem should NOT be called
      expect(localStorage.getItem).not.toHaveBeenCalled();
    });

    it("for cohere: loads api key from localStorage, returns CohereEmbeddings", async () => {
      (findModel as jest.Mock).mockReturnValue(cohereModel);
      localStorage.setItem("memory_apikey_cohere", "sk-cohere");

      const provider = await createProviderFromConfig({
        modelId: "embed-english-v3.0",
        provider: "cohere",
      });

      expect(provider).toBeInstanceOf(CohereEmbeddings);
      expect(provider.model.id).toBe("embed-english-v3.0");
      expect(localStorage.getItem).toHaveBeenCalledWith("memory_apikey_cohere");
    });
  });
});
