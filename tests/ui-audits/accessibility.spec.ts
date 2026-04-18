import { test } from "@playwright/test";

import { expectAxeViolationsToMatchBaseline, expectNoAxeViolations, openAuditSurface } from "./helpers";
import { KNOWN_ACCESSIBILITY_BASELINE } from "./known-accessibility-baseline";
import { ACCESSIBILITY_TARGETS } from "./ui-surface-targets";

const BASELINE_KEYS: Record<string, keyof typeof KNOWN_ACCESSIBILITY_BASELINE> = {
  "/creators/apply": "creatorApply",
  "/creators/waitlist": "creatorWaitlistGuest",
  "/": "home",
  "/privacy": "privacy",
};

test.describe("UI continuity accessibility audits", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  for (const target of ACCESSIBILITY_TARGETS) {
    test(`${target.path} satisfies indexed accessibility audit coverage`, async ({ page }, testInfo) => {
      test.setTimeout(120000);
      await openAuditSurface(page, target.path, target.ready_selector);
      const baselineKey = BASELINE_KEYS[target.path];
      if (baselineKey) {
        await expectAxeViolationsToMatchBaseline(
          page,
          KNOWN_ACCESSIBILITY_BASELINE[baselineKey],
          target.hydration_signal,
          testInfo.project.name,
        );
        return;
      }

      await expectNoAxeViolations(page, target.hydration_signal);
    });
  }
});
