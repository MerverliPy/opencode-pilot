import { test, expect } from "../../fixtures/pilot.fixture";
import { ROUTES } from "../../utils/routes";

/**
 * Performance regression E2E tests.
 *
 * Measures rendering performance during:
 * - Rapid UI state changes (simulating SSE updates)
 * - Navigation between routes
 * - Memory stability during extended sessions
 *
 * These tests establish baselines for performance regression detection.
 * Full-stack tests (requiring E2E_FULL_STACK=1) test real SSE streaming.
 */

interface PerformanceMetrics {
  metrics: Array<{ name: string; value: number }>;
}

test.describe("Performance regression — navigation", () => {
  test.beforeEach(() => {
    test.skip(!!process.env.CI, "Performance benchmarks require stable env");
  });
  // Baseline: navigating between all routes should be fast
  test("rapid navigation between routes stays under performance budget", async ({ page }) => {
    const routes = [ROUTES.HOME, ROUTES.CHAT, ROUTES.SESSIONS, ROUTES.FILES, ROUTES.SETTINGS];
    const timings: number[] = [];

    for (const route of routes) {
      const start = Date.now();
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByTestId("main-content")).toBeVisible();
      timings.push(Date.now() - start);
    }

    // Each route should load in under 3 seconds
    for (const timing of timings) {
      expect(timing).toBeLessThan(3000);
    }

    // Average should be under 1.5 seconds
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    expect(avg).toBeLessThan(1500);
  });

  test("repeated navigation to same route is stable", async ({ page }) => {
    const timings: number[] = [];

    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await page.goto(ROUTES.SETTINGS);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByTestId("main-content")).toBeVisible();
      timings.push(Date.now() - start);
    }

    // No single navigation should take more than 3 seconds
    for (const timing of timings) {
      expect(timing).toBeLessThan(3000);
    }

    // Later navigations should be faster (caching) — last 3 should average under 1s
    const laterAvg = timings.slice(2).reduce((a, b) => a + b, 0) / 3;
    expect(laterAvg).toBeLessThan(1000);
  });
});

test.describe("Performance regression — memory", () => {
  test.beforeEach(() => {
    test.skip(!!process.env.CI, "Performance benchmarks require stable env");
  });
  test("heap does not grow significantly during navigation", async ({ page }) => {
    // Navigate to home and measure initial heap
    await page.goto(ROUTES.HOME);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send("Performance.enable");

      // Get initial heap
      const initialMetrics = (await cdp.send(
        "Performance.getMetrics",
      )) as PerformanceMetrics;
      const initialHeap = initialMetrics.metrics.find(
        (m) => m.name === "JSHeapUsedSize",
      );
      const initialHeapMB = (initialHeap?.value ?? 0) / 1024 / 1024;

      // Navigate through all routes
      const routes = [ROUTES.CHAT, ROUTES.SESSIONS, ROUTES.FILES, ROUTES.SETTINGS, ROUTES.TERMINAL, ROUTES.HOME];
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState("domcontentloaded");
      }

      // Get final heap
      const finalMetrics = (await cdp.send(
        "Performance.getMetrics",
      )) as PerformanceMetrics;
      const finalHeap = finalMetrics.metrics.find(
        (m) => m.name === "JSHeapUsedSize",
      );
      const finalHeapMB = (finalHeap?.value ?? 0) / 1024 / 1024;

      // Heap should not grow by more than 20MB during navigation
      const heapGrowth = finalHeapMB - initialHeapMB;
      expect(heapGrowth).toBeLessThan(20);
    } finally {
      await cdp.send("Performance.disable");
    }
  });
});

test.describe("Performance regression — rendering", () => {
  test.beforeEach(() => {
    test.skip(!!process.env.CI, "Performance benchmarks require stable env");
  });
  test("settings form interaction is responsive", async ({ page }) => {
    await page.goto(ROUTES.SETTINGS);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByTestId("main-content")).toBeVisible();

    // Measure time to open form
    const start = Date.now();
    await page.getByTestId("add-server-button").click();
    await expect(page.getByTestId("server-name-input")).toBeVisible();
    const formOpenTime = Date.now() - start;

    // Form should open in under 500ms
    expect(formOpenTime).toBeLessThan(500);

    // Measure time to type in form
    const typeStart = Date.now();
    await page.getByTestId("server-name-input").fill("Performance Test Server");
    await page.getByTestId("server-url-input").fill("http://localhost:4096");
    const typeTime = Date.now() - typeStart;

    // Typing should complete in under 1 second
    expect(typeTime).toBeLessThan(1000);
  });

  test("no long tasks during initial page load", async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send("Performance.enable");
      await cdp.send("Runtime.enable");

      // Listen for long tasks via PerformanceObserver
      await page.evaluate(() => {
        const w = window as unknown as Record<string, unknown>;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              w.__longTasks = (w.__longTasks as number[] || []) as number[];
              (w.__longTasks as number[]).push(entry.duration);
            }
          }
        });
        observer.observe({ type: "longtask", buffered: true });
      });

      await page.goto(ROUTES.HOME);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByTestId("main-content")).toBeVisible();

      // Wait for any delayed long tasks to be collected by the PerformanceObserver
      // Use a short explicit delay since __longTasks may never be defined if
      // there are zero long tasks (which is the happy path).
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

      const tasks = await page.evaluate(
        () => ((window as unknown as Record<string, unknown>).__longTasks as number[] || []),
      );

      // Should have no more than 2 long tasks during initial load
      // (some are unavoidable during React hydration)
      expect(tasks.length).toBeLessThanOrEqual(2);
    } finally {
      await cdp.send("Performance.disable");
    }
  });
});