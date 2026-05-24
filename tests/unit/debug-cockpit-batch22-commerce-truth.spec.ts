import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch22CommerceTruthReport, validateDebugCockpitBatch22CommerceTruthReport } from "@/lib/debug/debug-cockpit-batch22-commerce-truth";

describe("debug cockpit batch22 commerce truth", () => {
  it("reports source-of-funds cleanup and UID redaction dimensions", () => {
    const report = buildDebugCockpitBatch22CommerceTruthReport();

    expect(report.recentTransactionsLoaded).toBe(19);
    expect(report.unknownSourceTransactionsBefore).toBeGreaterThan(report.unknownSourceTransactionsAfter);
    expect(report.unlockSourceStatusAfter).toBe("new_unlocks_exact_split_legacy_unknown_actionable");
    expect(report.fullUidDefaultVisibleAfter).toBe(false);
    expect(report.transactionSequenceStatus).toBe("bounded_redacted_sequence_evidence");
    expect(Object.keys(report.scoreDimensions).length).toBeGreaterThan(0);
    expect(validateDebugCockpitBatch22CommerceTruthReport(report)).toEqual([]);
  });
});
