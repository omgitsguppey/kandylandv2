import { expect, test } from "@playwright/test";

import { openAuditSurface } from "./helpers";
import { RUNTIME_TARGETS } from "./ui-surface-targets";

test.describe("UI continuity runtime audits", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  for (const target of RUNTIME_TARGETS) {
    test(`${target.path} mounts required shell without runtime warnings`, async ({ page }) => {
      await openAuditSurface(page, target.path, target.ready_selector);
      await expect(page.locator(target.hydration_signal).first()).toBeVisible({ timeout: 15000 });
      for (const anchor of target.expected_anchors) {
        await expect(page.getByText(anchor, { exact: false }).first()).toBeVisible({ timeout: 15000 });
      }
      await expect(page.locator("[data-ui-continuity-error='true']")).toHaveCount(0);
      await expect(page.getByText(/internal error/i)).toHaveCount(0);
    });
  }

  test("homepage sections remain visible through scroll and hydration", async ({ page }) => {
    await openAuditSurface(page, "/", "main");

    const hero = page.locator("[data-home-section='hero']").first();
    const creatorSpotlight = page.locator("[data-home-section='creator-spotlight']").first();
    const howItWorks = page.locator("[data-home-section='how-it-works']").first();

    await expect(hero).toBeVisible({ timeout: 15000 });

    await creatorSpotlight.scrollIntoViewIfNeeded();
    await expect(creatorSpotlight).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(500);
    await howItWorks.scrollIntoViewIfNeeded();
    await expect(howItWorks).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(500);
    await hero.scrollIntoViewIfNeeded();
    await expect(hero).toBeVisible({ timeout: 15000 });

    await expect(hero).toHaveCount(1);
    await expect(creatorSpotlight).toHaveCount(1);
    await expect(howItWorks).toHaveCount(1);
  });
});
