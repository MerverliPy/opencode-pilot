/**
 * MetricAggregator — computes statistics from raw metric arrays.
 *
 * Provides: mean, median, stddev, percentiles, histograms.
 */

export type HistogramBin = { label: string; min: number; max: number; count: number };

export class MetricAggregator {
  /** Compute percentile from sorted array */
  percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[idx] ?? 0;
  }

  /** Compute mean */
  mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /** Compute median (p50) */
  median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    return this.percentile(sorted, 50);
  }

  /** Compute standard deviation */
  stddev(values: number[]): number {
    if (values.length < 2) return 0;
    const m = this.mean(values);
    const sqDiffs = values.map((v) => (v - m) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
  }

  /** Build equal-width histogram with N buckets */
  histogram(values: number[], buckets: number = 10): HistogramBin[] {
    if (values.length === 0) return [];
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0]!;
    const max = sorted[sorted.length - 1]!;
    const width = (max - min) / buckets || 1;

    const bins: HistogramBin[] = [];
    for (let i = 0; i < buckets; i++) {
      const lo = min + i * width;
      const hi = lo + width;
      bins.push({
        label: `${lo.toFixed(0)}–${hi.toFixed(0)}`,
        min: lo,
        max: hi,
        count: 0,
      });
    }
    bins[bins.length - 1]!.max = max + 1; // inclusive upper bound for last bin

    for (const v of sorted) {
      const idx = Math.min(Math.floor((v - min) / width), buckets - 1);
      bins[idx]!.count++;
    }
    return bins;
  }

  /** Summarize array: count, mean, median, p95, p99, stddev, min, max */
  summarize(values: number[]) {
    if (values.length === 0) {
      return { count: 0, mean: 0, median: 0, p95: 0, p99: 0, stddev: 0, min: 0, max: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      mean: this.mean(values),
      median: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      stddev: this.stddev(values),
      min: sorted[0]!,
      max: sorted[sorted.length - 1]!,
    };
  }
}
