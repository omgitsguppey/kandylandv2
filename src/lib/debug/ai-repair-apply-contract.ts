import type { AiRepairApplyResult, AiRepairProposal } from "./ai-repair-workbench-contract";

export function buildAiRepairApplyContract(proposal: AiRepairProposal): AiRepairApplyResult {
  if (proposal.mode === "artifact_refresh" && proposal.approval.status === "human_approved") {
    return {
      status: "artifact_refresh_ready",
      sourceMutationAllowed: false,
      productionMutationAllowed: false,
      instructions: [
        "Run only the deterministic artifact refresh command listed in validators.",
        "Review the generated diff before staging explicit paths.",
      ],
      validators: proposal.validators,
      rollbackPlan: proposal.rollbackPlan,
    };
  }

  if (proposal.mode === "source_patch_candidate") {
    return {
      status: "manual_patch_required",
      sourceMutationAllowed: false,
      productionMutationAllowed: false,
      instructions: [
        "Create a local source patch from this proposal outside the admin UI.",
        "Run the listed validators before review.",
        "Stage only explicit files after human inspection.",
      ],
      validators: proposal.validators,
      rollbackPlan: proposal.rollbackPlan,
    };
  }

  if (proposal.mode === "formal_evidence_request" || proposal.mode === "manual_operator_action") {
    return {
      status: "not_applicable",
      sourceMutationAllowed: false,
      productionMutationAllowed: false,
      instructions: ["No source or production mutation is allowed for this proposal mode."],
      validators: proposal.validators,
      rollbackPlan: proposal.rollbackPlan,
    };
  }

  return {
    status: "not_applicable",
    sourceMutationAllowed: false,
    productionMutationAllowed: false,
    instructions: ["Inspect-only proposal; review evidence and decide whether a new work item is needed."],
    validators: proposal.validators,
    rollbackPlan: proposal.rollbackPlan,
  };
}
