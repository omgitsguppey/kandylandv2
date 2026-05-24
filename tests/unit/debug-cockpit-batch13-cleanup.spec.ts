import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch13CleanupReport,
  validateDebugCockpitBatch13CleanupReport,
} from "../../scripts/agent/debug-cockpit-batch13-shared";

describe("Batch 13 final cleanup lock", () => {
  it("summarizes refreshed lanes while preserving real watch and monolith warnings", () => {
    const report = buildDebugCockpitBatch13CleanupReport();

    expect(report.googleCostAgeAfter).toBeLessThanOrEqual(72);
    expect(report.cloudCostAgeAfter).toBeLessThanOrEqual(72);
    expect(report.dataConnectMirrorStatusAfter).toBe("manual_only_safe");
    expect(report.runtimeWatchStatusAfter).toBe("source_ready_evidence_gap");
    expect(report.externalAnalyticsArchiveStatus).toBe("archive_only_external_evidence");
    expect(report.adminDebugMonolithStatus).toBe("monolith_split_plan_required");
    expect(report.supportRecoveryStatus).not.toBe("unknown");
    expect(report.creatorLaneLegacyStatus).not.toBe("unknown");
    expect(report.scoreDimensions).toHaveProperty("overallHealthScore");
    expect(validateDebugCockpitBatch13CleanupReport(report)).toEqual([]);
  });
});
