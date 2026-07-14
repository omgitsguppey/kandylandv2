import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { buildServerUnlockTelemetryEvent, classifyUnlockTelemetryCoverage } from "@/lib/commerce/unlock-watch-parity-contract";

describe("server unlock telemetry emission", () => {
  it("builds an idempotent canonical unlock event with spend source split", () => {
    const event = buildServerUnlockTelemetryEvent({
      userId: "user-1",
      dropId: "drop-1",
      transactionId: "tx-1",
      entitlementId: "drop-entitlement:user-1:drop-1",
      gumdropsSpent: 125,
      purchasedAmountSpent: 100,
      rewardAmountSpent: 25,
      entitlementState: "granted",
      route: "/api/drops/unlock",
      sourceComponent: "drops_unlock_route",
    });

    expect(event.eventName).toBe("drop_unlocked");
    expect(event.eventId).toBe(event.idempotencyKey);
    expect(event.params).toMatchObject({
      transaction_id: "tx-1",
      drop_id: "drop-1",
      gumdrops_spent: 125,
      purchased_amount_spent: 100,
      reward_amount_spent: 25,
      sourceTruth: "server_unlock_route",
      source_truth: "server_unlock_route",
    });
  });

  it("blocks parity when unlock transactions exist without canonical unlock telemetry", () => {
    expect(classifyUnlockTelemetryCoverage({
      unlockTransactionCount: 47,
      telemetryEventCount: 0,
    })).toMatchObject({
      missingUnlockTelemetryCount: 47,
      state: "fail",
      passAllowed: false,
      blocker: "missing_server_unlock_telemetry",
    });
  });

  it("keeps entitlement telemetry from overwriting the canonical unlock fact", () => {
    const route = readFileSync("src/app/api/drops/unlock/route.ts", "utf8");

    expect(route).toContain("...serverUnlockTelemetry.params");
    expect(route).toContain("entitlement_granted:${result.transactionId || result.entitlementId}:${dropId}");
  });
});
