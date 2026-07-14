import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch8CleanupReport,
  validateDebugCockpitBatch8CleanupReport,
} from "../../scripts/agent/business-truth-recovery-shared";
import { expectNoFailuresOrOnlyNamedIsolation } from "./utils/source-validator-contract";

describe("debug cockpit batch8 cleanup", () => {
  it("locks recovery CTA collapse and canonical business truth source classes", () => {
    const report = buildDebugCockpitBatch8CleanupReport({ currentHead: "head-current" });

    expectNoFailuresOrOnlyNamedIsolation({
      failures: validateDebugCockpitBatch8CleanupReport(report),
      expectedIsolationFailures: ["dirty files unclassified."],
    });
    expect(report.visiblePlaybooksAfter).toBe(0);
    expect(report.collapsedPlaybooks).toContain("stale_artifact_recovery");
    expect(report.businessTruthStatusAfter).toBe("low_confidence_review");
    expect(report.businessTruthFreshnessAfter).toBe("stale_snapshot_with_reason");
    expect(report.businessTruthConfidenceAfter).toBe(74);
    expect(report.opsHealthInherited).toBe(false);
    expect(report.watchSourceClass).toBe("valid_watch_time");
    expect(report.revenueSourceClass).toBe("operator_confirmed_provider_formal_missing");
  });
});
