export { codeReviewScenario } from './code-review.js';
export { bugFixScenario } from './bug-fix.js';
export { refactorScenario } from './refactor.js';
export { e2eTestScenario } from './e2e-test.js';
export { docsUpdateScenario } from './docs-update.js';
export { apiThroughputScenario } from './api-throughput.js';
export { proxyThroughputScenario } from './proxy-throughput.js';
export { terminalConcurrencyScenario } from './terminal-concurrency.js';
export { workflowRoutingScenario } from './workflow-routing.js';
export { contextPackSizeScenario } from './context-pack-size.js';
export { pluginHookOverheadScenario } from './plugin-hook-overhead.js';
export { rtkCompressionScenario } from './rtk-compression-savings.js';
export { verifyPlanAccuracyScenario } from './verify-plan-accuracy.js';
export { reviewerFanoutControlScenario } from './reviewer-fanout-control.js';

import type { ScenarioName } from '../config.js';

export function getScenario(name: ScenarioName) {
  switch (name) {
    case 'code-review': return codeReviewScenario;
    case 'bug-fix': return bugFixScenario;
    case 'refactor': return refactorScenario;
    case 'e2e-test': return e2eTestScenario;
    case 'docs-update': return docsUpdateScenario;
    case 'api-throughput': return apiThroughputScenario;
    case 'proxy-throughput': return proxyThroughputScenario;
    case 'terminal-concurrency': return terminalConcurrencyScenario;
    case 'workflow-routing': return workflowRoutingScenario;
    case 'context-pack-size': return contextPackSizeScenario;
    case 'plugin-hook-overhead': return pluginHookOverheadScenario;
    case 'rtk-compression-savings': return rtkCompressionScenario;
    case 'verify-plan-accuracy': return verifyPlanAccuracyScenario;
    case 'reviewer-fanout-control': return reviewerFanoutControlScenario;
  }
}

export interface Scenario {
  name: string;
  description: string;
  /** Task prompt to send to OpenCode */
  taskPrompt: string;
  /** Expected workflow phases */
  expectedPhases: string[];
  /** Expected tools that should be used */
  expectedTools: string[];
  /** Token budget for this scenario */
  tokenBudget: { maxTotal: number; maxPerCall: number };
  /** Timeout per scenario run (ms) */
  timeoutMs: number;
  /** Number of iterations to run */
  iterations: number;
}

import { codeReviewScenario } from './code-review.js';
import { bugFixScenario } from './bug-fix.js';
import { refactorScenario } from './refactor.js';
import { e2eTestScenario } from './e2e-test.js';
import { docsUpdateScenario } from './docs-update.js';
import { apiThroughputScenario } from './api-throughput.js';
import { proxyThroughputScenario } from './proxy-throughput.js';
import { terminalConcurrencyScenario } from './terminal-concurrency.js';
import { workflowRoutingScenario } from './workflow-routing.js';
import { contextPackSizeScenario } from './context-pack-size.js';
import { pluginHookOverheadScenario } from './plugin-hook-overhead.js';
import { rtkCompressionScenario } from './rtk-compression-savings.js';
import { verifyPlanAccuracyScenario } from './verify-plan-accuracy.js';
import { reviewerFanoutControlScenario } from './reviewer-fanout-control.js';

