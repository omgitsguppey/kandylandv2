import { describe, expect, it } from "vitest";

import { reviewAiRepairProposal } from "@/lib/debug/ai-repair-critic";
import { evaluateAiRepairApprovalGate } from "@/lib/debug/ai-repair-approval-gate";
import type { AiRepairProposal } from "@/lib/debug/ai-repair-workbench-contract";

function proposal(overrides?: Partial<AiRepairProposal>): AiRepairProposal {
  return {
    proposalId: "proposal-1",
    workItemId: "wi-1",
    mode: "source_patch_candidate",
    status: "critic_required",
    createdAt: "2026-05-25T00:00:00.000Z",
    createdBy: "deterministic",
    source: "deterministic",
    filesToChange: ["src/lib/debug/debug-backlog-builder.ts"],
    patchSummary: "Patch telemetry mapping.",
    validators: ["npm run check:debug-backlog-engine"],
    criticReview: null,
    approval: { status: "critic_required", humanApprovalRequired: true, applyAllowed: false, approvedBy: null, approvedAt: null, reason: "Source patches require review." },
    applyResult: null,
    rollbackPlan: "Revert patch.",
    auditTrail: ["created"],
    autoApplyAllowed: false,
    criticRequired: true,
    humanApprovalRequired: true,
    ...overrides,
  };
}

describe("AI repair critic and approval gate", () => {
  it("requires critic and human approval for source patch candidates", () => {
    const review = reviewAiRepairProposal(proposal());
    const gate = evaluateAiRepairApprovalGate({ proposal: proposal({ criticReview: review }), criticReview: review });

    expect(review.result).toBe("pass_to_human_review");
    expect(gate.status).toBe("critic_passed_human_required");
    expect(gate.applyAllowed).toBe(false);
  });

  it("rejects payment or GumDrop auto-apply proposals", () => {
    const review = reviewAiRepairProposal(proposal({
      filesToChange: ["src/lib/gumdrop-ledger.ts"],
      patchSummary: "Change GumDrop source of funds.",
      autoApplyAllowed: true,
    }));

    expect(review.result).toBe("reject_unsafe");
    expect(review.issues.join(" ")).toMatch(/payment|GumDrop|auto-apply/i);
  });
});
