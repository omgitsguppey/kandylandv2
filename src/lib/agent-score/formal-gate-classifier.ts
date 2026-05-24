export type FormalGateClassifierStatus =
  | "formal_evidence_required"
  | "source_ready_formal_missing"
  | "operator_artifact_required"
  | "deployed_runtime_required"
  | "provider_artifact_required"
  | "admin_sample_required"
  | "not_source_bug";

export type FormalGateQueueClassification =
  | "source_fix_first"
  | "formal_evidence"
  | "external_owner_review"
  | "collapsed_info";

export type FormalGateClassifierInput = {
  id?: string;
  label?: string;
  statusText?: string;
  nextAction?: string;
  artifactPath?: string;
  scoreImpactEstimate?: number;
  blockedReason?: string;
  sourceReady?: boolean;
};

export type FormalGateClassifierResult = {
  status: FormalGateClassifierStatus;
  queueClassification: FormalGateQueueClassification;
  notSourceBug: boolean;
  evidencePath: string;
  nextAction: string;
  reason: string;
};

const PROVIDER_PATTERN = /provider|paypal|formal smoke|runtime_provider_smoke/iu;
const RUNTIME_PATTERN = /deployed runtime|runtime smoke|runtime unverified|debug_runtime_evidence/iu;
const ADMIN_SAMPLE_PATTERN = /admin truth|admin sample|admin_truth_sample|admin-truth-sample/iu;
const OPERATOR_PATTERN = /operator|manual|screenshot|visual|owner review|external billing|billing\/provider/iu;
const FORMAL_PATTERN = /formal|smoke|required|missing|unverified|sample|artifact|blocked_formal_evidence/iu;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function searchable(input: FormalGateClassifierInput) {
  return [
    input.id,
    input.label,
    input.statusText,
    input.nextAction,
    input.artifactPath,
    input.blockedReason,
  ].map(text).join("\n");
}

function evidencePathFor(input: FormalGateClassifierInput, status: FormalGateClassifierStatus) {
  if (input.artifactPath) return input.artifactPath;
  if (status === "provider_artifact_required") return "agent/state/provider-smoke-evidence.generated.json";
  if (status === "deployed_runtime_required") return "agent/state/runtime-smoke-evidence.generated.json";
  if (status === "admin_sample_required" || status === "source_ready_formal_missing") {
    return "agent/state/admin-truth-source-sample.generated.json + redacted first-party admin sample";
  }
  if (status === "operator_artifact_required") return "operator-supplied formal evidence artifact";
  return "source/debug lane";
}

function nextActionFor(input: FormalGateClassifierInput, status: FormalGateClassifierStatus) {
  if (input.nextAction) return input.nextAction;
  if (status === "provider_artifact_required") return "Attach formal provider smoke evidence before clearing this gate.";
  if (status === "deployed_runtime_required") return "Attach deployed runtime smoke evidence before clearing this gate.";
  if (status === "admin_sample_required" || status === "source_ready_formal_missing") {
    return "Attach a redacted first-party admin truth sample before clearing the formal admin gate.";
  }
  if (status === "operator_artifact_required") return "Attach the required operator artifact before clearing this gate.";
  return "Keep this item out of the source-fix queue unless a source failure is present.";
}

export function classifyFormalGate(input: FormalGateClassifierInput): FormalGateClassifierResult {
  const haystack = searchable(input);
  const lower = haystack.toLowerCase();
  const hasFormalLanguage = FORMAL_PATTERN.test(haystack);
  const sourceReadyFormalMissing = input.sourceReady === true && ADMIN_SAMPLE_PATTERN.test(haystack);
  const status: FormalGateClassifierStatus = sourceReadyFormalMissing
    ? "source_ready_formal_missing"
    : ADMIN_SAMPLE_PATTERN.test(haystack)
      ? "admin_sample_required"
      : PROVIDER_PATTERN.test(haystack)
        ? "provider_artifact_required"
        : RUNTIME_PATTERN.test(haystack)
          ? "deployed_runtime_required"
          : OPERATOR_PATTERN.test(haystack)
            ? "operator_artifact_required"
            : hasFormalLanguage
              ? "formal_evidence_required"
              : "not_source_bug";
  const formalOrExternal = status !== "not_source_bug" || /blocked_external|external_required|owner_review/iu.test(lower);
  const queueClassification: FormalGateQueueClassification =
    /external billing|owner_review|owner review|cost/iu.test(haystack)
      ? "external_owner_review"
      : formalOrExternal
        ? "formal_evidence"
        : input.scoreImpactEstimate && input.scoreImpactEstimate > 0 && /source|debug|route|telemetry/iu.test(haystack)
          ? "source_fix_first"
        : "collapsed_info";

  return {
    status,
    queueClassification,
    notSourceBug: queueClassification !== "source_fix_first",
    evidencePath: evidencePathFor(input, status),
    nextAction: nextActionFor(input, status),
    reason: formalOrExternal
      ? "This item requires a formal/operator evidence artifact and must not be treated as a source-code fix."
      : "No source-code failure is present in this gate classification.",
  };
}

export function isFormalGateSourceFix(result: FormalGateClassifierResult) {
  return result.queueClassification === "source_fix_first" && !result.notSourceBug;
}

export function isFormalGateText(input: FormalGateClassifierInput) {
  return classifyFormalGate(input).queueClassification === "formal_evidence";
}

export function shouldCollapseExternalReview(input: FormalGateClassifierInput) {
  return classifyFormalGate(input).queueClassification === "external_owner_review";
}
