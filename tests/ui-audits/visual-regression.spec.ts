import { expect, test } from "@playwright/test";

import { openAuditSurface } from "./helpers";

test.describe("UI continuity visual audits", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  test("creator apply hero stays stable", async ({ page }) => {
    await openAuditSurface(page, "/creators/apply", "main");
    await expect(page.getByRole("heading", { name: /Apply for creator access/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("main section").first()).toHaveScreenshot("creator-apply-hero.png", {
      maxDiffPixels: 500,
    });
  });

  test("creator waiting guest hero stays stable", async ({ page }) => {
    await openAuditSurface(page, "/creators/waitlist", "main");
    await expect(page.getByRole("heading", { name: /Start your creator application/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("main section").first()).toHaveScreenshot("creator-waitlist-guest-hero.png", {
      maxDiffPixels: 400,
    });
  });

  test("home hero stays stable", async ({ page }) => {
    await openAuditSurface(page, "/", "main");
    const hero = page.locator("main section").first().locator("div.flex.min-w-0.max-w-2xl.w-full.flex-col.items-center").first();
    const activityTicker = hero
      .getByText(/Live Now:\s+\d+\s+KandyDrops are ready to unwrap!/i)
      .locator("xpath=ancestor::div[contains(@class, 'inline-flex')][1]");
    await expect(hero).toHaveScreenshot("home-hero.png", {
      mask: [
        hero.locator(".animate-ping"),
        activityTicker,
      ],
      maxDiffPixels: 40,
      timeout: 15000,
    });
  });

  test("privacy hero stays stable", async ({ page }) => {
    await openAuditSurface(page, "/privacy", "main");
    const introCard = page
      .getByRole("heading", { name: "How KandyDrops handles your data" })
      .locator("xpath=ancestor::div[contains(@class, 'rounded-[2rem]')][1]");
    await expect(introCard).toHaveScreenshot("privacy-page.png", { timeout: 15000 });
  });
});
