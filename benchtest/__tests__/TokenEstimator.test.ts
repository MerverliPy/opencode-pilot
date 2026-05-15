/**
 * Unit tests for TokenEstimator.
 */

import { strict as assert } from 'assert';
import { TokenEstimator } from '../collector/TokenEstimator.js';

function test() {
  const est = new TokenEstimator();
  let passed = 0;
  let failed = 0;

  function assertEq(actual: number, expected: number, msg: string) {
    if (actual === expected) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.log(`  ✗ ${msg}: expected ${expected}, got ${actual}`);
      failed++;
    }
  }

  // Empty text
  assertEq(est.estimateTokens('', 'ds/deepseek-v4-flash'), 0, 'empty text');

  // DeepSeek ratio: ~1.8 chars/token
  const shortText = 'Hello world';
  // 'Hello world' = 11 chars / 1.8 = 7 tokens
  assertEq(est.estimateTokens(shortText, 'ds/deepseek-v4-flash'), 7, 'short text deepseek');

  // Unknown model uses default 4 chars/token
  assertEq(est.estimateTokens(shortText, 'unknown-model'), 3, 'short text unknown model');

  // Empty model ID
  assertEq(est.estimateTokens('test', ''), 1, 'empty model id');

  // Tool token estimation
  const toolResult = est.estimateToolTokens('input text', 'output text', 'ds/deepseek-v4-flash');
  assertEq(toolResult.input, 6, 'tool input tokens (11/1.8=ceil(6.1)=7)...');  // 11/1.8=6.1→ceil 7
  assertEq(toolResult.output, 7, 'tool output tokens (12/1.8=6.7→ceil 7)');
  assertEq(toolResult.total, toolResult.input + toolResult.output, 'total = input + output');

  // Custom ratio
  const custom = new TokenEstimator({ 'custom-model': 2.0 });
  assertEq(custom.estimateTokens('abcdef', 'custom-model'), 3, 'custom ratio');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

const success = test();
process.exit(success ? 0 : 1);
