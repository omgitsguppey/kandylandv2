import { describe, expect, it } from "vitest";

import { buildDebugCockpitBatch27AiRepairWorkbenchReport } from "@/lib/debug/debug-cockpit-batch27-ai-repair-workbench";

describe("Debug Cockpit Batch 27 AI repair workbench report", () => {
  it("reports provider blocking, grouped work items, approval gates, and score dimensions", () => {
    const report = buildDebugCockpitBatch27AiRepairWorkbenchReport({
      workItems: [
        { sourceKind: "pipeline_failure", selectedMode: "inspect_only", applyEligibility: "inspect_only" },
        { sourceKind: "orchestration_finding", selectedMode: "source_patch_candidate", applyEligibility: "human_approval_required" },
        { sourceKind: "formal_evidence_required", selectedMode: "formal_evidence_request", applyEligibility: "inspect_only" },
      ],
      proposals: [{ mode: "source_patch_candidate", status: "critic_required", autoApplyAllowed: false }],
      fallbackStatus: "deterministic_fallback_summary",
      livePlannerStatus: "not_requested",
      providerCallsInTests: false,
    });

    expect(report.aiAssistantStatusAfter).toBe("async_repair_workbench_ready");
    expect(report.providerCallsInTests).toBe(false);
    expect(report.pipelineFailuresGrouped).toBe(true);
    expect(report.sourcePatchCandidateCount).toBe(1);
    expect(report.humanApprovalRequiredCount).toBeGreaterThan(0);
    expect(report.autoApplyAllowedCount).toBe(0);
    expect(report.scoreDimensions).toContain("workItemStructure");
  });
});
