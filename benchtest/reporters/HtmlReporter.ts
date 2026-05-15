/**
 * HtmlReporter — generates a self-contained HTML report from benchtest results.
 * Extends the existing audit-report.mjs pattern with token usage visualization.
 */

import fs from 'fs';
import path from 'path';
import type { BenchtestReport, DetectorAlert, TokenSummary, PhaseMetric } from '../types.js';

export class HtmlReporter {
  /** Generate HTML report */
  generate(report: BenchtestReport, outPath: string): string {
    const html = this.buildHtml(report);
    const dir = path.dirname(outPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    return path.resolve(outPath);
  }

  private buildHtml(report: BenchtestReport): string {
    const { meta, summary, tokenSummary, phases, alerts, toolCalls, modelCalls } = report;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Benchtest Report — ${this.esc(meta.scenario)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #e6edf3; padding: 24px; }
  .container { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 8px; color: #58a6ff; }
  h2 { font-size: 18px; margin: 24px 0 12px; color: #f0f6fc; border-bottom: 1px solid #30363d; padding-bottom: 6px; }
  .meta { color: #8b949e; font-size: 13px; margin-bottom: 20px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .card .label { font-size: 11px; text-transform: uppercase; color: #8b949e; letter-spacing: 0.5px; }
  .card .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .pass { color: #3fb950; }
  .fail { color: #f85149; }
  .warn { color: #d29922; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #21262d; font-size: 13px; }
  th { color: #8b949e; font-weight: 600; }
  .bar-cell { position: relative; }
  .bar { position: absolute; left: 0; top: 2px; height: 20px; border-radius: 3px; opacity: 0.7; }
  .bar-label { position: relative; z-index: 1; padding-left: 4px; }
  .alert-critical { border-left: 3px solid #f85149; padding-left: 8px; margin: 4px 0; }
  .alert-high { border-left: 3px solid #d29922; padding-left: 8px; margin: 4px 0; }
  .alert-medium { border-left: 3px solid #58a6ff; padding-left: 8px; margin: 4px 0; }
  .alert-low { border-left: 3px solid #8b949e; padding-left: 8px; margin: 4px 0; }
  .phase-bar { display: flex; height: 32px; border-radius: 4px; overflow: hidden; margin: 12px 0; }
  .phase-seg { display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; font-weight: 600; min-width: 40px; }
  pre { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 12px; font-size: 12px; overflow-x: auto; }
</style>
</head>
<body>
<div class="container">
  <h1>🧪 Benchtest Report</h1>
  <div class="meta">
    Scenario: ${this.esc(meta.scenario)} &middot;
    Duration: ${this.fmtMs(meta.durationMs)} &middot;
    ${meta.timestamp} &middot;
    ${meta.sessionCount} session(s)
  </div>

  <div class="cards">
    <div class="card"><div class="label">Status</div><div class="value ${summary.pass ? 'pass' : 'fail'}">${summary.pass ? 'PASS' : 'FAIL'}</div></div>
    <div class="card"><div class="label">Total Tokens</div><div class="value">${tokenSummary.total.combined.toLocaleString()}</div></div>
    <div class="card"><div class="label">Est. Cost</div><div class="value">$${tokenSummary.total.estimatedCost.toFixed(6)}</div></div>
    <div class="card"><div class="label">Tool Calls</div><div class="value">${summary.totalToolCalls}</div></div>
    <div class="card"><div class="label">Model Calls</div><div class="value">${summary.totalModelCalls}</div></div>
    <div class="card"><div class="label">Alerts</div><div class="value ${alerts.length > 0 ? 'warn' : 'pass'}">${alerts.length}</div></div>
  </div>

  ${this.buildTokenSummaryTable(tokenSummary)}
  ${this.buildPhaseVisualization(phases)}
  ${this.buildPhaseTable(phases)}
  ${this.buildAlertsSection(alerts)}
  ${this.buildToolCallTable(toolCalls)}
  ${this.buildModelCallTable(modelCalls)}
</div>
</body>
</html>`;
  }

  private buildTokenSummaryTable(ts: TokenSummary): string {
    let rows = '';
    const maxTokens = Math.max(
      ...Object.values(ts.byPhase).map((d) => d.prompt + d.completion),
      1,
    );

    for (const [phase, data] of Object.entries(ts.byPhase)) {
      const total = data.prompt + data.completion;
      const pct = (total / maxTokens) * 100;
      const color = this.phaseColor(phase);
      rows += `<tr>
        <td>${this.esc(phase)}</td>
        <td>${data.prompt.toLocaleString()}</td>
        <td>${data.completion.toLocaleString()}</td>
        <td>${total.toLocaleString()}</td>
        <td>${data.durationMs ? this.fmtMs(data.durationMs) : '—'}</td>
        <td class="bar-cell"><div class="bar" style="width:${pct}%;background:${color}"></div><span class="bar-label">${pct.toFixed(0)}%</span></td>
      </tr>`;
    }

    return `<h2>Token Usage by Phase</h2>
    <table>
      <tr><th>Phase</th><th>Prompt</th><th>Completion</th><th>Total</th><th>Duration</th><th>Share</th></tr>
      ${rows}
      <tr style="font-weight:700;border-top:2px solid #30363d">
        <td>Total</td>
        <td>${ts.total.prompt.toLocaleString()}</td>
        <td>${ts.total.completion.toLocaleString()}</td>
        <td>${ts.total.combined.toLocaleString()}</td>
        <td>—</td>
        <td>100%</td>
      </tr>
    </table>

    <h2>Token Usage by Agent</h2>
    <table>
      <tr><th>Agent</th><th>Prompt</th><th>Completion</th><th>Total</th><th>Calls</th></tr>
      ${Object.entries(ts.byAgent).map(([agent, d]) => `<tr><td>${this.esc(agent)}</td><td>${d.prompt.toLocaleString()}</td><td>${d.completion.toLocaleString()}</td><td>${(d.prompt + d.completion).toLocaleString()}</td><td>${d.calls}</td></tr>`).join('')}
    </table>

    <h2>Token Usage by Model</h2>
    <table>
      <tr><th>Model</th><th>Prompt</th><th>Completion</th><th>Total</th><th>Calls</th></tr>
      ${Object.entries(ts.perModel).map(([model, d]) => `<tr><td>${this.esc(model)}</td><td>${d.prompt.toLocaleString()}</td><td>${d.completion.toLocaleString()}</td><td>${(d.prompt + d.completion).toLocaleString()}</td><td>${d.calls}</td></tr>`).join('')}
    </table>`;
  }

  private buildPhaseVisualization(phases: PhaseMetric[]): string {
    if (phases.length === 0) return '';
    const totalDur = phases.reduce((s, p) => s + (p.endTime ? p.endTime - p.startTime : 0), 0);
    if (totalDur === 0) return '';

    let segs = '';
    for (const p of phases) {
      if (!p.endTime) continue;
      const dur = p.endTime - p.startTime;
      const pct = Math.max(5, (dur / totalDur) * 100);
      const color = this.phaseColor(p.name);
      segs += `<div class="phase-seg" style="flex:${pct};background:${color}" title="${this.esc(p.name)}: ${this.fmtMs(dur)}">${p.name}</div>`;
    }

    return `<h2>Phase Timeline</h2><div class="phase-bar">${segs}</div>`;
  }

  private buildPhaseTable(phases: PhaseMetric[]): string {
    if (phases.length === 0) return '';
    return `<table>
      <tr><th>Phase</th><th>Duration</th><th>Tool Calls</th><th>Model Calls</th><th>Tokens</th></tr>
      ${phases.map((p) => `<tr>
        <td>${this.esc(p.name)}</td>
        <td>${p.endTime ? this.fmtMs(p.endTime - p.startTime) : 'running'}</td>
        <td>${p.toolCalls}</td>
        <td>${p.modelCalls}</td>
        <td>${p.totalTokens.toLocaleString()}</td>
      </tr>`).join('')}
    </table>`;
  }

  private buildAlertsSection(alerts: DetectorAlert[]): string {
    if (alerts.length === 0) {
      return '<h2>Alerts</h2><p class="pass">No alerts — all metrics within thresholds</p>';
    }

    const items = alerts.map((a) =>
      `<div class="alert-${a.severity}">
        <strong>[${a.severity.toUpperCase()}]</strong> ${this.esc(a.detector)}: ${this.esc(a.message)}
        <br><span style="color:#8b949e;font-size:11px">threshold: ${a.threshold} &middot; actual: ${a.actualValue}</span>
      </div>`
    ).join('');

    return `<h2>Alerts (${alerts.length})</h2>${items}`;
  }

  private buildToolCallTable(toolCalls: BenchtestReport['toolCalls']): string {
    if (toolCalls.length === 0) return '';
    const toolSummary = new Map<string, { count: number; totalMs: number }>();
    for (const tc of toolCalls) {
      const existing = toolSummary.get(tc.tool) ?? { count: 0, totalMs: 0 };
      existing.count++;
      existing.totalMs += tc.durationMs;
      toolSummary.set(tc.tool, existing);
    }

    const maxCount = Math.max(...Array.from(toolSummary.values()).map((v) => v.count), 1);
    const rows = Array.from(toolSummary.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([tool, data]) => {
        const pct = (data.count / maxCount) * 100;
        return `<tr><td>${this.esc(tool)}</td><td>${data.count}</td><td>${this.fmtMs(data.totalMs)}</td><td>${this.fmtMs(data.totalMs / data.count)}</td><td class="bar-cell"><div class="bar" style="width:${pct}%;background:#58a6ff"></div><span class="bar-label">${pct.toFixed(0)}%</span></td></tr>`;
      }).join('');

    return `<h2>Tool Call Distribution</h2>
    <table><tr><th>Tool</th><th>Count</th><th>Total Time</th><th>Avg Time</th><th>Share</th></tr>${rows}</table>`;
  }

  private buildModelCallTable(modelCalls: BenchtestReport['modelCalls']): string {
    if (modelCalls.length === 0) return '';
    return `<h2>Recent Model Calls</h2>
    <table><tr><th>Agent</th><th>Model</th><th>Input T</th><th>Output T</th><th>Total T</th><th>Duration</th></tr>
    ${modelCalls.slice(-20).reverse().map((m) =>
      `<tr><td>${this.esc(m.agent)}</td><td>${this.esc(m.modelID)}</td><td>${m.inputTokens.toLocaleString()}</td><td>${m.outputTokens.toLocaleString()}</td><td>${m.totalTokens.toLocaleString()}</td><td>${this.fmtMs(m.durationMs)}</td></tr>`
    ).join('')}</table>`;
  }

  private phaseColor(phase: string): string {
    const colors: Record<string, string> = {
      'discover': '#58a6ff',
      'plan': '#d29922',
      'implement': '#3fb950',
      'verify': '#f0883e',
      'review': '#bc8cff',
      'routing': '#8b949e',
      'docs': '#79c0ff',
    };
    return colors[phase] ?? '#58a6ff';
  }

  private esc(s: string): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private fmtMs(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(2)}s`;
    return `${Math.round(n)}ms`;
  }
}
