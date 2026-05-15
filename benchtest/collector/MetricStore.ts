/**
 * MetricStore — in-memory metric collection with batch export.
 *
 * Accumulates metrics during a benchtest run. Provides filtered queries
 * for reporters and detectors.
 */

import type {
  ToolCallMetric, ModelCallMetric, HookExecutionMetric,
  PhaseMetric, CompactionMetric, SkillMetric, AgentHandoffMetric,
  WorkflowEvent, TokenSummary,
} from '../types.js';
import { AGENT_PHASE_MAP, MODEL_PRICES, DEFAULT_PRICE } from '../config.js';
import { TokenEstimator } from './TokenEstimator.js';

export class MetricStore {
  toolCalls: ToolCallMetric[] = [];
  modelCalls: ModelCallMetric[] = [];
  hooks: HookExecutionMetric[] = [];
  phases: PhaseMetric[] = [];
  compactions: CompactionMetric[] = [];
  skills: SkillMetric[] = [];
  handoffs: AgentHandoffMetric[] = [];
  events: WorkflowEvent[] = [];

  private estimator = new TokenEstimator();
  private toolCallSeq = new Map<string, number>(); // callID → index
  private modelCallSeq = new Map<string, number>();

  // ─── Record methods ────────────────────────────────────────────

  recordToolCall(m: ToolCallMetric): void {
    this.toolCalls.push(m);
    this.toolCallSeq.set(m.callID, this.toolCalls.length - 1);
    this.events.push({
      timestamp: m.timestamp,
      type: 'tool.call',
      agent: m.agent,
      detail: `${m.tool} (${m.durationMs}ms)`,
      durationMs: m.durationMs,
    });
  }

  recordModelCall(m: ModelCallMetric): void {
    this.modelCalls.push(m);
    this.modelCallSeq.set(`${m.sessionID}:${m.timestamp}`, this.modelCalls.length - 1);
    this.events.push({
      timestamp: m.timestamp,
      type: 'model.call',
      agent: m.agent,
      detail: `${m.modelID} (${m.totalTokens}t)`,
      tokenCount: m.totalTokens,
    });
  }

  recordHook(m: HookExecutionMetric): void {
    this.hooks.push(m);
  }

  recordPhase(name: string, agentName: string): void {
    this.phases.push({
      name,
      startTime: Date.now(),
      agentName,
      toolCalls: 0,
      modelCalls: 0,
      totalTokens: 0,
    });
    this.events.push({ timestamp: Date.now(), type: 'phase.start', phase: name, agent: agentName });
  }

  endPhase(name: string): void {
    const phase = this.phases.find((p) => p.name === name && !p.endTime);
    if (phase) {
      phase.endTime = Date.now();
      phase.toolCalls = this.toolCalls.filter((t) =>
        AGENT_PHASE_MAP[t.agent] === name || t.agent === phase.agentName,
      ).length;
      phase.modelCalls = this.modelCalls.filter((m) =>
        AGENT_PHASE_MAP[m.agent] === name || m.agent === phase.agentName,
      ).length;
      phase.totalTokens = this.modelCalls
        .filter((m) => AGENT_PHASE_MAP[m.agent] === name || m.agent === phase.agentName)
        .reduce((sum, m) => sum + m.totalTokens, 0);
      this.events.push({ timestamp: Date.now(), type: 'phase.end', phase: name, durationMs: phase.endTime - phase.startTime });
    }
  }

  recordCompaction(m: CompactionMetric): void {
    this.compactions.push(m);
    this.events.push({
      timestamp: m.timestamp,
      type: 'compaction',
      detail: `saved ${m.savedBytes} bytes`,
      durationMs: m.savedBytes,
    });
  }

  recordSkill(m: SkillMetric): void {
    this.skills.push(m);
    this.events.push({
      timestamp: m.timestamp,
      type: 'skill.load',
      agent: m.skillName,
      durationMs: m.loadDurationMs,
    });
  }

  recordHandoff(m: AgentHandoffMetric): void {
    this.handoffs.push(m);
    this.events.push({
      timestamp: m.timestamp,
      type: 'agent.handoff',
      agent: m.fromAgent,
      targetAgent: m.toAgent,
      detail: m.taskDescription,
      durationMs: m.durationMs,
    });
  }

  // ─── Query methods ─────────────────────────────────────────────

  getToolCallsByAgent(agent: string): ToolCallMetric[] {
    return this.toolCalls.filter((t) => t.agent === agent);
  }

  getModelCallsByAgent(agent: string): ModelCallMetric[] {
    return this.modelCalls.filter((m) => m.agent === agent);
  }

  getToolCallsByTool(tool: string): ToolCallMetric[] {
    return this.toolCalls.filter((t) => t.tool === tool);
  }

  getModelCallsByPhase(phase: string): ModelCallMetric[] {
    return this.modelCalls.filter((m) => AGENT_PHASE_MAP[m.agent] === phase);
  }

  /** Build aggregated token summary */
  buildTokenSummary(): TokenSummary {
    const byTool: Record<string, { prompt: number; completion: number; calls: number }> = {};
    const bySkill: Record<string, { prompt: number; completion: number; loads: number }> = {};
    const byPhase: Record<string, { prompt: number; completion: number; durationMs: number }> = {};
    const byAgent: Record<string, { prompt: number; completion: number; calls: number }> = {};
    const perModel: Record<string, { prompt: number; completion: number; calls: number }> = {};

    let totalPrompt = 0;
    let totalCompletion = 0;
    let totalCost = 0;

    for (const m of this.modelCalls) {
      totalPrompt += m.inputTokens;
      totalCompletion += m.outputTokens;

      // By tool: attribute model call tokens to the most recent tool
      const tool = this.toolCalls
        .filter((t) => t.sessionID === m.sessionID && t.timestamp <= m.timestamp)
        .pop();
      const toolName = tool?.tool ?? 'unknown';
      if (!byTool[toolName]) byTool[toolName] = { prompt: 0, completion: 0, calls: 0 };
      byTool[toolName]!.prompt += m.inputTokens;
      byTool[toolName]!.completion += m.outputTokens;
      byTool[toolName]!.calls++;

      // By phase
      const phase = AGENT_PHASE_MAP[m.agent] ?? 'other';
      if (!byPhase[phase]) byPhase[phase] = { prompt: 0, completion: 0, durationMs: 0 };
      byPhase[phase]!.prompt += m.inputTokens;
      byPhase[phase]!.completion += m.outputTokens;

      // By agent
      if (!byAgent[m.agent]) byAgent[m.agent] = { prompt: 0, completion: 0, calls: 0 };
      byAgent[m.agent]!.prompt += m.inputTokens;
      byAgent[m.agent]!.completion += m.outputTokens;
      byAgent[m.agent]!.calls++;

      // Per model
      const modelKey = `${m.providerID}/${m.modelID}`;
      if (!perModel[modelKey]) perModel[modelKey] = { prompt: 0, completion: 0, calls: 0 };
      perModel[modelKey]!.prompt += m.inputTokens;
      perModel[modelKey]!.completion += m.outputTokens;
      perModel[modelKey]!.calls++;

      // Cost
      const price = MODEL_PRICES[m.modelID] ?? DEFAULT_PRICE;
      totalCost += (m.inputTokens / 1000) * price.input;
      totalCost += (m.outputTokens / 1000) * price.output;
    }

    // Phase durations from phase records
    for (const p of this.phases) {
      if (p.endTime) {
        if (!byPhase[p.name]) byPhase[p.name] = { prompt: 0, completion: 0, durationMs: 0 };
        byPhase[p.name]!.durationMs = p.endTime - p.startTime;
      }
    }

    // By skill (from model calls attributed to skill-loaded agents)
    for (const s of this.skills) {
      const agentCalls = this.modelCalls.filter((m) => m.agent?.includes(s.skillName));
      bySkill[s.skillName] = {
        prompt: agentCalls.reduce((a, m) => a + m.inputTokens, 0),
        completion: agentCalls.reduce((a, m) => a + m.outputTokens, 0),
        loads: s.executeCount,
      };
    }

    return {
      total: {
        prompt: totalPrompt,
        completion: totalCompletion,
        combined: totalPrompt + totalCompletion,
        estimatedCost: Math.round(totalCost * 100000) / 100000,
      },
      byTool,
      bySkill,
      byPhase,
      byAgent,
      perModel,
    };
  }

  /** Export all metrics for report generation */
  exportAll() {
    return {
      toolCalls: this.toolCalls,
      modelCalls: this.modelCalls,
      hooks: this.hooks,
      phases: this.phases,
      compactions: this.compactions,
      skills: this.skills,
      handoffs: this.handoffs,
      events: this.events,
      tokenSummary: this.buildTokenSummary(),
    };
  }

  /** Reset all metrics */
  reset(): void {
    this.toolCalls = [];
    this.modelCalls = [];
    this.hooks = [];
    this.phases = [];
    this.compactions = [];
    this.skills = [];
    this.handoffs = [];
    this.events = [];
    this.toolCallSeq.clear();
    this.modelCallSeq.clear();
  }
}
