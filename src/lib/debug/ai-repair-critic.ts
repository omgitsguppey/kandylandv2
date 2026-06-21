import type { AiRepairCriticReview, AiRepairProposal } from "./ai-repair-workbench-contract";

const PROTECTED_SURFACE_PATTERN = /\b(payment|paypal|wallet|gumdrop|gumdrops|source of funds|auth|session|security|secret|token|password|private|support body|chat message)\b/iu;
const PAYMENT_GUMDROP_PATTERN = /\b(payment|paypal|wallet|gumdrop|gumdrops|source of funds)\b/iu;
const PRIVACY_PATTERN = /\b(private|support body|chat message|full uid|email|secret|token|password)\b/iu;

function includesProtectedText(proposal: AiRepairProposal, pattern: RegExp) {
  return [
    proposal.patchSummary,
    proposal.rollbackPlan,
    ...proposal.filesToChange,
    ...proposal.auditTrail,
  ].some((value) => pattern.test(value));
}

export function reviewAiRepairProposal(proposal: AiRepairProposal): AiRepairCriticReview {
  const issues: string[] = [];
  const touchesProtectedSurface = includesProtectedText(proposal, PROTECTED_SURFACE_PATTERN);
  const paymentGumdropRisk = includesProtectedText(proposal, PAYMENT_GUMDROP_PATTERN) ? "high" : "low";
  const privacyRisk = includesProtectedText(proposal, PRIVACY_PATTERN) ? "high" : "low";

  if (proposal.mode === "source_patch_candidate" && proposal.filesToChange.length === 0) {
    issues.push("source patch candidate lacks files to change");
  }
  if (proposal.mode === "source_patch_candidate" && proposal.validators.length === 0) {
    issues.push("source patch candidate lacks validators");
  }
  if (proposal.autoApplyAllowed) {
    issues.push("source patch cannot auto-apply from AI workbench");
  }
  if (paymentGumdropRisk === "high") {
    issues.push("payment/GumDrop protected surface requires explicit human implementation review");
  }
  if (privacyRisk === "high") {
    issues.push("privacy-sensitive context requires redaction and human review");
  }
  if (proposal.mode === "formal_evidence_request") {
    issues.push("typed evidence request cannot be treated as a source patch");
  }
  if (proposal.mode === "manual_operator_action") {
    issues.push("operator action cannot be auto-applied");
  }

  const rejectUnsafe = proposal.autoApplyAllowed || touchesProtectedSurface;
  const result: AiRepairCriticReview["result"] = rejectUnsafe
    ? "reject_unsafe"
    : proposal.mode === "source_patch_candidate"
      ? "pass_to_human_review"
      : proposal.mode === "formal_evidence_request"
        ? "formal_evidence_required"
        : proposal.mode === "manual_operator_action"
          ? "manual_operator_action"
          : "inspect_only";

  return {
    criticId: `critic-${proposal.proposalId}`,
    proposalId: proposal.proposalId,
    result,
    issues,
    securityRisk: touchesProtectedSurface ? "high" : "low",
    privacyRisk,
    costRisk: "low",
    dataIntegrityRisk: proposal.mode === "source_patch_candidate" ? "medium" : "low",
    paymentGumdropRisk,
    testCoverageRisk: proposal.validators.length > 0 ? "low" : "medium",
  };
}
