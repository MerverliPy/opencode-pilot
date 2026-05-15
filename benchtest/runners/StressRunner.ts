/**
 * StressRunner — runs N concurrent scenario sessions to stress-test
 * the workflow system and measure throughput under load.
 */

import type { BenchtestOptions, BenchtestReport } from '../types.js';
import { WorkflowRunner } from './WorkflowRunner.js';

export class StressRunner {
  private options: BenchtestOptions;

  constructor(options: BenchtestOptions) {
    this.options = { ...options, quick: true }; // Use quick for stress
  }

  /** Run concurrent sessions */
  async run(concurrency: number = 5): Promise<{
    reports: BenchtestReport[];
    totalDurationMs: number;
    throughputPerMin: number;
  }> {
    const startTime = Date.now();
    const runners = Array.from({ length: concurrency }, () => new WorkflowRunner(this.options));

    const results = await Promise.allSettled(
      runners.map((r) => r.run()),
    );

    const allReports: BenchtestReport[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allReports.push(...result.value);
      }
    }

    const elapsed = Date.now() - startTime;
    return {
      reports: allReports,
      totalDurationMs: elapsed,
      throughputPerMin: Math.round((allReports.length / elapsed) * 60000),
    };
  }
}
