import type { AiRepairApproval, AiRepairCriticReview, AiRepairProposal } from "./ai-repair-workbench-contract";

export function evaluateAiRepairApprovalGate(input: {
  proposal: AiRepairProposal;
  criticReview?: AiRepairCriticReview | null;
  humanApproved?: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
}): AiRepairApproval {
  const { proposal, criticReview } = input;

  if (proposal.mode === "source_patch_candidate") {
    if (!criticReview || criticReview.result !== "pass_to_human_review") {
      return {
        status: "critic_required",
        humanApprovalRequired: true,
        applyAllowed: false,
        approvedBy: null,
        approvedAt: null,
        reason: "Source patch candidates require critic review before human approval.",
      };
    }
    if (!input.humanApproved) {
      return {
        status: "critic_passed_human_required",
        humanApprovalRequired: true,
        applyAllowed: false,
        approvedBy: null,
        approvedAt: null,
        reason: "Critic passed; human approval is still required before manual implementation.",
      };
    }
    return {
      status: "human_approved",
      humanApprovalRequired: true,
      applyAllowed: false,
      approvedBy: input.approvedBy ?? "admin",
      approvedAt: input.approvedAt ?? new Date(0).toISOString(),
      reason: "Human approved for manual implementation packet generation.",
    };
  }

  if (proposal.mode === "formal_evidence_request") {
    return {
      status: "not_applicable",
      humanApprovalRequired: false,
      applyAllowed: false,
      approvedBy: null,
      approvedAt: null,
      reason: "Formal evidence request is not a source patch and cannot be auto-applied.",
    };
  }

  if (proposal.mode === "manual_operator_action") {
    return {
      status: "not_applicable",
      humanApprovalRequired: true,
      applyAllowed: false,
      approvedBy: null,
      approvedAt: null,
      reason: "Manual operator action requires an operator outside the AI workbench.",
    };
  }

  return {
    status: "not_applicable",
    humanApprovalRequired: false,
    applyAllowed: false,
    approvedBy: null,
    approvedAt: null,
    reason: "Inspect-only proposal has no apply gate.",
  };
}
