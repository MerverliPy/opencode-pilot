/**
 * JsonReporter — writes benchtest report as JSON file.
 */

import fs from 'fs';
import path from 'path';
import type { BenchtestReport } from '../types.js';

export class JsonReporter {
  /** Write report to file */
  write(report: BenchtestReport, outPath: string): void {
    const dir = path.dirname(outPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  }

  /** Write multiple reports as an array */
  writeAll(reports: BenchtestReport[], outPath: string): void {
    const dir = path.dirname(outPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(reports, null, 2));
  }
}
