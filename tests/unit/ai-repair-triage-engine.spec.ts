import { describe, expect, it } from "vitest";

import {
  buildDeterministicRepairPlan,
  classifyApplyEligibility,
  classifyRepairMode,
  groupRepairWorkItems,
  scoreRepairWorkItem,
} from "@/lib/debug/ai-repair-triage-engine";
import type { AiRepairWorkItem } from "@/lib/debug/ai-repair-workbench-contract";

function item(overrides: Partial<AiRepairWorkItem>): AiRepairWorkItem {
  return {
    workItemId: "wi-1",
    title: "Pipeline failures",
    sourceKind: "pipeline_failure",
    sourceRef: "ops.pipeline",
    owner: "admin_debug",
    severity: "high",
    scoreImpact: 8,
    risk: ["ops"],
    status: "detected",
    sourceEvidence: ["709 pipeline failures"],
    redactionClass: "internal",
    allowedModes: ["inspect_only", "source_patch_candidate"],
    selectedMode: "inspect_only",
    applyEligibility: "inspect_only",
    validators: ["npm run check:admin-debug-control-tower"],
    filesToInspect: ["src/app/api/admin/debug/assistant/route.ts"],
    filesPotentiallyTouched: [],
    rollbackPlan: "No mutation.",
    nextAction: "Group pipeline failures.",
    ...overrides,
  };
}

describe("AI repair triage engine", () => {
  it("uses deterministic priority scoring and groups repeated failures by root cause", () => {
    const score = scoreRepairWorkItem({
      severityScore: 90,
      scoreImpactScore: 80,
      blastRadiusScore: 70,
      evidenceCompletenessScore: 80,
      sourceCompletenessScore: 60,
      freshnessScore: 70,
      repairabilityScore: 60,
      safetyRiskScore: 10,
      contaminationRiskScore: 0,
    });

    expect(score.priorityScore).toBe(72.4);

    const grouped = groupRepairWorkItems([
      item({ workItemId: "wi-a", sourceRef: "pipeline:analytics", title: "Pipeline failures x709" }),
      item({ workItemId: "wi-b", sourceRef: "pipeline:analytics", title: "Pipeline failures x1" }),
    ]);

    expect(grouped.groups).toHaveLength(1);
    expect(grouped.groups[0].count).toBe(2);
    expect(grouped.rawItemCount).toBe(2);
  });

  it("keeps formal evidence and fallback work out of source patch apply states", () => {
    expect(classifyRepairMode(item({ sourceKind: "formal_evidence_required" }))).toBe("formal_evidence_request");
    expect(classifyRepairMode(item({ status: "blocked_missing_context" }))).toBe("inspect_only");
    expect(classifyApplyEligibility({ mode: "source_patch_candidate", criticPassed: false, humanApproved: false })).toBe("critic_required");
    expect(classifyApplyEligibility({ mode: "formal_evidence_request", criticPassed: true, humanApproved: true })).toBe("inspect_only");

    const plan = buildDeterministicRepairPlan(item({
      selectedMode: "source_patch_candidate",
      filesPotentiallyTouched: ["src/lib/debug/example.ts"],
    }));

    expect(plan.humanApprovalRequired).toBe(true);
    expect(plan.criticRequired).toBe(true);
    expect(plan.autoApplyAllowed).toBe(false);
  });
});
