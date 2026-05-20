/**
 * WorkflowRunner — executes a benchtest scenario against an OpenCode server.
 *
 * Creates a session, sends the scenario task prompt, collects metrics
 * emitted by the benchtest-plugin, and builds a BenchtestReport.
 *
 * Supports two modes:
 *   - Simulation mode (default): uses Math.random() for tool/model timing
 *   - RealHTTP mode (realHTTP: true): makes actual HTTP calls to the Pilot server
 */

import type { BenchtestOptions, BenchtestReport, ToolCallMetric, ModelCallMetric } from '../types.js';
import { MetricStore } from '../collector/MetricStore.js';
import { DetectionEngine } from '../detectors/index.js';
import { getScenario } from '../scenarios/index.js';
import type { Scenario } from '../scenarios/index.js';
import { TOKEN_THRESHOLDS, AGENT_PHASE_MAP, DETECTOR_THRESHOLDS } from '../config.js';
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

  private async pilotFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.options.url}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        'Authorization': `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
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

    if (this.options.realHTTP) {
      // Real HTTP mode: make actual API calls to the Pilot server
      this.store.recordPhase('benchmark', 'benchtest');

      // a. Create session
      const sessionRes = await this.pilotFetch('/session', {
        method: 'POST',
        body: JSON.stringify({ scenario: this.scenario.name }),
      });
      const sessionBody = await sessionRes.json() as any;
      const sessionId: string = sessionBody.sessionID || `sess-${Date.now()}`;

      this.store.events.push({
        timestamp: Date.now(),
        type: 'session.create',
        detail: `Session ${sessionId} created`,
      });

      // b. Send prompt via SSE stream
      const promptStart = performance.now();
      const promptRes = await this.pilotFetch(`/session/${sessionId}/prompt`, {
        method: 'POST',
        body: JSON.stringify({ prompt: this.scenario.taskPrompt, stream: true }),
      });

      // c. Read SSE response stream
      let inputChars = this.scenario.taskPrompt.length;
      let outputChars = 0;
      let firstTokenTime = 0;

      if (promptRes.body) {
        const reader = promptRes.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          done = streamDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            outputChars += chunk.length;
            if (firstTokenTime === 0) {
              firstTokenTime = performance.now();
            }
          }
        }
      }

      const promptDuration = performance.now() - promptStart;
      const ttfb = firstTokenTime > 0 ? firstTokenTime - promptStart : promptDuration;

      // Record prompt as tool call
      const toolMetric: ToolCallMetric = {
        tool: 'prompt',
        sessionID: sessionId,
        callID: 'prompt-1',
        agent: 'benchtest',
        timestamp: Date.now(),
        durationMs: Math.round(promptDuration),
        inputChars,
        outputChars,
        destructive: false,
      };
      this.store.recordToolCall(toolMetric);
      this.detectors.evaluateToolCall(toolMetric);

      // Record TTFB as model call
      const modelMetric: ModelCallMetric = {
        sessionID: sessionId,
        agent: 'benchtest',
        providerID: 'n9router',
        modelID: 'ds/deepseek-v4-flash',
        timestamp: Date.now(),
        inputTokens: Math.round(inputChars / 4),
        outputTokens: Math.round(outputChars / 4),
        totalTokens: Math.round((inputChars + outputChars) / 4),
        durationMs: Math.round(ttfb),
        temperature: 0.7,
        maxOutputTokens: 8192,
      };
      this.store.recordModelCall(modelMetric);
      this.detectors.evaluateModelCall(modelMetric);

      // d. Get session status
      const statusStart = performance.now();
      const statusRes = await this.pilotFetch(`/session/${sessionId}`);
      const statusDuration = performance.now() - statusStart;

      this.store.recordToolCall({
        tool: 'session-status',
        sessionID: sessionId,
        callID: 'status-1',
        agent: 'benchtest',
        timestamp: Date.now(),
        durationMs: Math.round(statusDuration),
        inputChars: 0,
        outputChars: (await statusRes.clone().text()).length,
        destructive: false,
      });

      this.store.endPhase('benchmark');
    } else {
      // Simulation mode: estimate timing with Math.random()
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

        // Simulate tool calls per phase (circular wrap through expectedTools)
        const toolCount = Math.min(3, this.scenario.expectedTools.length);
        const offset = (phaseIdx * 2) % this.scenario.expectedTools.length;
        const toolsInPhase: string[] = [];
        for (let i = 0; i < toolCount; i++) {
          toolsInPhase.push(
            this.scenario.expectedTools[(offset + i) % this.scenario.expectedTools.length]!
          );
        }
        if (toolsInPhase.length === 0) continue;

        for (const tool of toolsInPhase) {
          toolSeq++;
          const callID = `benchtest-call-${toolSeq}`;
          const toolDuration = 100 + Math.random() * 900;
          const inputTokens = Math.floor(500 + Math.random() * 2000);
          const outputTokens = Math.floor(1000 + Math.random() * 4000);

          const toolMetricSim: ToolCallMetric = {
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
          this.store.recordToolCall(toolMetricSim);
          this.detectors.evaluateToolCall(toolMetricSim);

          // Simulate model call after each tool
          const modelDuration = 500 + Math.random() * 3000;
          const modelTokens = {
            input: Math.floor(1000 + Math.random() * 4000),
            output: Math.floor(500 + Math.random() * 2000),
          };

          const modelMetricSim: ModelCallMetric = {
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
          this.store.recordModelCall(modelMetricSim);
          this.detectors.evaluateModelCall(modelMetricSim);
        }
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

    // RTK compression savings check (realHTTP mode only — simulation data has no real patterns)
    const isRealHTTP = this.options.realHTTP ?? false;
    if (isRealHTTP) {
      const totalToolOutput = this.store.toolCalls.reduce((sum, t) => sum + t.outputChars, 0);
      const totalRtkSaved = this.store.toolCalls.reduce((sum, t) => sum + (t.rtkSavedBytes ?? 0), 0);
      if (totalToolOutput > 0) {
        const savingsRatio = totalRtkSaved / totalToolOutput;
        if (savingsRatio < DETECTOR_THRESHOLDS.rtkMinSavingsRatio) {
          alerts.push({
            detector: 'rtk-savings',
            severity: 'low',
            timestamp: Date.now(),
            message: `RTK compression savings (${(savingsRatio * 100).toFixed(1)}%) below threshold (${(DETECTOR_THRESHOLDS.rtkMinSavingsRatio * 100).toFixed(0)}%)`,
            threshold: DETECTOR_THRESHOLDS.rtkMinSavingsRatio,
            actualValue: savingsRatio,
          });
        }
      }
    }

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
