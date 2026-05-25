import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { AI_DEBUG_ASSISTANT_MODEL } from "@/lib/ai-debug-assistant";
import { planAiRepair } from "@/lib/server/ai-repair-planner";
import type { AiRepairWorkItem } from "@/lib/debug/ai-repair-workbench-contract";

const workItem: AiRepairWorkItem = {
  workItemId: "wi-route",
  title: "Route context missing",
  sourceKind: "telemetry_gap",
  sourceRef: "orchestration:missing_route_context",
  owner: "telemetry",
  severity: "high",
  scoreImpact: 5,
  risk: ["data_integrity"],
  status: "preflight_ready",
  sourceEvidence: ["Missing route context"],
  redactionClass: "internal",
  allowedModes: ["inspect_only", "source_patch_candidate"],
  selectedMode: "source_patch_candidate",
  applyEligibility: "human_approval_required",
  validators: ["npm run check:debug-backlog-engine"],
  filesToInspect: ["src/lib/debug/debug-backlog-builder.ts"],
  filesPotentiallyTouched: ["src/lib/debug/debug-backlog-builder.ts"],
  rollbackPlan: "Revert source patch.",
  nextAction: "Prepare bounded patch candidate.",
};

describe("AI repair planner", () => {
  it("does not call providers unless explicit live generation is requested", async () => {
    const runner = vi.fn();
    const result = await planAiRepair({
      workItem,
      explicitLiveGenerationRequested: false,
      settings: { enabled: true, model: AI_DEBUG_ASSISTANT_MODEL },
      contextPacket: {
        packetId: "packet",
        workItemId: workItem.workItemId,
        boundedEvidence: ["Missing route context"],
        safeSourceSnippets: [],
        artifactRefs: [],
        validatorRefs: workItem.validators,
        routeRefs: [],
        redactedUserFacts: [],
        forbiddenPayloadsDetected: [],
        tokenEstimate: 10,
        maxInputTokens: 9000,
        modelRole: "admin_debug_fix_planner",
        privacyDecision: "safe",
        costDecision: "within_budget",
        sourceCompletenessScore: 90,
        missingContextReasons: [],
        providerCallRequired: false,
        selectedModeAfterSafety: "source_patch_candidate",
      },
      runner,
      project: "kandydrops-by-ikandy",
    });

    expect(runner).not.toHaveBeenCalled();
    expect(result.status).toBe("deterministic_plan_ready");
    expect(result.proposal.status).toBe("critic_required");
  });

  it("schema-validates explicit live planner responses and still requires approval", async () => {
    const runner = vi.fn().mockResolvedValue(JSON.stringify({
      summary: "Route context can be repaired with a bounded telemetry mapping patch.",
      diagnosis: "Missing route context is source-fixable.",
      proposedMode: "source_patch_candidate",
      filesToInspect: ["src/lib/debug/debug-backlog-builder.ts"],
      filesToChange: ["src/lib/debug/debug-backlog-builder.ts"],
      validatorsToRun: ["npm run check:debug-backlog-engine"],
      dataSafetyNotes: ["No raw user data required."],
      costSafetyNotes: ["No provider calls in validators."],
      riskAssessment: "Low if source-only.",
      rollbackPlan: "Revert patch.",
      humanApprovalRequired: true,
      confidence: "medium",
      unknowns: ["Need current source diff."],
    }));

    const result = await planAiRepair({
      workItem,
      explicitLiveGenerationRequested: true,
      settings: { enabled: true, model: AI_DEBUG_ASSISTANT_MODEL },
      contextPacket: {
        packetId: "packet",
        workItemId: workItem.workItemId,
        boundedEvidence: ["Missing route context"],
        safeSourceSnippets: [],
        artifactRefs: [],
        validatorRefs: workItem.validators,
        routeRefs: [],
        redactedUserFacts: [],
        forbiddenPayloadsDetected: [],
        tokenEstimate: 10,
        maxInputTokens: 9000,
        modelRole: "admin_debug_fix_planner",
        privacyDecision: "safe",
        costDecision: "within_budget",
        sourceCompletenessScore: 90,
        missingContextReasons: [],
        providerCallRequired: false,
        selectedModeAfterSafety: "source_patch_candidate",
      },
      runner,
      project: "kandydrops-by-ikandy",
    });

    expect(runner).toHaveBeenCalledOnce();
    expect(result.status).toBe("ai_plan_ready");
    expect(result.proposal.autoApplyAllowed).toBe(false);
    expect(result.proposal.approval.status).toBe("critic_required");
  });
});
