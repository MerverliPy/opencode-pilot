import type { EmbeddingModel, EmbeddingProviderConfig } from "../types";
import { CohereEmbeddings } from "../CohereEmbeddings";

// ---------------------------------------------------------------------------
// Model fixture
// ---------------------------------------------------------------------------
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

function lastFetchBody(): Record<string, unknown> {
  const calls = (global.fetch as jest.Mock).mock.calls;
  const [, options] = calls[calls.length - 1];
  return JSON.parse(options.body);
}

function lastFetchHeaders(): Record<string, string> {
  const calls = (global.fetch as jest.Mock).mock.calls;
  const [, options] = calls[calls.length - 1];
  return options.headers;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("CohereEmbeddings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Default task sends search_document ────────────────────────────────
  it("embed() sends search_document for default task", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "co-key" };
    const provider = new CohereEmbeddings(cohereModel, config);

    mockFetchOk({ embeddings: { float: [[0.1]] } });
    await provider.embed(["text"]);

    const body = lastFetchBody();
    expect(body.input_type).toBe("search_document");
  });

  // ── task=query sends search_query ─────────────────────────────────────
  it("embed() sends search_query when task=query", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "co-key" };
    const provider = new CohereEmbeddings(cohereModel, config);

    mockFetchOk({ embeddings: { float: [[0.1]] } });
    await provider.embed(["text"], "query");

    const body = lastFetchBody();
    expect(body.input_type).toBe("search_query");
  });

  // ── Sends Authorization Bearer ────────────────────────────────────────
  it("embed() sends Authorization Bearer", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "co-secret" };
    const provider = new CohereEmbeddings(cohereModel, config);

    mockFetchOk({ embeddings: { float: [[0.1]] } });
    await provider.embed(["text"]);

    const headers = lastFetchHeaders();
    expect(headers.Authorization).toBe("Bearer co-secret");
  });

  // ── Empty apiKey still sends Bearer ───────────────────────────────────
  it("embed() with empty apiKey still sends Authorization header", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "" };
    const provider = new CohereEmbeddings(cohereModel, config);

    mockFetchOk({ embeddings: { float: [[0.1]] } });
    await provider.embed(["text"]);

    const headers = lastFetchHeaders();
    expect(headers.Authorization).toBe("Bearer ");
  });

  // ── Returns embeddings.float array ────────────────────────────────────
  it("embed() returns embeddings.float array", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "co-key" };
    const provider = new CohereEmbeddings(cohereModel, config);

    const expected = [
      [0.1, 0.2],
      [0.3, 0.4],
    ];
    mockFetchOk({ embeddings: { float: expected } });
    const result = await provider.embed(["a", "b"]);

    expect(result).toEqual(expected);
  });

  // ── Sends correct model id and texts ──────────────────────────────────
  it("embed() sends model id and texts array", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "co-key" };
    const provider = new CohereEmbeddings(cohereModel, config);

    mockFetchOk({ embeddings: { float: [[0.1]] } });
    await provider.embed(["hello", "world"]);

    const body = lastFetchBody();
    expect(body.model).toBe("embed-english-v3.0");
    expect(body.texts).toEqual(["hello", "world"]);
  });

  // ── Sends embedding_types and truncate ────────────────────────────────
  it("embed() sends embedding_types and truncate fields", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "co-key" };
    const provider = new CohereEmbeddings(cohereModel, config);

    mockFetchOk({ embeddings: { float: [[0.1]] } });
    await provider.embed(["text"]);

    const body = lastFetchBody();
    expect(body.embedding_types).toEqual(["float"]);
    expect(body.truncate).toBe("END");
  });

  // ── Throws on HTTP error ──────────────────────────────────────────────
  it("embed() throws on HTTP error", async () => {
    const config: EmbeddingProviderConfig = { apiKey: "co-key" };
    const provider = new CohereEmbeddings(cohereModel, config);

    mockFetchError(401, "Unauthorized");

    await expect(provider.embed(["text"])).rejects.toThrow(
      "[cohere] embed failed 401: Unauthorized",
    );
  });
});
