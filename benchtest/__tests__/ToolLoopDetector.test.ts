/**
 * Unit tests for ToolLoopDetector.
 */

import { strict as assert } from 'assert';
import { ToolLoopDetector } from '../detectors/ToolLoopDetector.js';
import type { ToolCallMetric, ModelCallMetric } from '../types.js';

function makeTool(tool: string, agent = 'test-agent'): ToolCallMetric {
  return {
    tool,
    sessionID: 'test-session',
    callID: `call-${Date.now()}-${Math.random()}`,
    agent,
    timestamp: Date.now(),
    durationMs: 100,
    inputChars: 50,
    outputChars: 200,
    destructive: false,
  };
}

function makeModel(): ModelCallMetric {
  return {
    sessionID: 'test-session',
    agent: 'test-agent',
    providerID: 'test',
    modelID: 'test-model',
    timestamp: Date.now(),
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    durationMs: 500,
  };
}

function test() {
  const detector = new ToolLoopDetector(5); // alert after 5 consecutive
  let passed = 0;
  let failed = 0;

  function assertNoAlert(alert: any, msg: string) {
    if (alert === null) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.log(`  ✗ ${msg}: unexpected alert`);
      failed++;
    }
  }

  function assertAlert(alert: any, msg: string) {
    if (alert !== null) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.log(`  ✗ ${msg}: expected alert but got null`);
      failed++;
    }
  }

  // 4 consecutive tools (below threshold of 5)
  assertNoAlert(detector.evaluateToolCall(makeTool('read')), 'tool 1');
  assertNoAlert(detector.evaluateToolCall(makeTool('read')), 'tool 2');
  assertNoAlert(detector.evaluateToolCall(makeTool('grep')), 'tool 3');
  assertNoAlert(detector.evaluateToolCall(makeTool('read')), 'tool 4');

  // 5th tool should trigger
  const alert = detector.evaluateToolCall(makeTool('bash'));
  assertAlert(alert, 'tool loop detected at 5');

  assert(alert!.actualValue >= 5, 'alert actualValue >= 5');

  // Model call resets the counter
  detector.notifyModelCall(makeModel());

  assertNoAlert(detector.evaluateToolCall(makeTool('read')), 'after model: tool 1');
  assertNoAlert(detector.evaluateToolCall(makeTool('read')), 'after model: tool 2');

  // Reset
  detector.reset();
  assertNoAlert(detector.evaluateToolCall(makeTool('read')), 'after reset: tool 1');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

const success = test();
process.exit(success ? 0 : 1);
