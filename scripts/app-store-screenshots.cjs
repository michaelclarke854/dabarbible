// App Store Screenshots — DABAR
// Save as: scripts/app-store-screenshots.js
// Run: node scripts/app-store-screenshots.js
// Requires: bun run dev running on localhost:8080

const { chromium } = require('playwright');
const { mkdirSync } = require('fs');
const { execSync } = require('child_process');

const OUT_DIR = 'ios/App/fastlane/screenshots/en-US';

(async () => {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
  });
  await ctx.addInitScript(() => {
    window.CapacitorCustomPlatform = { name: 'ios' };
    window.Capacitor = {
      getPlatform: () => 'ios',
      isNativePlatform: () => true,
    };
  });
  const page = await ctx.newPage();

  // Screen 1 — Landing hero
  await page.goto('http://localhost:8080');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT_DIR}/01_landing_hero.png`, fullPage: false });
  console.log('✓ 01_landing_hero.png');

  // Screen 2 — AskScreen (dismiss LandingHero first)
  const cta = page.getByRole('button').filter({ hasText: /ask|start|begin/i }).first();
  if (await cta.isVisible().catch(() => false)) {
    await cta.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: `${OUT_DIR}/02_ask_screen.png`, fullPage: false });
  console.log('✓ 02_ask_screen.png');

  // Screen 3 — Pricing
  await page.goto('http://localhost:8080/pricing');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT_DIR}/03_pricing.png`, fullPage: false });
  console.log('✓ 03_pricing.png');

  // Screen 4 — Doctrine
  await page.goto('http://localhost:8080/doctrine');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT_DIR}/04_doctrine.png`, fullPage: false });
  console.log('✓ 04_doctrine.png');

  await browser.close();

  // Verify dimensions
  console.log('\nVerifying dimensions:');
  try {
    const result = execSync(`identify ${OUT_DIR}/*.png`).toString();
    console.log(result);
    const lines = result.split('\n').filter(l => l.includes('PNG'));
    const allCorrect = lines.every(l => l.includes('1290x2796'));
    console.log(allCorrect
      ? '✓ All 1290x2796 — App Store ready'
      : '✗ Dimension mismatch — check deviceScaleFactor');
  } catch {
    console.log('Skipping dimension check — brew install imagemagick to enable');
  }

  // Remove old screenshots at wrong path
  try {
    execSync('rm -rf ios/fastlane/screenshots', { stdio: 'ignore' });
    console.log('✓ Removed old ios/fastlane/screenshots/');
  } catch { /* did not exist */ }

  console.log('\nDone:', OUT_DIR);
})();
