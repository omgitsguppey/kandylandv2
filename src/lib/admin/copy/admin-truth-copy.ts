import type { AdminSurfaceState } from "@/lib/admin-parity";
import {
  ADMIN_COPY_REGISTRY,
  ADMIN_OPERATOR_BADGE_LABELS,
  ADMIN_SURFACE_STATE_BADGE_LABELS,
  ADMIN_SURFACE_STATE_OPERATOR_COPY,
  type AdminCopyPatternKey,
  type AdminOperatorBadgeLabel,
  type AdminOperatorState,
  type AdminStatusSeverity,
} from "@/lib/admin/copy/admin-copy-registry";

export type AdminTruthCopyInput = {
  moduleKey?: string | null;
  technicalState?: string | null;
  sourceMode?: string | null;
  truthState?: string | null;
  sourceName?: string | null;
  routeName?: string | null;
  collectionName?: string | null;
  tableName?: string | null;
  lastVerifiedAt?: string | number | null;
  refreshStatus?: string | null;
  parityStatus?: string | null;
  confidence?: number | null;
  issueCount?: number | null;
  unavailableReason?: string | null;
  fallbackReason?: string | null;
  estimatedReason?: string | null;
  staleReason?: string | null;
  operatorImpact?: string | null;
  recommendedAction?: string | null;
  debugDetails?: unknown;
  debugPath?: string | null;
};

export type AdminTruthCopy = {
  headline: string;
  shortBody: string;
  badgeLabel: AdminOperatorBadgeLabel;
  severity: AdminStatusSeverity;
  actionLabel: string;
  operatorImpact: string;
  recommendedAction: string;
  technicalDetails: string;
  debugPath: string;
  canUserFix: boolean;
  canSystemRetry: boolean;
  showInMainUi: boolean;
  operatorState: AdminOperatorState;
  technicalState: string;
};

export type AdminDebugExplanation = {
  operatorSummary: string;
  whatThisMeans: string;
  whyItMatters: string;
  recommendedNextCheck: string;
  technicalEvidence: string;
  sourceDetails: string;
  debugPath: string;
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function asFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampCopy(text: string, maxLength = 150) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}.`;
}

function debugValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "not recorded";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "unserializable debug detail";
  }
}

function patternForInput(input: AdminTruthCopyInput): AdminCopyPatternKey {
  const technicalState = normalize(input.technicalState);
  const sourceMode = normalize(input.sourceMode);
  const truthState = normalize(input.truthState);
  const refreshStatus = normalize(input.refreshStatus);
  const parityStatus = normalize(input.parityStatus);
  const reasonText = [
    input.unavailableReason,
    input.fallbackReason,
    input.estimatedReason,
    input.staleReason,
  ].filter(Boolean).join(" ").toLowerCase();

  if (technicalState.includes("purchase") && (technicalState.includes("mismatch") || technicalState.includes("parity"))) {
    return "purchase_tracking_mismatch";
  }
  if (technicalState.includes("unlock") && (technicalState.includes("mismatch") || technicalState.includes("parity"))) {
    return "unlock_tracking_mismatch";
  }
  if (technicalState.includes("task") && (technicalState.includes("mismatch") || technicalState.includes("lifecycle"))) {
    return "task_lifecycle_mismatch";
  }
  if (technicalState.includes("notification_duplicate")) {
    return "notification_duplicate_prevented";
  }
  if (technicalState.includes("notification") && technicalState.includes("missing")) {
    return "notification_missing";
  }
  if (technicalState.includes("onboarding") || technicalState.includes("creator_intake")) {
    return "onboarding_discrepancy";
  }
  if (technicalState.includes("auth") && technicalState.includes("timing")) {
    return "auth_timing_unavailable";
  }
  if (technicalState.includes("event_context") || technicalState.includes("surface_context") || technicalState.includes("missing_sample")) {
    return "event_context_unavailable";
  }
  if (technicalState.includes("fake_zero")) {
    return "fake_zero_prevented";
  }
  if (input.estimatedReason || sourceMode.includes("estimated") || reasonText.includes("guest")) {
    return "guest_estimated";
  }
  if (technicalState.includes("source_mismatch") || sourceMode.includes("mixed")) {
    return "source_mismatch";
  }
  if (technicalState.includes("parity") || parityStatus.includes("fail") || parityStatus.includes("mismatch")) {
    return "parity_mismatch";
  }
  if (refreshStatus.includes("refreshing") || refreshStatus.includes("running") || refreshStatus.includes("queued")) {
    return "refresh_running";
  }
  if (technicalState.includes("realtime") || technicalState.includes("listener") || reasonText.includes("realtime")) {
    return "analytics_delayed";
  }
  if (sourceMode.includes("fallback") || sourceMode.includes("stale") || truthState.includes("stale")) {
    return "cache_stale_or_snapshot";
  }
  if (truthState.includes("unavailable") || sourceMode.includes("unavailable") || technicalState.includes("missing_source")) {
    return "no_verified_snapshot";
  }

  return "data_validation_moved_to_debug";
}

export function mapTechnicalStateToOperatorState(input: AdminTruthCopyInput): AdminOperatorState {
  return ADMIN_COPY_REGISTRY[patternForInput(input)].operatorState;
}

export function getAdminStatusSeverity(input: AdminTruthCopyInput | AdminSurfaceState): AdminStatusSeverity {
  if (typeof input === "string") {
    if (input === "failed") return "critical";
    if (input === "degraded" || input === "fallback" || input === "stale") return "warning";
    if (input === "loading" || input === "unavailable") return "notice";
    return "success";
  }

  return ADMIN_COPY_REGISTRY[patternForInput(input)].severity;
}

export function getAdminStatusBadgeLabel(input: AdminTruthCopyInput | AdminSurfaceState): AdminOperatorBadgeLabel {
  if (typeof input === "string") {
    return ADMIN_SURFACE_STATE_BADGE_LABELS[input];
  }

  const candidate = ADMIN_COPY_REGISTRY[patternForInput(input)].badgeLabel;
  return ADMIN_OPERATOR_BADGE_LABELS.includes(candidate) ? candidate : "REVIEW";
}

export function getAdminActionLabel(input: AdminTruthCopyInput): string {
  return input.recommendedAction === "No action needed." ? "No action needed" : ADMIN_COPY_REGISTRY[patternForInput(input)].actionLabel;
}

export function getAdminStatusExplanation(input: AdminTruthCopyInput | AdminSurfaceState): string {
  if (typeof input === "string") {
    const copy = ADMIN_SURFACE_STATE_OPERATOR_COPY[input];
    return `${copy.headline} ${copy.shortBody}`;
  }

  const copy = buildOperatorStatusCopy(input);
  return `${copy.headline} ${copy.shortBody}`;
}

export function buildDeveloperDebugCopy(input: AdminTruthCopyInput): string {
  const technicalState = input.technicalState || ADMIN_COPY_REGISTRY[patternForInput(input)].technicalState;
  const details = [
    `technicalState=${technicalState}`,
    input.moduleKey ? `moduleKey=${input.moduleKey}` : null,
    input.sourceMode ? `sourceMode=${input.sourceMode}` : null,
    input.truthState ? `truthState=${input.truthState}` : null,
    input.sourceName ? `sourceName=${input.sourceName}` : null,
    input.routeName ? `routeName=${input.routeName}` : null,
    input.collectionName ? `collectionName=${input.collectionName}` : null,
    input.tableName ? `tableName=${input.tableName}` : null,
    input.lastVerifiedAt ? `lastVerifiedAt=${input.lastVerifiedAt}` : null,
    input.refreshStatus ? `refreshStatus=${input.refreshStatus}` : null,
    input.parityStatus ? `parityStatus=${input.parityStatus}` : null,
    asFiniteNumber(input.confidence) !== null ? `confidence=${input.confidence}` : null,
    asFiniteNumber(input.issueCount) !== null ? `issueCount=${input.issueCount}` : null,
    input.debugDetails ? `debugDetails=${debugValue(input.debugDetails)}` : null,
  ].filter(Boolean);

  return details.join(" | ");
}

export function buildOperatorStatusCopy(input: AdminTruthCopyInput): AdminTruthCopy {
  const pattern = ADMIN_COPY_REGISTRY[patternForInput(input)];
  const headline = clampCopy(input.operatorImpact && pattern.key === "technical_debug_only" ? input.operatorImpact : pattern.headline, 90);
  const shortBody = clampCopy(
    input.unavailableReason && pattern.key === "no_verified_snapshot"
      ? "No verified source is ready yet."
      : pattern.shortBody,
    120,
  );

  return {
    headline,
    shortBody,
    badgeLabel: pattern.badgeLabel,
    severity: pattern.severity,
    actionLabel: getAdminActionLabel(input),
    operatorImpact: clampCopy(input.operatorImpact || pattern.operatorImpact),
    recommendedAction: clampCopy(input.recommendedAction || pattern.recommendedAction),
    technicalDetails: buildDeveloperDebugCopy(input),
    debugPath: input.debugPath || pattern.debugPath,
    canUserFix: pattern.canUserFix,
    canSystemRetry: pattern.canSystemRetry,
    showInMainUi: pattern.showInMainUi,
    operatorState: pattern.operatorState,
    technicalState: input.technicalState || pattern.technicalState,
  };
}

export function buildAdminDebugExplanation(input: AdminTruthCopyInput): AdminDebugExplanation {
  const operator = buildOperatorStatusCopy(input);
  const sources = [
    input.sourceName ? `source=${input.sourceName}` : null,
    input.routeName ? `route=${input.routeName}` : null,
    input.collectionName ? `collection=${input.collectionName}` : null,
    input.tableName ? `table=${input.tableName}` : null,
  ].filter(Boolean).join(" | ") || "source details not recorded";

  return {
    operatorSummary: `${operator.headline} ${operator.shortBody}`,
    whatThisMeans: operator.operatorImpact,
    whyItMatters: operator.operatorImpact,
    recommendedNextCheck: operator.recommendedAction,
    technicalEvidence: operator.technicalDetails,
    sourceDetails: sources,
    debugPath: operator.debugPath,
  };
}

export function summarizeAdminIssueForOperator(issue: string): string {
  const normalized = issue.toLowerCase();
  if (normalized.includes("guest") || normalized.includes("anonymous")) {
    return "Guest traffic is estimated for this range.";
  }
  if (normalized.includes("purchase") && (normalized.includes("parity") || normalized.includes("mismatch"))) {
    return ADMIN_COPY_REGISTRY.purchase_tracking_mismatch.headline;
  }
  if (normalized.includes("unlock") && (normalized.includes("parity") || normalized.includes("mismatch"))) {
    return ADMIN_COPY_REGISTRY.unlock_tracking_mismatch.headline;
  }
  if (normalized.includes("sample") && normalized.includes("missing")) {
    return "No sample is available for this range.";
  }
  if (normalized.includes("realtime") || normalized.includes("listener") || normalized.includes("observer")) {
    return "Live updates are delayed. Verified snapshot shown.";
  }
  if (normalized.includes("stale") || normalized.includes("cache") || normalized.includes("snapshot") || normalized.includes("fallback")) {
    return "Verified snapshot shown.";
  }
  if (normalized.includes("pipeline") || normalized.includes("coverage") || normalized.includes("fail")) {
    return "Tracking needs review.";
  }

  return "Needs review.";
}
