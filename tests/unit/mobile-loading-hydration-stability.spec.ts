import { describe, expect, it } from "vitest";

import {
  buildMobileLoadingHydrationStabilityReport,
  validateMobileLoadingHydrationStabilityReport,
} from "../../scripts/agent/validate-mobile-loading-hydration-stability";
import {
  createStaleRequestGuard,
  getMobileSkeletonClass,
  getModuleLoadingState,
  shouldShowCompactSkeleton,
} from "../../src/lib/ui/loading-state-contract";

const baseSources = {
  loadingContract: "createStaleRequestGuard getMobileSkeletonClass getModuleLoadingState shouldShowCompactSkeleton",
  mobileScaleContract: "getMobileModuleClassNames getSkeletonClassForModule",
  packageJson: "check:mobile-loading-hydration-stability",
};

describe("mobile loading hydration stability", () => {
  it("suppresses stale request results with a deterministic guard", () => {
    const guard = createStaleRequestGuard();
    const firstRequest = guard.next();
    const secondRequest = guard.next();

    expect(guard.isFresh(firstRequest)).toBe(false);
    expect(guard.isFresh(secondRequest)).toBe(true);
    expect(getModuleLoadingState({ loading: true, hasData: true })).toBe("refreshing");
    expect(shouldShowCompactSkeleton({ loading: true, hasData: false })).toBe(true);
  });

  it("returns compact mobile skeleton classes instead of full-page loader tokens", () => {
    const className = getMobileSkeletonClass("creator", "manager");

    expect(className).toContain("animate-pulse");
    expect(className).not.toContain("min-h-screen");
    expect(className).not.toContain("h-40");
    expect(className).not.toContain("p-8");
  });

  it("passes when touched surfaces use compact skeleton markers and stale request protection", () => {
    const report = buildMobileLoadingHydrationStabilityReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: [
        "src/components/Creators/CreatorDropManager.tsx",
        "src/app/admin/queue/page.tsx",
        "src/app/admin/analytics/loading.tsx",
      ],
      sources: {
        ...baseSources,
        files: {
          "src/components/Creators/CreatorDropManager.tsx": 'createStaleRequestGuard authFetch("/api/creator/drops") data-mobile-skeleton="creator-drop-list" data-mobile-density="compact" data-mobile-sprawl-guard="true"',
          "src/app/admin/queue/page.tsx": 'createStaleRequestGuard authFetch("/api/admin/queue") data-mobile-skeleton="admin-queue-route" data-mobile-density="compact" data-mobile-sprawl-guard="true"',
          "src/app/admin/analytics/loading.tsx": 'getMobileSkeletonClass data-mobile-skeleton="admin-analytics-loading" data-mobile-density="compact" data-mobile-sprawl-guard="true"',
        },
      },
      inventoryMatches: ["src/app/admin/analytics/loading.tsx:1:min-h-screen"],
    });

    expect(report.summary.protectedNavChatUntouched).toBe(true);
    expect(report.summary.staleRequestProtectionApplied).toBe(true);
    expect(report.summary.promiseAllHydrationAvoided).toBe(true);
    expect(report.summary.compactSkeletonsPresent).toBe(true);
    expect(validateMobileLoadingHydrationStabilityReport(report)).toEqual([]);
  });

  it("fails when protected nav or chat files changed", () => {
    const report = buildMobileLoadingHydrationStabilityReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/components/Chat/ChatExperience.tsx"],
      sources: { ...baseSources, files: {} },
      inventoryMatches: [],
    });

    expect(report.summary.protectedNavChatUntouched).toBe(false);
    expect(validateMobileLoadingHydrationStabilityReport(report)).toContain("protected nav/chat files changed by this pass.");
  });

  it("fails when async loaders can overwrite newer data", () => {
    const report = buildMobileLoadingHydrationStabilityReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/components/Creators/CreatorDropManager.tsx"],
      sources: {
        ...baseSources,
        files: {
          "src/components/Creators/CreatorDropManager.tsx": 'authFetch("/api/creator/drops"); setDrops([]); setLoading(false); data-mobile-skeleton="creator-drop-list"',
        },
      },
      inventoryMatches: [],
    });

    expect(report.summary.staleRequestProtectionApplied).toBe(false);
    expect(validateMobileLoadingHydrationStabilityReport(report)).toContain("async loaders in touched files lack stale request protection.");
  });

  it("fails when mobile dashboard hydration still uses all-or-nothing Promise.all", () => {
    const report = buildMobileLoadingHydrationStabilityReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      changedFiles: ["src/app/admin/queue/page.tsx"],
      sources: {
        ...baseSources,
        files: {
          "src/app/admin/queue/page.tsx": 'createStaleRequestGuard Promise.all([authFetch("/api/admin/queue"), getDocs()]) data-mobile-skeleton="admin-queue-route"',
        },
      },
      inventoryMatches: [],
    });

    expect(report.summary.promiseAllHydrationAvoided).toBe(false);
    expect(validateMobileLoadingHydrationStabilityReport(report)).toContain("Promise.all causes all-or-nothing hydration in mobile dashboards.");
  });
});
