/**
 * Unit tests for MetricAggregator — pure logic, no network.
 * Uses nearest-rank percentile (consistent with bench-lib.mjs).
 */

import { strict as assert } from 'assert';
import { MetricAggregator } from '../collector/MetricAggregator.js';

function test() {
  const agg = new MetricAggregator();
  let passed = 0;
  let failed = 0;

  function assertEq(actual: number, expected: number, msg: string) {
    if (Math.abs(actual - expected) < 0.001) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.log(`  ✗ ${msg}: expected ${expected}, got ${actual}`);
      failed++;
    }
  }

  // Test: empty array
  const emptyResult = agg.summarize([]);
  assertEq(emptyResult.count, 0, 'empty array: count');
  assertEq(emptyResult.mean, 0, 'empty array: mean');

  // Test: single value
  const single = agg.summarize([42]);
  assertEq(single.count, 1, 'single value: count');
  assertEq(single.mean, 42, 'single value: mean');
  assertEq(single.min, 42, 'single value: min');
  assertEq(single.max, 42, 'single value: max');

  // Test: multiple values
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = agg.summarize(values);
  assertEq(result.count, 10, '1-10: count');
  assertEq(result.mean, 5.5, '1-10: mean');
  // nearest-rank median for 10 items: ceil(0.5*10)=5, index 4 => value 5
  assertEq(result.median, 5, '1-10: median (nearest-rank)');

  // Test: percentile (nearest-rank)
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assertEq(agg.percentile(sorted, 50), 5, 'p50');
  assertEq(agg.percentile(sorted, 95), 10, 'p95');
  assertEq(agg.percentile(sorted, 99), 10, 'p99');
  assertEq(agg.percentile(sorted, 0), 1, 'p0');

  // Test: stddev
  const uniform = [5, 5, 5, 5, 5];
  assertEq(agg.stddev(uniform), 0, 'uniform: stddev=0');

  const varied = [1, 2, 3, 4, 5];
  const stddev = agg.stddev(varied);
  assert(stddev > 0, 'varied: stddev > 0');

  // Test: histogram
  const hist = agg.histogram([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 5);
  assertEq(hist.length, 5, 'histogram: 5 buckets');

  const totalCount = hist.reduce((s, b) => s + b.count, 0);
  assertEq(totalCount, 10, 'histogram: total count');

  // Test: odd number of values
  const odd = agg.summarize([1, 2, 3, 4, 5]);
  assertEq(odd.median, 3, 'odd count: median');

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

const success = test();
process.exit(success ? 0 : 1);
