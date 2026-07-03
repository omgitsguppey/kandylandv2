export type FormalGateDisplayStatus =
  | "formal_required"
  | "source_ready_formal_missing"
  | "operator_confirmed_partial"
  | "artifact_attached"
  | "stale_artifact"
  | "not_source_bug";

export type FormalGateDisplayInput = {
  gateId: "runtime_provider_smoke" | "deployed_runtime_smoke" | "provider_smoke_artifact" | "admin_truth_sample_artifact" | string;
  sourceReady?: boolean;
  operatorConfirmedPaymentUsd?: number | null;
  operatorConfirmedProduct?: string | null;
  formalProviderArtifactAttached?: boolean;
  deployedRuntimeSmokeAttached?: boolean;
  formalAdminTruthSampleAttached?: boolean;
  adminTruthSourceArtifact?: string | null;
  staleArtifact?: boolean;
};

export type FormalGateDisplayResult = {
  gateId: string;
  displayStatus: FormalGateDisplayStatus;
  notSourceBug: boolean;
  evidencePaths: string[];
  nextAction: string;
  operatorSignal: string | null;
  formalProviderGateCleared: boolean;
  deployedRuntimeGateCleared: boolean;
  adminTruthStatus: "source_ready_formal_admin_sample_required" | "formal_admin_sample_attached" | "not_admin_gate";
};

export type PublicBetaCapDisplayState =
  | "source_only"
  | "site_activity_evidence_required"
  | "admin_source_activity_sample_required"
  | "refresh_due"
  | "review";

export type PublicBetaCapDisplay = {
  state: PublicBetaCapDisplayState;
  label: string;
  detail: string;
};

const PROVIDER_PATH = "agent/state/provider-smoke-evidence.generated.json";
const RUNTIME_PATH = "agent/state/runtime-smoke-evidence.generated.json";
const ADMIN_SOURCE_PATH = "agent/state/admin-truth-source-sample.generated.json";
const ADMIN_FORMAL_PATH = "redacted admin source activity sample";

export function buildFormalGateDisplay(input: FormalGateDisplayInput): FormalGateDisplayResult {
  const isAdmin = /admin_truth|admin-truth|admin sample/iu.test(input.gateId);
  const providerCleared = input.formalProviderArtifactAttached === true;
  const runtimeCleared = input.deployedRuntimeSmokeAttached === true;
  const adminCleared = input.formalAdminTruthSampleAttached === true;
  const operatorProduct = /gumdrops/iu.test(input.operatorConfirmedProduct ?? "") ? "GumDrop" : input.operatorConfirmedProduct ?? "operator";
  const operatorSignal = typeof input.operatorConfirmedPaymentUsd === "number" && Number.isFinite(input.operatorConfirmedPaymentUsd) && input.operatorConfirmedPaymentUsd > 0
    ? `${operatorProduct} payment operator-confirmed; provider-backed source evidence remains separate.`
    : null;
  const displayStatus: FormalGateDisplayStatus = input.staleArtifact
    ? "stale_artifact"
    : isAdmin && input.sourceReady && !adminCleared
      ? "source_ready_formal_missing"
      : operatorSignal && (!providerCleared || !runtimeCleared)
        ? "operator_confirmed_partial"
        : (providerCleared || runtimeCleared || adminCleared)
          ? "artifact_attached"
          : "formal_required";
  const evidencePaths = isAdmin
    ? [input.adminTruthSourceArtifact ?? ADMIN_SOURCE_PATH, ADMIN_FORMAL_PATH]
    : [PROVIDER_PATH, RUNTIME_PATH];

  return {
    gateId: input.gateId,
    displayStatus,
    notSourceBug: true,
    evidencePaths,
    nextAction: isAdmin
      ? "Produce a redacted admin source activity sample before clearing the admin lane."
      : "Produce provider-backed source activity evidence and deployed route evidence before clearing this gate.",
    operatorSignal,
    formalProviderGateCleared: providerCleared,
    deployedRuntimeGateCleared: runtimeCleared,
    adminTruthStatus: isAdmin
      ? adminCleared
        ? "formal_admin_sample_attached"
        : "source_ready_formal_admin_sample_required"
      : "not_admin_gate",
  };
}

export function resolvePublicBetaCapDetailForAdmin(detail?: string): PublicBetaCapDisplay {
  const normalized = String(detail ?? "").trim();
  const count = normalized.match(/\b\d+\b/u)?.[0];

  if (!normalized) {
    return { state: "review", label: "Readiness unavailable", detail: "The public beta evidence gate did not provide a reason." };
  }

  if (/source-only behavior evidence|targeted behavior tests/iu.test(normalized)) {
    return {
      state: "source_only",
      label: "Source-only evidence",
      detail: "Implemented behavior checks passed. Deployed route evidence, provider-backed source activity evidence, admin source activity evidence, and UI source contract checks stay separate.",
    };
  }

  if (/runtime\/provider smoke|provider smoke|runtime smoke|provider-backed site activity|deployed route evidence|deployed runtime route evidence/iu.test(normalized)) {
    const runtimeRecorded = /runtime smoke:\s*keep automated deployed runtime smoke evidence fresh|formal runtime smoke passed|runtimeartifactstatus=formal_runtime_smoke_passed|runtimegatepassed=true|deployed (runtime )?route evidence (is )?(current|recorded)|deployed route evidence is recorded/iu.test(normalized);
    const providerEvidenceDetail = runtimeRecorded
      ? "Produce redacted provider-backed source activity evidence. Deployed route evidence is recorded; keep it fresh."
      : "Produce redacted provider-backed source activity evidence and deployed route evidence.";
    return {
      state: "site_activity_evidence_required",
      label: "Source activity evidence required",
      detail: /operator-confirmed|operator confirmed|paypal/iu.test(normalized)
        ? `The payment note is product context only. ${providerEvidenceDetail}`
        : providerEvidenceDetail,
    };
  }

  if (/admin truth|sample evidence|truth sample/iu.test(normalized)) {
    return {
      state: "admin_source_activity_sample_required",
      label: "Admin source activity sample required",
      detail: "Produce a fresh redacted admin source activity sample before clearing this gate.",
    };
  }

  if (/report refresh required|report freshness|pr integrity|freshness window|current-head|current head|source commit|older than 72 hours|generated report|report metadata/iu.test(normalized)) {
    return {
      state: "refresh_due",
      label: "Refresh due",
      detail: /source metadata is stale/iu.test(normalized)
        ? "Public beta score source metadata is stale."
        : count ? `${count} required generated reports are outside the freshness window.` : "Required generated reports are outside the freshness window.",
    };
  }

  return {
    state: "review",
    label: "Needs review",
    detail: normalized
      .replace(/^Unknown evidence:\s*/iu, "")
      .replace(/^Stale evidence:\s*/iu, "")
      .replace(/^Runtime unverified:\s*/iu, "")
      .replace(/^Needs review:\s*/iu, "")
      .trim() || "Evidence needs review.",
  };
}

export function formatPublicBetaCapDetailForAdmin(detail?: string) {
  const display = resolvePublicBetaCapDetailForAdmin(detail);
  return `${display.label}: ${display.detail}`;
}

export function summarizePublicBetaCapDisplays(displays: PublicBetaCapDisplay[]) {
  const sourceOnlyCount = displays.filter((entry) => entry.state === "source_only").length;
  const typedEvidenceCount = displays.filter((entry) =>
    entry.state === "site_activity_evidence_required"
    || entry.state === "admin_source_activity_sample_required").length;
  const refreshCount = displays.filter((entry) => entry.state === "refresh_due").length;
  const reviewCount = displays.filter((entry) => entry.state === "review").length;
  const summary = [
    typedEvidenceCount ? `${typedEvidenceCount} typed source-activity gate${typedEvidenceCount === 1 ? "" : "s"}` : null,
    refreshCount ? `${refreshCount} refresh item${refreshCount === 1 ? "" : "s"}` : null,
    sourceOnlyCount ? `${sourceOnlyCount} source check${sourceOnlyCount === 1 ? "" : "s"}` : null,
    reviewCount ? `${reviewCount} review item${reviewCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(", ");

  return {
    sourceOnlyCount,
    typedEvidenceCount,
    refreshCount,
    reviewCount,
    needsTypedEvidence: typedEvidenceCount > 0,
    needsRefresh: typedEvidenceCount === 0 && refreshCount > 0,
    needsReview: typedEvidenceCount === 0 && refreshCount === 0 && (sourceOnlyCount > 0 || reviewCount > 0),
    summary,
  };
}

export function formatPublicBetaReadinessStatusForAdmin(input: { status?: string | null; reason?: string | null; capDetails?: string[] }) {
  const status = String(input.status ?? "").trim();
  const combined = [status, input.reason, ...(input.capDetails ?? [])].filter(Boolean).join(" ");
  if (!combined.trim()) return "Readiness unavailable";
  if (/runtime\/provider smoke|provider smoke|runtime smoke|provider-backed site activity|deployed route evidence|deployed runtime route evidence|admin truth|sample evidence|truth sample|external proof|proof required|source evidence required/iu.test(combined)) return "Source activity evidence required";
  if (/report refresh needed|report freshness|pr integrity|freshness window|current-head|current head|generated reports? are older/iu.test(combined)) return "Report refresh needed";
  if (/targeted behavior tests|source checks/iu.test(combined)) return "Source checks only";
  if (/unknown evidence/iu.test(combined)) return "Evidence needs classification";
  if (/stale evidence/iu.test(combined)) return "Refresh or evidence needed";
  if (/ready/iu.test(status)) return "Ready";
  return status.replaceAll("_", " ").replace(/\b\w/gu, (char) => char.toUpperCase());
}
