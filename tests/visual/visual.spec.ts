import { test, expect } from "@playwright/test";

/**
 * DABAR visual regression suite.
 *
 * Uses dev-only fixture routes mounted in src/App.tsx under
 * import.meta.env.DEV so they are tree-shaken from production builds.
 * Baselines live in tests/visual/baselines/<spec>-<test>-<project>.png.
 */

// ─── Ask screen ──────────────────────────────────────────────────────────────

test.describe("Ask screen", () => {
  test("renders landing hero (unauthenticated, first visit)", async ({ page }) => {
    await page.goto("/__visual/ask");
    await page.waitForLoadState("networkidle");
    // Framer Motion stagger settle: longest delay (~0.55s) + duration (~0.7s).
    await page.waitForTimeout(1400);
    await expect(page).toHaveScreenshot("ask-screen.png", { fullPage: true });
  });
});

// ─── Response screen ─────────────────────────────────────────────────────────

test.describe("Response screen", () => {
  test("renders all four wisdom blocks with glass styling", async ({ page }) => {
    await page.goto("/__visual/response");
    await page.waitForLoadState("networkidle");
    // 4 blocks × 0.12s delay + 0.5s duration ≈ 1s — round up with margin.
    await page.waitForTimeout(1200);
    await expect(page).toHaveScreenshot("response-screen.png", { fullPage: true });
  });

  test("response blocks render in correct order", async ({ page }) => {
    await page.goto("/__visual/response");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);

    // VisualFixtures.tsx renders sr-only data-block anchors for stable assertions.
    await expect(page.locator('[data-block="mirror"]')).toHaveCount(1);
    await expect(page.locator('[data-block="scripture"]')).toHaveCount(1);
    await expect(page.locator('[data-block="wisdom-bridge"]')).toHaveCount(1);
    await expect(page.locator('[data-block="threshold"]')).toHaveCount(1);
  });
});

// ─── Shared draft page ───────────────────────────────────────────────────────
// Uses the seeded QA token from prior session.

test.describe("Shared draft page", () => {
  test("renders — layout, wrapping, citations", async ({ page }) => {
    await page.goto("/share/draft/qa-preview-token-2026");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);
    await expect(page).toHaveScreenshot("shared-draft.png", { fullPage: true });
  });

  test("KJV citations do not overflow the viewport", async ({ page }, testInfo) => {
    await page.goto("/share/draft/qa-preview-token-2026");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    const viewportWidth = page.viewportSize()?.width ?? 320;

    // Match the scripture chip elements rendered by SharedDraftView.tsx.
    const citations = page.locator('[class*="bg-scripture-card"] span');
    const count = await citations.count();

    for (let i = 0; i < count; i++) {
      const box = await citations.nth(i).boundingBox();
      if (box) {
        // 1px tolerance for sub-pixel rounding.
        expect(
          box.x + box.width,
          `citation ${i} overflows viewport`,
        ).toBeLessThanOrEqual(viewportWidth + 1);
      }
    }

    testInfo.annotations.push({
      type: "citations-checked",
      description: `${count} citation chip(s) inspected`,
    });
  });
});

// ─── Critical CSS smoke tests ────────────────────────────────────────────────

test.describe("Design system smoke", () => {
  test("parchment background is applied (not white)", async ({ page }) => {
    await page.goto("/__visual/ask");
    await page.waitForLoadState("networkidle");

    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Parchment is approximately rgb(245, 240, 232). Anything pure white or
    // transparent means the design tokens didn't apply.
    expect(bgColor).not.toBe("rgb(255, 255, 255)");
    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("Cinzel font is loaded on headings", async ({ page }) => {
    await page.goto("/__visual/ask");
    await page.waitForLoadState("networkidle");
    // Give the webfont a beat to swap in.
    await page.waitForTimeout(400);

    const fontFamily = await page.evaluate(() => {
      const heading = document.querySelector(
        'h1, [class*="font-serif"], [class*="cinzel"]',
      );
      return heading ? window.getComputedStyle(heading).fontFamily : null;
    });

    expect(fontFamily).toBeTruthy();
    expect(fontFamily).toContain("Cinzel");
  });
});