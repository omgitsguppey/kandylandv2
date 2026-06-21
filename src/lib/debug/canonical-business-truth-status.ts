import type {
  AdminUserTruthFreshnessState,
  AdminUserTruthIssue,
  AdminUserTruthSourceTruth,
} from "@/lib/admin-user-truth-contract";

export type CanonicalBusinessTruthStatus =
  | "healthy_current"
  | "source_ready_stale_snapshot"
  | "low_confidence_review"
  | "source_missing_actionable"
  | "formal_admin_sample_required"
  | "stale_artifact_refresh_required"
  | "unknown";

export type CanonicalBusinessTruthSourceClass =
  | "admin_snapshot_canonical"
  | "operator_confirmed_provider_formal_missing"
  | "provider_formal"
  | "materialized"
  | "legacy_fallback"
  | "valid_watch_time"
  | "estimated_watch_time"
  | "watch_time_unavailable"
  | "unavailable";

export type CanonicalBusinessTruthStatusInput = {
  generatedAt?: number | null;
  sourceFreshness?: AdminUserTruthFreshnessState | string | null;
  sourceTruth?: AdminUserTruthSourceTruth | string | null;
  confidenceScore?: number | null;
  issues?: AdminUserTruthIssue[];
  totalUsers?: number;
  verifiedPurchases?: number;
  totalRevenueUsd?: number;
  trackedUnwraps?: number;
  validWatchTimeMs?: number;
  currentHead?: string | null;
  artifactHead?: string | null;
  formalAdminSampleStatus?: string | null;
  operatorConfirmedPayment?: boolean;
  formalProviderGateCleared?: boolean;
  watchTimeSource?: "valid_watch_time" | "estimated_watch_time" | "unavailable" | "legacy_page_duration" | string | null;
  nowMs?: number;
};

export type CanonicalBusinessTruthStatusResult = {
  status: CanonicalBusinessTruthStatus;
  opsHealthInherited: false;
  freshnessCause: string;
  freshnessExplanation: string;
  confidenceReviewRequired: boolean;
  refreshCommand: "npm run check:admin-truth-source-sample";
  nextAction: string;
  userSourceClass: CanonicalBusinessTruthSourceClass;
  purchaseSourceClass: CanonicalBusinessTruthSourceClass;
  revenueSourceClass: CanonicalBusinessTruthSourceClass;
  unwrapSourceClass: CanonicalBusinessTruthSourceClass;
  watchSourceClass: CanonicalBusinessTruthSourceClass;
  watchMetricCanUsePageTime: false;
  revenueProviderFormalMissing: boolean;
  formalAdminSampleRequired: boolean;
};

const REFRESH_COMMAND = "npm run check:admin-truth-source-sample" as const;

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function text(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function hasUsableMetric(input: CanonicalBusinessTruthStatusInput) {
  return [
    input.totalUsers,
    input.verifiedPurchases,
    input.totalRevenueUsd,
    input.trackedUnwraps,
    input.validWatchTimeMs,
  ].some((value) => typeof value === "number" && Number.isFinite(value));
}

function sourceClassForTruth(sourceTruth: unknown): CanonicalBusinessTruthSourceClass {
  const normalized = text(sourceTruth);
  if (normalized === "canonical" || normalized === "server") return "admin_snapshot_canonical";
  if (normalized === "materialized") return "materialized";
  if (normalized === "legacy_fallback") return "legacy_fallback";
  return "unavailable";
}

function commerceSourceClass(input: CanonicalBusinessTruthStatusInput): CanonicalBusinessTruthSourceClass {
  if (input.formalProviderGateCleared) return "provider_formal";
  if (input.operatorConfirmedPayment) return "operator_confirmed_provider_formal_missing";
  return sourceClassForTruth(input.sourceTruth);
}

function watchSourceClass(input: CanonicalBusinessTruthStatusInput): CanonicalBusinessTruthSourceClass {
  const source = text(input.watchTimeSource);
  if (source === "valid_watch_time") return "valid_watch_time";
  if (source === "estimated_watch_time") return "estimated_watch_time";
  if (source === "legacy_page_duration" || source === "unavailable") return "watch_time_unavailable";
  if (numberValue(input.validWatchTimeMs) > 0) return "valid_watch_time";
  return "watch_time_unavailable";
}

function freshnessCause(input: CanonicalBusinessTruthStatusInput) {
  if (input.currentHead && input.artifactHead && input.currentHead !== input.artifactHead) return "head mismatch";
  if (text(input.sourceFreshness) === "stale") return "stale source inputs";
  if (text(input.formalAdminSampleStatus).includes("missing")) return "admin source activity sample missing";
  if (text(input.sourceFreshness).includes("failed") || text(input.sourceFreshness).includes("unavailable")) return "source missing";
  if ((input.issues ?? []).some((issue) => /stale/iu.test(issue.message))) return "stale source inputs";
  return "current source inputs";
}

export function classifyCanonicalBusinessTruthStatus(
  input: CanonicalBusinessTruthStatusInput,
): CanonicalBusinessTruthStatusResult {
  const confidenceScore = numberValue(input.confidenceScore, 0);
  const confidenceReviewRequired = confidenceScore < 80;
  const formalAdminSampleRequired = text(input.formalAdminSampleStatus).includes("missing");
  const sourceFreshness = text(input.sourceFreshness);
  const sourceTruth = text(input.sourceTruth);
  const cause = freshnessCause(input);
  const sourceMissing = !hasUsableMetric(input) || sourceTruth === "blocked" || sourceFreshness === "unavailable" || sourceFreshness === "failed";
  const status: CanonicalBusinessTruthStatus = sourceMissing
    ? "source_missing_actionable"
    : confidenceReviewRequired
      ? "low_confidence_review"
      : sourceFreshness === "stale" || cause !== "current source inputs"
        ? "source_ready_stale_snapshot"
        : formalAdminSampleRequired
          ? "formal_admin_sample_required"
          : "healthy_current";
  const revenueProviderFormalMissing = Boolean(input.operatorConfirmedPayment && !input.formalProviderGateCleared);

  return {
    status,
    opsHealthInherited: false,
    freshnessCause: cause,
    freshnessExplanation: sourceFreshness === "stale" && input.generatedAt
      ? `Snapshot stale: source inputs stale even though the report was generated recently.`
      : cause === "head mismatch"
        ? "Snapshot stale: artifact head does not match the current source head."
        : cause === "admin source activity sample missing"
          ? "Snapshot stale: admin source activity sample evidence is still missing."
          : cause === "source missing"
            ? "Business truth source is missing or unavailable."
            : "Business truth source inputs are current.",
    confidenceReviewRequired,
    refreshCommand: REFRESH_COMMAND,
    nextAction: confidenceReviewRequired
      ? `Confidence ${confidenceScore}%: review required; refresh the bounded admin source activity sample.`
      : sourceFreshness === "stale"
        ? `Refresh stale business truth with ${REFRESH_COMMAND}.`
        : formalAdminSampleRequired
          ? "Produce a redacted admin source activity sample before clearing the typed evidence gate."
          : "No business truth action required.",
    userSourceClass: sourceClassForTruth(input.sourceTruth),
    purchaseSourceClass: commerceSourceClass(input),
    revenueSourceClass: commerceSourceClass(input),
    unwrapSourceClass: sourceClassForTruth(input.sourceTruth),
    watchSourceClass: watchSourceClass(input),
    watchMetricCanUsePageTime: false,
    revenueProviderFormalMissing,
    formalAdminSampleRequired,
  };
}
