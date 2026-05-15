import type { Scenario } from './index.js';

export const bugFixScenario: Scenario = {
  name: 'bug-fix',
  description: 'Simulates a bug fix — discover failing test, diagnose, implement fix, verify',
  taskPrompt: `The following test is failing. Find the bug, fix it, and verify the fix passes.

Test code (save as /tmp/failing-test.ts and run with tsx):

import { strict as assert } from 'assert';

function deduplicate(arr: number[]): number[] {
  const seen = new Set<number>();
  return arr.filter((x) => {
    if (seen.has(x)) return false;
    seen.add(x);
    return true;
  });
}

// Bug: the function works for numbers but fails for mixed types
// The real issue is in the implementation — find and fix it

const result = deduplicate([1, 2, 2, 3, 1, 4]);
assert.deepEqual(result, [1, 2, 3, 4]);
console.log('PASS: basic dedup');

const result2 = deduplicate([]);
assert.deepEqual(result2, []);
console.log('PASS: empty array');

console.log('All tests passed!');

Run the test with: npx tsx /tmp/failing-test.ts
Read the file, identify any issues, and fix them.`,
  expectedPhases: ['discover', 'plan', 'implement', 'verify'],
  expectedTools: ['read', 'write', 'bash', 'grep'],
  tokenBudget: { maxTotal: 60_000, maxPerCall: 8_000 },
  timeoutMs: 180_000,
  iterations: 1,
};
