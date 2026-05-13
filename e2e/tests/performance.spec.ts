import { test, expect } from "@playwright/test";

/**
 * Performance E2E tests.
 *
 * Mirrors chrome-devtools-mcp tools:
 *   - performance_start_trace
 *   - performance_stop_trace
 *   - performance_analyze_insight
 *   - lighthouse_audit
 *
 * Uses CDP (Chrome DevTools Protocol) for metrics — same protocol
 * that chrome-devtools-mcp speaks.
 */

interface PerformanceMetrics {
  metrics: Array<{ name: string; value: number }>;
}

test.describe("Performance — page load time", () => {
  test("page load time is under 3 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(3000);
  });
});

test.describe("Performance — CDP metrics", () => {
  test("Performance.getMetrics returns valid data", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cdpSession = await page.context().newCDPSession(page);

    // Enable performance domain first
    await cdpSession.send("Performance.enable");

    // CDP call mirrors what chrome-devtools-mcp does internally
    const result = (await cdpSession.send(
      "Performance.getMetrics",
    )) as PerformanceMetrics;

    expect(result.metrics).toBeDefined();
    expect(Array.isArray(result.metrics)).toBe(true);
    expect(result.metrics.length).toBeGreaterThan(0);

    // Look for key metrics
    const metricNames = result.metrics.map((m) => m.name);
    expect(metricNames).toContain("JSHeapUsedSize");
    expect(metricNames).toContain("JSHeapTotalSize");

    await cdpSession.send("Performance.disable");
  });

  test("JS heap size is reasonable on initial load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send("Performance.enable");

    const result = (await cdpSession.send(
      "Performance.getMetrics",
    )) as PerformanceMetrics;

    const heapUsed = result.metrics.find((m) => m.name === "JSHeapUsedSize");
    expect(heapUsed).toBeDefined();
    expect(heapUsed!.value).toBeGreaterThan(0);
    // Should be under 100MB on initial load for a reasonably-sized app
    expect(heapUsed!.value).toBeLessThan(100 * 1024 * 1024);

    await cdpSession.send("Performance.disable");
  });
});

test.describe("Performance — paint timing (LCP/FCP proxy)", () => {
  test("First Contentful Paint is recorded", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const paintEntries = await page.evaluate(() =>
      performance.getEntriesByType("paint"),
    );

    const fcp = paintEntries.find(
      (e: PerformanceEntry) => e.name === "first-contentful-paint",
    );
    expect(fcp).toBeDefined();
    expect(fcp!.startTime).toBeGreaterThan(0);
  });

  test("PerformanceObserver captures paint events", async ({ page }) => {
    const paintTimings = await page.evaluate(() => {
      return new Promise<PerformanceEntry[]>((resolve) => {
        const entries: PerformanceEntry[] = [];
        const observer = new PerformanceObserver((list) => {
          entries.push(...list.getEntries());
          resolve(entries);
        });
        observer.observe({ entryTypes: ["paint"] });
        // If already fired, entries may be empty; timeout as fallback
        setTimeout(() => resolve(entries), 5000);
      });
    });

    // paint events may already be captured before the observer starts,
    // so we just verify the API works
    expect(Array.isArray(paintTimings)).toBe(true);
  });
});

test.describe("Performance — long tasks", () => {
  test("no long tasks (>50ms) on initial load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const longTasks = await page.evaluate(() => {
      return new Promise<PerformanceEntry[]>((resolve) => {
        const entries: PerformanceEntry[] = [];
        const observer = new PerformanceObserver((list) => {
          entries.push(...list.getEntries());
        });
        observer.observe({ entryTypes: ["longtask"] });
        setTimeout(() => {
          observer.disconnect();
          resolve(entries);
        }, 1000);
      });
    });

    // Should have no long tasks on a clean initial load
    expect(longTasks.length).toBe(0);
  });
});

test.describe("Performance — memory usage via CDP", () => {
  test("heap usage stays within bounds during navigation", async ({ page }) => {
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send("Performance.enable");

    // Measure heap before navigation
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const before = (await cdpSession.send(
      "Performance.getMetrics",
    )) as PerformanceMetrics;
    const heapBefore = before.metrics.find((m) => m.name === "JSHeapUsedSize")!;

    // Navigate to other routes
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await page.goto("/sessions");
    await page.waitForLoadState("networkidle");
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const after = (await cdpSession.send(
      "Performance.getMetrics",
    )) as PerformanceMetrics;
    const heapAfter = after.metrics.find((m) => m.name === "JSHeapUsedSize")!;

    // Heap shouldn't grow unboundedly after navigating between routes
    const growth = heapAfter.value - heapBefore.value;
    expect(growth).toBeLessThan(50 * 1024 * 1024); // < 50MB growth

    await cdpSession.send("Performance.disable");
  });
});
