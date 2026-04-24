import { expect, test } from "@playwright/test";

import { openAuditSurface } from "./helpers";
import { VISUAL_TARGETS } from "./ui-surface-targets";

function visualMasks(page: import("@playwright/test").Page, path: string) {
  if (path === "/") {
    return [page.getByTestId("hero-activity-ticker-mask")];
  }

  if (path === "/creators/apply") {
    return [page.locator("main section:first-of-type a, main section:first-of-type button")];
  }

  return [];
}

test.describe("UI continuity visual audits", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  for (const target of VISUAL_TARGETS) {
    test(`${target.path} stays visually stable`, async ({ page }) => {
      await openAuditSurface(page, target.path, target.ready_selector);
      for (const anchor of target.expected_anchors) {
        await expect(page.getByText(anchor, { exact: false }).first()).toBeVisible({ timeout: 15000 });
      }
      if (target.path === "/") {
        await page.addStyleTag({ content: "nav { visibility: hidden !important; }" });
      }
      await expect(page.locator(target.screenshot_selector).first()).toHaveScreenshot(`${target.stable_id}.png`, {
        mask: visualMasks(page, target.path),
        maxDiffPixels: target.path === "/" ? 60 : 500,
        timeout: 15000,
      });
    });
  }
});
