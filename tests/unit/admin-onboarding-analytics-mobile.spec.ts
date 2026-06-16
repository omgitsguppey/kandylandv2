import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx"),
  "utf8",
);

describe("Admin onboarding analytics mobile consolidation", () => {
  it("renders Onboarding Performance as one compact mobile view mode at a time", () => {
    expect(source).toContain("onboardingPerformanceViewMode");
    expect(source).toContain("setOnboardingPerformanceViewMode");
    expect(source).toContain("data-admin-analytics-mobile-view-mode={onboardingPerformanceViewMode}");
    expect(source).toContain('data-onboarding-performance-chart="compact"');
    expect(source).toContain('data-onboarding-performance-table="compact"');
    expect(source).toContain("data-onboarding-performance-truth-state={model.truthState}");
    expect(source).toContain("data-onboarding-performance-discrepancy={String(model.discrepancyDetected)}");
    expect(source).toContain("data-onboarding-performance-timing-missing={String(model.timingMissing)}");
    expect(source).toContain('onboardingPerformanceViewMode === "chart"');
    expect(source).toContain('onboardingPerformanceViewMode === "table"');
    expect(source).toContain('onboardingPerformanceViewMode === "cards"');
  });

  it("derives the badge label from the actual onboarding truth state", () => {
    expect(source).toContain("function getOnboardingVelocityBadgeLabel");
    expect(source).toContain('case "cached":');
    expect(source).toContain('return "SNAP"');
    expect(source).toContain('case "unavailable":');
    expect(source).toContain('return "UNAVAILABLE"');
    expect(source).not.toContain(': "LIVE";');
  });
});
