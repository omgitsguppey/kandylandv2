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
});
