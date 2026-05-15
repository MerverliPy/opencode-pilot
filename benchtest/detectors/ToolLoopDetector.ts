/**
 * ToolLoopDetector — flags when N+ consecutive tool calls happen without
 * an intervening model call. Indicates the LLM is stuck in a tool loop
 * (e.g. repeatedly calling the same tool with slightly different args).
 *
 * Each loop alert includes the exact tool sequence and which tool/agent
 * triggered it, allowing precise pinpointing of wasteful patterns.
 */

import type { ToolCallMetric, ModelCallMetric, DetectorAlert } from '../types.js';
import { DETECTOR_THRESHOLDS } from '../config.js';

interface LoopState {
  agent: string;
  toolSequence: string[];
  startTime: number;
  startCallID: string;
}

export class ToolLoopDetector {
  private maxConsecutive: number;
  private loopState: LoopState | null = null;
  private lastModelCallTime = 0;

  constructor(maxConsecutive?: number) {
    this.maxConsecutive = maxConsecutive ?? DETECTOR_THRESHOLDS.toolLoopMax;
  }

  /** Notify of a model call (resets the loop counter) */
  notifyModelCall(m: ModelCallMetric): void {
    this.lastModelCallTime = m.timestamp;
    this.loopState = null; // model call breaks the loop
  }

  /** Evaluate tool call. Returns alert if loop detected. */
  evaluateToolCall(t: ToolCallMetric): DetectorAlert | null {
    // If a model call happened after this tool call started, no loop
    if (this.lastModelCallTime > t.timestamp) {
      this.loopState = null;
      return null;
    }

    if (!this.loopState) {
      // Start tracking a potential loop
      this.loopState = {
        agent: t.agent,
        toolSequence: [t.tool],
        startTime: t.timestamp,
        startCallID: t.callID,
      };
      return null;
    }

    // Continuing the loop
    this.loopState.toolSequence.push(t.tool);

    if (this.loopState.toolSequence.length >= this.maxConsecutive) {
      const alert: DetectorAlert = {
        detector: 'ToolLoopDetector',
        severity: 'high',
        timestamp: t.timestamp,
        message: `Tool loop detected: ${this.loopState.agent} made ${this.loopState.toolSequence.length} consecutive tool calls without model intervention. Sequence: ${this.loopState.toolSequence.join(' → ')}`,
        metric: t,
        threshold: this.maxConsecutive,
        actualValue: this.loopState.toolSequence.length,
      };
      // Reset after alert — don't keep firing for same loop
      this.loopState = null;
      return alert;
    }

    return null;
  }

  reset(): void {
    this.loopState = null;
    this.lastModelCallTime = 0;
  }
}
