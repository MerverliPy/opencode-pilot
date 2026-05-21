import { N9RouterChatClient, availableModels } from "../n9routerChat";
import type { ServerConfig } from "@pilot-shared/types";

describe("n9routerChat", () => {
  const server: ServerConfig = {
    id: "s1",
    name: "Home",
    url: "http://localhost:4096",
    username: "alice",
    password: "secret",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses cookie auth for chat completion without Authorization header", async () => {
    const client = new N9RouterChatClient(server);
    const reader = { read: jest.fn(), releaseLock: jest.fn() };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });

    await client.chatCompletion([{ role: "user", content: "hi" }], "gpt-4o");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4096/api/chat/completions",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          "X-Requested-With": "PilotPWA",
        }),
      }),
    );
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("uses the provided n9router API key for model discovery", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: "gpt-4o" }] }),
    });

    const models = await availableModels("http://localhost:9090/", "router-key");

    expect(models).toEqual(["gpt-4o"]);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:9090/v1/models",
      expect.objectContaining({
        headers: {
          Accept: "application/json",
          Authorization: "Bearer router-key",
        },
      }),
    );
  });
});
