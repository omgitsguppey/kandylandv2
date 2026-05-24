import { describe, expect, it, vi } from "vitest";

import {
  buildAiDebugContextPacket,
  planAiDebugWorkItem,
} from "@/lib/server/ai-debug-planner";
import type { AiDebugWorkItem } from "@/lib/debug/ai-debug-orchestration-contract";

const queuedWorkItem: AiDebugWorkItem = {
  workItemId: "route-diagnostic-timeout",
  source: "route_diagnostic",
  severity: "p1",
  owner: "admin_debug",
  status: "preflight_ready",
  scoreImpact: 4,
  privacyClass: "internal",
  sourceRefs: ["src/app/api/admin/debug/route.ts"],
  redactionPolicy: "strip_user_bodies",
  contaminationRisk: "low",
  applyEligibility: "human_approval_required",
  nextAction: "Inspect the admin debug route diagnostic and propose a bounded source fix.",
};

describe("ai debug planner", () => {
  it("builds a bounded redacted context packet before any AI plan", () => {
    const packet = buildAiDebugContextPacket({
      workItem: queuedWorkItem,
      sourceFacts: {
        diagnostic: "admin debug route timeout",
        supportBody: "my email is user@example.com and password is secret",
        privateCreatorContent: "private creator body",
      },
      fileRefs: ["src/app/api/admin/debug/route.ts"],
      validatorRefs: ["npm run check:admin-debug-control-tower"],
      maxTokenBudget: 9000,
      modelRole: "admin_debug_fix_planner",
    });

    expect(packet.deterministicPreflight.status).toBe("pass");
    expect(packet.redactedUserSupportTaskFacts.join(" ")).not.toContain("user@example.com");
    expect(packet.redactedUserSupportTaskFacts.join(" ")).not.toContain("password");
    expect(packet.forbiddenPayloadFlags).toEqual(expect.arrayContaining(["raw_support_body_redacted", "private_creator_content_redacted"]));
    expect(packet.tokenEstimate).toBeGreaterThan(0);
    expect(packet.tokenEstimate).toBeLessThanOrEqual(packet.maxTokenBudget);
  });

  it("falls back deterministically without calling a provider when disabled", async () => {
    const runner = vi.fn();
    const result = await planAiDebugWorkItem({
      workItem: queuedWorkItem,
      contextPacket: buildAiDebugContextPacket({
        workItem: queuedWorkItem,
        sourceFacts: { diagnostic: "admin debug route timeout" },
        fileRefs: ["src/app/api/admin/debug/route.ts"],
        validatorRefs: ["npm run check:admin-debug-control-tower"],
        maxTokenBudget: 9000,
        modelRole: "admin_debug_fix_planner",
      }),
      settings: { enabled: false, model: "gemini-3.1-flash-lite-preview" },
      project: "kandydrops-by-ikandy",
      runner,
    });

    expect(runner).not.toHaveBeenCalled();
    expect(result.providerCallAttempted).toBe(false);
    expect(result.status).toBe("deterministic_fallback");
    expect(result.proposal.mode).toBe("inspect_only");
    expect(result.proposal.humanApprovalRequired).toBe(true);
    expect(result.proposal.autoApplyAllowed).toBe(false);
    expect(result.proposal.criticReviewRequired).toBe(false);
  });

  it("requires critic review for any source patch candidate", async () => {
    const runner = vi.fn().mockResolvedValue({
      proposalId: "proposal-route-timeout",
      mode: "source_patch_candidate",
      filesToInspect: ["src/app/api/admin/debug/route.ts"],
      filesToChange: ["src/app/api/admin/debug/route.ts"],
      validatorsToRun: ["npm run check:admin-debug-control-tower"],
      rollbackPlan: "Revert the bounded route helper extraction.",
      humanApprovalRequired: true,
      autoApplyAllowed: false,
      riskScore: 42,
    });

    const result = await planAiDebugWorkItem({
      workItem: queuedWorkItem,
      contextPacket: buildAiDebugContextPacket({
        workItem: queuedWorkItem,
        sourceFacts: { diagnostic: "admin debug route timeout" },
        fileRefs: ["src/app/api/admin/debug/route.ts"],
        validatorRefs: ["npm run check:admin-debug-control-tower"],
        maxTokenBudget: 9000,
        modelRole: "admin_debug_fix_planner",
      }),
      settings: { enabled: true, model: "gemini-3.1-flash-lite-preview" },
      project: "kandydrops-by-ikandy",
      runner,
    });

    expect(result.status).toBe("ai_plan_ready");
    expect(result.providerCallAttempted).toBe(true);
    expect(result.proposal.mode).toBe("source_patch_candidate");
    expect(result.proposal.criticReviewRequired).toBe(true);
    expect(result.proposal.autoApplyAllowed).toBe(false);
  });
});
