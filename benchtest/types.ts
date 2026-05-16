// ─── Metric Types ─────────────────────────────────────────────────────────────
// Shared contract between collectors, detectors, reporters, and the plugin.

/** A single tool execution record */
export interface ToolCallMetric {
  tool: string;
  sessionID: string;
  callID: string;
  agent: string;
  timestamp: number;
  durationMs: number;
  inputChars: number;
  outputChars: number;
  rtkFilter?: string;
  rtkSavedBytes?: number;
  error?: string;
  destructive: boolean;
}

/** A single model/LLM call record */
export interface ModelCallMetric {
  sessionID: string;
  agent: string;
  providerID: string;
  modelID: string;
  timestamp: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  temperature?: number;
  maxOutputTokens?: number;
  contextWindowUtil?: number;
}

/** A plugin hook execution record */
export interface HookExecutionMetric {
  hook: string;
  plugin: string;
  durationMs: number;
  blockedAction?: boolean;
}

/** A workflow phase transition */
export interface PhaseMetric {
  name: string;
  startTime: number;
  endTime?: number;
  agentName: string;
  toolCalls: number;
  modelCalls: number;
  totalTokens: number;
}

/** A compaction event record */
export interface CompactionMetric {
  sessionID: string;
  timestamp: number;
  contextBeforeChars: number;
  contextAfterChars: number;
  savedBytes: number;
  trigger: 'auto' | 'manual' | 'overflow';
}

/** A skill load/execution record */
export interface SkillMetric {
  skillName: string;
  timestamp: number;
  loadDurationMs: number;
  executeCount: number;
  totalExecuteMs: number;
  estimatedTokens: number;
}

/** Agent handoff event */
export interface AgentHandoffMetric {
  timestamp: number;
  fromAgent: string;
  toAgent: string;
  taskDescription: string;
  durationMs: number;
}

/** Aggregated token summary */
export interface TokenSummary {
  total: { prompt: number; completion: number; combined: number; estimatedCost: number };
  byTool: Record<string, { prompt: number; completion: number; calls: number }>;
  bySkill: Record<string, { prompt: number; completion: number; loads: number }>;
  byPhase: Record<string, { prompt: number; completion: number; durationMs: number }>;
  byAgent: Record<string, { prompt: number; completion: number; calls: number }>;
  perModel: Record<string, { prompt: number; completion: number; calls: number }>;
}

/** A single anomaly alert from detectors */
export interface DetectorAlert {
  detector: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  message: string;
  metric?: ToolCallMetric | ModelCallMetric;
  threshold: number;
  actualValue: number;
}

/** Complete benchtest report — the top-level output contract */
export interface BenchtestReport {
  meta: {
    timestamp: string;
    scenario: string;
    durationMs: number;
    sessionCount: number;
    config: Record<string, unknown>;
  };
  summary: {
    totalToolCalls: number;
    totalModelCalls: number;
    totalTokens: number;
    estimatedCost: number;
    pass: boolean;
    alerts: DetectorAlert[];
  };
  tokenSummary: TokenSummary;
  toolCalls: ToolCallMetric[];
  modelCalls: ModelCallMetric[];
  phases: PhaseMetric[];
  compactions: CompactionMetric[];
  handoffs: AgentHandoffMetric[];
  skills: SkillMetric[];
  hooks: HookExecutionMetric[];
  alerts: DetectorAlert[];
  events: WorkflowEvent[];
}

/** Workflow event (for detailed timeline) */
export interface WorkflowEvent {
  timestamp: number;
  type: 'phase.start' | 'phase.end' | 'agent.handoff' | 'compaction' | 'tool.call' | 'model.call' | 'skill.load' | 'session.create' | 'session.end';
  phase?: string;
  agent?: string;
  targetAgent?: string;
  durationMs?: number;
  tokenCount?: number;
  detail?: string;
}

/** Runner options */
export interface BenchtestOptions {
  url: string;
  apiKey?: string;
  scenario: string;
  outDir: string;
  quick?: boolean;
  verbose?: boolean;
  realHTTP?: boolean;
}
