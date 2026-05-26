import { describe, expect, it } from "vitest";

import {
  ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS,
  ADMIN_CREATOR_MONETIZATION_DEBUG_LANE,
  buildCreatorMonetizationAdminDebugLane,
  buildCreatorMonetizationAdminDebugSummary,
  validateCreatorMonetizationAdminDebugSummary,
} from "@/lib/admin/creator-monetization-debug-contract";
import {
  buildCreatorMonetizationAdminDebugReport,
  classifyCreatorMonetizationAdminDebugDirtyFile,
  validateCreatorMonetizationAdminDebugReport,
} from "../../scripts/agent/validate-creator-monetization-admin-debug";

describe("creator monetization admin debug truth", () => {
  it("builds a summary-first admin lane without private payment or user payloads", () => {
    const summary = buildCreatorMonetizationAdminDebugSummary({
      creators: [
        {
          creatorId: "creator_1",
          creatorSettings: {
            subscriptionsEnabled: true,
            subscriptionPriceGd: 900,
            messagingEnabled: true,
            chatFreeForSubscribers: true,
            broadcastsEnabled: true,
            profileTimelineEnabled: true,
          },
          creatorSettingsUpdatedAt: Date.now(),
        },
        {
          creatorId: "creator_2",
          creatorSettings: {
            subscriptionsEnabled: false,
            messagingEnabled: true,
            chatFreeForSubscribers: false,
          },
        },
      ],
      entitlements: [
        {
          entitlementType: "fan_pass_access",
          status: "active",
          sourceOfFunds: "paid_gumdrops",
          sourceFeature: "fan_pass",
          creatorId: "creator_1",
          userId: "user_private",
        },
        {
          entitlementType: "paid_chat_message",
          status: "denied",
          sourceOfFunds: "reward_gumdrops",
          sourceFeature: "chat",
          creatorId: "creator_1",
          userId: "user_private_2",
          mismatchReasons: ["paid_source_required"],
        },
      ],
      transactions: [
        { type: "creator_message_text", status: "completed", purchasedAmountSpent: 1, rewardAmountSpent: 0 },
        { type: "creator_message_video", status: "failed", purchasedAmountSpent: 0, rewardAmountSpent: 0, errorCode: "insufficient_paid_gumdrops" },
        { type: "creator_subscription", status: "completed", purchasedAmountSpent: 900, rewardAmountSpent: 0 },
      ],
      accessFailures: [
        { reason: "paid_source_required" },
        { reason: "fan_pass_inactive" },
      ],
      nowMs: Date.now(),
    });

    expect(summary.laneId).toBe(ADMIN_CREATOR_MONETIZATION_DEBUG_LANE);
    expect(summary.configuredCreators).toBe(2);
    expect(summary.fanPass.enabled).toBe(1);
    expect(summary.fanPass.disabled).toBe(1);
    expect(summary.activeUsersOrEntitlements).toBe(1);
    expect(summary.paidChat.attempted).toBe(2);
    expect(summary.paidChat.succeeded).toBe(1);
    expect(summary.paidChat.failed).toBe(1);
    expect(summary.accessDenied.byReason).toEqual(expect.arrayContaining([
      { reason: "paid_source_required", count: 1 },
      { reason: "fan_pass_inactive", count: 1 },
    ]));
    expect(summary.sourceOfFundsMismatch.count).toBe(1);
    expect(summary.privacy.rawPaymentProviderPayloadVisible).toBe(false);
    expect(summary.privacy.privateUserPiiVisible).toBe(false);
    expect(JSON.stringify(summary)).not.toContain("user_private");
    expect(validateCreatorMonetizationAdminDebugSummary(summary)).toEqual([]);
  });

  it("defines telemetry, score impact, and compact drilldown boundaries", () => {
    const lane = buildCreatorMonetizationAdminDebugLane();

    expect(lane.label).toBe("Creator monetization admin debug");
    expect(lane.telemetryEvents).toEqual(ADMIN_CREATOR_MONETIZATION_DEBUG_EVENTS);
    expect(lane.defaultReadPolicy).toBe("summary_first_no_broad_default_reads");
    expect(lane.rawDetailsDefault).toBe("drilldown_only");
    expect(lane.scoreDimensions).toEqual(expect.arrayContaining(["sourceHealth", "evidenceCompleteness", "runtimeHealth"]));
  });

  it("reports route, telemetry, privacy, and scoped dirty-file evidence", () => {
    const report = buildCreatorMonetizationAdminDebugReport({
      currentHead: "test-head",
      dirtyFiles: [],
      scoreBefore: 77.83,
      scoreAfter: 77.83,
    });

    expect(report.status).toBe("pass");
    expect(report.adminSummaryStatus).toBe("pass");
    expect(report.debugRouteStatus).toBe("pass");
    expect(report.privacyStatus).toBe("pass");
    expect(report.telemetryStatus).toBe("pass");
    expect(report.paymentRuntimeStatus).toBe("unchanged");
    expect(report.gumdropMathStatus).toBe("unchanged");
    expect(report.debugLane.label).toBe("Creator monetization admin debug");
    expect(validateCreatorMonetizationAdminDebugReport(report)).toEqual([]);
  });

  it("blocks payment, PII, and GumDrop runtime files from the admin debug pass", () => {
    expect(classifyCreatorMonetizationAdminDebugDirtyFile("src/lib/admin/creator-monetization-debug-contract.ts")).toBe("current_source_change");
    expect(classifyCreatorMonetizationAdminDebugDirtyFile("scripts/agent/validate-creator-monetization-admin-debug.ts")).toBe("validator_artifact_expected");
    expect(classifyCreatorMonetizationAdminDebugDirtyFile("src/app/api/paypal/capture/route.ts")).toBe("unsafe_unknown");
    expect(classifyCreatorMonetizationAdminDebugDirtyFile("src/lib/gumdrop-ledger.ts")).toBe("unsafe_unknown");

    const report = buildCreatorMonetizationAdminDebugReport({
      currentHead: "test-head",
      dirtyFiles: ["src/app/api/paypal/capture/route.ts"],
    });
    expect(validateCreatorMonetizationAdminDebugReport(report)).toContain("src/app/api/paypal/capture/route.ts is unclassified for creator monetization admin debug.");
  });
});
