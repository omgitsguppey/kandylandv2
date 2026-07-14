import {
  PERSON_METRIC_DEFINITIONS,
  type PersonMetricId,
} from "@/lib/analytics/person-metrics-contract";
import type { PersonMetricsHydrationReport } from "@/lib/analytics/person-metrics-hydration";
import type { AnalyticsIdentityLineageOwnerSummaryState } from "@/lib/analytics/identity-link-contract";
import { USER_INDEX_MATERIALIZER_CONTRACT_VERSION } from "@/lib/user-indexes/user-tracking-index-contract";

export const INDIVIDUAL_USER_METRIC_TRUTH_VERSION = "2026.05.individual-user-metrics.1";
export const INDIVIDUAL_USER_METRIC_PROVEN_ZERO_FRESHNESS_TOLERANCE_MS = 15 * 60 * 1000;

export type UserMetricHydrationStatus = "hydrated" | "collecting" | "source_missing" | "bridge_missing" | "materializer_missing" | "permission_blocked" | "proven_zero";

export interface IndividualUserMetricSourceTruthInput {
  directUserSourceCount: number;
  displayedUserCount: number;
  identityLinkCount: number;
  identityLineageRejectedCount?: number;
  identityLineageOwnerState?: AnalyticsIdentityLineageOwnerSummaryState;
  materializerDocumentPresent: boolean;
  materializedUserCount?: number;
  sourceWindowStartMs?: number | null;
  sourceWindowEndMs?: number | null;
  materializerMetadata?: {
    materializerVersion?: unknown;
    sourceFingerprint?: unknown;
    publishedAtMs?: unknown;
  } | null;
  currentSourceFingerprint?: unknown;
  evaluatedAtMs?: number;
  freshnessToleranceMs?: number;
}

export type IndividualUserMetricMaterializerProofState =
  | "current"
  | "document_missing"
  | "materializer_version_missing"
  | "materializer_version_mismatch"
  | "source_fingerprint_missing"
  | "current_source_fingerprint_missing"
  | "source_fingerprint_mismatch";

export type IndividualUserMetricFreshnessState =
  | "fresh"
  | "materializer_proof_missing"
  | "evaluation_time_invalid"
  | "source_window_missing"
  | "source_window_invalid"
  | "source_window_in_future"
  | "materializer_publication_missing"
  | "materializer_publication_precedes_window"
  | "materializer_publication_in_future"
  | "materializer_publication_stale"
  | "source_window_stale";

export interface IndividualUserMetricSourceTruth {
  state: UserMetricHydrationStatus;
  valuesDisplayable: boolean;
  provenZero: boolean;
  directUserSourceCount: number;
  displayedUserCount: number;
  identityLinkCount: number;
  identityLineageRejectedCount: number;
  identityLineageOwnerState: AnalyticsIdentityLineageOwnerSummaryState;
  materializedUserCount: number;
  identityBridgeState: "linked" | "bridge_missing";
  materializerState: "hydrated" | "materializer_missing" | "materializer_stale";
  materializerProofState: IndividualUserMetricMaterializerProofState;
  materializerFreshnessState: IndividualUserMetricFreshnessState;
  materializerVersion: string | null;
  materializerSourceFingerprint: string | null;
  currentSourceFingerprint: string | null;
  materializerPublishedAtMs: number | null;
  evaluatedAtMs: number | null;
  freshnessToleranceMs: number;
  sourceWindowStartMs: number | null;
  sourceWindowEndMs: number | null;
  sourceTruth: "individual_user_metric_truth";
  explanation: string;
}

export interface IndividualUserMetricTruth {
  metricId: string;
  sourceEvents: string[];
  sourceFact: string;
  identityRequirement: "guest_or_session" | "signed_in_user" | "linked_person" | "creator_role" | "server_exact";
  countScope: "global_and_user" | "user_only" | "linked_person" | "creator_role";
  dedupeRule: string;
  confidenceRule: string;
  provenZeroRule: string;
  displayRule: string;
  debugFailureReason: "missingProducer" | "missingBridge" | "materializer_missing" | "permission_blocked" | "global_only_not_user_proof";
  panelHydrationMapping: string;
}

const REQUIREMENT_BY_ID: Partial<Record<PersonMetricId, IndividualUserMetricTruth["identityRequirement"]>> = {
  payment_approvals: "server_exact",
  drop_unlocks: "server_exact",
  unwraps: "server_exact",
  runtime_watch_sessions: "linked_person",
  creator_drop_manager_actions: "creator_role",
};

export const INDIVIDUAL_USER_METRIC_TRUTH: IndividualUserMetricTruth[] = PERSON_METRIC_DEFINITIONS.map((metric) => ({
  metricId: metric.id,
  sourceEvents: metric.eventNames,
  sourceFact: metric.sourceOfTruth,
  identityRequirement: REQUIREMENT_BY_ID[metric.id] ?? "guest_or_session",
  countScope: metric.aggregation.linkedPerson.enabled ? "global_and_user" : "user_only",
  dedupeRule: `${metric.aggregation.global.doubleCountPolicy}; linked=${metric.aggregation.linkedPerson.doubleCountPolicy}`,
  confidenceRule: `minimum=${metric.identityConfidence.minimum}; globalMinimum=${metric.identityConfidence.globalMinimum}`,
  provenZeroRule: "Zero is displayable only when provenZero=true for a bounded source window.",
  displayRule: "Missing individual user data is not zero; show collecting/source_missing/bridge_missing/materializer_missing/permission_blocked.",
  debugFailureReason: "global_only_not_user_proof",
  panelHydrationMapping: metric.materializer,
}));

export interface IndividualUserMetricStatus {
  metricId: PersonMetricId;
  globalCount: number;
  guestCount: number;
  signedInCount: number;
  linkedPersonCount: number;
  creatorRoleCount: number;
  userHydrationStatus: UserMetricHydrationStatus;
  globalOnlyMismatch: boolean;
  displayRule: string;
  debugFailureReason: string | null;
}

export interface IndividualUserMetricTruthReport {
  reportKey: "individual-user-metric-truth";
  status: "pass" | "review" | "classified";
  metricStatus: Record<PersonMetricId, IndividualUserMetricStatus>;
  globalVsUserMismatchCount: number;
  activeGlobalVsUserMismatchCount: number;
  classifiedNonBlockingMismatchCount: number;
  expectedNoUserMappingCount: number;
  missingIdentityLinkCount: number;
  unsafeUnknownMismatchCount: number;
  duplicateSuppressionCount: number;
  validationFailures: string[];
}

export function resolveIndividualUserMetricHydrationStatus(input: {
  globalCount: number;
  userCount: number;
  provenZero: boolean;
  missingProducer: string | null;
  missingBridge: string | null;
  explicitState?: UserMetricHydrationStatus | null;
}): UserMetricHydrationStatus {
  if (input.explicitState) return input.explicitState;
  if (input.userCount > 0) return "hydrated";
  if (input.provenZero) return "proven_zero";
  if (input.globalCount > 0) return "bridge_missing";
  if (input.missingBridge) return "materializer_missing";
  if (input.missingProducer) return "source_missing";
  return "collecting";
}

function finiteNonNegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function finitePositive(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function resolveMaterializerProofState(input: {
  materializerDocumentPresent: boolean;
  materializerVersion: string | null;
  materializerSourceFingerprint: string | null;
  currentSourceFingerprint: string | null;
}): IndividualUserMetricMaterializerProofState {
  if (!input.materializerDocumentPresent) return "document_missing";
  if (!input.materializerVersion) return "materializer_version_missing";
  if (input.materializerVersion !== USER_INDEX_MATERIALIZER_CONTRACT_VERSION) return "materializer_version_mismatch";
  if (!input.materializerSourceFingerprint) return "source_fingerprint_missing";
  if (!input.currentSourceFingerprint) return "current_source_fingerprint_missing";
  if (input.materializerSourceFingerprint !== input.currentSourceFingerprint) return "source_fingerprint_mismatch";
  return "current";
}

function resolveMaterializerFreshnessState(input: {
  hasCurrentMaterializerProof: boolean;
  evaluatedAtMs: number | null;
  freshnessToleranceMs: number;
  materializerPublishedAtMs: number | null;
  sourceWindowStartMs: number | null;
  sourceWindowEndMs: number | null;
}): IndividualUserMetricFreshnessState {
  if (!input.hasCurrentMaterializerProof) return "materializer_proof_missing";
  if (!input.evaluatedAtMs) return "evaluation_time_invalid";
  if (!input.sourceWindowStartMs || !input.sourceWindowEndMs) return "source_window_missing";
  if (input.sourceWindowEndMs < input.sourceWindowStartMs) return "source_window_invalid";
  if (!input.materializerPublishedAtMs) return "materializer_publication_missing";
  if (input.sourceWindowEndMs > input.evaluatedAtMs) return "source_window_in_future";
  if (input.materializerPublishedAtMs > input.evaluatedAtMs) return "materializer_publication_in_future";
  if (input.materializerPublishedAtMs < input.sourceWindowEndMs) return "materializer_publication_precedes_window";
  if (input.evaluatedAtMs - input.materializerPublishedAtMs > input.freshnessToleranceMs) {
    return "materializer_publication_stale";
  }
  if (input.evaluatedAtMs - input.sourceWindowEndMs > input.freshnessToleranceMs) return "source_window_stale";
  return "fresh";
}

export function buildIndividualUserMetricSourceTruth(
  input: IndividualUserMetricSourceTruthInput,
): IndividualUserMetricSourceTruth {
  const directUserSourceCount = Math.trunc(finiteNonNegative(input.directUserSourceCount));
  const displayedUserCount = finiteNonNegative(input.displayedUserCount);
  const identityLinkCount = Math.trunc(finiteNonNegative(input.identityLinkCount));
  const identityLineageRejectedCount = Math.trunc(finiteNonNegative(input.identityLineageRejectedCount));
  const identityLineageOwnerState = input.identityLineageOwnerState
    ?? (identityLineageRejectedCount > 0 ? "mixed_rejected" : identityLinkCount > 0 ? "current" : "missing");
  const materializedUserCount = finiteNonNegative(input.materializedUserCount);
  const sourceWindowStartMs = finitePositive(input.sourceWindowStartMs);
  const sourceWindowEndMs = finitePositive(input.sourceWindowEndMs);
  const materializerVersion = cleanString(input.materializerMetadata?.materializerVersion);
  const materializerSourceFingerprint = cleanString(input.materializerMetadata?.sourceFingerprint);
  const currentSourceFingerprint = cleanString(input.currentSourceFingerprint);
  const materializerPublishedAtMs = finitePositive(input.materializerMetadata?.publishedAtMs);
  const evaluatedAtMs = input.evaluatedAtMs === undefined
    ? Date.now()
    : finitePositive(input.evaluatedAtMs);
  const freshnessToleranceMs = finitePositive(input.freshnessToleranceMs)
    ?? INDIVIDUAL_USER_METRIC_PROVEN_ZERO_FRESHNESS_TOLERANCE_MS;
  const materializerProofState = resolveMaterializerProofState({
    materializerDocumentPresent: input.materializerDocumentPresent,
    materializerVersion,
    materializerSourceFingerprint,
    currentSourceFingerprint,
  });
  const hasCurrentMaterializerProof = materializerProofState === "current";
  const materializerFreshnessState = resolveMaterializerFreshnessState({
    hasCurrentMaterializerProof,
    evaluatedAtMs,
    freshnessToleranceMs,
    materializerPublishedAtMs,
    sourceWindowStartMs,
    sourceWindowEndMs,
  });
  const hasFreshBoundedSourceWindow = materializerFreshnessState === "fresh";
  const hasRejectedIdentityLineage = identityLineageRejectedCount > 0;
  const freshnessProofMissing = materializerFreshnessState === "evaluation_time_invalid"
    || materializerFreshnessState === "source_window_missing"
    || materializerFreshnessState === "materializer_publication_missing";

  const explicitState: UserMetricHydrationStatus = displayedUserCount > 0
    ? "hydrated"
    : input.materializerDocumentPresent && !hasCurrentMaterializerProof
      ? "materializer_missing"
      : input.materializerDocumentPresent && freshnessProofMissing
          ? "materializer_missing"
        : hasCurrentMaterializerProof && !hasFreshBoundedSourceWindow
          ? "collecting"
        : hasRejectedIdentityLineage
          ? "bridge_missing"
        : materializedUserCount > 0
          ? "bridge_missing"
        : hasFreshBoundedSourceWindow
          ? "proven_zero"
        : identityLinkCount > 0 && !input.materializerDocumentPresent
          ? "materializer_missing"
          : directUserSourceCount === 0
            ? "source_missing"
            : "collecting";
  const state = resolveIndividualUserMetricHydrationStatus({
    globalCount: 0,
    userCount: displayedUserCount,
    provenZero: hasFreshBoundedSourceWindow && !hasRejectedIdentityLineage && materializedUserCount === 0,
    missingProducer: directUserSourceCount === 0 ? "individual_user_sources" : null,
    missingBridge: identityLinkCount === 0 ? "identity_lineage_indexes" : null,
    explicitState,
  });
  const provenZero = state === "proven_zero";
  const valuesDisplayable = state === "hydrated" || provenZero;

  const explanation = state === "hydrated"
    ? "Observed user-scoped evidence is available for the Admin User projection."
    : state === "proven_zero"
      ? "A fresh bounded materialized source window proved zero user activity."
      : state === "bridge_missing"
        ? hasRejectedIdentityLineage
          ? `${identityLineageRejectedCount} identity lineage record(s) were excluded because owner-version proof is ${identityLineageOwnerState}; missing values are not zero.`
          : "Materialized user evidence exists, but the Admin User projection did not hydrate it; missing values are not zero."
      : state === "materializer_missing"
          ? input.materializerDocumentPresent
            ? hasCurrentMaterializerProof
              ? `The user tracking index lacks required freshness proof (${materializerFreshnessState}); missing values are not zero.`
              : `The user tracking index lacks current materializer proof (${materializerProofState}); missing values are not zero.`
            : "Identity linkage exists, but the user tracking materializer output is missing; missing values are not zero."
          : state === "source_missing"
            ? "No individual user source is available; missing values are not zero."
            : hasCurrentMaterializerProof && materializerFreshnessState !== "fresh"
              ? `Individual user evidence is not fresh (${materializerFreshnessState}); refresh the bounded materializer window before displaying zero.`
              : "Individual user sources are collecting without a bounded zero proof."

  return {
    state,
    valuesDisplayable,
    provenZero,
    directUserSourceCount,
    displayedUserCount,
    identityLinkCount,
    identityLineageRejectedCount,
    identityLineageOwnerState,
    materializedUserCount,
    identityBridgeState: identityLinkCount > 0 ? "linked" : "bridge_missing",
    materializerState: !hasCurrentMaterializerProof || freshnessProofMissing
      ? "materializer_missing"
      : hasFreshBoundedSourceWindow
        ? "hydrated"
        : "materializer_stale",
    materializerProofState,
    materializerFreshnessState,
    materializerVersion,
    materializerSourceFingerprint,
    currentSourceFingerprint,
    materializerPublishedAtMs,
    evaluatedAtMs,
    freshnessToleranceMs,
    sourceWindowStartMs: hasFreshBoundedSourceWindow ? sourceWindowStartMs : null,
    sourceWindowEndMs: hasFreshBoundedSourceWindow ? sourceWindowEndMs : null,
    sourceTruth: "individual_user_metric_truth",
    explanation,
  };
}

export function buildIndividualUserMetricTruthReport(report: PersonMetricsHydrationReport): IndividualUserMetricTruthReport {
  const metricStatus = PERSON_METRIC_DEFINITIONS.reduce<Record<PersonMetricId, IndividualUserMetricStatus>>((output, metric) => {
    const global = report.scopes.global.metrics[metric.id];
    const guest = report.scopes.guest.metrics[metric.id];
    const signedIn = report.scopes.signedIn.metrics[metric.id];
    const linked = report.scopes.linkedPerson.metrics[metric.id];
    const creator = report.scopes.creatorRole.metrics[metric.id];
    const userCount = guest.count + signedIn.count + linked.count + creator.count;
    const computedUserHydrationStatus = resolveIndividualUserMetricHydrationStatus({
      globalCount: global.count,
      userCount,
      provenZero: global.provenZero,
      missingProducer: report.metricStatus[metric.id].missingProducer,
      missingBridge: report.metricStatus[metric.id].missingBridge,
    });
    const userHydrationStatus = global.count > 0 && userCount === 0
      ? "bridge_missing"
      : report.userParityStatus?.[metric.id]?.state ?? computedUserHydrationStatus;
    output[metric.id] = {
      metricId: metric.id,
      globalCount: global.count,
      guestCount: guest.count,
      signedInCount: signedIn.count,
      linkedPersonCount: linked.count,
      creatorRoleCount: creator.count,
      userHydrationStatus,
      globalOnlyMismatch: global.count > 0 && userCount === 0,
      displayRule: userHydrationStatus === "proven_zero"
        ? "Display zero because a bounded source window proved zero."
        : "Missing user data is not zero; show the user-level source state.",
      debugFailureReason: global.count > 0 && userCount === 0 ? "global_only_not_user_proof" : null,
    };
    return output;
  }, {} as Record<PersonMetricId, IndividualUserMetricStatus>);

  const globalVsUserMismatchCount = Object.values(metricStatus).filter((metric) => metric.globalOnlyMismatch).length;
  
  const classifiedMismatches = Object.values(metricStatus)
    .filter((metric) => metric.globalOnlyMismatch && ["visits", "active_days", "page_views"].includes(metric.metricId));
  const classifiedNonBlockingMismatchCount = classifiedMismatches.length;
  const expectedNoUserMappingCount = classifiedMismatches.length;

  const unsafeUnknownMismatches = Object.values(metricStatus)
    .filter((metric) => metric.globalOnlyMismatch && !["visits", "active_days", "page_views"].includes(metric.metricId));
  const unsafeUnknownMismatchCount = unsafeUnknownMismatches.length;
  const activeGlobalVsUserMismatchCount = unsafeUnknownMismatchCount;
  
  const missingIdentityLinkCount = activeGlobalVsUserMismatchCount > 0 ? 1 : 0;

  const hasOnlyClassifiedMismatches = Object.values(metricStatus)
    .filter((metric) => metric.globalOnlyMismatch)
    .every((metric) => ["visits", "active_days", "page_views"].includes(metric.metricId));

  return {
    reportKey: "individual-user-metric-truth",
    status: globalVsUserMismatchCount === 0 ? "pass" : hasOnlyClassifiedMismatches ? "classified" : "review",
    metricStatus,
    globalVsUserMismatchCount,
    activeGlobalVsUserMismatchCount,
    classifiedNonBlockingMismatchCount,
    expectedNoUserMappingCount,
    missingIdentityLinkCount,
    unsafeUnknownMismatchCount,
    duplicateSuppressionCount: report.validation.duplicateGuestUserCountsSuppressed,
    validationFailures: (globalVsUserMismatchCount > 0 && !hasOnlyClassifiedMismatches)
      ? [`${globalVsUserMismatchCount} metric(s) have unclassified global-only hydration without user-level proof.`]
      : [],
  };
}

export function validateIndividualUserMetricTruth() {
  const failures: string[] = [];
  for (const metric of INDIVIDUAL_USER_METRIC_TRUTH) {
    if (metric.sourceEvents.length === 0) failures.push(`${metric.metricId} lacks source events.`);
    if (!metric.identityRequirement) failures.push(`${metric.metricId} lacks identity requirement.`);
    if (!metric.dedupeRule) failures.push(`${metric.metricId} lacks dedupe rule.`);
    if (!metric.provenZeroRule.includes("provenZero")) failures.push(`${metric.metricId} lacks provenZero rule.`);
  }
  return failures;
}
