/**
 * RegressionRunner — compares current benchtest results against a baseline.
 *
 * Flags any metric that exceeds baseline thresholds:
 *   - Token count > 120% of baseline
 *   - Tool call count > 130% of baseline
 *   - Any new critical alerts
 *   - Phase duration > 150% of baseline
 */

import type { BenchtestReport } from '../types.js';

export interface RegressionResult {
  pass: boolean;
  regressions: Array<{
    metric: string;
    baseline: number;
    actual: number;
    change: number;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export class RegressionRunner {
  private baseline: BenchtestReport | null = null;

  /** Load baseline from file */
  async loadBaseline(filePath: string): Promise<void> {
    const fs = await import('fs');
    const data = fs.readFileSync(filePath, 'utf8');
    this.baseline = JSON.parse(data);
  }

  /** Set baseline from a report object */
  setBaseline(report: BenchtestReport): void {
    this.baseline = report;
  }

  /** Compare current report against baseline */
  compare(current: BenchtestReport): RegressionResult {
    if (!this.baseline) {
      return { pass: true, regressions: [] };
    }

    const regressions: RegressionResult['regressions'] = [];

    // Compare token totals
    const baseTokens = this.baseline.tokenSummary.total.combined;
    const currTokens = current.tokenSummary.total.combined;
    if (currTokens > baseTokens * 1.2) {
      regressions.push({
        metric: 'totalTokens',
        baseline: baseTokens,
        actual: currTokens,
        change: ((currTokens - baseTokens) / baseTokens) * 100,
        severity: currTokens > baseTokens * 1.5 ? 'high' : 'medium',
      });
    }

    // Compare tool call count
    const baseTools = this.baseline.summary.totalToolCalls;
    const currTools = current.summary.totalToolCalls;
    if (currTools > baseTools * 1.3) {
      regressions.push({
        metric: 'totalToolCalls',
        baseline: baseTools,
        actual: currTools,
        change: ((currTools - baseTools) / baseTools) * 100,
        severity: currTools > baseTools * 2 ? 'high' : 'medium',
      });
    }

    // Compare model call count
    const baseModels = this.baseline.summary.totalModelCalls;
    const currModels = current.summary.totalModelCalls;
    if (currModels > baseModels * 1.3) {
      regressions.push({
        metric: 'totalModelCalls',
        baseline: baseModels,
        actual: currModels,
        change: ((currModels - baseModels) / baseModels) * 100,
        severity: 'medium',
      });
    }

    // Compare critical alerts
    const baseCritical = this.baseline.alerts.filter((a) => a.severity === 'critical').length;
    const currCritical = current.alerts.filter((a) => a.severity === 'critical').length;
    if (currCritical > baseCritical && currCritical > 0) {
      regressions.push({
        metric: 'criticalAlerts',
        baseline: baseCritical,
        actual: currCritical,
        change: currCritical - baseCritical,
        severity: 'high',
      });
    }

    // Compare phase durations
    for (const basePhase of this.baseline.phases) {
      const currPhase = current.phases.find((p) => p.name === basePhase.name);
      if (currPhase?.endTime && basePhase.endTime) {
        const baseDuration = basePhase.endTime - basePhase.startTime;
        const currDuration = currPhase.endTime - currPhase.startTime;
        if (currDuration > baseDuration * 1.5 && baseDuration > 0) {
          regressions.push({
            metric: `phase.${basePhase.name}.duration`,
            baseline: baseDuration,
            actual: currDuration,
            change: ((currDuration - baseDuration) / baseDuration) * 100,
            severity: 'medium',
          });
        }
      }
    }

    return {
      pass: regressions.length === 0,
      regressions,
    };
  }
}
