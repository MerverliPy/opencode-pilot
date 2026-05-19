import { appendFileSync } from "node:fs";
import type { Plugin } from "@opencode-ai/plugin";

const isEnabled = (): boolean => process.env.BENCHTEST_ENABLED === "1" || process.env.BENCHTEST_ENABLED === "true";
const metricsOut = (): string => process.env.BENCHTEST_METRICS_OUT || "/tmp/benchtest-metrics.jsonl";
const sessionId = (): string => process.env.BENCHTEST_SESSION_ID || "unknown";

type PendingTool = {
  tool: string;
  startedAt: number;
  argsSize: number;
};

const pendingTools = new Map<string, PendingTool>();

function emit(event: string, data: Record<string, unknown>): void {
  if (!isEnabled()) return;
  const line = JSON.stringify({
    timestamp: Date.now(),
    sessionID: sessionId(),
    event,
    data,
  });

  try {
    appendFileSync(metricsOut(), `${line}\n`);
  } catch {
    // Metrics are best-effort and must never affect normal workflow execution.
  }
}

function estimateTokens(text: string): number {
  return text ? Math.ceil(text.length / 1.8) : 0;
}

function rawOutput(output: unknown): string {
  const raw: unknown = (output as any)?.output ?? (output as any)?.content ?? output;
  if (typeof raw === "string") return raw;
  if (raw === undefined || raw === null) return "";
  try {
    return JSON.stringify(raw);
  } catch {
    return String(raw);
  }
}

function rtkSavings(text: string): { filter?: string; before?: number; after?: number; saved?: number } {
  const match = text.match(/\[RTK:\s*([^\s]+)\s+(\d+)→(\d+)\s+bytes?\s+\(-(\d+)\)\]/);
  if (!match) return {};
  return {
    filter: match[1],
    before: Number(match[2]),
    after: Number(match[3]),
    saved: Number(match[4]),
  };
}

export const BenchtestMetricsPlugin: Plugin = async () => {
  if (!isEnabled()) return {};

  return {
    "session.created": async () => {
      emit("session.created", { sessionID: sessionId() });
    },

    "tool.execute.before": async (input: unknown) => {
      const i = input as any;
      const toolName = String(i?.tool || "unknown");
      const callID = String(i?.callID || `${toolName}:${Date.now()}:${pendingTools.size}`);
      const argsText = i?.args ? JSON.stringify(i.args) : "";
      pendingTools.set(callID, {
        tool: toolName,
        startedAt: Date.now(),
        argsSize: argsText.length,
      });
      emit("tool.execute.before", {
        tool: toolName,
        callID,
        argsSize: argsText.length,
        inputTokens: estimateTokens(argsText),
      });
    },

    "tool.execute.after": async (input: unknown, output: unknown) => {
      const i = input as any;
      const toolName = String(i?.tool || "unknown");
      const callID = String(i?.callID || "");
      const pending = callID ? pendingTools.get(callID) : undefined;
      const text = rawOutput(output);
      const savings = rtkSavings(text);

      if (callID) pendingTools.delete(callID);

      emit("tool.execute.after", {
        tool: pending?.tool || toolName,
        callID,
        durationMs: pending ? Date.now() - pending.startedAt : 0,
        argsSize: pending?.argsSize || 0,
        outputSize: text.length,
        outputTokens: estimateTokens(text),
        rtkFilter: savings.filter,
        rtkBytesBefore: savings.before,
        rtkBytesAfter: savings.after,
        rtkSavedBytes: savings.saved,
      });
    },

    "experimental.session.compacting": async (output: unknown) => {
      const o = output as any;
      const context = Array.isArray(o?.context) ? o.context : [];
      const prompt = typeof o?.prompt === "string" ? o.prompt : "";
      const contextChars = context.reduce((sum: number, entry: unknown) => sum + String(entry).length, 0);
      emit("session.compacting", {
        contextChars,
        promptChars: prompt.length,
      });
    },
  };
};
