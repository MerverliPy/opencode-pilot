/**
 * SpikeDetector — flags model calls where tokens exceed running avg + 2σ.
 *
 * Maintains a per-(agent,model) running window. When a new call exceeds
 * the threshold, emits an alert pinpointing the exact call.
 */

import type { ModelCallMetric, DetectorAlert, ToolCallMetric } from '../types.js';
import { DETECTOR_THRESHOLDS } from '../config.js';

interface RunningStats {
  values: number[];
  mean: number;
  stddev: number;
  threshold: number;
}

export class SpikeDetector {
  private stats = new Map<string, RunningStats>();
  private sigmaMul: number;

  constructor(sigmaMul?: number) {
    this.sigmaMul = sigmaMul ?? DETECTOR_THRESHOLDS.spikeSigmaMultiplier;
  }

  /** Key for per-(agent, model) tracking */
  private key(agent: string, model: string): string {
    return `${agent}::${model}`;
  }

  /** Evaluate a model call. Returns alert if over threshold. */
  evaluate(m: ModelCallMetric): DetectorAlert | null {
    const k = this.key(m.agent, m.modelID);
    const s = this.stats.get(k) ?? { values: [], mean: 0, stddev: 0, threshold: Infinity };

    if (s.values.length < 3) {
      // Not enough data — record and skip detection
      s.values.push(m.totalTokens);
      s.mean = s.values.reduce((a, b) => a + b, 0) / s.values.length;
      s.stddev = this.calcStddev(s.values, s.mean);
      s.threshold = s.mean + this.sigmaMul * s.stddev;
      this.stats.set(k, s);
      return null;
    }

    // Check threshold
    if (m.totalTokens > s.threshold) {
      return {
        detector: 'SpikeDetector',
        severity: m.totalTokens > s.threshold * 1.5 ? 'critical' : 'high',
        timestamp: m.timestamp,
        message: `Token spike for ${m.agent}/${m.modelID}: ${m.totalTokens}t exceeds threshold ${s.threshold.toFixed(0)}t (mean ${s.mean.toFixed(0)}t, σ ${s.stddev.toFixed(0)}t)`,
        metric: m,
        threshold: Math.round(s.threshold),
        actualValue: m.totalTokens,
      };
    }

    // Update running stats (rolling window of last 20)
    s.values.push(m.totalTokens);
    if (s.values.length > 20) s.values.shift();
    s.mean = s.values.reduce((a, b) => a + b, 0) / s.values.length;
    s.stddev = this.calcStddev(s.values, s.mean);
    s.threshold = s.mean + this.sigmaMul * s.stddev;
    this.stats.set(k, s);

    return null;
  }

  /** Reset all tracking */
  reset(): void {
    this.stats.clear();
  }

  private calcStddev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const sqDiffs = values.map((v) => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
  }
}
