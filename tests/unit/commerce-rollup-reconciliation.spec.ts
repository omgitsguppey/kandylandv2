import { describe, expect, it } from "vitest";

import { reconcileCommerceRollups } from "@/lib/commerce/commerce-rollup-reconciliation";

describe("commerce rollup reconciliation", () => {
  it("classifies transaction and rollup purchase count mismatches with comparable units", () => {
    const result = reconcileCommerceRollups({
      selectedRange: "30d",
      transactionCount: 5,
      rollupPurchaseCount: 13,
      rollupDocumentCount: 13,
      telemetryEventCount: 0,
      completedTransactionIds: ["tx1", "tx2", "tx3", "tx4", "tx5"],
      rollupSourceIds: ["r1", "r2"],
      duplicateRollupIds: [],
      legacyRollupIds: [],
      operatorConfirmedOnlyIds: [],
      startDayKey: "2026-04-25",
      endDayKey: "2026-05-24",
      rollupStartDayKey: "2026-04-25",
      rollupEndDayKey: "2026-05-24",
    });

    expect(result.state).toBe("fail");
    expect(result.comparableUnitsStatus).toBe("comparable_purchase_count");
    expect(result.mismatchReason).toBe("telemetry_missing");
    expect(result.missingTelemetryIds).toEqual(["tx1", "tx2", "tx3", "tx4", "tx5"]);
    expect(result.nextAction).toContain("Wire canonical server purchase telemetry");
  });

  it("does not compare daily rollup document count as purchase count", () => {
    const result = reconcileCommerceRollups({
      selectedRange: "30d",
      transactionCount: 5,
      rollupPurchaseCount: 5,
      rollupDocumentCount: 13,
      telemetryEventCount: 5,
      completedTransactionIds: ["tx1", "tx2", "tx3", "tx4", "tx5"],
      rollupSourceIds: ["2026-05-20", "2026-05-21"],
      duplicateRollupIds: [],
      legacyRollupIds: [],
      operatorConfirmedOnlyIds: [],
      startDayKey: "2026-04-25",
      endDayKey: "2026-05-24",
      rollupStartDayKey: "2026-04-25",
      rollupEndDayKey: "2026-05-24",
    });

    expect(result.state).toBe("pass");
    expect(result.comparableUnitsStatus).toBe("rollup_docs_not_purchase_count");
    expect(result.mismatchReason).toBe("none");
  });

  it("keeps revenue reconciliation clean when transaction and rollup purchase counts agree even if funnel telemetry is low", () => {
    const result = reconcileCommerceRollups({
      selectedRange: "30d",
      transactionCount: 19,
      rollupPurchaseCount: 19,
      rollupDocumentCount: 10,
      telemetryEventCount: 1,
      completedTransactionIds: ["tx1"],
      rollupSourceIds: ["r1"],
      duplicateRollupIds: [],
      legacyRollupIds: [],
      operatorConfirmedOnlyIds: [],
      startDayKey: "2026-04-25",
      endDayKey: "2026-05-24",
      rollupStartDayKey: "2026-04-25",
      rollupEndDayKey: "2026-05-24",
    });

    expect(result.state).toBe("pass");
    expect(result.mismatchReason).toBe("none");
  });
});
