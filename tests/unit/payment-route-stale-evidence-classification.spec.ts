import { describe, expect, it } from "vitest";

import { classifyPaymentRouteStaleEvidence } from "@/lib/debug/payment-route-stale-evidence-classifier";

describe("payment route stale evidence classification", () => {
  it("does not let operator evidence clear stale PayPal capture route freshness", () => {
    const record = classifyPaymentRouteStaleEvidence({
      routeKey: "paypal/capture:POST",
      lastSampleAgeMs: 2 * 24 * 60 * 60 * 1000,
      freshnessWindowMs: 24 * 60 * 60 * 1000,
      operatorEvidencePresent: true,
      deployedSmokePresent: false,
    });

    expect(record.status).toBe("stale_critical_evidence_required");
    expect(record.operatorEvidenceClearsRouteFreshness).toBe(false);
    expect(record.paymentRuntimeChanged).toBe(false);
  });
});
