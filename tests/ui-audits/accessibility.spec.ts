import { test } from "@playwright/test";

import { expectAxeViolationsToMatchBaseline, openAuditSurface } from "./helpers";
import { KNOWN_ACCESSIBILITY_BASELINE } from "./known-accessibility-baseline";

const AUDIT_TARGETS = [
  {
    baselineKey: "creatorApply",
    name: "creator apply hero",
    path: "/creators/apply",
    readySelector: "main",
    axeSelector: "main",
  },
  {
    baselineKey: "creatorWaitlistGuest",
    name: "creator waiting guest state",
    path: "/creators/waitlist",
    readySelector: "main",
    axeSelector: "main",
  },
  {
    baselineKey: "home",
    name: "home page",
    path: "/",
    readySelector: "main",
    axeSelector: "main",
  },
  {
    baselineKey: "privacy",
    name: "privacy page",
    path: "/privacy",
    readySelector: "main",
    axeSelector: "main",
  },
] as const;

test.describe("UI continuity accessibility audits", () => {
  test.skip(({ browserName }) => browserName !== "chromium");

  for (const target of AUDIT_TARGETS) {
    test(`${target.name} matches the known accessibility baseline`, async ({ page }, testInfo) => {
      await openAuditSurface(page, target.path, target.readySelector);
      await expectAxeViolationsToMatchBaseline(
        page,
        KNOWN_ACCESSIBILITY_BASELINE[target.baselineKey],
        target.axeSelector,
        testInfo.project.name,
      );
    });
  }
});
