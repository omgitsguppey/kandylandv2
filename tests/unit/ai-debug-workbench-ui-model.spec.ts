import { describe, expect, it } from "vitest";

import { buildAiDebugWorkbenchUiModel } from "@/lib/debug/ai-debug-workbench-ui-model";

describe("AI debug workbench UI model", () => {
  it("separates deterministic fallback summaries from repair proposal queues", () => {
    const model = buildAiDebugWorkbenchUiModel({
      fallbackStatus: "deterministic_fallback_summary",
      workItems: [{
        workItemId: "wi-1",
        title: "Pipeline failures",
        sourceKind: "pipeline_failure",
        sourceRef: "ops.pipeline",
        owner: "admin_debug",
        severity: "high",
        scoreImpact: 8,
        risk: ["ops"],
        status: "deterministic_plan_ready",
        sourceEvidence: ["709 failures"],
        redactionClass: "internal",
        allowedModes: ["inspect_only"],
        selectedMode: "inspect_only",
        applyEligibility: "inspect_only",
        validators: [],
        filesToInspect: [],
        filesPotentiallyTouched: [],
        rollbackPlan: "No mutation.",
        nextAction: "Inspect grouped failures.",
      }],
      proposals: [],
      routePreflightStatus: "no_sample",
    });

    expect(model.summaryLabel).toBe("Deterministic fallback summary");
    expect(model.proposalQueueLabel).toBe("Proposal queue");
    expect(model.rawEvidenceDefaultOpen).toBe(false);
    expect(model.routePreflightStatus).toBe("no_sample");
    expect(model.workItemRows[0]).toMatchObject({
      mode: "inspect_only",
      applyEligibility: "inspect_only",
    });
  });
});
