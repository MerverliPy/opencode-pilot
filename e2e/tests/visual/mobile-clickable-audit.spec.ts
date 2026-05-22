import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_ROUTES } from "../../utils/routes";

type Severity = "P0" | "P1" | "P2" | "P3";

interface ViewportTarget {
  name: string;
  width: number;
  height: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface InteractiveItem {
  auditId: string;
  index: number;
  tagName: string;
  role: string | null;
  type: string | null;
  text: string;
  ariaLabel: string | null;
  title: string | null;
  href: string | null;
  selectorHint: string;
  rect: Rect;
  clipped: boolean;
  tooSmall: boolean;
  disabled: boolean;
}

interface LayoutReport {
  url: string;
  viewport: {
    width: number;
    height: number;
    scrollWidth: number;
    scrollHeight: number;
  };
  horizontalOverflow: boolean;
  overflowingElements: Array<{
    selectorHint: string;
    text: string;
    rect: Rect;
  }>;
  clippedInteractiveElements: InteractiveItem[];
  fixedOrStickyOutOfBounds: Array<{
    selectorHint: string;
    text: string;
    rect: Rect;
    position: string;
  }>;
}

interface Finding {
  severity: Severity;
  route: string;
  viewport: string;
  category: string;
  message: string;
  selectorHint?: string;
  screenshot?: string;
}

interface ClickResult {
  route: string;
  viewport: string;
  index: number;
  selectorHint: string;
  label: string;
  href?: string | null;
  targetPath?: string | null;
  status: string;
  beforeUrl: string;
  afterUrl: string;
  reason?: string;
  error?: string;
  screenshot?: string;
}

interface InteractionState {
  href: string;
  path: string;
  activeSignature: string;
  dialogCount: number;
  menuCount: number;
  expandedCount: number;
  checkedCount: number;
}

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='tab']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='combobox']",
  "[role='textbox']",
  "[tabindex]:not([tabindex='-1'])",
  "[aria-controls]",
].join(",");

const VIEWPORTS: ViewportTarget[] = [
  { name: "mobile-320x568", width: 320, height: 568 },
  { name: "mobile-375x667", width: 375, height: 667 },
  { name: "mobile-390x844", width: 390, height: 844 },
  { name: "mobile-430x932", width: 430, height: 932 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
];

const OUT_DIR =
  process.env.VISUAL_AUDIT_OUT || "dogfood-output/visual-functional-audit";
const SOFT =
  process.env.VISUAL_AUDIT_SOFT === "1" ||
  process.env.VISUAL_AUDIT_SOFT === "true";

const consoleErrors: Array<{ route: string; viewport: string; message: string }> =
  [];
const pageErrors: Array<{ route: string; viewport: string; message: string }> =
  [];

function routesToAudit(): string[] {
  const fromEnv = process.env.VISUAL_AUDIT_ROUTES;
  const defaultRoutes = Array.from(new Set([...ALL_ROUTES, "/memory"]));

  const raw = fromEnv
    ? fromEnv.split(",").map((route) => route.trim()).filter(Boolean)
    : defaultRoutes;

  return Array.from(
    new Set(raw.map((route) => (route.startsWith("/") ? route : `/${route}`))),
  );
}

function safeName(value: string): string {
  const cleaned = value
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return cleaned || "root";
}

function writeJson(fileName: string, value: unknown): void {
  writeFileSync(join(OUT_DIR, fileName), JSON.stringify(value, null, 2) + "\n");
}

function writeJsonl(fileName: string, values: unknown[]): void {
  writeFileSync(
    join(OUT_DIR, fileName),
    values.map((value) => JSON.stringify(value)).join("\n") + "\n",
  );
}

function labelFor(item: InteractiveItem): string {
  return (
    item.ariaLabel ||
    item.text ||
    item.title ||
    item.selectorHint ||
    `${item.tagName.toLowerCase()}-${item.index}`
  ).trim();
}

function pathFromUrl(value: string): string {
  try {
    return new URL(value).pathname;
  } catch {
    return "";
  }
}

function pathFromHref(href: string | null, baseHref: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseHref).pathname;
  } catch {
    return null;
  }
}

function dangerousSkipReason(item: InteractiveItem, currentOrigin: string): string {
  const label = `${item.text} ${item.ariaLabel ?? ""} ${item.title ?? ""}`
    .toLowerCase()
    .trim();

  if (item.type === "file") {
    return "file upload control skipped";
  }

  if (item.href) {
    try {
      const hrefUrl = new URL(item.href, currentOrigin);
      if (hrefUrl.origin !== currentOrigin) {
        return "external navigation skipped";
      }
    } catch {
      return "unparseable href skipped";
    }
  }

  if (
    /\b(delete|remove|destroy|logout|log out|sign out|reset|clear|publish|deploy|force|revoke|disconnect|archive|trash)\b/i.test(
      label,
    )
  ) {
    return "potentially destructive action skipped";
  }

  if (
    process.env.VISUAL_AUDIT_ALLOW_SIDE_EFFECTS !== "1" &&
    /\b(start tunnel|stop tunnel|tunnel|push|notification|connect|disconnect|sync|server|add server|remove server)\b/i.test(
      label,
    )
  ) {
    return "side-effecting control skipped; set VISUAL_AUDIT_ALLOW_SIDE_EFFECTS=1 for dedicated integration testing";
  }

  return "";
}

function statusIsFailure(status: string): boolean {
  return status.startsWith("failed_");
}

async function tagInteractiveElements(page: Page): Promise<InteractiveItem[]> {
  return page.evaluate<InteractiveItem[], string>((selector) => {
    const toRect = (rect: DOMRect): Rect => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    });

    const textFor = (element: HTMLElement): string =>
      (element.innerText || element.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 140);

    const selectorHintFor = (element: HTMLElement, auditId: string): string => {
      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid="${testId}"]`;
      if (element.id) return `#${element.id}`;
      const role = element.getAttribute("role");
      if (role) return `${element.tagName.toLowerCase()}[role="${role}"]`;
      return `${element.tagName.toLowerCase()}[data-visual-audit-id="${auditId}"]`;
    };

    const isVisible = (element: HTMLElement): boolean => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= window.innerHeight &&
        rect.left <= window.innerWidth
      );
    };

    const candidates = Array.from(
      document.querySelectorAll(selector),
    ) as HTMLElement[];

    return candidates
      .filter(isVisible)
      .map((element, index) => {
        const auditId = `visual-audit-${index}`;
        element.setAttribute("data-visual-audit-id", auditId);

        const rect = toRect(element.getBoundingClientRect());
        const tagName = element.tagName;
        const input = element as HTMLInputElement;
        const disabled =
          "disabled" in element && Boolean((element as HTMLButtonElement).disabled);

        return {
          auditId,
          index,
          tagName,
          role: element.getAttribute("role"),
          type: input.type || null,
          text: textFor(element),
          ariaLabel: element.getAttribute("aria-label"),
          title: element.getAttribute("title"),
          href: element instanceof HTMLAnchorElement ? element.href : null,
          selectorHint: selectorHintFor(element, auditId),
          rect,
          clipped:
            rect.left < -1 ||
            rect.right > window.innerWidth + 1 ||
            rect.top < -1 ||
            rect.bottom > window.innerHeight + 1,
          tooSmall: rect.width < 44 || rect.height < 44,
          disabled,
        };
      });
  }, INTERACTIVE_SELECTOR);
}

async function evaluateLayout(page: Page): Promise<LayoutReport> {
  return page.evaluate<LayoutReport, string>((selector) => {
    const toRect = (rect: DOMRect): Rect => ({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    });

    const textFor = (element: HTMLElement): string =>
      (element.innerText || element.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120);

    const selectorHintFor = (element: HTMLElement): string => {
      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid="${testId}"]`;
      if (element.id) return `#${element.id}`;
      const role = element.getAttribute("role");
      if (role) return `${element.tagName.toLowerCase()}[role="${role}"]`;
      return element.tagName.toLowerCase();
    };

    const isVisible = (element: HTMLElement): boolean => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= window.innerHeight &&
        rect.left <= window.innerWidth
      );
    };

    const bodyElements = Array.from(
      document.querySelectorAll("body *"),
    ) as HTMLElement[];

    const overflowingElements = bodyElements
      .filter(isVisible)
      .map((element) => ({
        selectorHint: selectorHintFor(element),
        text: textFor(element),
        rect: toRect(element.getBoundingClientRect()),
      }))
      .filter((entry) => entry.rect.right > window.innerWidth + 1)
      .slice(0, 25);

    const interactiveElements = Array.from(
      document.querySelectorAll(selector),
    ) as HTMLElement[];

    const clippedInteractiveElements = interactiveElements
      .filter(isVisible)
      .map((element, index) => {
        const auditId = element.getAttribute("data-visual-audit-id") || `layout-${index}`;
        const rect = toRect(element.getBoundingClientRect());
        const input = element as HTMLInputElement;
        return {
          auditId,
          index,
          tagName: element.tagName,
          role: element.getAttribute("role"),
          type: input.type || null,
          text: textFor(element),
          ariaLabel: element.getAttribute("aria-label"),
          title: element.getAttribute("title"),
          href: element instanceof HTMLAnchorElement ? element.href : null,
          selectorHint: selectorHintFor(element),
          rect,
          clipped:
            rect.left < -1 ||
            rect.right > window.innerWidth + 1 ||
            rect.top < -1 ||
            rect.bottom > window.innerHeight + 1,
          tooSmall: rect.width < 44 || rect.height < 44,
          disabled:
            "disabled" in element &&
            Boolean((element as HTMLButtonElement).disabled),
        };
      })
      .filter((item) => item.clipped)
      .slice(0, 25);

    const fixedOrStickyOutOfBounds = bodyElements
      .filter(isVisible)
      .map((element) => {
        const style = window.getComputedStyle(element);
        return {
          element,
          position: style.position,
          rect: toRect(element.getBoundingClientRect()),
        };
      })
      .filter(
        (entry) =>
          (entry.position === "fixed" || entry.position === "sticky") &&
          (entry.rect.left < -1 ||
            entry.rect.right > window.innerWidth + 1 ||
            entry.rect.top < -1 ||
            entry.rect.bottom > window.innerHeight + 1),
      )
      .slice(0, 25)
      .map((entry) => ({
        selectorHint: selectorHintFor(entry.element),
        text: textFor(entry.element),
        rect: entry.rect,
        position: entry.position,
      }));

    return {
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 1,
      overflowingElements,
      clippedInteractiveElements,
      fixedOrStickyOutOfBounds,
    };
  }, INTERACTIVE_SELECTOR);
}

async function interactionState(page: Page): Promise<InteractionState> {
  return page.evaluate<InteractionState>(() => {
    const active = document.activeElement as HTMLElement | null;
    const activeSignature = active
      ? [
          active.tagName,
          active.id || "",
          active.getAttribute("role") || "",
          active.getAttribute("aria-label") || "",
          active.getAttribute("data-testid") || "",
        ].join("|")
      : "";

    return {
      href: window.location.href,
      path: window.location.pathname,
      activeSignature,
      dialogCount: document.querySelectorAll(
        "dialog[open], [role='dialog'], [aria-modal='true']",
      ).length,
      menuCount: document.querySelectorAll("[role='menu'], [role='listbox']").length,
      expandedCount: document.querySelectorAll("[aria-expanded='true']").length,
      checkedCount: document.querySelectorAll(
        "[aria-checked='true'], input:checked",
      ).length,
    };
  });
}

function isGuardedAppRoute(path: string | null): boolean {
  return path !== null && [
    "/",
    "/chat",
    "/sessions",
    "/files",
    "/terminal",
    "/diff",
    "/memory",
  ].includes(path);
}

function classifyClick(
  before: InteractionState,
  after: InteractionState,
  item: InteractiveItem,
): string {
  const targetPath = pathFromHref(item.href, before.href);

  if (targetPath && targetPath === before.path && after.path === before.path) {
    return "passed_current_route";
  }

  if (targetPath && targetPath !== before.path && after.path === targetPath) {
    return "passed_navigation";
  }

  if (after.href !== before.href) return "passed_navigation";
  if (after.dialogCount !== before.dialogCount) return "passed_dialog_change";
  if (after.menuCount !== before.menuCount) return "passed_menu_change";
  if (after.expandedCount !== before.expandedCount) return "passed_expanded_change";
  if (after.checkedCount !== before.checkedCount) return "passed_checked_change";
  if (after.activeSignature !== before.activeSignature) return "passed_focus_change";

  if (
    targetPath &&
    targetPath !== before.path &&
    isGuardedAppRoute(targetPath) &&
    (after.path === "/settings" || after.path === "/login")
  ) {
    return "skipped_guarded_navigation";
  }

  if (targetPath && targetPath !== before.path) {
    return "failed_navigation_noop";
  }

  return "failed_no_observable_response";
}

async function restoreRoute(page: Page, route: string): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  const currentPath = pathFromUrl(page.url());
  if (currentPath !== route) {
    await page.goto(route, { waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.locator("body").waitFor({ state: "visible", timeout: 5000 }).catch(
      () => undefined,
    );
  }
}

function markdownReport(input: {
  findings: Finding[];
  clicks: ClickResult[];
  routes: string[];
  viewports: ViewportTarget[];
  routeReports: LayoutReport[];
}): string {
  const bySeverity = (severity: Severity): Finding[] =>
    input.findings.filter((finding) => finding.severity === severity);

  const failedClicks = input.clicks.filter((click) => statusIsFailure(click.status));
  const skippedClicks = input.clicks.filter((click) => click.status.startsWith("skipped_"));
  const passedClicks = input.clicks.filter((click) => click.status.startsWith("passed_"));

  const lines: string[] = [];
  lines.push("# Pilot Visual Functional Audit");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Soft mode: ${SOFT ? "on" : "off"}`);
  lines.push("");
  lines.push("## Coverage");
  lines.push("");
  lines.push(`- Routes: ${input.routes.join(", ")}`);
  lines.push(
    `- Viewports: ${input.viewports
      .map((viewport) => `${viewport.width}x${viewport.height}`)
      .join(", ")}`,
  );
  lines.push(`- Click results: ${input.clicks.length}`);
  lines.push(`- Passed clicks: ${passedClicks.length}`);
  lines.push(`- Failed clicks: ${failedClicks.length}`);
  lines.push(`- Skipped clicks: ${skippedClicks.length}`);
  lines.push("");
  lines.push("## Findings by severity");
  lines.push("");
  for (const severity of ["P0", "P1", "P2", "P3"] as Severity[]) {
    lines.push(`### ${severity}`);
    const findings = bySeverity(severity);
    if (!findings.length) {
      lines.push("");
      lines.push("None.");
      lines.push("");
      continue;
    }
    lines.push("");
    for (const finding of findings) {
      lines.push(
        `- [${finding.viewport} ${finding.route}] ${finding.category}: ${finding.message}${
          finding.selectorHint ? ` (${finding.selectorHint})` : ""
        }${finding.screenshot ? ` screenshot=${finding.screenshot}` : ""}`,
      );
    }
    lines.push("");
  }
  lines.push("## Failed clicks");
  lines.push("");
  if (!failedClicks.length) {
    lines.push("None.");
  } else {
    for (const click of failedClicks.slice(0, 100)) {
      lines.push(
        `- [${click.viewport} ${click.route}] ${click.status}: ${click.label} (${click.selectorHint})${
          click.screenshot ? ` screenshot=${click.screenshot}` : ""
        }`,
      );
    }
  }
  lines.push("");
  lines.push("## Output files");
  lines.push("");
  lines.push("- report.md");
  lines.push("- report.json");
  lines.push("- clicks.jsonl");
  lines.push("- console-errors.jsonl");
  lines.push("- page-errors.jsonl");
  lines.push("- screenshots/");
  lines.push("- failures/");
  lines.push("");
  return lines.join("\n");
}

test.describe("Visual functional mobile audit", () => {
  test("route, viewport, layout, and clickable audit", async ({ page }, testInfo) => {
    test.setTimeout(300_000);

    mkdirSync(OUT_DIR, { recursive: true });
    mkdirSync(join(OUT_DIR, "screenshots"), { recursive: true });
    mkdirSync(join(OUT_DIR, "failures"), { recursive: true });

    const findings: Finding[] = [];
    const clicks: ClickResult[] = [];
    const routeReports: LayoutReport[] = [];
    const routes = routesToAudit();

    let currentRoute = "";
    let currentViewport = "";

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push({
          route: currentRoute,
          viewport: currentViewport,
          message: message.text(),
        });
      }
    });

    page.on("pageerror", (error) => {
      pageErrors.push({
        route: currentRoute,
        viewport: currentViewport,
        message: error.message,
      });
    });

    for (const viewport of VIEWPORTS) {
      currentViewport = viewport.name;
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of routes) {
        currentRoute = route;
        const routeSlug = safeName(route);
        const baseName = `${viewport.name}-${routeSlug}`;

        try {
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await page.locator("body").waitFor({ state: "visible", timeout: 8000 });
        } catch (error) {
          findings.push({
            severity: "P0",
            route,
            viewport: viewport.name,
            category: "route_load",
            message: `Route failed to load: ${String(error)}`,
          });
          continue;
        }

        const screenshotPath = join("screenshots", `${baseName}.png`);
        await page.screenshot({
          path: join(OUT_DIR, screenshotPath),
          fullPage: true,
        });

        const layout = await evaluateLayout(page);
        routeReports.push(layout);

        if (layout.horizontalOverflow) {
          findings.push({
            severity: "P1",
            route,
            viewport: viewport.name,
            category: "horizontal_overflow",
            message: `Document scrollWidth ${layout.viewport.scrollWidth} exceeds viewport width ${layout.viewport.width}.`,
            screenshot: screenshotPath,
          });
        }

        for (const item of layout.clippedInteractiveElements) {
          findings.push({
            severity: "P1",
            route,
            viewport: viewport.name,
            category: "clipped_interactive",
            message: `Interactive element is clipped outside the visible viewport.`,
            selectorHint: item.selectorHint,
            screenshot: screenshotPath,
          });
        }

        for (const item of layout.fixedOrStickyOutOfBounds) {
          findings.push({
            severity: "P1",
            route,
            viewport: viewport.name,
            category: "fixed_or_sticky_out_of_bounds",
            message: `Fixed/sticky element extends outside the viewport.`,
            selectorHint: item.selectorHint,
            screenshot: screenshotPath,
          });
        }

        const initialInventory = await tagInteractiveElements(page);

        for (const item of initialInventory) {
          if (item.tooSmall) {
            findings.push({
              severity: "P2",
              route,
              viewport: viewport.name,
              category: "tap_target",
              message: `Tap target is smaller than 44x44 CSS pixels: ${Math.round(
                item.rect.width,
              )}x${Math.round(item.rect.height)}.`,
              selectorHint: item.selectorHint,
              screenshot: screenshotPath,
            });
          }
        }

        for (let index = 0; index < initialInventory.length; index += 1) {
          await restoreRoute(page, route);
          const inventory = await tagInteractiveElements(page);
          const item = inventory[index];

          if (!item) {
            clicks.push({
              route,
              viewport: viewport.name,
              index,
              selectorHint: `inventory-index-${index}`,
              label: `inventory-index-${index}`,
              status: "skipped_missing_after_state_reset",
              beforeUrl: page.url(),
              afterUrl: page.url(),
              reason: "Element was not present after restoring route state.",
            });
            continue;
          }

          const label = labelFor(item);
          const currentOrigin = new URL(page.url()).origin;
          const skipReason = dangerousSkipReason(item, currentOrigin);

          if (skipReason) {
            clicks.push({
              route,
              viewport: viewport.name,
              index,
              selectorHint: item.selectorHint,
              label,
              status: "skipped_safe_guard",
              beforeUrl: page.url(),
              afterUrl: page.url(),
              reason: skipReason,
            });
            continue;
          }

          if (item.disabled) {
            clicks.push({
              route,
              viewport: viewport.name,
              index,
              selectorHint: item.selectorHint,
              label,
              status: "skipped_disabled",
              beforeUrl: page.url(),
              afterUrl: page.url(),
              reason: "Element is disabled.",
            });
            continue;
          }

          const selector = `[data-visual-audit-id="${item.auditId}"]`;
          const locator = page.locator(selector).first();
          const before = await interactionState(page);

          try {
            await locator.scrollIntoViewIfNeeded({ timeout: 1000 }).catch(() => undefined);
            await locator.click({ trial: true, timeout: 1500 });
            await locator.click({ timeout: 2000 });
            await page.waitForLoadState("domcontentloaded", { timeout: 2000 }).catch(
              () => undefined,
            );
            await page.waitForTimeout(100);

            const after = await interactionState(page);
            const status = classifyClick(before, after, item);
            const targetPath = pathFromHref(item.href, before.href);

            const clickResult: ClickResult = {
              route,
              viewport: viewport.name,
              index,
              selectorHint: item.selectorHint,
              label,
              href: item.href,
              targetPath,
              status,
              beforeUrl: before.href,
              afterUrl: after.href,
            };

            if (statusIsFailure(status)) {
              const failurePath = join(
                "failures",
                `${baseName}-click-${index}-${safeName(label)}.png`,
              );
              await page.screenshot({
                path: join(OUT_DIR, failurePath),
                fullPage: true,
              });
              clickResult.screenshot = failurePath;

              findings.push({
                severity: "P2",
                route,
                viewport: viewport.name,
                category: "click_no_observable_response",
                message: `Click produced no observable URL, focus, dialog, menu, expanded, or checked-state change.`,
                selectorHint: item.selectorHint,
                screenshot: failurePath,
              });
            }

            clicks.push(clickResult);
          } catch (error) {
            const failurePath = join(
              "failures",
              `${baseName}-click-${index}-${safeName(label)}.png`,
            );

            await page.screenshot({
              path: join(OUT_DIR, failurePath),
              fullPage: true,
            }).catch(() => undefined);

            clicks.push({
              route,
              viewport: viewport.name,
              index,
              selectorHint: item.selectorHint,
              label,
              href: item.href,
              targetPath: pathFromHref(item.href, before.href),
              status: "failed_click_exception",
              beforeUrl: before.href,
              afterUrl: page.url(),
              error: String(error),
              screenshot: failurePath,
            });

            findings.push({
              severity: "P1",
              route,
              viewport: viewport.name,
              category: "click_exception",
              message: `Click failed or was blocked: ${String(error)}`,
              selectorHint: item.selectorHint,
              screenshot: failurePath,
            });
          }

          await restoreRoute(page, route);
        }
      }
    }

    const uniqueConsoleErrors = new Map<string, { route: string; viewport: string; message: string; count: number }>();
    for (const entry of consoleErrors) {
      const normalized = entry.message.replace(/\s+/g, " ").trim().slice(0, 220);
      const key = `${entry.route}|${entry.viewport}|${normalized}`;
      const existing = uniqueConsoleErrors.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        uniqueConsoleErrors.set(key, {
          route: entry.route,
          viewport: entry.viewport,
          message: normalized,
          count: 1,
        });
      }
    }

    for (const entry of uniqueConsoleErrors.values()) {
      const isAuthOrRateLimit =
        /\b(401|Unauthorized|429|Too Many Requests)\b/i.test(entry.message);

      findings.push({
        severity: isAuthOrRateLimit ? "P2" : "P1",
        route: entry.route,
        viewport: entry.viewport,
        category: isAuthOrRateLimit ? "api_auth_or_rate_limit_console_error" : "console_error",
        message: `${entry.message} repeated ${entry.count} time(s).`,
      });
    }

    const uniquePageErrors = new Map<string, { route: string; viewport: string; message: string; count: number }>();
    for (const entry of pageErrors) {
      const normalized = entry.message.replace(/\s+/g, " ").trim().slice(0, 220);
      const key = `${entry.route}|${entry.viewport}|${normalized}`;
      const existing = uniquePageErrors.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        uniquePageErrors.set(key, {
          route: entry.route,
          viewport: entry.viewport,
          message: normalized,
          count: 1,
        });
      }
    }

    for (const entry of uniquePageErrors.values()) {
      findings.push({
        severity: "P0",
        route: entry.route,
        viewport: entry.viewport,
        category: "page_error",
        message: `${entry.message} repeated ${entry.count} time(s).`,
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      soft: SOFT,
      routes,
      viewports: VIEWPORTS,
      summary: {
        findings: findings.length,
        p0: findings.filter((finding) => finding.severity === "P0").length,
        p1: findings.filter((finding) => finding.severity === "P1").length,
        p2: findings.filter((finding) => finding.severity === "P2").length,
        p3: findings.filter((finding) => finding.severity === "P3").length,
        clicks: clicks.length,
        failedClicks: clicks.filter((click) => statusIsFailure(click.status)).length,
        skippedClicks: clicks.filter((click) =>
          click.status.startsWith("skipped_"),
        ).length,
      },
      findings,
      routeReports,
    };

    writeJson("report.json", report);
    writeJsonl("clicks.jsonl", clicks);
    writeJsonl("console-errors.jsonl", consoleErrors);
    writeJsonl("page-errors.jsonl", pageErrors);

    const reportMarkdown = markdownReport({
      findings,
      clicks,
      routes,
      viewports: VIEWPORTS,
      routeReports,
    });

    const reportPath = join(OUT_DIR, "report.md");
    writeFileSync(reportPath, reportMarkdown);

    await testInfo.attach("visual-functional-audit-report", {
      path: reportPath,
      contentType: "text/markdown",
    });

    const blockingFindings = findings.filter(
      (finding) => finding.severity === "P0" || finding.severity === "P1",
    );

    if (!SOFT) {
      expect(blockingFindings, "P0/P1 visual functional findings").toEqual([]);
    }
  });
});
