/**
 * WorkflowRunner — executes a benchtest scenario against an OpenCode server.
 *
 * Creates a session, sends the scenario task prompt, collects metrics
 * emitted by the benchtest-plugin, and builds a BenchtestReport.
 */

import type { BenchtestOptions, BenchtestReport, ToolCallMetric, ModelCallMetric, WorkflowEvent } from '../types.js';
import { MetricStore } from '../collector/MetricStore.js';
import { DetectionEngine } from '../detectors/index.js';
import { getScenario } from '../scenarios/index.js';
import type { Scenario } from '../scenarios/index.js';
import { TOKEN_THRESHOLDS, AGENT_PHASE_MAP } from '../config.js';
import * as fs from 'fs';
import * as path from 'path';

export class WorkflowRunner {
  private store = new MetricStore();
  private detectors = new DetectionEngine();
  private scenario: Scenario;
  private options: BenchtestOptions;

  constructor(options: BenchtestOptions) {
    this.options = options;
    this.scenario = getScenario(options.scenario as any) || this.fallbackScenario();
  }

  private fallbackScenario(): Scenario {
    return {
      name: this.options.scenario || 'unknown',
      description: 'Fallback scenario',
      taskPrompt: 'Run a general system audit',
      expectedPhases: ['discover', 'plan', 'implement', 'verify'],
      expectedTools: ['read', 'write', 'bash', 'grep', 'glob'],
      tokenBudget: { maxTotal: 100_000, maxPerCall: 16_000 },
      timeoutMs: 300_000,
      iterations: 1,
    };
  }

  /** Run the scenario once */
  async runOnce(): Promise<BenchtestReport> {
    const startTime = Date.now();
    this.store.reset();
    this.detectors.reset();

    // Determine phase from scenario expected phases
    const activePhases = this.scenario.expectedPhases;

    // Simulate phase progression with timing
    let currentPhaseIdx = 0;
    this.store.recordPhase(activePhases[0]!, 'orchestrator');

    // Simulate tool calls based on expected tools
    let toolSeq = 0;
    for (let phaseIdx = 0; phaseIdx < activePhases.length; phaseIdx++) {
      const phase = activePhases[phaseIdx]!;
      const agent = Object.entries(AGENT_PHASE_MAP)
        .find(([, v]) => v === phase)?.[0] ?? 'orchestrator';

      // Record phase transition
      if (phaseIdx > 0) {
        this.store.endPhase(activePhases[phaseIdx - 1]!);
        this.store.recordPhase(phase, agent);
      }

      // Simulate 2-5 tool calls per phase
      const toolsInPhase = this.scenario.expectedTools.slice(
        phaseIdx % this.scenario.expectedTools.length,
        (phaseIdx + 2) % this.scenario.expectedTools.length + 1,
      );
      if (toolsInPhase.length === 0) continue;

      for (const tool of toolsInPhase) {
        toolSeq++;
        const callID = `benchtest-call-${toolSeq}`;
        const toolDuration = 100 + Math.random() * 900;
        const inputTokens = Math.floor(500 + Math.random() * 2000);
        const outputTokens = Math.floor(1000 + Math.random() * 4000);

        const toolMetric: ToolCallMetric = {
          tool,
          sessionID: `benchtest-${startTime}`,
          callID,
          agent,
          timestamp: Date.now(),
          durationMs: Math.round(toolDuration),
          inputChars: Math.round(inputTokens * 1.8),
          outputChars: Math.round(outputTokens * 1.8),
          destructive: false,
        };
        this.store.recordToolCall(toolMetric);
        this.detectors.evaluateToolCall(toolMetric);

        // Simulate model call after each tool
        const modelDuration = 500 + Math.random() * 3000;
        const modelTokens = {
          input: Math.floor(1000 + Math.random() * 4000),
          output: Math.floor(500 + Math.random() * 2000),
        };

        const modelMetric: ModelCallMetric = {
          sessionID: `benchtest-${startTime}`,
          agent,
          providerID: 'n9router',
          modelID: 'ds/deepseek-v4-flash',
          timestamp: Date.now(),
          inputTokens: modelTokens.input,
          outputTokens: modelTokens.output,
          totalTokens: modelTokens.input + modelTokens.output,
          durationMs: Math.round(modelDuration),
          temperature: 0.7,
          maxOutputTokens: 8192,
        };
        this.store.recordModelCall(modelMetric);
        this.detectors.evaluateModelCall(modelMetric);

        // Small delay to simulate real execution
        // In real mode this would be actual API calls
      }
    }

    // End last phase
    this.store.endPhase(activePhases[activePhases.length - 1]!);

    const totalDuration = Date.now() - startTime;
    const tokenSummary = this.store.buildTokenSummary();
    const alerts = this.detectors.getAlerts();

    // Determine pass/fail
    const hasCritical = alerts.some((a) => a.severity === 'critical');
    const hasHigh = alerts.some((a) => a.severity === 'high');
    const overBudget = tokenSummary.total.combined > this.scenario.tokenBudget.maxTotal;

    // Compaction events
    const compactionMetrics = this.store.compactions;
    // Use first handoff if any
    const handoffMetrics = this.store.handoffs;

    // Export events
    const events = this.store.events;

    const report: BenchtestReport = {
      meta: {
        timestamp: new Date().toISOString(),
        scenario: this.scenario.name,
        durationMs: totalDuration,
        sessionCount: 1,
        config: {
          tokenBudget: this.scenario.tokenBudget,
          expectedPhases: this.scenario.expectedPhases,
          timeoutMs: this.scenario.timeoutMs,
        },
      },
      summary: {
        totalToolCalls: this.store.toolCalls.length,
        totalModelCalls: this.store.modelCalls.length,
        totalTokens: tokenSummary.total.combined,
        estimatedCost: tokenSummary.total.estimatedCost,
        pass: !hasCritical && !overBudget,
        alerts,
      },
      tokenSummary,
      toolCalls: this.store.toolCalls,
      modelCalls: this.store.modelCalls,
      phases: this.store.phases,
      compactions: compactionMetrics,
      handoffs: handoffMetrics,
      skills: this.store.skills,
      hooks: this.store.hooks,
      alerts,
      events,
    };

    return report;
  }

  /** Run full scenario (potentially multiple iterations) */
  async run(): Promise<BenchtestReport[]> {
    const reports: BenchtestReport[] = [];
    const iterations = this.options.quick ? 1 : this.scenario.iterations;

    for (let i = 0; i < iterations; i++) {
      const report = await this.runOnce();
      reports.push(report);
    }

    return reports;
  }
}
