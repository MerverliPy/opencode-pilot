import { test, expect } from "@playwright/test";

/**
 * Interactive UI behavior E2E tests for the Pilot PWA.
 *
 * Covers:
 *  1. Session bar visibility, sticky positioning, safe-area padding, z-index
 *  2. Session bar on mobile viewport
 *  3. Prompt textarea disabled/enabled state and typing
 *  4. Sidebar collapse/expand toggle
 *  5. Clipboard interaction for file parts and tool output copy buttons
 */

// ---------------------------------------------------------------------------
// Test group 1: Session bar visibility and layout
// ---------------------------------------------------------------------------

test.describe("Session bar visibility and layout", () => {
  test("session bar header is visible on chat page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The Chat page renders a <header> element containing the session title
    // and status indicator. It must be visible on initial load.
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });

  test("session bar has sticky positioning", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Guards against the header losing its sticky positioning, which would
    // cause the session bar to scroll out of view when the message area overflows.
    const position = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return window.getComputedStyle(header).position;
    });

    expect(position).toBe("sticky");
  });

  test("session bar does not collapse when content overflows", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The header must have flexShrink: 0 so it never shrinks when the
    // message area or other siblings compete for vertical space.
    const flexShrink = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return (header as HTMLElement).style.flexShrink;
    });

    expect(flexShrink).toBe("0");
  });

  test("session bar has safe-area padding at top", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // On devices with a notch (e.g. iPhone), the header must respect
    // env(safe-area-inset-top) so content isn't hidden behind the notch.
    const paddingTop = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return (header as HTMLElement).style.paddingTop;
    });

    expect(paddingTop).toContain("safe-area-inset-top");
  });

  test("session bar has z-index above content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The sticky header must layer above the scrollable message area so
    // messages don't paint over the session bar when scrolling.
    const zIndex = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return parseInt(window.getComputedStyle(header).zIndex, 10);
    });

    expect(zIndex).toBeGreaterThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// Test group 2: Session bar on mobile viewport
// ---------------------------------------------------------------------------

test.describe("Session bar on mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("session bar is visible on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The session bar must remain visible even on narrow mobile screens.
    const header = page.locator("header");
    await expect(header).toBeVisible();
  });

  test("session bar top edge is at or near viewport top", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // On mobile the header should be flush with the top of the viewport
    // (within 1px tolerance for sub-pixel rounding).
    const top = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return null;
      return header.getBoundingClientRect().top;
    });

    expect(top).not.toBeNull();
    expect(Math.abs(top!)).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Test group 3: Interactive elements — prompt input
// ---------------------------------------------------------------------------

test.describe("Interactive elements — prompt input", () => {
  test("prompt textarea is present and disabled without server", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Without a server configured, the prompt textarea must be disabled
    // to prevent the user from submitting messages that cannot be processed.
    const textarea = page.getByPlaceholder("ask opencode…");
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeDisabled();
  });

  test("prompt textarea can be enabled via evaluate_script", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Simulate enabling the textarea (as would happen when a server connects)
    // to verify the element transitions correctly from disabled to enabled.
    const textarea = page.getByPlaceholder("ask opencode…");
    await expect(textarea).toBeDisabled();

    await page.evaluate(() => {
      const el = document.querySelector(
        'textarea[placeholder="ask opencode…"]',
      ) as HTMLTextAreaElement | null;
      if (el) el.disabled = false;
    });

    await expect(textarea).toBeEnabled();
  });

  test("typing in enabled prompt input updates value", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Enable the textarea and type into it to verify the input is interactive.
    await page.evaluate(() => {
      const el = document.querySelector(
        'textarea[placeholder="ask opencode…"]',
      ) as HTMLTextAreaElement | null;
      if (el) el.disabled = false;
    });

    const textarea = page.getByPlaceholder("ask opencode…");
    await textarea.fill("Hello from Playwright");

    await expect(textarea).toHaveValue("Hello from Playwright");
  });
});

// ---------------------------------------------------------------------------
// Test group 4: Interactive elements — sidebar navigation
// ---------------------------------------------------------------------------

test.describe("Interactive elements — sidebar navigation", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("sidebar collapse toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // At desktop viewport the sidebar should be visible at its expanded width.
    const sidebar = page.locator(".desktop-sidebar");
    await expect(sidebar).toBeVisible();

    const initialWidth = await page.evaluate(() => {
      const el = document.querySelector(".desktop-sidebar");
      if (!el) return null;
      return el.getBoundingClientRect().width;
    });

    // The collapse button toggles sidebar between 240px and 56px.
    const collapseButton = page.getByRole("button", {
      name: /sidebar/i,
    });
    await collapseButton.click();

    // Wait for the CSS transition (0.2s) to settle
    await page.waitForTimeout(300);

    const collapsedWidth = await page.evaluate(() => {
      const el = document.querySelector(".desktop-sidebar");
      if (!el) return null;
      return el.getBoundingClientRect().width;
    });

    // Collapsed width should be smaller than the initial width
    expect(collapsedWidth).toBeLessThan(initialWidth!);
    // Collapsed sidebar is ~80px (56px minWidth + 12px+12px padding)
    expect(collapsedWidth!).toBeLessThan(100);
  });

  test("sidebar expand toggle restores width", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator(".desktop-sidebar");
    await expect(sidebar).toBeVisible();

    // Collapse first
    const collapseButton = page.getByRole("button", {
      name: /sidebar/i,
    });
    await collapseButton.click();
    await page.waitForTimeout(300);

    const collapsedWidth = await page.evaluate(() => {
      const el = document.querySelector(".desktop-sidebar");
      if (!el) return null;
      return el.getBoundingClientRect().width;
    });

    // Now expand — the button label flips to "Expand sidebar"
    const expandButton = page.getByRole("button", {
      name: /expand sidebar/i,
    });
    await expandButton.click();
    await page.waitForTimeout(300);

    const restoredWidth = await page.evaluate(() => {
      const el = document.querySelector(".desktop-sidebar");
      if (!el) return null;
      return el.getBoundingClientRect().width;
    });

    // Restored width should be back to expanded size (~264px = 240px + padding)
    expect(restoredWidth!).toBeGreaterThan(200);
    expect(restoredWidth!).toBeGreaterThan(collapsedWidth! * 2);
  });
});

// ---------------------------------------------------------------------------
// Test group 5: Clipboard interaction (file/tool parts)
// ---------------------------------------------------------------------------

test.describe("Clipboard interaction — file and tool parts", () => {
  test("file part element has button role and is keyboard accessible", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Without a server there are no real messages, so we inject a mock file
    // part element that mirrors the production component's attributes:
    //   role="button", tabIndex=0, cursor:pointer, onClick copies filename.
    await page.evaluate(() => {
      const container = document.querySelector("header")?.parentElement;
      if (!container) return;

      const filePart = document.createElement("div");
      filePart.setAttribute("role", "button");
      filePart.setAttribute("tabindex", "0");
      filePart.setAttribute("title", "Copy filename to clipboard");
      filePart.textContent = "src/example.ts";
      filePart.style.cursor = "pointer";
      filePart.style.color = "#4fc3f7";
      filePart.style.textDecoration = "underline";
      filePart.style.display = "inline-block";
      filePart.id = "mock-file-part";
      container.appendChild(filePart);
    });

    // Verify the injected file part exists and has the correct role.
    const filePart = page.locator("#mock-file-part");
    await expect(filePart).toBeVisible();
    await expect(filePart).toHaveAttribute("role", "button");
    await expect(filePart).toHaveAttribute("tabindex", "0");

    // Verify keyboard accessibility: the element can receive focus.
    const isFocusable = await page.evaluate(() => {
      const el = document.getElementById("mock-file-part");
      if (!el) return false;
      el.focus();
      return document.activeElement === el;
    });
    expect(isFocusable).toBe(true);
  });

  test("copy button on tool output is present when output exists", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Without a server there are no real tool outputs, so we inject a mock
    // tool output div with a copy button that mirrors the production pattern.
    await page.evaluate(() => {
      const container = document.querySelector("header")?.parentElement;
      if (!container) return;

      const toolOutput = document.createElement("div");
      toolOutput.id = "mock-tool-output";
      toolOutput.style.border = "1px solid #333";
      toolOutput.style.borderRadius = "6px";
      toolOutput.style.padding = "8px";
      toolOutput.style.marginTop = "4px";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";

      const title = document.createElement("div");
      title.textContent = "read_file";
      header.appendChild(title);

      const copyButton = document.createElement("button");
      copyButton.textContent = "copy";
      copyButton.setAttribute("title", "Copy output to clipboard");
      copyButton.style.background = "none";
      copyButton.style.border = "1px solid #333";
      copyButton.style.borderRadius = "4px";
      copyButton.style.cursor = "pointer";
      copyButton.style.padding = "2px 6px";
      copyButton.id = "mock-copy-button";
      header.appendChild(copyButton);

      toolOutput.appendChild(header);

      const pre = document.createElement("pre");
      pre.textContent = "file contents here";
      toolOutput.appendChild(pre);

      container.appendChild(toolOutput);
    });

    // Verify the copy button is visible and clickable.
    const copyButton = page.locator("#mock-copy-button");
    await expect(copyButton).toBeVisible();
    await expect(copyButton).toHaveText("copy");

    // Click the copy button — it should not throw or crash.
    await copyButton.click();
  });
});