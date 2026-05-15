/**
 * ContextWindowDetector — monitors context growth rate per session.
 *
 * Tracks the growth of context (sum of input tokens) across model calls
 * in a session. Alerts when growth rate exceeds threshold, indicating
 * runaway context accumulation that will trigger compaction.
 */

import type { ModelCallMetric, DetectorAlert } from '../types.js';
import { DETECTOR_THRESHOLDS } from '../config.js';

interface SessionContext {
  sessionID: string;
  lastTotalTokens: number;
  lastTimestamp: number;
  growthRates: number[];
}

export class ContextWindowDetector {
  private sessions = new Map<string, SessionContext>();
  private growthRateThreshold: number;

  constructor(growthRate?: number) {
    this.growthRateThreshold = growthRate ?? DETECTOR_THRESHOLDS.contextGrowthRate;
  }

  /** Evaluate model call for context growth. */
  evaluate(m: ModelCallMetric): DetectorAlert | null {
    const existing = this.sessions.get(m.sessionID);
    if (!existing) {
      this.sessions.set(m.sessionID, {
        sessionID: m.sessionID,
        lastTotalTokens: m.totalTokens,
        lastTimestamp: m.timestamp,
        growthRates: [],
      });
      return null;
    }

    // Compute growth rate for this cycle
    const elapsed = m.timestamp - existing.lastTimestamp;
    if (elapsed <= 0) return null;

    // Context here = cumulative input tokens across calls (approximates window fill)
    const growth = m.inputTokens;
    const previousTotal = existing.lastTotalTokens;
    const growthRate = previousTotal > 0 ? growth / previousTotal : 0;

    existing.growthRates.push(growthRate);
    existing.lastTotalTokens = previousTotal + growth;
    existing.lastTimestamp = m.timestamp;

    // Trim history
    if (existing.growthRates.length > 20) existing.growthRates.shift();

    if (growthRate > this.growthRateThreshold && existing.growthRates.length >= 3) {
      const avgGrowth = existing.growthRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
      return {
        detector: 'ContextWindowDetector',
        severity: avgGrowth > this.growthRateThreshold * 2 ? 'critical' : 'medium',
        timestamp: m.timestamp,
        message: `High context growth in session ${m.sessionID.slice(0, 8)}…: ${(growthRate * 100).toFixed(1)}% growth this cycle (3-avg: ${(avgGrowth * 100).toFixed(1)}%). Agent: ${m.agent}, model: ${m.modelID}`,
        metric: m,
        threshold: Math.round(this.growthRateThreshold * 100),
        actualValue: Math.round(growthRate * 100),
      };
    }

    return null;
  }

  reset(): void {
    this.sessions.clear();
  }
}
