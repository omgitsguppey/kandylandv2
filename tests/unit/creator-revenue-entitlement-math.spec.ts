import { describe, expect, it } from "vitest";

import {
  calculateCreatorRevenueSummary,
  calculateEntitlementAccess,
  calculateFanPassActive,
  calculatePaidChatBypass,
  classifyRevenueConfidence,
  explainCreatorRevenueMath,
} from "@/lib/math/creator-revenue-entitlement-math";
import {
  buildCreatorRevenueEntitlementMathReport,
  classifyCreatorRevenueEntitlementMathDirtyFile,
  validateCreatorRevenueEntitlementMathReport,
} from "../../scripts/agent/validate-creator-revenue-entitlement-math";

describe("creator revenue entitlement math", () => {
  it("classifies revenue confidence without promoting operator or legacy signals to exact", () => {
    expect(classifyRevenueConfidence({ providerPaymentArtifact: true })).toBe("exact");
    expect(classifyRevenueConfidence({ internalLedgerLinkedToSuccessfulPayment: true })).toBe("linked");
    expect(classifyRevenueConfidence({ operatorConfirmedRevenue: true })).toBe("inferred");
    expect(classifyRevenueConfidence({ legacyTransaction: true, revenueCents: 1000 })).toBe("weak");
    expect(classifyRevenueConfidence({ legacyTransaction: true })).toBe("unknown");
  });

  it("requires creator enablement, active entitlement, valid access window, and non-reversed status for Fan Pass access", () => {
    const nowMs = Date.UTC(2026, 4, 26);
    const base = {
      enabledByCreator: true,
      entitlementStatus: "active" as const,
      activeForUser: true,
      accessStartAt: nowMs - 1_000,
      accessEndAt: nowMs + 1_000,
      nowMs,
    };

    expect(calculateFanPassActive(base).active).toBe(true);
    expect(calculateFanPassActive({ ...base, accessEndAt: null, lifetime: true }).active).toBe(true);
    expect(calculateFanPassActive({ ...base, enabledByCreator: false }).active).toBe(false);
    expect(calculateFanPassActive({ ...base, accessEndAt: nowMs - 1 }).reason).toBe("outside_access_window");
    expect(calculateFanPassActive({ ...base, entitlementStatus: "refunded" }).reason).toBe("reversed_entitlement");
    expect(calculateFanPassActive({ ...base, entitlementStatus: "cancelled" }).active).toBe(false);
  });

  it("does not grant legacy entitlement access without access date proof", () => {
    const nowMs = Date.UTC(2026, 4, 26);

    expect(calculateEntitlementAccess({
      creatorId: "creator_1",
      userId: "user_1",
      sourceTruth: "legacy_unknown",
      status: "active",
      accessStartAt: null,
      accessEndAt: null,
      nowMs,
    })).toMatchObject({ accessGranted: false, reason: "legacy_access_window_missing" });

    expect(calculateEntitlementAccess({
      creatorId: "creator_1",
      userId: "user_1",
      sourceTruth: "creator_subscription",
      status: "active",
      accessStartAt: nowMs - 1,
      accessEndAt: nowMs + 1,
      nowMs,
    })).toMatchObject({ accessGranted: true, reason: "active_entitlement" });
  });

  it("routes paid chat bypass through Fan Pass resolver output or creator reply bypass only", () => {
    expect(calculatePaidChatBypass({
      fanPassResolverResult: { activeForUser: true, state: "access_granted" },
    })).toMatchObject({ bypassAllowed: true, source: "fan_pass_resolver" });

    expect(calculatePaidChatBypass({
      actorRole: "creator",
      creatorReplyBypass: true,
    })).toMatchObject({ bypassAllowed: true, source: "creator_reply_bypass" });

    expect(calculatePaidChatBypass({
      rawFanPassActive: true,
    })).toMatchObject({ bypassAllowed: false, reason: "fan_pass_resolver_required" });
  });

  it("separates confirmed, inferred, pending, reversed, and unknown legacy creator revenue", () => {
    const summary = calculateCreatorRevenueSummary([
      { revenueCents: 5000, status: "confirmed", providerPaymentArtifact: true },
      { revenueCents: 2000, status: "confirmed", internalLedgerLinkedToSuccessfulPayment: true },
      { revenueCents: 1250, status: "confirmed", operatorConfirmedRevenue: true },
      { revenueCents: 900, status: "pending", internalLedgerLinkedToSuccessfulPayment: true },
      { revenueCents: 800, status: "refunded", providerPaymentArtifact: true },
      { revenueCents: 700, status: "confirmed", legacyTransaction: true },
      { revenueCents: 600, status: "confirmed", revenueConfidence: "unknown" },
    ]);

    expect(summary.confirmedRevenueCents).toBe(7000);
    expect(summary.inferredRevenueCents).toBe(1250);
    expect(summary.pendingRevenueCents).toBe(900);
    expect(summary.reversedRevenueCents).toBe(800);
    expect(summary.unknownLegacyRevenueCents).toBe(1300);
    expect(summary.dashboardMetrics.every((metric) => metric.confidence)).toBe(true);
  });

  it("explains the math lane without claiming payment or payout changes", () => {
    expect(explainCreatorRevenueMath().paymentRuntimeTouched).toBe(false);
    expect(explainCreatorRevenueMath().payoutMathTouched).toBe(false);
    expect(explainCreatorRevenueMath().rules).toContain("Entitlement is access truth, not payment truth.");
  });

  it("validates the creator revenue math report and blocks payment runtime changes", () => {
    const report = buildCreatorRevenueEntitlementMathReport({
      currentHead: "test-head",
      dirtyFiles: [],
      openPrs: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
    });

    expect(report.status).toBe("pass");
    expect(report.debugLane.label).toBe("Creator revenue math");
    expect(report.revenueConfidenceBuckets).toEqual(["exact", "linked", "inferred", "weak", "unknown"]);
    expect(validateCreatorRevenueEntitlementMathReport(report)).toEqual([]);
    expect(classifyCreatorRevenueEntitlementMathDirtyFile("src/lib/math/creator-revenue-entitlement-math.ts")).toBe("current_source_change");
    expect(classifyCreatorRevenueEntitlementMathDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");
  });
});
