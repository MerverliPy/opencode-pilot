/**
 * TerminalReporter — prints benchtest results to terminal with color.
 */

import type { BenchtestReport, DetectorAlert, TokenSummary, PhaseMetric } from '../types.js';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[97m',
  gray: '\x1b[90m',
};

export class TerminalReporter {
  /** Print full report to console */
  print(report: BenchtestReport): void {
    this.printHeader(report);
    this.printSummary(report.summary.pass, report.summary);
    this.printTokenSummary(report.tokenSummary);
    this.printPhases(report.phases);
    this.printAlerts(report.alerts);
    this.printFooter();
  }

  private printHeader(report: BenchtestReport): void {
    console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.cyan}║         Benchtest Report                      ║${C.reset}`);
    console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════╝${C.reset}`);
    console.log(`  ${C.dim}Scenario :${C.reset} ${report.meta.scenario}`);
    console.log(`  ${C.dim}Duration :${C.reset} ${this.fmtMs(report.meta.durationMs)}`);
    console.log(`  ${C.dim}Time     :${C.reset} ${report.meta.timestamp}`);
    console.log(`  ${C.dim}Sessions :${C.reset} ${report.meta.sessionCount}`);
    console.log('');
  }

  private printSummary(pass: boolean, summary: BenchtestReport['summary']): void {
    const statusColor = pass ? C.green : C.red;
    const statusIcon = pass ? 'PASS' : 'FAIL';
    console.log(`  ${C.bold}Status: ${statusColor}${statusIcon}${C.reset}`);
    console.log(`  ${C.dim}Tool calls :${C.reset} ${summary.totalToolCalls}`);
    console.log(`  ${C.dim}Model calls:${C.reset} ${summary.totalModelCalls}`);
    console.log(`  ${C.dim}Total tokens:${C.reset} ${summary.totalTokens.toLocaleString()}`);
    console.log(`  ${C.dim}Est. cost  :${C.reset} $${summary.estimatedCost.toFixed(6)}`);
    console.log(`  ${C.dim}Alerts     :${C.reset} ${summary.alerts.length}`);
    console.log('');
  }

  private printTokenSummary(ts: TokenSummary): void {
    console.log(`  ${C.bold}${C.white}Token Summary${C.reset}`);
    console.log(`  ${C.dim}Total${C.reset}`);
    console.log(`    prompt: ${ts.total.prompt.toLocaleString()}  completion: ${ts.total.completion.toLocaleString()}  combined: ${ts.total.combined.toLocaleString()}`);
    console.log(`    cost: $${ts.total.estimatedCost.toFixed(6)}`);
    console.log('');

    // By phase
    console.log(`  ${C.dim}By Phase${C.reset}`);
    for (const [phase, data] of Object.entries(ts.byPhase)) {
      const dur = data.durationMs ? ` (${this.fmtMs(data.durationMs)})` : '';
      console.log(`    ${phase.padEnd(12)} ${data.prompt.toLocaleString().padStart(8)}p / ${data.completion.toLocaleString().padStart(8)}c${dur}`);
    }
    console.log('');

    // By agent
    console.log(`  ${C.dim}By Agent${C.reset}`);
    for (const [agent, data] of Object.entries(ts.byAgent)) {
      console.log(`    ${agent.padEnd(18)} ${data.prompt.toLocaleString().padStart(8)}p / ${data.completion.toLocaleString().padStart(8)}c (${data.calls} calls)`);
    }
    console.log('');

    // Per model
    console.log(`  ${C.dim}Per Model${C.reset}`);
    for (const [model, data] of Object.entries(ts.perModel)) {
      console.log(`    ${model.padEnd(30)} ${data.prompt.toLocaleString().padStart(8)}p / ${data.completion.toLocaleString().padStart(8)}c (${data.calls} calls)`);
    }
    console.log('');
  }

  private printPhases(phases: PhaseMetric[]): void {
    if (phases.length === 0) return;
    console.log(`  ${C.bold}${C.white}Phase Timeline${C.reset}`);
    for (const p of phases) {
      const dur = p.endTime ? this.fmtMs(p.endTime - p.startTime) : 'running';
      console.log(`    ${C.cyan}${p.name.padEnd(12)}${C.reset} ${dur.padEnd(10)} tools:${p.toolCalls}  models:${p.modelCalls}  tokens:${p.totalTokens.toLocaleString()}`);
    }
    console.log('');
  }

  private printAlerts(alerts: DetectorAlert[]): void {
    if (alerts.length === 0) {
      console.log(`  ${C.green}No alerts${C.reset}`);
      console.log('');
      return;
    }

    console.log(`  ${C.bold}${C.yellow}Alerts (${alerts.length})${C.reset}`);
    const bySeverity = (sev: string) => alerts.filter((a) => a.severity === sev);
    for (const sev of ['critical', 'high', 'medium', 'low'] as const) {
      const sevAlerts = bySeverity(sev);
      if (sevAlerts.length === 0) continue;
      const color = sev === 'critical' ? C.red : sev === 'high' ? C.yellow : C.dim;
      console.log(`  ${color}${sev.toUpperCase()}${C.reset}`);
      for (const a of sevAlerts) {
        console.log(`    ${a.detector}: ${a.message.slice(0, 120)}`);
      }
    }
    console.log('');
  }

  private printFooter(): void {
    console.log(`${C.bold}${C.cyan}══════════════════════════════════════════════${C.reset}\n`);
  }

  private fmtMs(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
    return `${Math.round(n)}ms`;
  }
}
