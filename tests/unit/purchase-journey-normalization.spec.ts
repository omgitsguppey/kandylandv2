import { describe, expect, it } from "vitest";

import { classifyPurchaseJourneyNormalization } from "@/lib/commerce/purchase-journey-normalization";

describe("purchase journey normalization", () => {
  it("counts one canonical purchase journey step even when wallet pre-events are missing", () => {
    const result = classifyPurchaseJourneyNormalization({
      purchaseTelemetryEventCount: 1,
      completedTransactionCount: 1,
      walletOpenCount: 0,
      checkoutStartCount: 0,
      uniquePurchaseKeys: ["tx1"],
    });

    expect(result.state).toBe("pass");
    expect(result.purchaseJourneyStepCount).toBe(1);
    expect(result.attributionGap).toBe("missing_wallet_or_checkout_pre_events");
    expect(result.revenueTruthSource).toBe("ledger_provider");
    expect(result.doubleCountRisk).toBe(false);
  });

  it("blocks journey parity when telemetry can double count one transaction", () => {
    const result = classifyPurchaseJourneyNormalization({
      purchaseTelemetryEventCount: 2,
      completedTransactionCount: 1,
      walletOpenCount: 1,
      checkoutStartCount: 1,
      uniquePurchaseKeys: ["tx1"],
    });

    expect(result.state).toBe("fail");
    expect(result.doubleCountRisk).toBe(true);
    expect(result.nextAction).toContain("dedupe");
  });
});
