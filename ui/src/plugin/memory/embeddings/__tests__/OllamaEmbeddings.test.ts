import type { EmbeddingModel, EmbeddingProviderConfig } from "../types";
import { OllamaEmbeddings } from "../OllamaEmbeddings";

// ---------------------------------------------------------------------------
// Model fixture
// ---------------------------------------------------------------------------
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

function lastFetchUrl(): string {
  const calls = (global.fetch as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as string;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("OllamaEmbeddings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── embed() sends correct POST body ────────────────────────────────────
  it("embed() sends correct POST body {model, input}", async () => {
    const config: EmbeddingProviderConfig = {};
    const provider = new OllamaEmbeddings(ollamaModel, config);

    mockFetchOk({
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });
    await provider.embed(["hello", "world"]);

    const body = lastFetchBody();
    expect(body.model).toBe("nomic-embed-text");
    expect(body.input).toEqual(["hello", "world"]);
  });

  // ── Uses provided baseUrl ──────────────────────────────────────────────
  it("embed() uses provided baseUrl", async () => {
    const config: EmbeddingProviderConfig = {
      baseUrl: "http://my-ollama:11434",
    };
    const provider = new OllamaEmbeddings(ollamaModel, config);

    mockFetchOk({ embeddings: [[0.1]] });
    await provider.embed(["text"]);

    const url = lastFetchUrl();
    expect(url).toBe("http://my-ollama:11434/api/embed");
  });

  // ── Defaults to http://localhost:11434 when no baseUrl ─────────────────
  it("embed() defaults to http://localhost:11434 when no baseUrl", async () => {
    const config: EmbeddingProviderConfig = {};
    const provider = new OllamaEmbeddings(ollamaModel, config);

    mockFetchOk({ embeddings: [[0.1]] });
    await provider.embed(["text"]);

    const url = lastFetchUrl();
    expect(url).toBe("http://localhost:11434/api/embed");
  });

  // ── Returns embeddings array ───────────────────────────────────────────
  it("embed() returns embeddings array", async () => {
    const config: EmbeddingProviderConfig = {};
    const provider = new OllamaEmbeddings(ollamaModel, config);

    const expected = [
      [0.1, 0.2],
      [0.3, 0.4],
    ];
    mockFetchOk({ embeddings: expected });
    const result = await provider.embed(["a", "b"]);

    expect(result).toEqual(expected);
  });

  // ── Ignores task parameter ────────────────────────────────────────────
  it("embed() ignores task parameter and always uses the same body shape", async () => {
    const config: EmbeddingProviderConfig = {};
    const provider = new OllamaEmbeddings(ollamaModel, config);

    mockFetchOk({ embeddings: [[0.1]] });
    await provider.embed(["text"], "query");

    const body = lastFetchBody();
    // The body should NOT contain any task/input_type field
    expect(body).toEqual({
      model: "nomic-embed-text",
      input: ["text"],
    });
  });

  // ── Throws on HTTP error ──────────────────────────────────────────────
  it("embed() throws on HTTP error", async () => {
    const config: EmbeddingProviderConfig = {};
    const provider = new OllamaEmbeddings(ollamaModel, config);

    mockFetchError(500, "Internal Server Error");

    await expect(provider.embed(["text"])).rejects.toThrow(
      "[ollama] embed failed 500: Internal Server Error",
    );
  });
});
