/**
 * TrendDetector — detects N consecutive model calls with increasing tokens.
 *
 * Indicates a context-growth trend where each successive LLM call consumes
 * more tokens than the last. Helps identify runaway context buildup.
 */

import type { ModelCallMetric, DetectorAlert } from '../types.js';
import { DETECTOR_THRESHOLDS } from '../config.js';

export class TrendDetector {
  private window: number;
  private recent: Map<string, number[]> = new Map(); // agent → token history

  constructor(window?: number) {
    this.window = window ?? DETECTOR_THRESHOLDS.trendWindow;
  }

  /** Evaluate model call. Returns alert if increasing trend detected. */
  evaluate(m: ModelCallMetric): DetectorAlert | null {
    const history = this.recent.get(m.agent) ?? [];
    history.push(m.totalTokens);

    // Keep only last window * 2 entries
    if (history.length > this.window * 2) {
      history.splice(0, history.length - this.window * 2);
    }
    this.recent.set(m.agent, history);

    if (history.length < this.window) return null;

    // Check last N entries for monotonic increase
    const lastN = history.slice(-this.window);
    const increasing = lastN.every((val, i, arr) => i === 0 || val >= arr[i - 1]!);

    if (increasing && lastN[lastN.length - 1]! > lastN[0]!) {
      const growth = ((lastN[lastN.length - 1]! - lastN[0]!) / lastN[0]!) * 100;
      return {
        detector: 'TrendDetector',
        severity: growth > 100 ? 'high' : 'medium',
        timestamp: m.timestamp,
        message: `${m.agent}: ${this.window}-call increasing token trend detected (${lastN[0]}→${lastN[lastN.length - 1]}, +${growth.toFixed(0)}%). Last call: ${m.totalTokens}t on ${m.modelID}`,
        metric: m,
        threshold: lastN[0]!,
        actualValue: lastN[lastN.length - 1]!,
      };
    }

    return null;
  }

  reset(): void {
    this.recent.clear();
  }
}
