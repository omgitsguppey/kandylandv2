import type { AiRepairMode, AiRepairProposal } from "./ai-repair-workbench-contract";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const SECRET_ASSIGNMENT_PATTERN = /\b(secret|token|password|authorization|bearer|api[_-]?key)\s*=\s*\S+/giu;
const SECRET_WORD_PATTERN = /\b(secret|token|password|authorization|bearer|api[_-]?key)\b/giu;

function stableId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 80) || "proposal";
}

function initialApproval(mode: AiRepairMode) {
  if (mode === "source_patch_candidate") {
    return {
      status: "critic_required" as const,
      humanApprovalRequired: true,
      applyAllowed: false,
      approvedBy: null,
      approvedAt: null,
      reason: "Source patch candidates require critic review and human approval.",
    };
  }
  if (mode === "manual_operator_action") {
    return {
      status: "not_applicable" as const,
      humanApprovalRequired: true,
      applyAllowed: false,
      approvedBy: null,
      approvedAt: null,
      reason: "Manual operator action cannot be auto-applied by the assistant.",
    };
  }
  return {
    status: "not_applicable" as const,
    humanApprovalRequired: false,
    applyAllowed: false,
    approvedBy: null,
    approvedAt: null,
    reason: "Inspect-only or evidence proposals do not have an apply gate.",
  };
}

export function createAiRepairProposalRecord(input: {
  workItemId: string;
  mode: AiRepairMode;
  filesToChange: string[];
  validators: string[];
  patchSummary: string;
  rollbackPlan?: string;
  createdBy: string;
  source?: AiRepairProposal["source"];
  createdAt?: string;
}): AiRepairProposal {
  const approval = initialApproval(input.mode);
  return {
    proposalId: `proposal-${stableId(input.workItemId)}-${stableId(input.mode)}`,
    workItemId: input.workItemId,
    mode: input.mode,
    status: approval.status,
    createdAt: input.createdAt ?? new Date(0).toISOString(),
    createdBy: input.createdBy,
    source: input.source ?? "deterministic",
    filesToChange: input.filesToChange,
    patchSummary: input.patchSummary,
    validators: input.validators,
    criticReview: null,
    approval,
    applyResult: null,
    rollbackPlan: input.rollbackPlan ?? "No source or production mutation is allowed without a reviewed rollback note.",
    auditTrail: [
      "proposal_created",
      input.source === "live_ai" ? "live_ai_schema_validated" : "deterministic_plan",
      "silent_apply_blocked",
    ],
    autoApplyAllowed: false,
    criticRequired: input.mode === "source_patch_candidate",
    humanApprovalRequired: approval.humanApprovalRequired,
  };
}

export function sanitizeAiRepairProposalForStore(proposal: AiRepairProposal): AiRepairProposal {
  const redact = (value: string | undefined) => String(value ?? "")
    .replace(EMAIL_PATTERN, "[redacted_email]")
    .replace(SECRET_ASSIGNMENT_PATTERN, "[redacted_credential]")
    .replace(SECRET_WORD_PATTERN, "[redacted_credential]");
  return {
    ...proposal,
    patchSummary: redact(proposal.patchSummary),
    rollbackPlan: redact(proposal.rollbackPlan),
    auditTrail: [...proposal.auditTrail.map(redact), "sanitized_for_store"],
  };
}
