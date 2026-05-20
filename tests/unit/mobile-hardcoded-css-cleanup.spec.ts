import { describe, expect, it } from "vitest";

import {
  buildMobileHardcodedCssCleanupReport,
  validateMobileHardcodedCssCleanupReport,
} from "../../scripts/agent/validate-mobile-hardcoded-css-cleanup";

const baseSources = {
  contract: "getMobileModuleClassNames getSkeletonClassForModule assertNoDesktopStuffing",
  packageJson: "check:mobile-hardcoded-css-cleanup",
};

describe("mobile hardcoded CSS cleanup", () => {
  it("passes when cleaned surfaces use compact markers and shared scale helpers", () => {
    const report = buildMobileHardcodedCssCleanupReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [
        "src/app/dashboard/DashboardClient.tsx",
        "src/app/dashboard/library/LibraryClient.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/app/admin/queue/page.tsx",
      ],
      sources: {
        ...baseSources,
        files: {
          "src/app/dashboard/DashboardClient.tsx": 'data-mobile-density="compact" data-mobile-sprawl-guard="true" getMobileModuleClassNames("user", "overview")',
          "src/app/dashboard/library/LibraryClient.tsx": 'data-mobile-density="compact" data-mobile-sprawl-guard="true" getMobileModuleClassNames("user", "list")',
          "src/components/Creators/CreatorDropManager.tsx": 'data-mobile-density="compact" data-mobile-sprawl-guard="true" getMobileModuleClassNames("creator", "manager")',
          "src/components/Creators/CreatorDashboardSettingsHub.tsx": 'data-mobile-density="compact" data-mobile-sprawl-guard="true" getMobileModuleClassNames("creator", "overview")',
          "src/app/admin/queue/page.tsx": 'data-mobile-density="compact" data-mobile-sprawl-guard="true" getMobileModuleClassNames("admin", "manager")',
        },
      },
      inventoryMatches: ["src/app/dashboard/DashboardClient.tsx:1:p-8"],
    });

    expect(report.summary.mobileScaleContractPresent).toBe(true);
    expect(report.summary.protectedNavChatUntouched).toBe(true);
    expect(report.summary.dataMarkersPresent).toBe(true);
    expect(report.summary.highRiskPatternsRemovedFromTouchedFiles).toBe(true);
    expect(validateMobileHardcodedCssCleanupReport(report)).toEqual([]);
  });

  it("fails when protected navigation or chat files changed", () => {
    const report = buildMobileHardcodedCssCleanupReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/components/Navigation/ProfileSidebar.tsx"],
      sources: { ...baseSources, files: {} },
      inventoryMatches: [],
    });

    expect(report.summary.protectedNavChatUntouched).toBe(false);
    expect(validateMobileHardcodedCssCleanupReport(report)).toContain("protected nav/chat files changed by this pass.");
  });

  it("fails when touched mobile surfaces keep unprefixed desktop-scale class tokens", () => {
    const report = buildMobileHardcodedCssCleanupReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/app/dashboard/library/LibraryClient.tsx"],
      sources: {
        ...baseSources,
        files: {
          "src/app/dashboard/library/LibraryClient.tsx": 'data-mobile-density="compact" data-mobile-sprawl-guard="true" className="rounded-3xl p-8 text-4xl"',
        },
      },
      inventoryMatches: [],
    });

    expect(report.summary.highRiskPatternsRemovedFromTouchedFiles).toBe(false);
    expect(validateMobileHardcodedCssCleanupReport(report)).toContain("high-risk mobile class patterns remain in touched files.");
  });

  it("fails when cleaned surfaces omit mobile density markers", () => {
    const report = buildMobileHardcodedCssCleanupReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/components/Creators/CreatorDashboardSettingsHub.tsx"],
      sources: {
        ...baseSources,
        files: {
          "src/components/Creators/CreatorDashboardSettingsHub.tsx": 'getMobileModuleClassNames("creator", "overview")',
        },
      },
      inventoryMatches: [],
    });

    expect(report.summary.dataMarkersPresent).toBe(false);
    expect(validateMobileHardcodedCssCleanupReport(report)).toContain("cleaned surfaces are missing mobile density/sprawl markers.");
  });

  it("requires explicit next fix order", () => {
    const report = buildMobileHardcodedCssCleanupReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [],
      sources: { ...baseSources, files: {} },
      inventoryMatches: [],
    });
    report.nextFixOrder = [];

    expect(validateMobileHardcodedCssCleanupReport(report)).toContain("nextFixOrder missing.");
  });
});
