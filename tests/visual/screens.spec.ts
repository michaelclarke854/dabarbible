import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

/**
 * Visual regression for Ask + Response screens at 320 / 375 / 414.
 * Baselines live in tests/visual/baselines/. Diffs land in tests/visual/diffs/.
 * Tolerance: ~1% mismatched pixels (layout-focused, not pixel-strict).
 */
const BASELINE_DIR = path.join(__dirname, "baselines");
const DIFF_DIR = path.join(__dirname, "diffs");
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";
const MISMATCH_THRESHOLD = 0.01; // 1%

fs.mkdirSync(BASELINE_DIR, { recursive: true });
fs.mkdirSync(DIFF_DIR, { recursive: true });

const SCREENS = [
  { name: "ask", path: "/__visual/ask" },
  { name: "response", path: "/__visual/response" },
] as const;

const WIDTHS = [320, 375, 414] as const;

for (const screen of SCREENS) {
  for (const width of WIDTHS) {
    test(`${screen.name} @ ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(screen.path, { waitUntil: "networkidle" });
      // Disable animations / caret blink for stable diffs.
      await page.addStyleTag({
        content: `
          *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
            caret-color: transparent !important;
          }
        `,
      });
      await page.waitForTimeout(200);

      const buf = await page.screenshot({ fullPage: true, animations: "disabled" });
      const baselinePath = path.join(BASELINE_DIR, `${screen.name}-${width}.png`);

      if (UPDATE || !fs.existsSync(baselinePath)) {
        fs.writeFileSync(baselinePath, buf);
        test.info().annotations.push({
          type: "baseline",
          description: `Wrote ${baselinePath}`,
        });
        return;
      }

      const actual = PNG.sync.read(buf);
      const expected = PNG.sync.read(fs.readFileSync(baselinePath));

      // Resize check — if dimensions differ, that itself is a regression.
      expect(
        { w: actual.width, h: actual.height },
        "screenshot dimensions changed vs baseline",
      ).toEqual({ w: expected.width, h: expected.height });

      const diff = new PNG({ width: actual.width, height: actual.height });
      const mismatched = pixelmatch(
        expected.data,
        actual.data,
        diff.data,
        actual.width,
        actual.height,
        { threshold: 0.18, includeAA: false },
      );
      const ratio = mismatched / (actual.width * actual.height);

      if (ratio > MISMATCH_THRESHOLD) {
        const diffPath = path.join(DIFF_DIR, `${screen.name}-${width}.diff.png`);
        const actualPath = path.join(DIFF_DIR, `${screen.name}-${width}.actual.png`);
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
        fs.writeFileSync(actualPath, buf);
        throw new Error(
          `Visual regression on ${screen.name} @ ${width}px: ` +
            `${(ratio * 100).toFixed(2)}% mismatch ` +
            `(threshold ${(MISMATCH_THRESHOLD * 100).toFixed(2)}%). ` +
            `Diff: ${diffPath}`,
        );
      }
    });
  }
}