import { describe, expect, it } from "vitest";

import {
  buildSupportThreadsIndexRepairReport,
  validateSupportThreadsIndexRepairReport,
} from "@/lib/debug/debug-cockpit-batch19-product-routes";

describe("support threads index repair", () => {
  it("adds composite index evidence and typed missing-index responses", () => {
    const report = buildSupportThreadsIndexRepairReport();

    expect(report.indexStatus).toBe("firestore_indexes_configured");
    expect(report.typedMissingIndexCode).toBe("missing_firestore_index");
    expect(report.safeFallbackBroadReads).toBe(false);
    expect(report.currentServerErrorHidden).toBe(false);
    expect(validateSupportThreadsIndexRepairReport(report)).toEqual([]);
  });
});
