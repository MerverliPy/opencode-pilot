import type { ModelCallMetric, ToolCallMetric, DetectorAlert } from '../types.js';
import { SpikeDetector } from './SpikeDetector.js';
import { TrendDetector } from './TrendDetector.js';
import { ToolLoopDetector } from './ToolLoopDetector.js';
import { ContextWindowDetector } from './ContextWindowDetector.js';

export { SpikeDetector } from './SpikeDetector.js';
export { TrendDetector } from './TrendDetector.js';
export { ToolLoopDetector } from './ToolLoopDetector.js';
export { ContextWindowDetector } from './ContextWindowDetector.js';

/**
 * DetectionEngine — runs all detectors against incoming metrics.
 */
export class DetectionEngine {
  private spike = new SpikeDetector();
  private trend = new TrendDetector();
  private toolLoop = new ToolLoopDetector();
  private contextWindow = new ContextWindowDetector();
  private alerts: DetectorAlert[] = [];

  /** Evaluate a model call against all relevant detectors */
  evaluateModelCall(m: ModelCallMetric): DetectorAlert[] {
    const results: DetectorAlert[] = [];
    this.toolLoop.notifyModelCall(m);

    const spikeAlert = this.spike.evaluate(m);
    if (spikeAlert) { this.alerts.push(spikeAlert); results.push(spikeAlert); }

    const trendAlert = this.trend.evaluate(m);
    if (trendAlert) { this.alerts.push(trendAlert); results.push(trendAlert); }

    const ctxAlert = this.contextWindow.evaluate(m);
    if (ctxAlert) { this.alerts.push(ctxAlert); results.push(ctxAlert); }

    return results;
  }

  /** Evaluate a tool call against tool-loop detector */
  evaluateToolCall(t: ToolCallMetric): DetectorAlert[] {
    const results: DetectorAlert[] = [];
    const loopAlert = this.toolLoop.evaluateToolCall(t);
    if (loopAlert) { this.alerts.push(loopAlert); results.push(loopAlert); }
    return results;
  }

  /** Get all accumulated alerts */
  getAlerts(): DetectorAlert[] {
    return this.alerts;
  }

  /** Count alerts by severity */
  alertSummary(): Record<string, number> {
    const summary: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const a of this.alerts) {
      summary[a.severity] = (summary[a.severity] ?? 0) + 1;
    }
    return summary;
  }

  reset(): void {
    this.spike.reset();
    this.trend.reset();
    this.toolLoop.reset();
    this.contextWindow.reset();
    this.alerts = [];
  }
}
