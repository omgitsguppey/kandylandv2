import type { AiRepairWorkbench } from "./ai-repair-workbench-contract";

function fallbackLabel(status: AiRepairWorkbench["fallbackStatus"]) {
  if (status === "deterministic_fallback_summary") return "Deterministic fallback summary";
  if (status === "live_model_summary") return "Live planner summary";
  return "Saved guidance summary";
}

export function buildAiDebugWorkbenchUiModel(input: {
  fallbackStatus: AiRepairWorkbench["fallbackStatus"];
  workbench?: Pick<AiRepairWorkbench, "workItems" | "workItemGroups" | "proposalQueue" | "routePreflightStatus" | "counts">;
  workItems?: AiRepairWorkbench["workItems"];
  proposals?: AiRepairWorkbench["proposalQueue"];
  routePreflightStatus?: AiRepairWorkbench["routePreflightStatus"];
}) {
  const workbench = input.workbench ?? {
    workItems: input.workItems ?? [],
    workItemGroups: [],
    proposalQueue: input.proposals ?? [],
    routePreflightStatus: input.routePreflightStatus ?? "unknown",
    counts: {
      workItems: input.workItems?.length ?? 0,
      inspectOnly: input.workItems?.filter((item) => item.selectedMode === "inspect_only").length ?? 0,
      sourcePatchCandidates: input.workItems?.filter((item) => item.selectedMode === "source_patch_candidate").length ?? 0,
      formalEvidenceRequests: 0,
      manualOperatorActions: 0,
      criticRequired: 0,
      criticPassed: 0,
      humanApprovalRequired: 0,
      applyReady: 0,
      autoApplyAllowed: 0,
    },
  };
  return {
    summaryLabel: fallbackLabel(input.fallbackStatus),
    proposalQueueLabel: "Proposal queue",
    rawEvidenceDefaultOpen: false,
    routePreflightStatus: workbench.routePreflightStatus,
    workItemRows: workbench.workItems.map((item) => ({
      workItemId: item.workItemId,
      title: item.title,
      sourceKind: item.sourceKind,
      priority: workbench.workItemGroups.find((group) => group.workItemIds.includes(item.workItemId))?.priorityScore ?? 0,
      mode: item.selectedMode,
      applyEligibility: item.applyEligibility,
      criticStatus: item.applyEligibility === "critic_required" ? "critic_required" : "not_applicable",
      approvalStatus: item.applyEligibility === "human_approval_required" ? "human_approval_required" : "not_applicable",
      nextAction: item.nextAction,
    })),
    proposalRows: workbench.proposalQueue.map((proposal) => ({
      proposalId: proposal.proposalId,
      workItemId: proposal.workItemId,
      mode: proposal.mode,
      status: proposal.status,
      approvalStatus: proposal.approval.status,
      validators: proposal.validators,
      rollbackPlan: proposal.rollbackPlan,
      autoApplyAllowed: proposal.autoApplyAllowed,
    })),
    counts: workbench.counts,
  };
}
