import { describe, expect, it } from "vitest";

import {
  buildUserLoadingWalletMobileRefinementReport,
  validateUserLoadingWalletMobileRefinementReport,
} from "../../scripts/agent/validate-user-loading-wallet-mobile-refinement";

const baseSources = {
  packageJson: "check:user-loading-wallet-mobile-refinement",
  mobileFinalLockDoc: "mobile-ui-final-lock",
  mobileLoadingDoc: "mobile-loading-hydration-stability",
  mobileScaleContract: "getMobileModuleClassNames getSkeletonClassForModule",
  loadingContract: "createStaleRequestGuard getMobileSkeletonClass",
};

describe("user loading wallet mobile refinement", () => {
  it("passes when wallet UI is compact, stable, and runtime-safe", () => {
    const report = buildUserLoadingWalletMobileRefinementReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      changedFiles: [
        "src/components/PurchaseModal.tsx",
        "src/app/dashboard/DashboardClient.tsx",
        "src/app/dashboard/library/LibraryClient.tsx",
        "src/app/drops/loading.tsx",
        "src/app/drops/[id]/preview/loading.tsx",
      ],
      openPrActions: ["preserved #274: broad governance doc PR outside this scoped wallet/mobile pass."],
      sources: {
        ...baseSources,
        files: {
          "src/components/PurchaseModal.tsx": [
            'data-wallet-mobile-density="compact"',
            'data-wallet-loading-stable="true"',
            'data-wallet-runtime-logic-unchanged="true"',
            "createStaleRequestGuard",
            "AbortController",
            "PayPalButtons",
            "fundingSource={FUNDING.PAYPAL}",
            "data-wallet-paypal-render-mode",
          ].join(" "),
          "src/app/dashboard/DashboardClient.tsx": [
            'data-user-dashboard-loading-staged="true"',
            "DailyCheckIn",
            "CollectionList",
            "RecentActivityFeed",
            "CreatorDiscoveryRail",
            "getMobileSkeletonClass",
          ].join(" "),
          "src/app/dashboard/library/LibraryClient.tsx": [
            'data-user-library-loading-stable="true"',
            "My KandyDrops",
            "getMobileSkeletonClass",
          ].join(" "),
          "src/app/drops/loading.tsx": 'data-mobile-density="compact" data-mobile-sprawl-guard="true"',
          "src/app/drops/[id]/preview/loading.tsx": 'data-mobile-density="compact" data-mobile-sprawl-guard="true"',
        },
      },
    });

    expect(report.summary.walletRuntimeLogicUnchanged).toBe(true);
    expect(report.summary.walletMobileDensityCompact).toBe(true);
    expect(report.summary.userDashboardModulesPreserved).toBe(true);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toEqual([]);
  });

  it("fails when protected nav or chat files changed", () => {
    const report = buildUserLoadingWalletMobileRefinementReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      changedFiles: ["src/components/Chat/ChatExperience.tsx"],
      openPrActions: ["preserved #274: broad governance doc PR outside this scoped wallet/mobile pass."],
      sources: { ...baseSources, files: {} },
    });

    expect(report.summary.protectedNavChatUntouched).toBe(false);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toContain("protected nav/chat files changed.");
  });

  it("fails when wallet compact markers or payment safety markers are missing", () => {
    const report = buildUserLoadingWalletMobileRefinementReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      changedFiles: ["src/components/PurchaseModal.tsx"],
      openPrActions: ["preserved #274: broad governance doc PR outside this scoped wallet/mobile pass."],
      sources: {
        ...baseSources,
        files: {
          "src/components/PurchaseModal.tsx": "rounded-3xl p-6 text-4xl PayPalButtons",
        },
      },
    });

    expect(report.summary.walletMobileDensityCompact).toBe(false);
    expect(report.summary.walletRuntimeLogicUnchanged).toBe(false);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toContain("wallet mobile density marker missing or oversized wallet tokens remain.");
  });

  it("fails when user dashboard core modules disappear", () => {
    const report = buildUserLoadingWalletMobileRefinementReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      changedFiles: ["src/app/dashboard/DashboardClient.tsx"],
      openPrActions: ["preserved #274: broad governance doc PR outside this scoped wallet/mobile pass."],
      sources: {
        ...baseSources,
        files: {
          "src/app/dashboard/DashboardClient.tsx": 'data-user-dashboard-loading-staged="true" getMobileSkeletonClass',
        },
      },
    });

    expect(report.summary.userDashboardModulesPreserved).toBe(false);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toContain("user dashboard modules removed or no longer source-visible.");
  });
});
