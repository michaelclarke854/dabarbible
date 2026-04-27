import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/visual",
  outputDir: "./tests/visual/test-results",
  snapshotDir: "./tests/visual/baselines",
  webServer: {
    command: "bun run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  use: {
    baseURL: "http://localhost:8080",
    reducedMotion: "reduce",
    colorScheme: "light",
    screenshot: "only-on-failure",
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.2 },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      testIgnore: "**/analytics.spec.ts",
    },
    {
      name: "mobile-375",
      use: { ...devices["iPhone SE"], viewport: { width: 375, height: 812 } },
      testIgnore: "**/analytics.spec.ts",
    },
    {
      name: "mobile-320",
      use: { viewport: { width: 320, height: 568 }, userAgent: devices["iPhone SE"].userAgent, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
      testIgnore: "**/analytics.spec.ts",
    },
    {
      name: "contract-tests",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
      testMatch: "**/analytics.spec.ts",
    },
  ],
});
