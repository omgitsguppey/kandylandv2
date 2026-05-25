import { describe, expect, it } from "vitest";

import batch32Report from "../../agent/state/debug-cockpit-batch32-commerce-parity.generated.json";

describe("Debug Cockpit Batch 32 commerce parity lock", () => {
  it("reports server telemetry repair without clearing unresolved historical blockers", () => {
    expect(batch32Report).toMatchObject({
      purchaseTransactionsCount: 5,
      canonicalPurchaseRollupCountBefore: 13,
      serverPurchaseTelemetryCountBefore: 0,
      purchaseTelemetryMissingCountBefore: 5,
      creatorSpendStatus: "pass",
      gumdropMathChanged: false,
      paymentRuntimeChanged: "telemetry_emission_only",
    });
    expect(batch32Report.serverPurchaseTelemetryCountAfter).toBeGreaterThanOrEqual(0);
    expect(batch32Report.revenueMismatchReasonAfter).not.toBe("unknown");
    expect(batch32Report.idempotencyStatus).toBe("idempotent_event_id");
    expect(batch32Report.remainingGaps).toContain("Existing historical purchases still need real future telemetry or an explicit no-mutation recovery plan; this batch does not backfill production.");
  });
});
