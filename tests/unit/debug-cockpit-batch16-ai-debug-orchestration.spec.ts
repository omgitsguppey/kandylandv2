import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch16Report } from "@/lib/debug/debug-cockpit-batch16-ai-debug-orchestration";

describe("debug cockpit batch 16 AI debug orchestration", () => {
  it("reports bounded async orchestration without provider calls or healthy no-sample states", () => {
    const report = buildDebugCockpitBatch16Report();

    expect(report.aiPlannerStatus).toBe("deterministic_fallback_ready");
    expect(report.aiCriticStatus).toBe("critic_required_for_source_patch");
    expect(report.providerCallsInTests).toBe(false);
    expect(report.privacyRedactionStatus).toBe("raw_bodies_blocked");
    expect(report.manualUtilityStatus).toBe("manual_utility_not_health");
    expect(report.taskIssueAttributionStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.repairQueueStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.bugTriageStatusAfter).toBe("source_ready_no_sample_loaded");
    expect(report.scoreDimensions).toEqual(expect.arrayContaining([
      "sourceHealth",
      "runtimeHealth",
      "evidenceCompleteness",
      "freshness",
      "costRisk",
      "regressionRisk",
    ]));
    expect(report.nextExactSteps.length).toBeGreaterThan(0);
  });
});
