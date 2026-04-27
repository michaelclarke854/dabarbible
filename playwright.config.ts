import { defineConfig, devices } from "@playwright/test";

/**
 * Visual regression for DABAR.
 *   bun run test:visual          → compare against committed baselines
 *   bun run test:visual:update   → refresh baselines (after intentional UI changes)
 *   bun run test:visual:report   → open the HTML report after a failed run
 *
 * Tolerance is layout-focused (~1% pixel ratio) — catches spacing/layout
 * regressions while absorbing font-hinting noise.
 */
export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./tests/visual/test-results",
  snapshotDir: "./tests/visual/baselines",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "tests/visual/test-results", open: "never" }]],

  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },

  use: {
    baseURL: "http://localhost:5173",
    // Freeze CSS animations at their final state for stable snapshots.
    // JS-driven Framer Motion is handled with explicit waitForTimeout in the spec.
    reducedMotion: "reduce",
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "off",
    launchOptions: { args: ["--disable-blink-features=AutomationControlled"] },
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    },
  },

  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "mobile-375",
      use: {
        ...devices["iPhone SE"],
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "mobile-320",
      use: {
        viewport: { width: 320, height: 568 },
        userAgent: devices["iPhone SE"].userAgent,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});