import type {
  AiDebugCriticReview,
  AiDebugCriticRisk,
  AiDebugRepairProposal,
} from "./ai-debug-orchestration-contract";

const PAYMENT_OR_GUMDROP_PATTERN = /paypal|payment|wallet|gumdrop|ledger|source-of-funds|balance/i;
const PRODUCTION_MUTATION_PATTERN = /production|live data|provider call|deploy|sync-sql/i;
const FORMAL_EVIDENCE_PATTERN = /formal|provider smoke|runtime smoke|admin truth sample/i;

function risk(hasRisk: boolean, fallback: AiDebugCriticRisk = "low"): AiDebugCriticRisk {
  return hasRisk ? "high" : fallback;
}

export function reviewAiDebugRepairProposal(proposal: AiDebugRepairProposal): AiDebugCriticReview {
  const issues: string[] = [];
  const changedText = proposal.filesToChange.join(" ");
  const allText = [
    proposal.mode,
    proposal.filesToInspect.join(" "),
    changedText,
    proposal.validatorsToRun.join(" "),
    proposal.rollbackPlan,
  ].join(" ");
  const touchesPayment = PAYMENT_OR_GUMDROP_PATTERN.test(allText);
  const productionMutation = PRODUCTION_MUTATION_PATTERN.test(allText);
  const formalEvidenceAsPatch = proposal.mode === "source_patch_candidate" && FORMAL_EVIDENCE_PATTERN.test(allText);
  const sourcePatch = proposal.mode === "source_patch_candidate";

  if (touchesPayment) issues.push("Proposal touches payment, wallet, PayPal, GumDrop math, or ledger/source-of-funds paths.");
  if (productionMutation) issues.push("Proposal suggests production mutation, provider call, deployment, or live sync.");
  if (formalEvidenceAsPatch) issues.push("Formal evidence requests must not become source patches.");
  if (proposal.autoApplyAllowed) issues.push("Repair proposals must not auto-apply without deterministic allowlist and human approval.");
  if (sourcePatch && proposal.validatorsToRun.length === 0) issues.push("Source patch candidate lacks validator coverage.");
  if (sourcePatch && !proposal.humanApprovalRequired) issues.push("Source patch candidate must require human approval.");
  if (sourcePatch && !proposal.criticReviewRequired) issues.push("Source patch candidate must carry critic review requirement.");

  let result: AiDebugCriticReview["result"] = "pass_to_human_review";
  if (proposal.mode === "inspect_only") result = "inspect_only";
  if (proposal.mode === "formal_evidence_request") result = "formal_evidence_required";
  if (proposal.mode === "manual_operator_action") result = "manual_operator_action";
  if (sourcePatch && issues.length > 0) result = "revise_required";
  if (touchesPayment || productionMutation || formalEvidenceAsPatch || proposal.autoApplyAllowed) result = "reject_unsafe";

  return {
    criticId: `critic-${proposal.proposalId}`,
    proposalId: proposal.proposalId,
    result,
    issues,
    securityRisk: risk(touchesPayment || productionMutation || proposal.autoApplyAllowed),
    costRisk: risk(touchesPayment || productionMutation),
    privacyRisk: risk(/support|chat|user|private/i.test(allText), sourcePatch ? "medium" : "low"),
    correctnessRisk: risk(touchesPayment || formalEvidenceAsPatch, sourcePatch && issues.length > 0 ? "medium" : "low"),
    testCoverageRisk: risk(sourcePatch && proposal.validatorsToRun.length === 0),
  };
}

export function summarizeRepairProposalReview(review: AiDebugCriticReview) {
  return {
    approvedForHumanReview: review.result === "pass_to_human_review" || review.result === "inspect_only",
    autoApplyBlocked: true,
    issueCount: review.issues.length,
    highestRisk: [review.securityRisk, review.costRisk, review.privacyRisk, review.correctnessRisk, review.testCoverageRisk].includes("high")
      ? "high"
      : [review.securityRisk, review.costRisk, review.privacyRisk, review.correctnessRisk, review.testCoverageRisk].includes("medium")
        ? "medium"
        : "low",
  };
}
