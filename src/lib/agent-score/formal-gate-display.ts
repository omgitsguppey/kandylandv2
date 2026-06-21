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
      : "Produce provider-backed site activity and deployed runtime route evidence before clearing this gate.",
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
