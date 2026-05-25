import { describe, expect, it } from "vitest";

import { reconcileUnlockRollups } from "@/lib/commerce/unlock-rollup-reconciliation";

describe("unlock rollup reconciliation", () => {
  it("classifies the 47 vs 145 mismatch with missing telemetry as a source blocker", () => {
    const result = reconcileUnlockRollups({
      selectedRange: "30d",
      transactionCount: 47,
      rollupUnlockCount: 145,
      rollupDocumentCount: 31,
      telemetryEventCount: 0,
      completedTransactionIds: ["tx-1", "tx-2"],
      rollupSourceIds: ["day-1"],
      duplicateRollupIds: [],
      legacyRollupIds: [],
      startDayKey: "2026-04-24",
      endDayKey: "2026-05-24",
      rollupStartDayKey: "2026-04-24",
      rollupEndDayKey: "2026-05-24",
    });

    expect(result.state).toBe("fail");
    expect(result.countDelta).toBe(98);
    expect(result.mismatchReason).toBe("missing_server_unlock_telemetry");
    expect(result.comparableUnitsStatus).toBe("comparable_unlock_count");
    expect(result.technicalEvidence).toContain("Mismatch reason: missing_server_unlock_telemetry");
  });

  it("does not compare rollup documents as unlock count when purchase count is available", () => {
    const result = reconcileUnlockRollups({
      selectedRange: "30d",
      transactionCount: 47,
      rollupUnlockCount: 47,
      rollupDocumentCount: 31,
      telemetryEventCount: 47,
      completedTransactionIds: ["tx-1"],
      rollupSourceIds: ["day-1"],
      duplicateRollupIds: [],
      legacyRollupIds: [],
    });

    expect(result.state).toBe("pass");
    expect(result.comparableUnitsStatus).toBe("rollup_docs_not_unlock_count");
  });
});
