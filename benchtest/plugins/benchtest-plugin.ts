/**
 * benchtest-plugin.ts — OpenCode Plugin for workflow instrumentation.
 *
 * Hooks into all available measurement points:
 *   - tool.execute.before/after → tool call timing, token estimation
 *   - chat.params              → model/provider tracking
 *   - chat.message             → response token tracking
 *   - experimental.text.complete → streaming text token count
 *   - experimental.session.compacting → compaction savings
 *   - session.created          → session lifecycle
 *
 * Gated behind BENCHTEST_ENABLED env var. No-ops when disabled.
 * Emits metrics via structured console.log (JSON Lines) for the
 * benchtest runner to consume.
 *
 * Usage in opencode.json:
 *   "plugin": [
 *     "./.opencode/plugins/n9router-director.ts",
 *     "./.opencode/plugins/tool-guardrails.ts",
 *     "./.opencode/plugins/rtk-compressor.ts",
 *     "./.opencode/plugins/benchtest-plugin.ts"
 *   ]
 */

import type { Plugin } from '@opencode-ai/plugin';

const IS_ENABLED = () => process.env.BENCHTEST_ENABLED === '1' || process.env.BENCHTEST_ENABLED === 'true';
const METRICS_OUT = process.env.BENCHTEST_METRICS_OUT || '/tmp/benchtest-metrics.jsonl';
const SESSION_ID = process.env.BENCHTEST_SESSION_ID || 'unknown';

// ─── Helpers ──────────────────────────────────────────────────────

let pendingToolCalls = new Map<string, { tool: string; args: any; startedAt: number; agent: string }>();
let pendingModelCalls = new Map<string, { model: string; provider: string; startedAt: number; agent: string }>();
let sessionCreated = false;

function emit(event: string, data: Record<string, unknown>): void {
  if (!IS_ENABLED()) return;
  const line = JSON.stringify({
    timestamp: Date.now(),
    sessionID: SESSION_ID,
    event,
    data,
  });
  // Write to stdout for benchtest runner to capture
  console.log(`[BENCHTEST] ${line}`);
  try {
    const fs = require('fs');
    fs.appendFileSync(METRICS_OUT, line + '\n');
  } catch {
    // Silently fail if fs unavailable (browser context)
  }
}

function getAgent(): string {
  return process.env.OPENCODE_AGENT || 'unknown';
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  // DeepSeek/Qwen2: ~1.8 chars/token
  return Math.ceil(text.length / 1.8);
}

// ─── Plugin ───────────────────────────────────────────────────────

export const BenchtestPlugin: Plugin = async () => {
  if (!IS_ENABLED()) {
    return {}; // No-op when disabled
  }

  return {
    // ── Session lifecycle ────────────────────────────────────────
    'session.created': async () => {
      sessionCreated = true;
      emit('session.created', { sessionID: SESSION_ID });
    },

    // ── LLM call params (before request) ─────────────────────────
    'chat.params': async (input, output) => {
      const agent = input.agent || getAgent();
      const modelID = input.model?.modelID || 'unknown';
      const providerID = input.model?.providerID || 'unknown';
      const callKey = `${SESSION_ID}:${agent}:${Date.now()}`;

      pendingModelCalls.set(callKey, {
        model: modelID,
        provider: providerID,
        startedAt: Date.now(),
        agent,
      });

      emit('chat.params', {
        agent,
        modelID,
        providerID,
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
        callKey,
      });
    },

    // ── LLM response ────────────────────────────────────────────
    'chat.message': async (input, output) => {
      const agent = input.agent || getAgent();
      const modelID = input.model?.modelID || input.model?.modelID || 'unknown';
      const providerID = input.model?.providerID || 'unknown';

      // Find matching pending call
      let matchedKey: string | null = null;
      let pending: any = null;
      for (const [key, p] of pendingModelCalls) {
        if (p.agent === agent && key.includes(agent)) {
          matchedKey = key;
          pending = p;
          break;
        }
      }

      const durationMs = pending ? Date.now() - pending.startedAt : 0;
      if (matchedKey) pendingModelCalls.delete(matchedKey);

      // Count tokens from message parts
      let inputTokens = 0;
      let outputTokens = 0;
      let textLength = 0;
      if (output?.parts) {
        for (const part of output.parts) {
          if (typeof part === 'string') {
            textLength += part.length;
          } else if (part && typeof part === 'object') {
            const p = part as Record<string, unknown>;
            if (typeof p.text === 'string') textLength += p.text.length;
          }
        }
      }
      // Also check message text
      if (output?.message && typeof output.message === 'object') {
        const msg = output.message as Record<string, unknown>;
        if (typeof msg.content === 'string') textLength += msg.content.length;
      }

      inputTokens = estimateTokens(textLength > 0 ? textLength.toString() : '');
      outputTokens = estimateTokens(textLength > 0 ? textLength.toString() : '');

      emit('chat.message', {
        agent,
        modelID,
        providerID,
        durationMs,
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        messageID: input.messageID,
      });
    },

    // ── Tool call (before) ───────────────────────────────────────
    'tool.execute.before': async (input, output) => {
      const tool = input.tool || 'unknown';
      const callID = input.callID || `${Date.now()}`;
      const agent = getAgent();
      const argsSize = input.args ? JSON.stringify(input.args).length : 0;

      pendingToolCalls.set(callID, {
        tool,
        args: input.args,
        startedAt: Date.now(),
        agent,
      });

      emit('tool.execute.before', {
        tool,
        callID,
        agent,
        argsSize,
      });
    },

    // ── Tool call (after) ────────────────────────────────────────
    'tool.execute.after': async (input, output) => {
      const tool = input.tool || 'unknown';
      const callID = input.callID || '';
      const pendingCall = pendingToolCalls.get(callID) || pendingToolCalls.get(input.callID || '');

      const startedAt = pendingCall?.startedAt || Date.now();
      const durationMs = Date.now() - startedAt;
      const agent = pendingCall?.agent || getAgent();

      // Get output size
      let outputText = '';
      const rawOut = (output as any)?.output ?? (output as any)?.content ?? '';
      if (typeof rawOut === 'string') outputText = rawOut;
      else if (rawOut && typeof rawOut === 'object') {
        try { outputText = JSON.stringify(rawOut); } catch { outputText = String(rawOut); }
      }
      const outputSize = outputText.length;

      // Check for RTK compression annotation
      let rtkFilter: string | undefined;
      let rtkSavedBytes: number | undefined;
      const rtkMatch = outputText.match(/\[RTK:\s*(\S+)\s*(\d+)\u2192(\d+)\s*bytes?\s*\(-(\d+)\)\]/);
      if (rtkMatch) {
        rtkFilter = rtkMatch[1];
        rtkSavedBytes = parseInt(rtkMatch[4]!, 10);
      }

      // Estimate tokens
      const argsText = input.args ? JSON.stringify(input.args) : '';
      const inputTokens = estimateTokens(argsText);
      const outputTokens = estimateTokens(outputText);

      if (callID) pendingToolCalls.delete(callID);

      emit('tool.execute.after', {
        tool,
        callID,
        agent,
        durationMs,
        outputSize,
        inputTokens,
        outputTokens,
        rtkFilter,
        rtkSavedBytes,
      });
    },

    // ── Text streaming complete ──────────────────────────────────
    'experimental.text.complete': async (input, output) => {
      const text = (input as any).text || '';
      if (!text) return;
      const estimatedTokens = estimateTokens(text);

      emit('text.complete', {
        messageID: (input as any).messageID || 'unknown',
        partID: (input as any).partID || 'unknown',
        textLength: text.length,
        estimatedTokens,
      });
    },

    // ── Session compaction ───────────────────────────────────────
    'experimental.session.compacting': async (output) => {
      const context = (output as any)?.context ?? [];
      const prompt = (output as any)?.prompt ?? '';
      const contextBefore = context.reduce((sum: number, s: string) => sum + s.length, 0);

      emit('session.compacting', {
        contextBeforeChars: contextBefore,
        promptChars: prompt.length,
        timestamp: Date.now(),
      });
    },
  };
};
