export { codeReviewScenario } from './code-review.js';
export { bugFixScenario } from './bug-fix.js';
export { refactorScenario } from './refactor.js';
export { e2eTestScenario } from './e2e-test.js';
export { docsUpdateScenario } from './docs-update.js';

import type { ScenarioName } from '../config.js';

export function getScenario(name: ScenarioName) {
  switch (name) {
    case 'code-review': return codeReviewScenario;
    case 'bug-fix': return bugFixScenario;
    case 'refactor': return refactorScenario;
    case 'e2e-test': return e2eTestScenario;
    case 'docs-update': return docsUpdateScenario;
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
