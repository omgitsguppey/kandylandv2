import { describe, expect, it } from "vitest";

import {
  CREATOR_ENTITLEMENT_DEBUG_LANE,
  CREATOR_ENTITLEMENT_TYPES,
  buildCreatorEntitlementContractShape,
  validateCreatorEntitlementShape,
} from "@/lib/creator-monetization/creator-entitlement-contract";
import {
  buildCreatorEntitlement,
  classifyEntitlementSource,
  explainEntitlementMismatch,
  resolveCreatorEntitlementAccess,
} from "@/lib/creator-monetization/creator-entitlement-resolver";
import {
  buildCreatorRevenueEntitlementLedgerReport,
  classifyCreatorRevenueEntitlementDirtyFile,
  validateCreatorRevenueEntitlementLedgerReport,
} from "../../scripts/agent/validate-creator-revenue-entitlement-ledger";

describe("creator revenue entitlement ledger", () => {
  it("defines the canonical entitlement types and required contract fields", () => {
    expect(CREATOR_ENTITLEMENT_TYPES).toEqual([
      "fan_pass_access",
      "paid_chat_message",
      "drop_unlock",
      "creator_experience_access",
      "broadcast_access",
      "system_grant",
      "unknown_legacy",
    ]);

    const shape = buildCreatorEntitlementContractShape();
    expect(shape.requiredFields).toEqual(expect.arrayContaining([
      "entitlementId",
      "creatorId",
      "userId",
      "sourceFeature",
      "sourceOfFunds",
      "gdAmount",
      "revenueCents",
      "accessStartAt",
      "accessEndAt",
      "status",
      "confidence",
      "debugVisibility",
    ]));
    expect(validateCreatorEntitlementShape(shape)).toEqual([]);
  });

  it("builds a Fan Pass entitlement with paid source truth and explicit revenue confidence", () => {
    const entitlement = buildCreatorEntitlement({
      entitlementId: "fan_pass:user_1:creator_1",
      entitlementType: "fan_pass_access",
      creatorId: "creator_1",
      userId: "user_1",
      sourceFeature: "fan_pass",
      sourceTransactionId: "txn_1",
      sourceOfFunds: "paid_gumdrops",
      gdAmount: 250,
      revenueCents: null,
      accessStartAt: 1,
      accessEndAt: 2,
      status: "active",
      confidence: "verified",
      revenueConfidence: "unavailable",
      sourceTruth: "creator_subscription",
    });

    expect(entitlement).toMatchObject({
      entitlementType: "fan_pass_access",
      creatorId: "creator_1",
      userId: "user_1",
      sourceFeature: "fan_pass",
      sourceOfFunds: "paid_gumdrops",
      status: "active",
      confidence: "verified",
      revenueConfidence: "unavailable",
      debugVisibility: {
        lane: CREATOR_ENTITLEMENT_DEBUG_LANE,
        status: "debug_visible",
      },
    });
    expect(resolveCreatorEntitlementAccess(entitlement).accessGranted).toBe(true);
  });

  it("blocks paid creator entitlements funded by reward-only GumDrops", () => {
    const rewardFunded = buildCreatorEntitlement({
      entitlementId: "fan_pass:user_1:creator_1",
      entitlementType: "fan_pass_access",
      creatorId: "creator_1",
      userId: "user_1",
      sourceFeature: "fan_pass",
      sourceTransactionId: "txn_1",
      sourceOfFunds: "reward_gumdrops",
      gdAmount: 250,
      revenueCents: null,
      status: "active",
      confidence: "verified",
      sourceTruth: "creator_subscription",
    });

    const access = resolveCreatorEntitlementAccess(rewardFunded);
    expect(access.accessGranted).toBe(false);
    expect(access.failureReason).toBe("paid_source_required");
    expect(explainEntitlementMismatch(rewardFunded)).toContain("paid-source");
  });

  it("classifies transaction sources into creator entitlement types", () => {
    expect(classifyEntitlementSource({
      type: "creator_subscription",
      creatorId: "creator_1",
      userId: "user_1",
      purchasedAmountSpent: 250,
      rewardAmountSpent: 0,
      creatorAccrualId: "creator_accrual_1",
      creatorRevenueShareGd: 200,
    })).toMatchObject({
      entitlementType: "fan_pass_access",
      sourceFeature: "fan_pass",
      sourceOfFunds: "paid_gumdrops",
      revenueConfidence: "verified",
    });

    expect(classifyEntitlementSource({ type: "creator_message_image", purchasedAmountSpent: 30 })).toMatchObject({
      entitlementType: "paid_chat_message",
      sourceFeature: "chat",
    });
    expect(classifyEntitlementSource({ type: "unlock_content", ledgerSource: "mixed" })).toMatchObject({
      entitlementType: "drop_unlock",
      sourceFeature: "drop_unlock",
      sourceOfFunds: "mixed_gumdrops",
    });
    expect(classifyEntitlementSource({ type: "creator_booking_video", purchasedAmountSpent: 500 })).toMatchObject({
      entitlementType: "creator_experience_access",
      sourceFeature: "creator_experience",
    });
  });

  it("reports creator metrics mapping, source-of-funds truth, and scoped dirty files", () => {
    const report = buildCreatorRevenueEntitlementLedgerReport({
      currentHead: "test-head",
      dirtyFiles: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
    });

    expect(report.status).toBe("pass");
    expect(report.entitlementContractStatus).toBe("pass");
    expect(report.sourceOfFundsStatus).toBe("pass");
    expect(report.creatorMetricsStatus).toBe("pass");
    expect(report.paymentRuntimeStatus).toBe("unchanged");
    expect(report.gumdropMathStatus).toBe("unchanged");
    expect(report.debugLane.label).toBe(CREATOR_ENTITLEMENT_DEBUG_LANE);
    expect(report.metricsMapped).toEqual(expect.arrayContaining([
      "creator-level entitlements granted",
      "fan pass active users",
      "paid chat messages",
      "drop unlocks",
      "revenue confidence",
      "access denied/mismatch count",
    ]));
    expect(validateCreatorRevenueEntitlementLedgerReport(report)).toEqual([]);
  });

  it("blocks payment and GumDrop runtime files from the entitlement ledger pass", () => {
    expect(classifyCreatorRevenueEntitlementDirtyFile("src/lib/creator-monetization/creator-entitlement-contract.ts")).toBe("current_source_change");
    expect(classifyCreatorRevenueEntitlementDirtyFile("scripts/agent/validate-creator-revenue-entitlement-ledger.ts")).toBe("validator_artifact_expected");
    expect(classifyCreatorRevenueEntitlementDirtyFile("agent/state/creator-revenue-entitlement-ledger.generated.json")).toBe("current_generated_artifact_to_commit");
    expect(classifyCreatorRevenueEntitlementDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");
    expect(classifyCreatorRevenueEntitlementDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");

    const report = buildCreatorRevenueEntitlementLedgerReport({
      currentHead: "test-head",
      dirtyFiles: ["src/lib/gumdrop-ledger.ts"],
    });
    expect(validateCreatorRevenueEntitlementLedgerReport(report)).toContain("src/lib/gumdrop-ledger.ts is unclassified for creator entitlement ledger.");
  });
});
