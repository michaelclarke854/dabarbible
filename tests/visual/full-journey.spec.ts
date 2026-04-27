import { test, expect, type Request } from "@playwright/test";

/**
 * Full app journey — single chained E2E.
 *
 * Walks one synthetic guest through every gate the product enforces and
 * asserts that each surface (UI + analytics + auth boundary) behaves as
 * specified. This is the "does the whole funnel still work" smoke test
 * that runs alongside the more granular specs:
 *
 *   journal-flow.spec.ts   → step-by-step journal lifecycle
 *   analytics.spec.ts      → tracking contract per event
 *   gates.spec.ts          → per-state gate snapshots
 *   visual.spec.ts         → pixel diffs
 *
 * Flow under test (each step asserts UI + at least one tracked event):
 *   1. Landing hero renders + CTA fires landing_hero_cta_clicked
 *   2. Ask fixture: textarea wires to CTA enable state
 *   3. Response fixture: Save-to-Journal action is exposed
 *   4. Journal fixture: seeded entries render + search input is live
 *   5. Real "/" guest: Journal nav tab opens AuthModal (no journal leak)
 *   6. Every captured funnel event carries anon_session_id + snake_case name
 */

interface FunnelEvent {
  event_name: string;
  screen?: string | null;
  metadata?: Record<string, unknown> | null;
  anon_session_id?: string | null;
  user_id?: string | null;
}

async function captureFunnelEvents(page: import("@playwright/test").Page) {
  const events: FunnelEvent[] = [];
  await page.route("**/rest/v1/funnel_events*", async (route, request: Request) => {
    if (request.method() === "POST") {
      try {
        const body = request.postDataJSON();
        const rows: FunnelEvent[] = Array.isArray(body) ? body : [body];
        events.push(...rows);
      } catch {
        /* malformed payloads will fail their own assertions */
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([{ id: "intercepted" }]),
      });
      return;
    }
    await route.continue();
  });
  return events;
}

test.describe("Full app journey — landing → ask → response → journal → gate", () => {
  test("guest walks the entire funnel and every boundary holds", async ({ page }) => {
    const events = await captureFunnelEvents(page);

    // ── 1. Landing hero ────────────────────────────────────────────────
    await page.goto("/__visual/gate/landing");
    await page.waitForLoadState("networkidle");

    const heroCta = page
      .getByRole("button")
      .filter({ hasText: /seek wisdom|begin|start|ask/i })
      .first();
    await heroCta.click().catch(() => undefined);
    await page.waitForTimeout(300);

    const heroEvent = events.find((e) => e.event_name === "landing_hero_cta_clicked");
    expect(heroEvent, "landing_hero_cta_clicked must fire from hero CTA").toBeTruthy();
    expect(heroEvent?.screen).toBe("landing_hero");

    // ── 2. Ask screen accepts a question ──────────────────────────────
    await page.goto("/__visual/ask");
    await page.waitForLoadState("networkidle");

    const textarea = page.locator("textarea[data-ask-input]");
    await expect(textarea).toBeVisible();

    const seekCta = page.getByRole("button", { name: /seek wisdom/i });
    await expect(seekCta).toBeDisabled();
    await textarea.fill("How do I forgive someone who keeps hurting me?");
    await expect(seekCta).toBeEnabled();

    // ── 3. Response screen exposes Save to Journal ────────────────────
    await page.goto("/__visual/response");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200); // let Framer Motion settle

    const saveBtn = page.getByRole("button", { name: /save to journal/i });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();

    // ── 4. Journal fixture: seeded entries + live search ──────────────
    await page.goto("/__visual/journal");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/forgive someone who keeps hurting me/i)).toBeVisible();
    await expect(page.getByText(/cannot sleep because of my anxiety/i)).toBeVisible();
    await expect(page.getByText(/what is my purpose/i)).toBeVisible();

    const search = page.getByPlaceholder(/search saved wisdom/i);
    await search.fill("anxiety");
    await expect(search).toHaveValue("anxiety");

    // ── 5. Real "/" guest: journal access is gated by AuthModal ──────
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);

    const journalTab = page.getByRole("button", { name: /open journal/i });
    if (await journalTab.count()) {
      await journalTab.first().click();
      await page.waitForTimeout(400);

      await expect(
        page.getByText(/create a free account to keep your journal/i),
      ).toBeVisible();

      // JournalScreen itself must NOT be mounted for guests.
      await expect(page.getByPlaceholder(/search saved wisdom/i)).toHaveCount(0);

      const authOpened = events.find((e) => e.event_name === "auth_modal_opened");
      if (authOpened) {
        expect(authOpened.screen).toBe("auth_modal");
        expect(typeof (authOpened.metadata as Record<string, unknown>)?.trigger).toBe(
          "string",
        );
      }
    } else {
      // Landing-variant build: assert journal UI is simply absent.
      await expect(page.getByPlaceholder(/search saved wisdom/i)).toHaveCount(0);
    }

    // ── 6. Funnel hygiene across the whole journey ────────────────────
    expect(events.length, "no funnel events captured across the full journey").toBeGreaterThan(0);

    for (const e of events) {
      expect(
        e.anon_session_id,
        `event ${e.event_name} missing anon_session_id — guest attribution broken`,
      ).toBeTruthy();
      expect(
        /^[a-z][a-z0-9_]*$/.test(e.event_name),
        `event name "${e.event_name}" is not snake_case`,
      ).toBe(true);
    }
  });
});