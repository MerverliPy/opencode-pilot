/**
 * Unit tests for SpikeDetector.
 */

import { strict as assert } from 'assert';
import { SpikeDetector } from '../detectors/SpikeDetector.js';
import type { ModelCallMetric } from '../types.js';

function makeCall(totalTokens: number, agent = 'test-agent', modelID = 'test-model'): ModelCallMetric {
  return {
    sessionID: 'test-session',
    agent,
    providerID: 'test-provider',
    modelID,
    timestamp: Date.now(),
    inputTokens: Math.floor(totalTokens * 0.6),
    outputTokens: Math.floor(totalTokens * 0.4),
    totalTokens,
    durationMs: 100,
  };
}

function test() {
  const detector = new SpikeDetector(2.0); // 2 sigma
  let passed = 0;
  let failed = 0;

  function assertNoAlert(alert: any, msg: string) {
    if (alert === null) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.log(`  ✗ ${msg}: unexpected alert: ${alert?.message}`);
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

  // Need minimum 3 calls before detection kicks in
  assertNoAlert(detector.evaluate(makeCall(100)), 'first call (building stats)');
  assertNoAlert(detector.evaluate(makeCall(110)), 'second call (building stats)');
  assertNoAlert(detector.evaluate(makeCall(90)), 'third call (building stats)');

  // Now should detect spike — 500 is way above mean ~100
  const spike = detector.evaluate(makeCall(500));
  assertAlert(spike, 'spike detected: 500 >> ~100');

  // Normal values should not trigger
  assertNoAlert(detector.evaluate(makeCall(105)), 'normal value after spike');

  // Different agent/model pair starts fresh
  assertNoAlert(detector.evaluate(makeCall(50, 'other-agent')), 'different agent starts fresh');
  assertNoAlert(detector.evaluate(makeCall(60, 'other-agent')), 'different agent 2');
  assertNoAlert(detector.evaluate(makeCall(55, 'other-agent')), 'different agent 3');
  assertNoAlert(detector.evaluate(makeCall(65, 'other-agent')), 'different agent 4');

  // Reset
  detector.reset();
  assertNoAlert(detector.evaluate(makeCall(200)), 'after reset: first call');
  assertNoAlert(detector.evaluate(makeCall(210)), 'after reset: second call');
  assertNoAlert(detector.evaluate(makeCall(190)), 'after reset: third call');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

const success = test();
process.exit(success ? 0 : 1);
