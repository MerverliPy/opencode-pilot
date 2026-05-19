// ─── Benchtest Configuration ───────────────────────────────────────────────────
// Thresholds, model pricing, and test matrix.

/** Token consumption thresholds per model provider */
export const TOKEN_THRESHOLDS: Record<string, { perCall: number; perSession: number }> = {
  'n9router': { perCall: 16_000, perSession: 200_000 },
  'anthropic': { perCall: 8_000, perSession: 100_000 },
  'openai': { perCall: 8_000, perSession: 100_000 },
  'ollama': { perCall: 4_000, perSession: 50_000 },
};

/** Anomaly detection thresholds */
export const DETECTOR_THRESHOLDS = {
  /** Spike: model call tokens > runningAvg + (sigmaMultiplier * stddev) */
  spikeSigmaMultiplier: 2,
  /** Trend: N consecutive increasing token counts */
  trendWindow: 5,
  /** Tool loop: N consecutive tool calls without intervening model call */
  toolLoopMax: 10,
  /** Context growth: % increase per message cycle before alerting */
  contextGrowthRate: 0.3,
  /** Compaction threshold: bytes saved below this triggers warning */
  compactionMinSavings: 100,
  /** Routing classification should be fast enough to pay for itself */
  workflowRoutingMs: 1_500,
  /** Context packs should stay bounded for handoffs */
  contextPackMaxLines: 120,
  /** Plugin hooks should not add noticeable per-tool latency */
  pluginHookMaxMs: 25,
  /** RTK should save at least this fraction on compressible outputs */
  rtkMinSavingsRatio: 0.35,
  /** Review fanout should stay risk-based instead of broad by default */
  reviewerFanoutMax: 3,
};

/** Model pricing per 1K tokens (USD). Used for cost estimation. */
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  'ds/deepseek-v4-flash': { input: 0.00015, output: 0.0006 },
  'ds/deepseek-chat': { input: 0.00015, output: 0.0006 },
  'ds/deepseek-reasoner': { input: 0.00055, output: 0.0022 },
  'scout': { input: 0.00015, output: 0.0006 },
  'build-fixer': { input: 0.00015, output: 0.0006 },
  'docs-updater': { input: 0.00015, output: 0.0006 },
  'e2e-runner': { input: 0.00015, output: 0.0006 },
};

/** Default pricing for unknown models (fallback) */
export const DEFAULT_PRICE = { input: 0.00015, output: 0.0006 };

/** Agent name → workflow phase mapping */
export const AGENT_PHASE_MAP: Record<string, string> = {
  'orchestrator': 'routing',
  'change-classifier': 'routing',
  'context-scout': 'discover',
  'context-pack-builder': 'discover',
  'docs-scout': 'discover',
  'planner': 'plan',
  'architect': 'plan',
  'implementer': 'implement',
  'maintainer': 'implement',
  'build-fixer': 'implement',
  'e2e-runner': 'verify',
  'verifier': 'verify',
  'test-strategist': 'verify',
  'code-reviewer': 'review',
  'typescript-reviewer': 'review',
  'api-contract-reviewer': 'review',
  'sqlite-memory-reviewer': 'review',
  'terminal-stream-reviewer': 'review',
  'ui-render-reviewer': 'review',
  'security-auditor': 'review',
  'performance-reviewer': 'review',
  'workflow-profiler': 'profile',
  'docs-updater': 'docs',
};

/** Agent names considered "edit-capable" (destructive) */
export const DESTRUCTIVE_AGENTS = new Set([
  'implementer', 'maintainer', 'build-fixer', 'e2e-runner', 'docs-updater',
]);

/** Benchtest scenarios registry */
export const SCENARIOS = [
  'code-review',
  'bug-fix',
  'refactor',
  'e2e-test',
  'docs-update',
  'api-throughput',
  'proxy-throughput',
  'terminal-concurrency',
  'workflow-routing',
  'context-pack-size',
  'plugin-hook-overhead',
  'rtk-compression-savings',
  'verify-plan-accuracy',
  'reviewer-fanout-control',
] as const;

export type ScenarioName = typeof SCENARIOS[number];

/** Quick-mode — each scenario runs with reduced iterations */
export const QUICK_MODE: Record<string, Record<string, unknown>> = {
  'code-review': { files: 1, config: 'minimal' },
  'bug-fix': { iteration: 1 },
  'refactor': { depth: 'shallow' },
  'e2e-test': { pageCount: 1 },
  'docs-update': { sectionCount: 1 },
  'api-throughput': { iterations: 5 },
  'proxy-throughput': { iterations: 1 },
  'terminal-concurrency': { connections: 2 },
  'workflow-routing': { tasks: 1, useDiff: true },
  'context-pack-size': { packs: 1, maxLines: 120 },
  'plugin-hook-overhead': { toolCalls: 5 },
  'rtk-compression-savings': { samples: 3 },
  'verify-plan-accuracy': { changedFileSets: 3 },
  'reviewer-fanout-control': { changedFileSets: 3 },
} as const;
