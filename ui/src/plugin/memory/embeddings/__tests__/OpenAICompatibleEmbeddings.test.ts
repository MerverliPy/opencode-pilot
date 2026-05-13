import type { EmbeddingModel, EmbeddingProviderConfig } from "../types";
import { OpenAICompatibleEmbeddings } from "../OpenAICompatibleEmbeddings";

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

const jinaModel: EmbeddingModel = {
  id: "jina-embeddings-v3",
  provider: "jina",
  displayName: "jina-embeddings-v3",
  dimensions: 1024,
  contextLength: 8192,
  requiresApiKey: true,
  isLocal: false,
  matryoshka: true,
  supportsTaskType: true,
};

const openrouterModel: EmbeddingModel = {
  id: "openai/text-embedding-3-small",
  provider: "openrouter",
  displayName: "openai/text-embedding-3-small",
  dimensions: 1536,
  contextLength: 8191,
  requiresApiKey: true,
  isLocal: false,
  matryoshka: true,
  supportsTaskType: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockFetchOk(jsonData: unknown) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(jsonData),
    text: jest.fn().mockResolvedValue(""),
  });
}

function mockFetchError(status: number, statusText: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    statusText,
    text: jest.fn().mockResolvedValue(statusText),
  });
}

/** Extract the POST body (as parsed object) from the last fetch call. */
function lastFetchBody(): Record<string, unknown> {
  const calls = (global.fetch as jest.Mock).mock.calls;
  const [, options] = calls[calls.length - 1];
  return JSON.parse(options.body);
}

/** Extract the headers from the last fetch call. */
function lastFetchHeaders(): Record<string, string> {
  const calls = (global.fetch as jest.Mock).mock.calls;
  const [, options] = calls[calls.length - 1];
  return options.headers;
}

/** Extract the URL from the last fetch call. */
function lastFetchUrl(): string {
  const calls = (global.fetch as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("OpenAICompatibleEmbeddings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── embed() sends correct POST body with model id and input array ──────
  it("embed() sends correct POST body with model id and input array", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["hello", "world"]);

    const body = lastFetchBody();
    expect(body.model).toBe("text-embedding-3-small");
    expect(body.input).toEqual(["hello", "world"]);
  });

  // ── embed() sends Authorization Bearer with apiKey ─────────────────────
  it("embed() sends Authorization Bearer with apiKey", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-secret" };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["test"]);

    const headers = lastFetchHeaders();
    expect(headers.Authorization).toBe("Bearer sk-secret");
  });

  // ── Jina model with task='query' sends task: 'retrieval.query' ─────────
  it("embed() with Jina model and task=query sends task: retrieval.query", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(jinaModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"], "query");

    const body = lastFetchBody();
    expect(body.task).toBe("retrieval.query");
  });

  // Jina with task='document' sends 'retrieval.passage'
  it("embed() with Jina model and task=document sends task: retrieval.passage", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(jinaModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"], "document");

    const body = lastFetchBody();
    expect(body.task).toBe("retrieval.passage");
  });

  // ── OpenRouter with routerProviderOrder sends provider.order ───────────
  it("embed() with OpenRouter and routerProviderOrder sends provider.order", async () => {
    const config: EmbeddingProviderConfig = {
      apiKey: "sk-test",
      routerProviderOrder: ["OpenAI", "Mistral"],
    };
    const provider = new OpenAICompatibleEmbeddings(openrouterModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"]);

    const body = lastFetchBody();
    expect(body.provider).toEqual({
      order: ["OpenAI", "Mistral"],
      allow_fallbacks: true,
    });
  });

  // ── OpenRouter sends HTTP-Referer and X-Title headers ──────────────────
  it("embed() with OpenRouter sends HTTP-Referer and X-Title headers", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(openrouterModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"]);

    const headers = lastFetchHeaders();
    expect(headers["HTTP-Referer"]).toBe("https://opencode.ai");
    expect(headers["X-Title"]).toBe("pilot");
  });

  // ── Non-OpenRouter providers do NOT send OpenRouter headers ────────────
  it("embed() without OpenRouter does not send OpenRouter-specific headers", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"]);

    const headers = lastFetchHeaders();
    expect(headers["HTTP-Referer"]).toBeUndefined();
    expect(headers["X-Title"]).toBeUndefined();
  });

  // ── Returns parsed embeddings sorted by index ──────────────────────────
  it("embed() returns parsed embeddings sorted by index", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({
      data: [
        { embedding: [0.3, 0.4], index: 1 },
        { embedding: [0.1, 0.2], index: 0 },
      ],
    });

    const result = await provider.embed(["a", "b"]);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  // ── With dimensions override sends dimensions field ────────────────────
  it("embed() with dimensions override sends dimensions field", async () => {
    const config: EmbeddingProviderConfig = {
      apiKey: "sk-test",
      dimensions: 256,
    };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"]);

    const body = lastFetchBody();
    expect(body.dimensions).toBe(256);
  });

  // ── Without dimensions override does NOT send dimensions field ─────────
  it("embed() without dimensions override does not send dimensions field", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"]);

    const body = lastFetchBody();
    expect(body.dimensions).toBeUndefined();
  });

  // ── Throws on HTTP error ───────────────────────────────────────────────
  it("embed() throws on HTTP error", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchError(400, "Bad Request");

    await expect(provider.embed(["text"])).rejects.toThrow(
      "[openai] embed failed 400: Bad Request",
    );
  });

  // ── Empty apiKey still sends Authorization header ──────────────────────
  it("embed() with empty apiKey still sends Authorization header", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "" };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["test"]);

    const headers = lastFetchHeaders();
    expect(headers.Authorization).toBe("Bearer ");
  });

  // ── No apiKey (undefined) still sends Authorization header ─────────────
  it("embed() with undefined apiKey still sends Authorization header", async () => {
    const config: EmbeddingProviderConfig = {};
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["test"]);

    const headers = lastFetchHeaders();
    expect(headers.Authorization).toBe("Bearer ");
  });

  // ── Uses correct baseUrl for openai provider ───────────────────────────
  it("embed() uses correct default baseUrl for openai provider", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "sk-test" };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"]);

    const url = lastFetchUrl();
    expect(url).toBe("https://api.openai.com/v1/embeddings");
  });

  // ── Uses custom baseUrl when provided ──────────────────────────────────
  it("embed() uses custom baseUrl when provided", async () => {
    const config: EmbeddingProviderConfig = {
      apiKey: "sk-test",
      baseUrl: "https://custom.example.com/v1",
    };
    const provider = new OpenAICompatibleEmbeddings(openaiModel, config);

    mockFetchOk({ data: [{ embedding: [0.1], index: 0 }] });
    await provider.embed(["text"]);

    const url = lastFetchUrl();
    expect(url).toBe("https://custom.example.com/v1/embeddings");
  });
});
