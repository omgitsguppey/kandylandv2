import { describe, expect, it } from "vitest";

import {
  MOBILE_SCALE_CONTRACT_VERSION,
  assertNoDesktopStuffing,
  getMobileDensityForSurface,
  getMobileModuleClassNames,
  getSkeletonClassForModule,
  MOBILE_SCALE_CONTRACT,
} from "@/lib/frontend-hardening/ui/mobile-scale-contract";
import {
  buildMobileUiScalingDoctrineReport,
  validateMobileUiScalingDoctrineReport,
} from "../../scripts/agent/validate-mobile-ui-scaling-doctrine";

describe("mobile UI scaling doctrine", () => {
  it("defines mobile-first scale limits and usable touch targets", () => {
    expect(MOBILE_SCALE_CONTRACT_VERSION).toContain("mobile-scale");
    expect(MOBILE_SCALE_CONTRACT.mobile.maxHeaderPx).toBeLessThanOrEqual(30);
    expect(MOBILE_SCALE_CONTRACT.mobile.maxCardPaddingPx).toBeLessThanOrEqual(16);
    expect(MOBILE_SCALE_CONTRACT.mobile.touchTargetMinPx).toBeGreaterThanOrEqual(44);
    expect(MOBILE_SCALE_CONTRACT.protectedSurfaces).toEqual(["top_nav", "bottom_nav", "chat"]);
  });

  it("resolves compact mobile density for admin, creator, and user modules without sharing business logic", () => {
    expect(getMobileDensityForSurface("admin", "debug")).toBe("compact");
    expect(getMobileDensityForSurface("creator", "manager")).toBe("compact");
    expect(getMobileDensityForSurface("user", "detail")).toBe("standard");
  });

  it("returns shared module class names instead of oversized hardcoded mobile classes", () => {
    const className = getMobileModuleClassNames("creator", "overview");

    expect(className).toContain("rounded-[1.35rem]");
    expect(className).toContain("p-3");
    expect(className).not.toContain("p-8");
    expect(className).not.toContain("text-4xl");
  });

  it("keeps skeletons dimensionally close to their final mobile modules", () => {
    const skeleton = getSkeletonClassForModule("manager");

    expect(skeleton).toContain("min-h-[4.5rem]");
    expect(skeleton).toContain("animate-pulse");
    expect(skeleton).toContain("motion-reduce:animate-none");
  });

  it("flags desktop-stuffed mobile layouts", () => {
    const result = assertNoDesktopStuffing({
      surface: "admin",
      moduleType: "overview",
      deviceBand: "mobile",
      className: "h-screen overflow-y-auto rounded-3xl p-8 text-4xl",
      nestedScroll: true,
      skeletonMatchesFinalLayout: false,
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      "mobile className must not use p-8 desktop-scale padding",
      "mobile className must not use text-4xl display type outside a true hero",
      "mobile className must not use raw h-screen shell math",
      "mobile nested scroll requires an approved list/table/debug policy",
      "mobile skeletons must reserve roughly final layout size",
    ]));
  });

  it("builds a validator report with doctrine, helper, scan, protected-surface, and next-action coverage", () => {
    const report = buildMobileUiScalingDoctrineReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-19T12:00:00.000Z",
      docs: {
        doctrine: "Mobile is the primary UX priority. Skeletons must reserve roughly final layout size. Hydration should not cause layout jumps. Top nav, bottom nav, and chat are protected. ## Next Fix Order",
      },
      sources: {
        contract: "getMobileDensityForSurface getMobileModuleClassNames getSkeletonClassForModule assertNoDesktopStuffing MOBILE_SCALE_CONTRACT",
        packageJson: "check:mobile-ui-scaling-doctrine",
      },
      changedFiles: [
        "src/lib/frontend-hardening/ui/mobile-scale-contract.ts",
        "docs/agent-truth/mobile-ui-scaling-doctrine.md",
      ],
      hardcodedScanMatches: ["src/components/Admin/Foo.tsx:1:p-8"],
    });

    expect(report.summary.sharedMobileScaleContractCreated).toBe(true);
    expect(report.summary.protectedNavChatUntouched).toBe(true);
    expect(report.hardcodedCssScan.length).toBe(1);
    expect(validateMobileUiScalingDoctrineReport(report)).toEqual([]);
  });
});
