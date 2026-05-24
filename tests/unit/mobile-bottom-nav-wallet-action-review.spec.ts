import { describe, expect, it } from "vitest";

import {
  buildMobileBottomNavWalletActionReviewReport,
  validateMobileBottomNavWalletActionReviewReport,
} from "../../scripts/agent/debug-cockpit-batch11-shared";

describe("mobile bottom nav wallet action review", () => {
  it("classifies wallet action semantics without changing bottom nav or payment behavior", () => {
    const report = buildMobileBottomNavWalletActionReviewReport();

    expect(report.walletNavActionStatus).toBe("intentional_nav_action_exception");
    expect(report.bottomNavBehaviorChanged).toBe(false);
    expect(report.purchaseModalBehaviorChanged).toBe(false);
    expect(report.paymentRuntimeChanged).toBe(false);
    expect(report.migrationNote).toContain("migrate_to_wallet_route_later");
    expect(validateMobileBottomNavWalletActionReviewReport(report)).toEqual([]);
  });
});
