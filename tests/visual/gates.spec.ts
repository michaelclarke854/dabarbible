import { test, expect } from "@playwright/test";

/**
 * DABAR paywall + gate E2E suite.
 *
 * Verifies every relevant gate state across the four user contexts:
 *   - guest        → landing → ask → soft gate (Q3) → blur gate (Q4+)
 *   - free         → tab nav locks for scripture/history/journal
 *   - trial-expired → full-screen paywall
 *   - subscribed   → all tabs unlocked
 *
 * Each fixture is a deterministic dev-only route in src/App.tsx, so the
 * spec asserts the real component shapes the production app renders
 * without touching Supabase auth, the database, or localStorage state.
 */

// ─── Guest: landing hero ─────────────────────────────────────────────────────

test.describe("Guest — landing hero", () => {
  test("renders the LandingHero with primary CTA", async ({ page }) => {
    await page.goto("/__visual/gate/landing");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1400); // stagger settle

    await expect(page.locator('[data-fixture="guest-landing-hero"]')).toBeVisible();
    // The CTA text is stable per the component contract.
    await expect(page.getByRole("button", { name: /ask your first question/i })).toBeVisible();
  });
});

// ─── Guest: empty AskScreen (post-landing, pre-first-question) ───────────────

test.describe("Guest — open ask screen", () => {
  test("renders an unlocked, focusable question input", async ({ page }) => {
    await page.goto("/__visual/gate/ask-open");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    const input = page.locator("[data-ask-input]");
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });
});

// ─── Guest: soft gate (3rd question) ─────────────────────────────────────────

test.describe("Guest — soft gate at GUEST_LIMIT", () => {
  test("renders the soft gate card with both signup + signin CTAs", async ({ page }) => {
    await page.goto("/__visual/gate/soft");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.locator('[data-gate="soft"]')).toBeVisible();
    await expect(page.locator("[data-gate-card]")).toBeVisible();
    await expect(page.locator('[data-gate-cta="signup"]')).toBeVisible();
    await expect(page.locator('[data-gate-cta="signin"]')).toBeVisible();

    // The blurred response region must be present (not removed from DOM).
    await expect(page.locator("[data-gate-blur-region]")).toBeVisible();
  });

  test("blurred region has the soft-gate-blur class applied", async ({ page }) => {
    await page.goto("/__visual/gate/soft");
    await page.waitForLoadState("networkidle");

    const filter = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>("[data-gate-blur-region]");
      return el ? window.getComputedStyle(el).filter : null;
    });
    // soft-gate-blur applies `filter: blur(5px)` per index.css.
    expect(filter).toContain("blur");
  });
});

// ─── Guest: blur gate (4th+ question) ────────────────────────────────────────

test.describe("Guest — blur gate beyond GUEST_LIMIT", () => {
  test("renders the blur gate variant with the same CTA contract", async ({ page }) => {
    await page.goto("/__visual/gate/blur");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(600);

    await expect(page.locator('[data-gate="blur"]')).toBeVisible();
    await expect(page.locator('[data-gate-cta="signup"]')).toBeVisible();
    await expect(page.locator('[data-gate-cta="signin"]')).toBeVisible();
  });
});

// ─── Trial expired: full-screen paywall ──────────────────────────────────────

test.describe("Trial expired — paywall", () => {
  test("renders the TrialPaywall with question count and exit options", async ({ page }) => {
    await page.goto("/__visual/gate/trial-expired");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    await expect(page.locator('[data-fixture="trial-expired-paywall"]')).toBeVisible();
    await expect(page.getByText(/your trial has ended/i)).toBeVisible();
    await expect(page.getByText(/47/)).toBeVisible(); // questionCount={47}
  });
});

// ─── Free user — locked tab navigation ───────────────────────────────────────

test.describe("Free user — locked tabs", () => {
  test("scripture, history and journal show as locked", async ({ page }) => {
    await page.goto("/__visual/gate/free-locked");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('[data-tab="ask"]')).toHaveAttribute("data-locked", "false");
    await expect(page.locator('[data-tab="scripture"]')).toHaveAttribute("data-locked", "true");
    await expect(page.locator('[data-tab="history"]')).toHaveAttribute("data-locked", "true");
    await expect(page.locator('[data-tab="journal"]')).toHaveAttribute("data-locked", "true");
  });
});

// ─── Subscribed user — all tabs unlocked ─────────────────────────────────────

test.describe("Subscribed user — unlocked tabs", () => {
  test("every tab reports unlocked", async ({ page }) => {
    await page.goto("/__visual/gate/subscribed");
    await page.waitForLoadState("networkidle");

    for (const tab of ["ask", "scripture", "history", "journal"]) {
      await expect(page.locator(`[data-tab="${tab}"]`)).toHaveAttribute(
        "data-locked",
        "false",
      );
    }
  });
});

// ─── Public route smoke: pricing + doctrine pages reachable ──────────────────
// Useful to confirm none of the gate copy accidentally blocks public routes.

test.describe("Public routes — never gated", () => {
  test("pricing page is reachable without auth", async ({ page }) => {
    const res = await page.goto("/pricing");
    expect(res?.status()).toBeLessThan(400);
    await page.waitForLoadState("networkidle");
    // Any of the tier names — copy-stable across the sprint.
    await expect(page.getByText(/personal/i).first()).toBeVisible();
  });

  test("doctrine page is reachable without auth", async ({ page }) => {
    const res = await page.goto("/doctrine");
    expect(res?.status()).toBeLessThan(400);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/what we believe/i)).toBeVisible();
  });
});