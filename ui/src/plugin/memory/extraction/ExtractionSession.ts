/**
 * Manages a persistent "shadow" OpenCode session used exclusively for
 * memory extraction. One ExtractionSession per client instance; the
 * shadow session is created once and reused across extractions.
 */
import type { OpencodeClient } from "../../../services/api";

const SHADOW_TITLE = "(memory extraction — do not use)";
const POLL_INTERVAL_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ExtractionSession {
  private sessionId: string | null = null;

  constructor(private client: OpencodeClient) {}

  async getOrCreateSessionId(): Promise<string> {
    if (this.sessionId) {
      try {
        await this.client.getSession(this.sessionId);
        return this.sessionId;
      } catch {
        // Session may have been deleted on the server — create a new one.
        this.sessionId = null;
      }
    }
    const sess = await this.client.createSession({ title: SHADOW_TITLE });
    this.sessionId = sess.id;
    return sess.id;
  }

  /**
   * Send a prompt to the shadow session and wait until the session goes idle,
   * then return the full text of the last assistant message.
   */
  async sendAndWait(
    text: string,
    opts: {
      model?: { providerID: string; modelID: string };
      timeoutMs?: number;
    } = {},
  ): Promise<string> {
    const timeoutMs = opts.timeoutMs ?? 45_000;
    const sessionId = await this.getOrCreateSessionId();

    await this.client.promptAsync(sessionId, {
      model: opts.model,
      parts: [{ type: "text", text }],
    });

    // Poll until idle or timeout.
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      try {
        const statuses = await this.client.sessionStatus();
        const s = statuses[sessionId];
        if (s === "idle" || s === "error" || s === "aborted") break;
      } catch {
        // Ignore transient network errors — keep polling.
      }
    }

    // Collect the last assistant message.
    const messages = await this.client.listMessages(sessionId);
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.info.role === "assistant");
    if (!lastAssistant) return "";

    return lastAssistant.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("");
  }

  /** Force creation of a fresh session on next use. */
  reset(): void {
    this.sessionId = null;
  }
}
