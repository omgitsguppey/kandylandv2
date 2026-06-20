import {
  createCanonicalAnalyticsEvent,
  type AnalyticsActorType,
  type AnalyticsObjectType,
  type CanonicalAnalyticsEvent,
} from "@/lib/analytics/analytics-event-contract";
import type { LegacyRecoveredEventRecord, LegacyRecoveryConfidenceLabel } from "@/lib/analytics/legacy-recovery-contract";
import type { GumdropLedgerSourceBucket } from "@/lib/math/gumdrop-ledger-math";

export const RECOVERY_TIMELINE_SPINE_VERSION = "2026.06.recovery-timeline-spine.1";
export const ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS = 12;
export const LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT = 95;

export const RECOVERY_TIMELINE_SOURCE_PRECEDENCE = [
  "first_party_event_fact",
  "transaction_ledger",
  "gumdrop_ledger",
  "unlock_record",
  "reward_record",
  "behavioral_timeline_fact",
  "legacy_analytics",
  "ga4_evidence",
  "unknown_legacy",
] as const;

export type RecoveryTimelineSource = typeof RECOVERY_TIMELINE_SOURCE_PRECEDENCE[number];

export type RecoveryTimelineClassification =
  | "canonical"
  | "corroborating_evidence"
  | "weak_match"
  | "unknown_legacy"
  | "duplicate_candidate"
  | "rejected";

export type RecoveryProductDomain =
  | "wallet_payment"
  | "gumdrop_economy"
  | "drop_unlock"
  | "daily_rewards"
  | "telemetry_behavior"
  | "identity_handoff"
  | "support_recovery"
  | "admin_debug"
  | "unknown";

export type RecoveryActorScope =
  | "global"
  | "guest"
  | "signed_in_user"
  | "linked_person"
  | "creator_role"
  | "admin_operator"
  | "system"
  | "unknown";

export type RecoveryTruthEligibility =
  | "product_truth_eligible"
  | "evidence_only"
  | "manual_review_required"
  | "ledger_corroboration_required"
  | "not_eligible"
  | "rejected";

export type RecoveryConfidence = LegacyRecoveryConfidenceLabel | "canonical" | "ledger_confirmed";

export type LaunchCriticalEventFamilyId =
  | "page_view"
  | "auth_signup"
  | "wallet_open"
  | "purchase"
  | "drop_preview"
  | "cta"
  | "unlock"
  | "viewer_open"
  | "watch_start"
  | "watch_end"
  | "creator_follow"
  | "creator_drop_submit"
  | "admin_review";

export type RecoveryMetricEvidenceKind = "observed" | "modeled" | "inferred" | "cached" | "missing";
export type RecoveryMetricEvidenceKindInput = RecoveryMetricEvidenceKind | "modelled";

export const RECOVERY_METRIC_EVIDENCE_KINDS = ["observed", "modeled", "inferred", "cached", "missing"] as const satisfies readonly RecoveryMetricEvidenceKind[];

export type RecoveryMetricConfidenceBand = "verified" | "strong" | "directional" | "weak" | "missing";

export const RECOVERY_METRIC_CONFIDENCE_BANDS = [
  "verified",
  "strong",
  "directional",
  "weak",
  "missing",
] as const satisfies readonly RecoveryMetricConfidenceBand[];

export type RecoveryMetricSourceTruth =
  | "first_party_event_fact"
  | "server_ledger"
  | "watch_session_rollup"
  | "admin_action_fact"
  | "ga4_evidence_only"
  | "legacy_directional_only"
  | "hot_cache_snapshot"
  | "source_missing";

export const RECOVERY_METRIC_SOURCE_TRUTHS = [
  "first_party_event_fact",
  "server_ledger",
  "watch_session_rollup",
  "admin_action_fact",
  "ga4_evidence_only",
  "legacy_directional_only",
  "hot_cache_snapshot",
  "source_missing",
] as const satisfies readonly RecoveryMetricSourceTruth[];

export type RecoveryMetricFreshnessState =
  | "source_current"
  | "late_arrival_window"
  | "cached"
  | "refresh_due"
  | "source_missing"
  | "external_evidence_required";

export const RECOVERY_METRIC_FRESHNESS_STATES = [
  "source_current",
  "late_arrival_window",
  "cached",
  "refresh_due",
  "source_missing",
  "external_evidence_required",
] as const satisfies readonly RecoveryMetricFreshnessState[];

export type RecoveryMetricDedupeDimension =
  | "event_id"
  | "session_id"
  | "identity_link_id"
  | "user_id"
  | "guest_id"
  | "route"
  | "object_id"
  | "timestamp_window"
  | "semantic_action";

export const RECOVERY_METRIC_DEDUPE_DIMENSIONS = [
  "event_id",
  "session_id",
  "identity_link_id",
  "user_id",
  "guest_id",
  "route",
  "object_id",
  "timestamp_window",
  "semantic_action",
] as const satisfies readonly RecoveryMetricDedupeDimension[];

export const RECOVERY_METRIC_DEDUPE_RULES = {
  dedupeDimensions: [...RECOVERY_METRIC_DEDUPE_DIMENSIONS],
  includesEventId: true,
  includesSessionId: true,
  includesIdentityLinkId: true,
  includesUserIdOrGuestId: true,
  includesRoute: true,
  includesObjectId: true,
  includesTimestampWindow: true,
  includesSemanticAction: true,
  eventIdIsPrimaryWhenPresent: true,
  identityLinkPrecedesUserOrGuestWhenPresent: true,
  fallbackUsesSessionIdentityRouteObjectAndTimestampWindow: true,
} as const;

export const RECOVERY_METRIC_PRODUCT_TRUTH_POLICY = {
  firstPartyPrimary: true,
  ga4EvidenceOnly: true,
  legacyEvidenceOnly: true,
  missingIsNotZero: true,
  noBalanceOrEntitlementMutation: true,
} as const;

export const RECOVERY_METRIC_MODELING_POLICY = {
  canonicalModeledSpelling: "modeled",
  acceptsBritishModelledAlias: true,
  modeledEvidenceCanCalibrateOnly: true,
  observedFirstPartyHoldbackRequired: true,
  consentModeLikeSignalsAreEvidenceOnly: true,
  lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
  visibilityCountingRequiresExplicitThreshold: true,
  visibilityMinimumVisiblePercent: 50,
  visibilityMinimumVisibleMs: 1_000,
  missingSourceNeverBecomesZero: true,
  productTruthRequiresFirstPartyOrLedgerCorroboration: true,
} as const;

export const RECOVERY_METRIC_POLICY_PROOF_BOUNDARY = "policy_metadata_only_not_runtime_provider_or_admin_truth_proof" as const;
export type RecoveryMetricPolicyProofBoundary = typeof RECOVERY_METRIC_POLICY_PROOF_BOUNDARY;

export const RECOVERED_METRIC_METADATA_PROOF_BOUNDARY = "metadata_completeness_only_not_source_runtime_provider_or_admin_truth_proof" as const;
export type RecoveredMetricMetadataProofBoundary = typeof RECOVERED_METRIC_METADATA_PROOF_BOUNDARY;

export type LaunchHistoryDaySourceTruthState =
  | "first_party_recovered"
  | "mixed_evidence"
  | "second_source_only"
  | "fallback_only"
  | "source_missing";

export type LaunchHistoryDayRecoveryConfidence = "verified" | "mixed" | "partial" | "fallback" | "unknown";

export type LaunchHistoryDaySourceCounts = {
  first_party: number;
  ga4: number;
  historicalSnapshot: number;
  legacySupport: number;
};

export type LaunchHistoryDaySourceCountKey = keyof LaunchHistoryDaySourceCounts;
export type LaunchHistoryDaySourceCountRecord = Partial<Record<LaunchHistoryDaySourceCountKey, number | null | undefined>>;

export type LaunchHistoryDayRecoveryState = {
  dayKey: string;
  expected: true;
  recovered: boolean;
  evidenceObserved: boolean;
  productTruthRecovered: boolean;
  sourceTruthState: LaunchHistoryDaySourceTruthState;
  sourceCounts: LaunchHistoryDaySourceCounts;
  missingRangesBySource: {
    first_party: string[];
    ga4: string[];
    historicalSnapshot: string[];
    legacySupport: string[];
  };
  duplicateRanges: string[];
  internalAdminExcludedCount: number | null;
  duplicateSourceCount: number;
  confidence: LaunchHistoryDayRecoveryConfidence;
  sourceTruth: RecoveryMetricSourceTruth;
  freshnessState: RecoveryMetricFreshnessState;
  evidenceKind: RecoveryMetricEvidenceKind;
  confidenceScore: number;
  confidenceBand: RecoveryMetricConfidenceBand;
  dedupeKey: string;
  dedupeDimensions: RecoveryMetricDedupeDimension[];
  lateArrivalWindowDays: typeof ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS;
  reason: string;
  nextAction: string;
};

export type LaunchHistoryFormalDayRecoveryState = Omit<
  LaunchHistoryDayRecoveryState,
  "missingRangesBySource" | "sourceCounts"
> & {
  formalEvidenceState: "local_evidence_window" | "outside_evidence_window";
  sourceCountsKnown: boolean;
  sourceCounts: {
    first_party: number | null;
    ga4: number | null;
    historicalSnapshot: number | null;
    legacySupport: number | null;
  };
  missingRangesBySource: {
    first_party: string[];
    ga4: string[];
    historicalSnapshot: string[];
    legacySupport: string[];
  };
};

export type FormalLaunchRangeRecoveryState = {
  launchStartDayKey: string;
  expectedThroughDayKey: string;
  expectedDayCount: number;
  localEvidenceDayCount: number;
  approvedCoverageDayCount: number;
  localEvidenceRanges: string[];
  unprovenRanges: string[];
  state: "all_launch_range_proven" | "formal_proof_missing";
  reason: string;
  dayCoverage: LaunchHistoryFormalDayRecoveryState[];
  unprovenDayCount: number;
};

export type LaunchRecoveryCoverageState = "available" | "partial" | "source_missing";

export type LaunchRecoverySourceGateBlocker = {
  blocker:
    | "local_evidence_missing"
    | "stale_evidence"
    | "all_launch_range_proof_missing"
    | "launch_history_coverage_unavailable"
    | "first_party_coverage_incomplete"
    | "launch_critical_family_coverage_below_floor"
    | "source_agreement_failed";
  reason: string;
  nextAction: string;
};

export type LaunchRecoverySourceGateState = {
  canClearSourceGate: boolean;
  sourceGateReason: string;
  sourceGateBlockers: LaunchRecoverySourceGateBlocker[];
  allLaunchRangeProofReason: string;
};

export type LaunchHistoryRangeProofCoverageWindowKind =
  | "all_range_historical_route"
  | "all_range_historical_export"
  | "admin_truth_sample"
  | "fixture_only_local_window"
  | "local_source_window"
  | "unknown";

export type LaunchHistoryRangeProofState = {
  expectedRangeSource: LaunchHistoryRangeProofCoverageWindowKind;
  coverageWindowKind: LaunchHistoryRangeProofCoverageWindowKind;
  allLaunchRangeProven: boolean;
  formalRangeStartDayKey: string | null;
  formalRangeEndDayKey: string | null;
  formalExpectedDayCount: number;
  evidenceDayCount: number;
  unprovenRanges: string[];
  reason: string;
};

export type AllLaunchHistoricalRouteRangeProofState = {
  allLaunchRangeProven: boolean;
  formalLaunchRange: FormalLaunchRangeRecoveryState;
  rangeProof: LaunchHistoryRangeProofState;
};

export type LaunchHistoryCoverageProofMode = "local_export" | "admin_truth_sample";

export type LaunchHistorySourceAgreementCoverageWindowKind =
  | "admin_truth_sample"
  | "all_range_historical_export"
  | "local_source_window";

export type LaunchHistoryCoverageRangeProofEligibility = {
  coverageWindowKind: LaunchHistorySourceAgreementCoverageWindowKind;
  proofModeAllowsLaunchRangeProof: boolean;
  explicitAllLaunchRangeProof: boolean;
  declaredCountsMatchRows: boolean;
  allLaunchRangeProven: boolean;
};

export type LaunchHistoryCoverageSummaryState = {
  firstRecoveredDayKey: string | null;
  lastRecoveredDayKey: string | null;
  recoveredDayCount: number;
  evidenceObservedDayCount: number;
  productTruthRecoveredDayCount: number;
  secondSourceOnlyDayCount: number;
  fallbackOnlyDayCount: number;
  firstPartyCoverage: {
    state: LaunchRecoveryCoverageState;
    canPromoteProductTruth: boolean;
    reason: string;
  };
  launchCoverage: {
    state: LaunchRecoveryCoverageState;
    reason: string;
  };
};

export type LaunchHistorySourceDayCoverageState = {
  expectedDayKeys: string[];
  sourceDayCounts: {
    firstParty: number;
    first_party: number;
    ga4: number;
    historicalSnapshot: number;
    legacySupport: number;
  };
  missingDaysBySource: {
    first_party: string[];
    ga4: string[];
    historical_snapshot: string[];
    legacy_support: string[];
  };
  firstPartyMissingDayKeys: string[];
  sourceMissingDayKeys: string[];
};

export type LaunchHistorySourceCoverageRowsState = {
  expectedDayKeys: string[];
  dayCoverage: LaunchHistoryDayRecoveryState[];
  sourceDayCoverage: LaunchHistorySourceDayCoverageState;
  sourceDayCounts: LaunchHistorySourceDayCoverageState["sourceDayCounts"];
  missingDaysBySource: LaunchHistorySourceDayCoverageState["missingDaysBySource"];
  firstPartyMissingDayKeys: string[];
  sourceMissingDayKeys: string[];
  duplicateDayKeys: string[];
};

export type LaunchHistoryDisplaySummaryState = {
  sourceLabel: string;
  confidenceLabel: "verified" | "strong" | "directional" | "weak" | "unknown" | "review";
  coverageLabel: string;
  sourceWindowLabel: string | null;
  coverageDenominatorKind?: "approved_launch_range" | "formal_launch_range" | "evidence_window" | "unknown";
  missingRangeCount: number;
  sourceAgreementState: string;
  sourceRoleCounts?: Record<string, number>;
  sourceGateBlockers?: LaunchRecoverySourceGateBlocker[];
  mathReasonSamples?: Array<{
    familyId: string;
    sourceRole: string;
    mathReason: string;
    nextAction: string;
  }>;
};

export type LaunchHistoryDisplaySummaryCoverageInput = {
  expectedDayCount?: number | null;
  recoveredDayCount?: number | null;
  firstRecoveredDayKey?: string | null;
  evidenceObservedDayCount?: number | null;
  productTruthRecoveredDayCount?: number | null;
  sourceDayCounts?: {
    firstParty?: number | null;
    first_party?: number | null;
    ga4?: number | null;
    historicalSnapshot?: number | null;
    legacySupport?: number | null;
  } | null;
  firstPartyCoverage?: {
    state?: LaunchRecoveryCoverageState | string | null;
    coveredDayCount?: number | null;
    missingRanges?: string[] | null;
  } | null;
  rangeProof?: {
    allLaunchRangeProven?: boolean | null;
    formalExpectedDayCount?: number | null;
    evidenceDayCount?: number | null;
    coverageWindowKind?: string | null;
  } | null;
  missingRanges?: string[] | null;
  days?: Array<{ confidenceBand?: string | null }> | null;
  eventFamilyCoverage?: {
    familySourceStates?: LaunchRecoverySummaryRecord[] | null;
  } | null;
  sourceGateBlockers?: LaunchRecoverySourceGateBlocker[] | null;
  state?: LaunchRecoveryCoverageState | string | null;
};

export type LaunchCriticalEventFamily = {
  familyId: LaunchCriticalEventFamilyId;
  canonicalEventNames: string[];
  activeSourceEventNames?: string[];
  productDomain: RecoveryProductDomain;
  objectType: AnalyticsObjectType;
  defaultSourceTruth: RecoveryMetricSourceTruth;
  defaultEvidenceKind: RecoveryMetricEvidenceKind;
  materializerLane: string;
  identityScope: Extract<RecoveryActorScope, "global" | "guest" | "signed_in_user" | "linked_person" | "creator_role" | "admin_operator">[];
  dedupeWindowMs: number;
  dedupeDimensions?: RecoveryMetricDedupeDimension[];
  recoveryNotes: string[];
};

export type LaunchCriticalFamilyProofBoundary = {
  productTruthSource: RecoveryMetricSourceTruth;
  productTruthEligibleWhenObserved: boolean;
  externalEvidenceCanClearProductTruth: false;
  missingCanRenderAsZero: false;
  requiresLedgerCorroboration: boolean;
  requiresWatchSessionRollup: boolean;
  requiresAdminAuditFact: boolean;
  sourceRole:
    | "behavior_product_truth"
    | "identity_handoff_truth"
    | "ledger_protected_truth"
    | "watch_session_truth"
    | "admin_audit_truth";
  recoveryBoundary: string;
};

export type LaunchAnalyticsRecoveryDedupeInput = {
  eventId?: string | null;
  sessionId?: string | null;
  identityLinkId?: string | null;
  userId?: string | null;
  anonymousVisitorId?: string | null;
  route?: string | null;
  semanticAction: string;
  objectId?: string | null;
  timestampMs?: number | null;
  timestampWindowMs?: number | null;
};

export type LaunchCriticalSourceEvidenceCounts = {
  canonicalEventCounts?: Record<string, number>;
  telemetryEventCounts?: Record<string, number>;
  firstPartyPurchaseCount?: number;
  completedPurchaseTransactionsCount?: number;
  firstPartyUnlockCount?: number;
  unlockTransactionsCount?: number;
  viewerSessionFactCount?: number;
  viewerSessionStartedLogsLength?: number;
  watchSessionCount?: number;
  watchCaptureFullCount?: number;
};

export type RecoveredLaunchMetricState = {
  metricKey: LaunchCriticalEventFamilyId;
  eventName: string;
  sourceTruth: RecoveryMetricSourceTruth;
  freshnessState: RecoveryMetricFreshnessState;
  confidenceScore: number;
  confidenceBand: RecoveryMetricConfidenceBand;
  evidenceKind: RecoveryMetricEvidenceKind;
  dedupeKey: string;
  dedupeDimensions: RecoveryMetricDedupeDimension[];
  lateArrivalWindowDays: typeof ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS;
  missingVsZeroState: "source_present" | "source_missing" | "bounded_zero_proven";
  identityStitching: RecoveryMetricIdentityStitchingState;
  mathReason: string;
};

export type RecoveryMetricIdentityStitchingState = {
  usesIdentityLink: boolean;
  countsGlobalOnce: true;
  countsLinkedPersonOnce: boolean;
  doubleCountingPreventedBy: "event_id" | "identity_link_id" | "session_semantic_window";
};

export type LaunchCriticalFamilySourceState = {
  familyId: LaunchCriticalEventFamilyId;
  canonicalEventNames: string[];
  proofBoundary: LaunchCriticalFamilyProofBoundary;
  observedFirstParty: boolean;
  sourceTruth: RecoveryMetricSourceTruth;
  freshnessState: RecoveryMetricFreshnessState;
  evidenceKind: RecoveryMetricEvidenceKind;
  strongestSourceTruth: RecoveryMetricSourceTruth;
  strongestEvidenceKind: RecoveryMetricEvidenceKind;
  confidenceScore: number;
  confidenceBand: RecoveryMetricConfidenceBand;
  dedupeKey: string;
  dedupeDimensions: RecoveryMetricDedupeDimension[];
  lateArrivalWindowDays: typeof ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS;
  sourceRole:
    | "product_truth"
    | "calibration_only"
    | "legacy_review"
    | "snapshot_review"
    | "missing_source";
  sourceCoverageState:
    | "observed_first_party"
    | "modeled_second_source"
    | "inferred_legacy"
    | "cached_snapshot"
    | "source_missing";
  productTruthEligible: boolean;
  mathReason: string;
  nextAction: string;
};

export type LaunchCriticalRecoveryCoverageReport = {
  reportKey: "launch-critical-analytics-recovery-coverage";
  generatedAtUtc: string;
  version: typeof RECOVERY_TIMELINE_SPINE_VERSION;
  lateArrivalWindowDays: typeof ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS;
  targetCoveragePercent: typeof LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT;
  familyCount: number;
  canonicalMappedFamilyCount: number;
  canonicalMappingCoveragePercent: 100;
  mappedFamilyCount: number;
  coveragePercent: number;
  observedFirstPartyFamilyCount: number;
  observedFirstPartyCoveragePercent: number;
  sourceCoverageStatus: "pass" | "blocked";
  missingFamilies: LaunchCriticalEventFamilyId[];
  familySourceStates: LaunchCriticalFamilySourceState[];
  holdbackValidation: {
    observedFirstPartyRequired: true;
    modeledOrInferredCanCalibrateOnly: true;
    minObservedFirstPartyCoveragePercent: typeof LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT;
    status: "pass" | "blocked";
    reason: string;
    nextAction: string;
  };
  sourceTruthStates: RecoveryMetricSourceTruth[];
  evidenceKinds: RecoveryMetricEvidenceKind[];
  confidenceBands: RecoveryMetricConfidenceBand[];
  freshnessStates: RecoveryMetricFreshnessState[];
  dedupeRules: typeof RECOVERY_METRIC_DEDUPE_RULES;
  productTruthPolicy: typeof RECOVERY_METRIC_PRODUCT_TRUTH_POLICY;
  modelingPolicy: typeof RECOVERY_METRIC_MODELING_POLICY;
};

export type LaunchCriticalCatalogFamilyState = {
  familyId: LaunchCriticalEventFamilyId;
  canonicalEventNames: string[];
  resolvedEventNames: string[];
  missingEventNames: string[];
  catalogMapped: boolean;
  primaryResolvedEventName: string | null;
};

export type LaunchCriticalCatalogCoverageReport = {
  reportKey: "launch-critical-analytics-catalog-coverage";
  familyCount: number;
  catalogMappedFamilyCount: number;
  catalogMappingCoveragePercent: number;
  missingFamilies: LaunchCriticalEventFamilyId[];
  aliasResolutionUsed: boolean;
  familyCatalogStates: LaunchCriticalCatalogFamilyState[];
  policy: {
    requiresOneCatalogEventPerFamily: true;
    compatibilityAliasesAllowed: true;
    missingCompatibilityAliasIsNotSourceCoverageFailure: true;
  };
};

export type LaunchCriticalActiveSourceFamilyState = {
  familyId: LaunchCriticalEventFamilyId;
  canonicalEventNames: string[];
  activeSourceEventNames: string[];
  proofBoundary: LaunchCriticalFamilyProofBoundary;
  activeSourceFiles: string[];
  activeSourceReferenceCount: number;
  materializerFiles: string[];
  materializerReferenceCount: number;
  sourceCoverageState: "source_connected" | "source_only" | "materializer_only" | "source_missing";
  sourceTruth: RecoveryMetricSourceTruth;
  freshnessState: RecoveryMetricFreshnessState;
  evidenceKind: RecoveryMetricEvidenceKind;
  confidenceScore: number;
  confidenceBand: RecoveryMetricConfidenceBand;
  dedupeKey: string;
  dedupeDimensions: RecoveryMetricDedupeDimension[];
  lateArrivalWindowDays: typeof ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS;
  countsForActiveSourceCoverage: boolean;
  productTruthEligibleFromSourceScan: false;
  nextAction: string;
};

export type LaunchCriticalActiveSourceCoverageReport = {
  reportKey: "launch-critical-active-source-coverage";
  generatedAtUtc: string;
  version: typeof RECOVERY_TIMELINE_SPINE_VERSION;
  familyCount: number;
  activeSourceFamilyCount: number;
  activeSourceCoveragePercent: number;
  targetCoveragePercent: typeof LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT;
  sourceCoverageStatus: "pass" | "blocked";
  canClearHistoricalLaunchProof: false;
  canClearRuntimeGate: false;
  canClearProviderGate: false;
  canClearAdminTruthGate: false;
  familySourceStates: LaunchCriticalActiveSourceFamilyState[];
  policy: {
    catalogMappingRequiredSeparately: true;
    activeSourceScanIsNotRuntimeProof: true;
    historicalRowsStillRequired: true;
    missingIsNotZero: true;
  };
};

type LaunchRecoverySummaryRecord = Record<string, unknown> & {
  confidenceBand?: RecoveryMetricConfidenceBand | string | null;
  confidenceScore?: number | null;
  evidenceKind?: RecoveryMetricEvidenceKind | string | null;
  strongestEvidenceKind?: RecoveryMetricEvidenceKind | string | null;
  sourceTruth?: RecoveryMetricSourceTruth | string | null;
  strongestSourceTruth?: RecoveryMetricSourceTruth | string | null;
  freshnessState?: RecoveryMetricFreshnessState | string | null;
  sourceTruthState?: LaunchHistoryDaySourceTruthState | string | null;
  sourceCoverageState?: string | null;
  sourceCounts?: Record<string, unknown> | null;
  productTruthRecovered?: boolean | null;
  sourceCountsKnown?: boolean | null;
  observedFirstParty?: boolean | null;
  countsForActiveSourceCoverage?: boolean | null;
  productTruthEligible?: boolean | null;
  activeSourceReferenceCount?: number | null;
  materializerReferenceCount?: number | null;
  lateArrivalWindowDays?: number | null;
  dedupeKey?: string | null;
  dedupeDimensions?: RecoveryMetricDedupeDimension[] | string[] | null;
  dayKey?: string | null;
  familyId?: string | null;
  eventName?: string | null;
  nextAction?: string | null;
};

export type LaunchRecoveryDayEvidenceSummaryState = {
  dayCount: number;
  confidenceBandCounts: Record<string, number>;
  evidenceKindCounts: Record<string, number>;
  sourceTruthCounts: Record<string, number>;
  freshnessStateCounts: Record<string, number>;
  sourceTruthStateCounts: Record<string, number>;
  productTruthRecoveredDayCount: number;
  sourceCountsKnownDayCount: number;
  lateArrivalWindowDays: number | null;
  lateArrivalWindowDayValues: number[];
  missingDaySamples: string[];
};

export type LaunchRecoveryFamilySourceSummaryState = {
  familyCount: number;
  confidenceBandCounts: Record<string, number>;
  evidenceKindCounts: Record<string, number>;
  sourceTruthCounts: Record<string, number>;
  sourceCoverageStateCounts: Record<string, number>;
  sourceRoleCounts: Record<string, number>;
  productTruthEligibleFamilyCount: number;
  observedFirstPartyFamilySamples: string[];
  missingFirstPartyFamilySamples: Array<{
    familyId: string;
    confidenceBand: string;
    evidenceKind: string;
    sourceRole: string;
    sourceCoverageState: string;
    mathReason: string;
    nextAction: string;
  }>;
};

export type LaunchActiveSourceFamilySummaryState = {
  familyCount: number;
  confidenceBandCounts: Record<string, number>;
  evidenceKindCounts: Record<string, number>;
  sourceTruthCounts: Record<string, number>;
  sourceCoverageStateCounts: Record<string, number>;
  connectedFamilyCount: number;
  activeSourceReferenceCount: number;
  materializerReferenceCount: number;
  connectedFamilySamples: string[];
  disconnectedFamilySamples: Array<{
    familyId: string;
    confidenceBand: string;
    evidenceKind: string;
    sourceCoverageState: string;
    nextAction: string;
  }>;
};

export const RECOVERED_METRIC_REQUIRED_METADATA_FIELDS = [
  "sourceTruth",
  "freshnessState",
  "confidenceScore",
  "evidenceKind",
  "dedupeKey",
  "dedupeDimensions",
  "lateArrivalWindowDays",
] as const;

export type RecoveredMetricRequiredMetadataField = typeof RECOVERED_METRIC_REQUIRED_METADATA_FIELDS[number];

export type RecoveredMetricMetadataCompletenessSummary = {
  status: "complete" | "incomplete";
  rowCount: number;
  completeRowCount: number;
  requiredFields: RecoveredMetricRequiredMetadataField[];
  expectedLateArrivalWindowDays: typeof ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS;
  missingFieldCounts: Record<RecoveredMetricRequiredMetadataField, number>;
  missingRowSamples: Array<{
    index: number;
    rowKey: string;
    missingFields: RecoveredMetricRequiredMetadataField[];
  }>;
};

export const LAUNCH_CRITICAL_EVENT_FAMILIES: LaunchCriticalEventFamily[] = [
  {
    familyId: "page_view",
    canonicalEventNames: ["semantic_page_viewed", "page_viewed"],
    productDomain: "telemetry_behavior",
    objectType: "page",
    defaultSourceTruth: "first_party_event_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "analytics_event_facts",
    identityScope: ["global", "guest", "signed_in_user", "linked_person"],
    dedupeWindowMs: 10_000,
    recoveryNotes: ["GA4 page_view can corroborate directional traffic only; first-party page facts remain primary."],
  },
  {
    familyId: "auth_signup",
    canonicalEventNames: ["auth_email_signup_completed", "auth_google_completed", "auth_registration_completed", "user_registered"],
    productDomain: "identity_handoff",
    objectType: "identity",
    defaultSourceTruth: "first_party_event_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "identity_handoff_materializer",
    identityScope: ["global", "guest", "signed_in_user", "linked_person"],
    dedupeWindowMs: 60_000,
    recoveryNotes: ["Signup recovery must preserve guest-to-user identity continuity without counting the same handoff twice."],
  },
  {
    familyId: "wallet_open",
    canonicalEventNames: ["wallet_opened", "purchase_modal_opened"],
    productDomain: "gumdrop_economy",
    objectType: "wallet",
    defaultSourceTruth: "first_party_event_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "purchase_integrity_materializer",
    identityScope: ["global", "guest", "signed_in_user", "linked_person"],
    dedupeWindowMs: 60_000,
    recoveryNotes: ["Wallet opens are behavior evidence only; they never prove purchase, balance, or source-of-funds truth."],
  },
  {
    familyId: "purchase",
    canonicalEventNames: ["gumdrops_purchase_completed", "purchase", "checkout_completed"],
    activeSourceEventNames: ["gumdrops_purchase_completed", "checkout_completed", "server_purchase_verified"],
    productDomain: "wallet_payment",
    objectType: "purchase",
    defaultSourceTruth: "server_ledger",
    defaultEvidenceKind: "observed",
    materializerLane: "treasury_transaction_ledger",
    identityScope: ["global", "signed_in_user", "linked_person"],
    dedupeWindowMs: 60_000,
    recoveryNotes: ["Purchase recovery requires server transaction and GumDrop ledger corroboration before any product-truth eligibility."],
  },
  {
    familyId: "drop_preview",
    canonicalEventNames: ["drop_preview_opened", "drop_preview_page_viewed"],
    productDomain: "telemetry_behavior",
    objectType: "drop",
    defaultSourceTruth: "first_party_event_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "drop_preview_materializer",
    identityScope: ["global", "guest", "signed_in_user", "linked_person"],
    dedupeWindowMs: 10_000,
    recoveryNotes: ["Preview opens and preview page views are the same intent family and must not double-count one visit."],
  },
  {
    familyId: "cta",
    canonicalEventNames: ["drop_preview_cta_clicked", "semantic_target_clicked"],
    productDomain: "telemetry_behavior",
    objectType: "drop",
    defaultSourceTruth: "first_party_event_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "cta_intent_materializer",
    identityScope: ["global", "guest", "signed_in_user", "linked_person"],
    dedupeWindowMs: 10_000,
    recoveryNotes: ["CTA recovery is conversion-intent evidence; downstream purchase/unlock truth still requires server facts."],
  },
  {
    familyId: "unlock",
    canonicalEventNames: ["unlock_drop_success", "drop_unwrapped", "entitlement_granted"],
    productDomain: "drop_unlock",
    objectType: "unlock",
    defaultSourceTruth: "server_ledger",
    defaultEvidenceKind: "observed",
    materializerLane: "entitlement_unlock_materializer",
    identityScope: ["global", "signed_in_user", "linked_person"],
    dedupeWindowMs: 60_000,
    recoveryNotes: ["Unlock truth requires entitlement/unlock records and source-aware spend truth; analytics can only corroborate."],
  },
  {
    familyId: "viewer_open",
    canonicalEventNames: ["viewer_opened", "viewer_session_started"],
    productDomain: "telemetry_behavior",
    objectType: "viewer_session",
    defaultSourceTruth: "first_party_event_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "viewer_session_materializer",
    identityScope: ["global", "signed_in_user", "linked_person"],
    dedupeWindowMs: 30_000,
    recoveryNotes: ["Viewer opens are access/engagement evidence and must stay distinct from verified watch time."],
  },
  {
    familyId: "watch_start",
    canonicalEventNames: ["watch_session_started", "drop_watch_started"],
    productDomain: "telemetry_behavior",
    objectType: "viewer_session",
    defaultSourceTruth: "watch_session_rollup",
    defaultEvidenceKind: "observed",
    materializerLane: "analytics_watch_sessions",
    identityScope: ["global", "signed_in_user", "linked_person"],
    dedupeWindowMs: 30_000,
    recoveryNotes: ["Watch starts begin source-truthed watch sessions; page duration remains diagnostic only."],
  },
  {
    familyId: "watch_end",
    canonicalEventNames: ["watch_session_ended", "watch_session_completed"],
    productDomain: "telemetry_behavior",
    objectType: "viewer_session",
    defaultSourceTruth: "watch_session_rollup",
    defaultEvidenceKind: "observed",
    materializerLane: "analytics_watch_sessions",
    identityScope: ["global", "signed_in_user", "linked_person"],
    dedupeWindowMs: 30_000,
    recoveryNotes: ["Watch end recovery can repair capture quality but cannot promote estimates to canonical watch time."],
  },
  {
    familyId: "creator_follow",
    canonicalEventNames: ["creator_followed", "creator_follow_succeeded"],
    productDomain: "telemetry_behavior",
    objectType: "creator_profile",
    defaultSourceTruth: "first_party_event_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "creator_relationship_materializer",
    identityScope: ["global", "signed_in_user", "linked_person", "creator_role"],
    dedupeWindowMs: 60_000,
    recoveryNotes: ["Creator follows should count for the linked person and creator surface without becoming generic duplicate user actions."],
  },
  {
    familyId: "creator_drop_submit",
    canonicalEventNames: ["creator_drop_submitted", "creator_drop_submit_succeeded"],
    productDomain: "telemetry_behavior",
    objectType: "drop",
    defaultSourceTruth: "first_party_event_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "creator_drop_manager_materializer",
    identityScope: ["global", "signed_in_user", "linked_person", "creator_role"],
    dedupeWindowMs: 60_000,
    recoveryNotes: ["Creator-submitted Drops remain creator-visible and user-hidden until admin approval truth exists."],
  },
  {
    familyId: "admin_review",
    canonicalEventNames: [
      "admin_creator_drop_review_viewed",
      "admin_creator_drop_approved",
      "admin_creator_drop_rejected",
      "admin_creator_drop_reviewed",
    ],
    productDomain: "admin_debug",
    objectType: "admin",
    defaultSourceTruth: "admin_action_fact",
    defaultEvidenceKind: "observed",
    materializerLane: "admin_drop_review_audit",
    identityScope: ["admin_operator"],
    dedupeWindowMs: 60_000,
    recoveryNotes: ["Admin review actions are audit/admin truth and should not hydrate user engagement metrics."],
  },
];

export type RecoveryCorroboration = {
  transactionId?: string | null;
  gumdropLedgerId?: string | null;
  unlockId?: string | null;
  rewardEventId?: string | null;
  eventFactId?: string | null;
  sourceCount: number;
  treasuryLedgerCorroborated: boolean;
};

export type RecoveryTimelineEntry = {
  timelineId: string;
  source: RecoveryTimelineSource;
  sourceRecordId: string | null;
  timestamp: string;
  eventName: string;
  actor: {
    actorType: RecoveryActorScope;
    userId?: string | null;
    anonymousVisitorId?: string | null;
    sessionId?: string | null;
    identityLinkId?: string | null;
  };
  identityConfidence: RecoveryConfidence;
  eventConfidence: RecoveryConfidence;
  productDomain: RecoveryProductDomain;
  classification: RecoveryTimelineClassification;
  recoveryEligibility: RecoveryTruthEligibility;
  missingVsZeroState: "source_present" | "source_missing" | "bridge_missing" | "materializer_missing" | "permission_blocked" | "proven_zero_not_applicable";
  corroboration: RecoveryCorroboration;
  evidenceLabels: Array<"source_truth" | "corroborating_evidence" | "ga4_evidence_only" | "legacy_directional_only" | "manual_review">;
  notes: string[];
};

export type RecoveryTimelineValidationResult = {
  ok: boolean;
  findings: string[];
};

export type AnalyticsEventFactRecoveryInput = {
  eventId: string;
  eventName: string;
  timestamp: number;
  userId?: string | null;
  anonymousVisitorId?: string | null;
  sessionId?: string | null;
  pagePath?: string | null;
  dropId?: string | null;
  sourceSurface?: string | null;
};

export type EventFactTimelineGapClassification =
  | "first_party_present"
  | "legacy_only"
  | "ga4_only"
  | "first_party_missing"
  | "identity_missing"
  | "timestamp_conflict"
  | "duplicate_candidate";

export type EventFactTimelineMatch = {
  matchingKey: string;
  firstPartyEventFactId: string | null;
  timelineId: string | null;
  eventName: string;
  gapClassification: EventFactTimelineGapClassification;
  duplicateCandidate: boolean;
  productTruthEligible: boolean;
  reason: string;
};

export type EventFactTimelineReconciliationReport = {
  reportKey: "analytics-event-facts-recovery-reconciliation";
  generatedAtUtc: string;
  matchingRules: {
    exactEventFactIdWins: true;
    sameActorSessionActionWindowMs: number;
    timestampConflictWindowMs: number;
    missingSourceIsNotZero: true;
  };
  summary: {
    firstPartyFactCount: number;
    timelineEntryCount: number;
    firstPartyPresent: number;
    legacyOnly: number;
    ga4Only: number;
    firstPartyMissing: number;
    identityMissing: number;
    timestampConflict: number;
    duplicateCandidate: number;
    productTruthEligible: number;
  };
  matches: EventFactTimelineMatch[];
  productTruthPolicy: {
    firstPartyEventFactsPrimary: true;
    legacyCanOnlyCorroborate: true;
    ga4CanOnlyCorroborate: true;
    duplicateEventsNotImported: true;
    missingWindowNotZero: true;
  };
};

export type TreasuryTimelineEventType =
  | "purchase"
  | "reward"
  | "unlock_spend"
  | "creator_accrual"
  | "admin_adjustment"
  | "refund_void";

export type TreasuryTimelineReconciliationStatus =
  | "ledger_confirmed"
  | "analytics_correlated"
  | "analytics_missing"
  | "analytics_only_not_ledger"
  | "ledger_missing_protected"
  | "duplicate_risk"
  | "source_bucket_mismatch";

export type TreasuryLedgerRecoveryInput = {
  ledgerId: string;
  transactionId?: string | null;
  eventType: TreasuryTimelineEventType;
  eventName: string;
  occurredAt: string;
  actor: {
    userId?: string | null;
    anonymousVisitorId?: string | null;
    sessionId?: string | null;
  };
  amountGd: number;
  sourceBucket: GumdropLedgerSourceBucket;
  direction: "credit" | "debit" | "reversal" | "accrual";
  sourceTruth: "server_transaction" | "gumdrop_ledger" | "reward_ledger" | "unlock_record" | "creator_ledger" | "admin_adjustment";
};

export type TreasuryTimelineEvidenceInput = {
  entry: RecoveryTimelineEntry;
  expectedSourceBucket?: GumdropLedgerSourceBucket | null;
};

export type TreasuryTimelineReconciliationFinding = {
  findingId: string;
  status: TreasuryTimelineReconciliationStatus;
  eventType: TreasuryTimelineEventType;
  ledgerId: string | null;
  timelineId: string | null;
  eventName: string;
  sourceBucket: GumdropLedgerSourceBucket | null;
  evidenceSourceBucket: GumdropLedgerSourceBucket | null;
  productTruthAllowed: boolean;
  reason: string;
  nextAction: string;
};

export type TreasuryTimelineReconciliationReport = {
  reportKey: "treasury-recovery-timeline-reconciliation";
  generatedAtUtc: string;
  status: "pass" | "review";
  eventMap: Array<{
    eventType: TreasuryTimelineEventType;
    ledgerOwner: RecoveryTimelineSource;
    analyticsEvidenceEvents: string[];
    productTruthRule: string;
  }>;
  summary: Record<TreasuryTimelineReconciliationStatus, number> & {
    ledgerEventCount: number;
    timelineEvidenceCount: number;
    productTruthEligibleCount: number;
  };
  findings: TreasuryTimelineReconciliationFinding[];
  productTruthPolicy: {
    treasuryLedgersPrimary: true;
    analyticsCanOnlyCorroborate: true;
    ga4CanCreditOrDebitGumdrops: false;
    legacyCanCreditOrDebitGumdrops: false;
    sourceBucketsMustMatch: true;
    noBalanceMutation: true;
    missingAnalyticsIsNotMissingMoney: true;
  };
};

export type GumdropRecoveryQueueEvidenceKind =
  | "treasury_ledger"
  | "first_party_event_fact"
  | "ga4_evidence"
  | "legacy_analytics"
  | "debug_evidence"
  | "manual_operator_evidence";

export type GumdropRecoveryQueueLedgerCorroboration =
  | "ledger_present"
  | "ledger_missing"
  | "source_bucket_mismatch"
  | "duplicate_risk"
  | "not_required_non_money";

export type GumdropRecoveryAllowedAction =
  | "manual_review_only"
  | "attach_evidence_to_existing_ledger"
  | "request_ledger_or_server_proof"
  | "reject_analytics_only_balance_recovery";

export type GumdropRecoveryQueueItem = {
  recoveryId: string;
  actor: {
    actorScope: RecoveryActorScope;
    userId?: string | null;
    anonymousVisitorId?: string | null;
    sessionId?: string | null;
    identityLinkId?: string | null;
  };
  timeWindow: {
    startUtc: string;
    endUtc: string;
    basis: "ledger_occurred_at" | "timeline_timestamp" | "unknown";
  };
  suspectedAction: TreasuryTimelineEventType;
  eventName: string;
  amountGd: number | null;
  sourceBucket: GumdropLedgerSourceBucket | null;
  evidenceSources: Array<{
    evidenceId: string;
    kind: GumdropRecoveryQueueEvidenceKind;
    source: RecoveryTimelineSource | "operator";
    productTruthAllowed: boolean;
    note: string;
  }>;
  confidence: "high" | "medium" | "low" | "unknown";
  ledgerCorroboration: {
    status: GumdropRecoveryQueueLedgerCorroboration;
    ledgerId: string | null;
    sourceBucket: GumdropLedgerSourceBucket | null;
    serverProofRequiredForMoneyAction: true;
  };
  requiredHumanProof: string[];
  allowedRecoveryAction: GumdropRecoveryAllowedAction;
  forbiddenAction: string;
};

export type GumdropRecoveryQueueReport = {
  reportKey: "gumdrop-recovery-queue";
  generatedAtUtc: string;
  status: "pass" | "review";
  summary: {
    queueItemCount: number;
    ledgerProofRequiredCount: number;
    analyticsOnlyRejectedCount: number;
    duplicateRiskCount: number;
    sourceBucketMismatchCount: number;
    moneyAffectingRecoveryAllowedCount: 0;
  };
  schema: {
    requiredFields: Array<keyof GumdropRecoveryQueueItem>;
    moneyTruthRule: "ledger_or_server_proof_required_before_balance_recovery";
    analyticsOnlyRecoveryAllowed: false;
  };
  items: GumdropRecoveryQueueItem[];
  productTruthPolicy: {
    dryRunOnly: true;
    creditsOrDebitsUsers: false;
    backfillsTransactions: false;
    analyticsOnlyCanChangeBalance: false;
    requiresLedgerOrServerProofBeforeMoneyAction: true;
    exposesPii: false;
  };
};

export const TREASURY_TIMELINE_EVENT_MAP: TreasuryTimelineReconciliationReport["eventMap"] = [
  {
    eventType: "purchase",
    ledgerOwner: "transaction_ledger",
    analyticsEvidenceEvents: ["gumdrops_purchase_completed", "checkout_completed", "purchase"],
    productTruthRule: "Only server transaction and GumDrop ledger records can credit paid_gd or paid_bonus_gd.",
  },
  {
    eventType: "reward",
    ledgerOwner: "reward_record",
    analyticsEvidenceEvents: ["daily_reward_claimed", "task_reward_claimed", "onboarding_reward_claimed"],
    productTruthRule: "Reward analytics can corroborate; reward credits require reward ledger/source-of-funds truth.",
  },
  {
    eventType: "unlock_spend",
    ledgerOwner: "unlock_record",
    analyticsEvidenceEvents: ["drop_unwrapped", "unlock_content", "unlock_drop_success"],
    productTruthRule: "Unlock spend truth requires source-aware ledger split and entitlement/unlock record.",
  },
  {
    eventType: "creator_accrual",
    ledgerOwner: "gumdrop_ledger",
    analyticsEvidenceEvents: ["creator_experience_paid", "creator_revenue_accrued"],
    productTruthRule: "Creator accruals require creator ledger/entitlement truth; analytics is evidence only.",
  },
  {
    eventType: "admin_adjustment",
    ledgerOwner: "gumdrop_ledger",
    analyticsEvidenceEvents: ["admin_balance_adjusted", "admin_gumdrop_adjustment"],
    productTruthRule: "Admin adjustments require audited admin ledger rows and must not be inferred from telemetry.",
  },
  {
    eventType: "refund_void",
    ledgerOwner: "transaction_ledger",
    analyticsEvidenceEvents: ["payment_refund_evidence_seen", "refund"],
    productTruthRule: "Refund/void recovery requires provider/transaction reversal and original source bucket.",
  },
];

export type Ga4RecoveryEventMapping = {
  ga4EventName: string;
  canonicalEventName: string;
  confidence: Extract<LegacyRecoveryConfidenceLabel, "medium" | "directional" | "low" | "unknown">;
  objectType: AnalyticsObjectType | "unknown";
  productDomain: RecoveryProductDomain;
  commerceTruthRequiresLedger: boolean;
};

export const GA4_RECOVERY_EVENT_MAPPINGS: Ga4RecoveryEventMapping[] = [
  {
    ga4EventName: "page_view",
    canonicalEventName: "page_viewed",
    confidence: "medium",
    objectType: "page",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "screen_view",
    canonicalEventName: "page_viewed",
    confidence: "directional",
    objectType: "page",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "search",
    canonicalEventName: "search_submitted",
    confidence: "directional",
    objectType: "page",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "login",
    canonicalEventName: "auth_login_completed",
    confidence: "directional",
    objectType: "identity",
    productDomain: "identity_handoff",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "sign_up",
    canonicalEventName: "auth_registration_completed",
    confidence: "directional",
    objectType: "identity",
    productDomain: "identity_handoff",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "wallet_opened",
    canonicalEventName: "wallet_opened",
    confidence: "directional",
    objectType: "wallet",
    productDomain: "gumdrop_economy",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "purchase",
    canonicalEventName: "gumdrops_purchase_completed",
    confidence: "medium",
    objectType: "purchase",
    productDomain: "wallet_payment",
    commerceTruthRequiresLedger: true,
  },
  {
    ga4EventName: "refund",
    canonicalEventName: "payment_refund_evidence_seen",
    confidence: "low",
    objectType: "purchase",
    productDomain: "wallet_payment",
    commerceTruthRequiresLedger: true,
  },
  {
    ga4EventName: "purchase_modal_opened",
    canonicalEventName: "purchase_modal_opened",
    confidence: "directional",
    objectType: "wallet",
    productDomain: "gumdrop_economy",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "drop_preview_opened",
    canonicalEventName: "drop_preview_opened",
    confidence: "directional",
    objectType: "drop",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "drop_preview_cta_clicked",
    canonicalEventName: "drop_preview_cta_clicked",
    confidence: "directional",
    objectType: "drop",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "unlock_drop_success",
    canonicalEventName: "drop_unwrapped",
    confidence: "low",
    objectType: "unlock",
    productDomain: "drop_unlock",
    commerceTruthRequiresLedger: true,
  },
  {
    ga4EventName: "viewer_opened",
    canonicalEventName: "viewer_opened",
    confidence: "directional",
    objectType: "viewer_session",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "watch_session_started",
    canonicalEventName: "watch_session_started",
    confidence: "directional",
    objectType: "viewer_session",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "watch_session_ended",
    canonicalEventName: "watch_session_ended",
    confidence: "directional",
    objectType: "viewer_session",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "creator_followed",
    canonicalEventName: "creator_followed",
    confidence: "directional",
    objectType: "creator_profile",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "creator_drop_submitted",
    canonicalEventName: "creator_drop_submitted",
    confidence: "directional",
    objectType: "drop",
    productDomain: "telemetry_behavior",
    commerceTruthRequiresLedger: false,
  },
  {
    ga4EventName: "admin_creator_drop_reviewed",
    canonicalEventName: "admin_creator_drop_reviewed",
    confidence: "low",
    objectType: "admin",
    productDomain: "admin_debug",
    commerceTruthRequiresLedger: false,
  },
];

export type Ga4RecoveryTimelineInput = {
  ga4EventName: string;
  ga4EventId?: string | null;
  occurredAt: string;
  importedAt?: string | null;
  userPseudoId?: string | null;
  sessionId?: string | null;
  pagePath?: string | null;
  objectId?: string | null;
  transactionId?: string | null;
  ledgerCorroborated?: boolean;
};

function readTimestamp(value: string | null | undefined) {
  if (!value) return new Date(0).toISOString();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date(0).toISOString();
}

function stableTimelineId(source: RecoveryTimelineSource, sourceRecordId: string | null, eventName: string, timestamp: string) {
  return [
    "recovery",
    source,
    sourceRecordId ?? "unknown",
    eventName,
    timestamp,
  ].join(":");
}

function actorScopeFromEvent(event: Pick<CanonicalAnalyticsEvent, "actorType" | "identityLinkId">): RecoveryActorScope {
  if (event.identityLinkId) return "linked_person";
  if (event.actorType === "guest") return "guest";
  if (event.actorType === "user") return "signed_in_user";
  if (event.actorType === "creator") return "creator_role";
  if (event.actorType === "admin" || event.actorType === "owner_admin") return "admin_operator";
  if (event.actorType === "system") return "system";
  return "unknown";
}

function normalizeActorKey(input: {
  userId?: string | null;
  anonymousVisitorId?: string | null;
  sessionId?: string | null;
  actorType?: RecoveryActorScope | null;
}) {
  if (input.userId) return `user:${input.userId}`;
  if (input.anonymousVisitorId) return `guest:${input.anonymousVisitorId}`;
  if (input.sessionId) return `session:${input.sessionId}`;
  return `${input.actorType ?? "unknown"}:unknown`;
}

function timeBucket(timestampMs: number, windowMs: number) {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return "unknown_time";
  return String(Math.floor(timestampMs / windowMs));
}

function factTimestampMs(fact: AnalyticsEventFactRecoveryInput) {
  return Number.isFinite(fact.timestamp) ? fact.timestamp : 0;
}

function entryTimestampMs(entry: RecoveryTimelineEntry) {
  const parsed = Date.parse(entry.timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function eventTypeFromTimelineEntry(entry: RecoveryTimelineEntry): TreasuryTimelineEventType | null {
  const text = `${entry.eventName} ${entry.productDomain} ${entry.corroboration.transactionId ?? ""} ${entry.corroboration.unlockId ?? ""}`.toLowerCase();
  if (/refund|void|reversal/u.test(text)) return "refund_void";
  if (/creator.*(paid|revenue|accrual)|creator_experience_paid/u.test(text)) return "creator_accrual";
  if (/admin.*(balance|adjust|gumdrop)|admin_gumdrop_adjustment/u.test(text)) return "admin_adjustment";
  if (/unlock|unwrap|drop_unwrapped/u.test(text)) return "unlock_spend";
  if (/reward|task|check.?in|onboarding/u.test(text)) return "reward";
  if (/purchase|checkout|payment|gumdrops_purchase_completed/u.test(text)) return "purchase";
  return null;
}

function treasuryLedgerMatchingKey(event: Pick<TreasuryLedgerRecoveryInput, "eventType" | "eventName" | "transactionId" | "ledgerId" | "actor" | "occurredAt">) {
  const timestampMs = Date.parse(event.occurredAt);
  return [
    event.eventType,
    event.eventName,
    event.transactionId ?? event.ledgerId,
    normalizeActorKey(event.actor),
    timeBucket(Number.isFinite(timestampMs) ? timestampMs : 0, 60_000),
  ].join("|");
}

function treasuryEvidenceMatchingKey(evidence: TreasuryTimelineEvidenceInput) {
  const entry = evidence.entry;
  const eventType = eventTypeFromTimelineEntry(entry) ?? "purchase";
  return [
    eventType,
    entry.eventName,
    entry.corroboration.transactionId
      ?? entry.corroboration.gumdropLedgerId
      ?? entry.corroboration.unlockId
      ?? entry.corroboration.rewardEventId
      ?? entry.sourceRecordId
      ?? entry.timelineId,
    normalizeActorKey(entry.actor),
    timeBucket(entryTimestampMs(entry), 60_000),
  ].join("|");
}

function treasuryFindingId(status: TreasuryTimelineReconciliationStatus, key: string) {
  return `treasury_timeline:${status}:${key.replace(/[^a-z0-9:_-]+/giu, "_").slice(0, 96)}`;
}

function emptyTreasurySummary(): TreasuryTimelineReconciliationReport["summary"] {
  return {
    ledger_confirmed: 0,
    analytics_correlated: 0,
    analytics_missing: 0,
    analytics_only_not_ledger: 0,
    ledger_missing_protected: 0,
    duplicate_risk: 0,
    source_bucket_mismatch: 0,
    ledgerEventCount: 0,
    timelineEvidenceCount: 0,
    productTruthEligibleCount: 0,
  };
}

function queueFindingKey(finding: Pick<TreasuryTimelineReconciliationFinding, "findingId" | "ledgerId" | "timelineId" | "status">) {
  return finding.ledgerId ?? finding.timelineId ?? finding.findingId ?? finding.status;
}

function queueTimeWindow(timestamp: string | null | undefined, basis: GumdropRecoveryQueueItem["timeWindow"]["basis"]) {
  const parsed = timestamp ? Date.parse(timestamp) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return {
      startUtc: new Date(0).toISOString(),
      endUtc: new Date(0).toISOString(),
      basis: "unknown" as const,
    };
  }
  return {
    startUtc: new Date(parsed - 60_000).toISOString(),
    endUtc: new Date(parsed + 60_000).toISOString(),
    basis,
  };
}

function evidenceKindFromTimelineSource(source: RecoveryTimelineSource): GumdropRecoveryQueueEvidenceKind {
  if (source === "first_party_event_fact") return "first_party_event_fact";
  if (source === "ga4_evidence") return "ga4_evidence";
  if (source === "legacy_analytics" || source === "unknown_legacy") return "legacy_analytics";
  return "debug_evidence";
}

function queueConfidenceFromFinding(status: TreasuryTimelineReconciliationStatus): GumdropRecoveryQueueItem["confidence"] {
  if (status === "analytics_correlated" || status === "analytics_missing") return "high";
  if (status === "source_bucket_mismatch" || status === "duplicate_risk") return "medium";
  if (status === "ledger_missing_protected") return "low";
  return "unknown";
}

function requiredProofForFinding(finding: TreasuryTimelineReconciliationFinding) {
  if (finding.status === "source_bucket_mismatch") {
    return [
      "redacted treasury ledger row with source bucket",
      "server source-of-funds calculation or unlock spend split",
      "operator confirmation that analytics bucket mapping is diagnostic only",
    ];
  }
  if (finding.status === "duplicate_risk") {
    return [
      "idempotency receipt or unique ledger event id",
      "redacted duplicate event window",
      "operator confirmation before any aggregate repair",
    ];
  }
  if (finding.status === "ledger_missing_protected") {
    return [
      "server transaction id, GumDrop ledger id, unlock id, reward id, or creator ledger id",
      "source bucket proof from server truth",
      "manual operator approval after ledger proof is attached",
    ];
  }
  if (finding.status === "analytics_missing") {
    return [
      "no money proof needed because ledger already exists",
      "emitter/materializer evidence only if analytics repair is requested",
    ];
  }
  return ["redacted supporting evidence and owner review"];
}

function allowedActionForFinding(finding: TreasuryTimelineReconciliationFinding): GumdropRecoveryAllowedAction {
  if (finding.status === "analytics_correlated" || finding.status === "analytics_missing") return "attach_evidence_to_existing_ledger";
  if (finding.status === "ledger_missing_protected") return "reject_analytics_only_balance_recovery";
  if (finding.status === "analytics_only_not_ledger") return "reject_analytics_only_balance_recovery";
  return "manual_review_only";
}

function ledgerCorroborationForFinding(finding: TreasuryTimelineReconciliationFinding): GumdropRecoveryQueueItem["ledgerCorroboration"]["status"] {
  if (finding.status === "source_bucket_mismatch") return "source_bucket_mismatch";
  if (finding.status === "duplicate_risk") return "duplicate_risk";
  if (finding.ledgerId) return "ledger_present";
  if (finding.status === "analytics_only_not_ledger") return "not_required_non_money";
  return "ledger_missing";
}

function factMatchingKey(fact: AnalyticsEventFactRecoveryInput, windowMs: number) {
  return [
    fact.eventName,
    normalizeActorKey(fact),
    fact.sessionId ?? "no_session",
    fact.dropId ?? fact.pagePath ?? "no_object",
    timeBucket(factTimestampMs(fact), windowMs),
  ].join("|");
}

function entryMatchingKey(entry: RecoveryTimelineEntry, windowMs: number) {
  return [
    entry.eventName,
    normalizeActorKey(entry.actor),
    entry.actor.sessionId ?? "no_session",
    entry.corroboration.unlockId ?? entry.corroboration.transactionId ?? "no_object",
    timeBucket(entryTimestampMs(entry), windowMs),
  ].join("|");
}

function normalizeDedupePart(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9:_./-]+/giu, "_");
  return normalized && normalized.length > 0 ? normalized.slice(0, 96) : fallback;
}

function confidenceForEvidence(input: {
  evidenceKind: RecoveryMetricEvidenceKind;
  sourceTruth: RecoveryMetricSourceTruth;
  usesIdentityLink: boolean;
  sourceObserved: boolean;
}) {
  if (!input.sourceObserved || input.evidenceKind === "missing" || input.sourceTruth === "source_missing") return 0;
  const base = input.evidenceKind === "observed"
    ? 95
    : input.evidenceKind === "cached"
      ? 82
      : input.evidenceKind === "modeled"
        ? 68
        : 46;
  const truthAdjustment = input.sourceTruth === "ga4_evidence_only" || input.sourceTruth === "legacy_directional_only"
    ? -10
    : input.sourceTruth === "server_ledger" || input.sourceTruth === "watch_session_rollup" || input.sourceTruth === "admin_action_fact"
      ? 3
      : 0;
  const identityAdjustment = input.usesIdentityLink ? 2 : 0;
  return Math.max(0, Math.min(100, base + truthAdjustment + identityAdjustment));
}

export function classifyRecoveryMetricConfidenceBand(score: number): RecoveryMetricConfidenceBand {
  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  if (normalizedScore <= 0) return "missing";
  if (normalizedScore >= 95) return "verified";
  if (normalizedScore >= 80) return "strong";
  if (normalizedScore >= 55) return "directional";
  return "weak";
}

function evidenceKindFromSourceTruth(sourceTruth: RecoveryMetricSourceTruth): RecoveryMetricEvidenceKind {
  if (sourceTruth === "source_missing") return "missing";
  if (sourceTruth === "ga4_evidence_only") return "modeled";
  if (sourceTruth === "legacy_directional_only") return "inferred";
  if (sourceTruth === "hot_cache_snapshot") return "cached";
  return "observed";
}

export function normalizeRecoveryMetricEvidenceKind(value: RecoveryMetricEvidenceKindInput | string | null | undefined): RecoveryMetricEvidenceKind {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "modelled") return "modeled";
  if (
    normalized === "observed"
    || normalized === "modeled"
    || normalized === "inferred"
    || normalized === "cached"
    || normalized === "missing"
  ) {
    return normalized;
  }
  return "missing";
}

function isObservedFirstPartySourceTruth(sourceTruth: RecoveryMetricSourceTruth) {
  return sourceTruth === "first_party_event_fact"
    || sourceTruth === "server_ledger"
    || sourceTruth === "watch_session_rollup"
    || sourceTruth === "admin_action_fact";
}

function sourceCoverageStateForMetric(input: {
  sourceTruth: RecoveryMetricSourceTruth;
  evidenceKind: RecoveryMetricEvidenceKind;
  observedFirstParty: boolean;
}): LaunchCriticalFamilySourceState["sourceCoverageState"] {
  if (input.observedFirstParty) return "observed_first_party";
  if (input.sourceTruth === "ga4_evidence_only" || input.evidenceKind === "modeled") return "modeled_second_source";
  if (input.sourceTruth === "legacy_directional_only" || input.evidenceKind === "inferred") return "inferred_legacy";
  if (input.sourceTruth === "hot_cache_snapshot" || input.evidenceKind === "cached") return "cached_snapshot";
  return "source_missing";
}

function recoveryMetricSourcePriority(metric: RecoveredLaunchMetricState) {
  if (metric.evidenceKind === "observed" && isObservedFirstPartySourceTruth(metric.sourceTruth)) return 4;
  if (metric.evidenceKind === "cached" || metric.sourceTruth === "hot_cache_snapshot") return 3;
  if (metric.evidenceKind === "modeled" || metric.sourceTruth === "ga4_evidence_only") return 2;
  if (metric.evidenceKind === "inferred" || metric.sourceTruth === "legacy_directional_only") return 1;
  return 0;
}

function nextActionForFamilySourceState(state: LaunchCriticalFamilySourceState["sourceCoverageState"]) {
  if (state === "observed_first_party") return "Use first-party or server-owned facts for source coverage and dedupe.";
  if (state === "modeled_second_source") return "Keep GA/Google evidence as modeled calibration until first-party fact coverage exists.";
  if (state === "inferred_legacy") return "Keep legacy evidence in recovery review; do not promote it without first-party corroboration.";
  if (state === "cached_snapshot") return "Refresh the owning snapshot or materializer before using this family as current coverage.";
  return "Add or repair the first-party emitter, bridge, or materializer for this launch-critical family.";
}

function sourceRoleForFamilySourceState(state: LaunchCriticalFamilySourceState["sourceCoverageState"]): LaunchCriticalFamilySourceState["sourceRole"] {
  if (state === "observed_first_party") return "product_truth";
  if (state === "modeled_second_source") return "calibration_only";
  if (state === "inferred_legacy") return "legacy_review";
  if (state === "cached_snapshot") return "snapshot_review";
  return "missing_source";
}

function mathReasonForFamilySourceState(input: {
  family: LaunchCriticalEventFamily;
  sourceCoverageState: LaunchCriticalFamilySourceState["sourceCoverageState"];
  sourceTruth: RecoveryMetricSourceTruth;
  evidenceKind: RecoveryMetricEvidenceKind;
}) {
  const eventList = input.family.canonicalEventNames.join(", ");
  if (input.sourceCoverageState === "observed_first_party") {
    return `${input.family.familyId} uses ${input.sourceTruth} as observed product-truth evidence through ${input.family.materializerLane}; canonical events: ${eventList}.`;
  }
  if (input.sourceCoverageState === "modeled_second_source") {
    return `${input.family.familyId} has ${input.evidenceKind} GA/Google calibration evidence only; first-party or server-owned facts are required before product-truth promotion.`;
  }
  if (input.sourceCoverageState === "inferred_legacy") {
    return `${input.family.familyId} has inferred legacy recovery evidence only; keep it in manual recovery review until first-party corroboration exists.`;
  }
  if (input.sourceCoverageState === "cached_snapshot") {
    return `${input.family.familyId} is represented by cached snapshot evidence; refresh or verify ${input.family.materializerLane} before treating it as current source coverage.`;
  }
  return `${input.family.familyId} has no bounded source evidence in the recovery window; missing remains missing and must not render as zero.`;
}

function sourceEvidenceCount(input: Record<string, number> | undefined, names: string[]) {
  if (!input) return 0;
  return names.reduce((total, name) => {
    const value = input[name] ?? input[name.toLowerCase()];
    return total + (Number.isFinite(value) ? Math.max(0, Number(value)) : 0);
  }, 0);
}

function dayKeyFromIso(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function nextUtcDayKey(dayKey: string) {
  const day = new Date(`${dayKey}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

function inclusiveDayCount(startDayKey: string, endDayKey: string) {
  const start = Date.parse(`${startDayKey}T00:00:00.000Z`);
  const end = Date.parse(`${endDayKey}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function listInclusiveDays(startDayKey: string, endDayKey: string) {
  const dayCount = inclusiveDayCount(startDayKey, endDayKey);
  if (dayCount <= 0) return [];
  return Array.from({ length: dayCount }, (_, index) => {
    const day = new Date(`${startDayKey}T00:00:00.000Z`);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

export function collapseLaunchRecoveryDayRanges(days: string[]) {
  const sorted = [...new Set(days)].sort();
  const ranges: string[] = [];
  let start: string | null = null;
  let previous: string | null = null;

  for (const dayKey of sorted) {
    if (!start) {
      start = dayKey;
      previous = dayKey;
      continue;
    }

    if (previous && dayKey === nextUtcDayKey(previous)) {
      previous = dayKey;
      continue;
    }

    ranges.push(start === previous ? start : `${start}..${previous}`);
    start = dayKey;
    previous = dayKey;
  }

  if (start) ranges.push(start === previous ? start : `${start}..${previous}`);
  return ranges;
}

function rangeLabel(startDayKey: string, endDayKey: string) {
  return startDayKey === endDayKey ? startDayKey : `${startDayKey}..${endDayKey}`;
}

function freshnessStateFromSourceTruth(input: {
  sourceTruth: RecoveryMetricSourceTruth;
  sourceObserved: boolean;
  insideLateArrivalWindow?: boolean;
  fromCache?: boolean;
}): RecoveryMetricFreshnessState {
  if (!input.sourceObserved || input.sourceTruth === "source_missing") return "source_missing";
  if (input.sourceTruth === "ga4_evidence_only" || input.sourceTruth === "legacy_directional_only") return "external_evidence_required";
  if (input.fromCache || input.sourceTruth === "hot_cache_snapshot") return "cached";
  if (input.insideLateArrivalWindow) return "late_arrival_window";
  return "source_current";
}

export function getLaunchCriticalEventFamily(eventName: string): LaunchCriticalEventFamily | null {
  const normalized = eventName.trim();
  return LAUNCH_CRITICAL_EVENT_FAMILIES.find((family) =>
    family.canonicalEventNames.includes(normalized) || (family.activeSourceEventNames ?? []).includes(normalized),
  ) ?? null;
}

export function getLaunchCriticalDedupeDimensions(family: LaunchCriticalEventFamily) {
  return [...(family.dedupeDimensions ?? RECOVERY_METRIC_DEDUPE_DIMENSIONS)];
}

export function getLaunchCriticalActiveSourceEventNames(family: LaunchCriticalEventFamily) {
  return family.activeSourceEventNames ?? family.canonicalEventNames;
}

export function buildLaunchCriticalFamilyProofBoundary(family: LaunchCriticalEventFamily): LaunchCriticalFamilyProofBoundary {
  const requiresLedgerCorroboration =
    family.productDomain === "wallet_payment"
    || family.productDomain === "gumdrop_economy"
    || family.productDomain === "drop_unlock";
  const requiresWatchSessionRollup = family.defaultSourceTruth === "watch_session_rollup";
  const requiresAdminAuditFact = family.defaultSourceTruth === "admin_action_fact";
  const sourceRole: LaunchCriticalFamilyProofBoundary["sourceRole"] = requiresAdminAuditFact
    ? "admin_audit_truth"
    : requiresWatchSessionRollup
      ? "watch_session_truth"
      : requiresLedgerCorroboration
        ? "ledger_protected_truth"
        : family.productDomain === "identity_handoff"
          ? "identity_handoff_truth"
          : "behavior_product_truth";
  const recoveryBoundary = requiresAdminAuditFact
    ? "Admin review events require admin action facts and must not hydrate user engagement."
    : requiresWatchSessionRollup
      ? "Watch metrics require watch-session rollups; page duration and legacy estimates stay diagnostic."
      : requiresLedgerCorroboration
        ? "Payment, GumDrop, unlock, and entitlement truth require server ledger or entitlement corroboration."
        : family.productDomain === "identity_handoff"
          ? "Identity handoff truth requires first-party identity-link facts and must not double-count guest and user activity."
          : "Behavior analytics require first-party event facts; GA4, cache, and legacy rows can only calibrate or corroborate.";

  return {
    productTruthSource: family.defaultSourceTruth,
    productTruthEligibleWhenObserved: isObservedFirstPartySourceTruth(family.defaultSourceTruth),
    externalEvidenceCanClearProductTruth: false,
    missingCanRenderAsZero: false,
    requiresLedgerCorroboration,
    requiresWatchSessionRollup,
    requiresAdminAuditFact,
    sourceRole,
    recoveryBoundary,
  };
}

export function buildLaunchCriticalCatalogCoverage(input: {
  catalogEventNames: readonly string[];
  aliasToCanonical?: Record<string, string>;
}): LaunchCriticalCatalogCoverageReport {
  const catalogNames = new Set(input.catalogEventNames.map((eventName) => eventName.trim()).filter(Boolean));
  const aliasToCanonical = input.aliasToCanonical ?? {};
  let aliasResolutionUsed = false;
  const familyCatalogStates = LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => {
    const resolvedEventNames: string[] = [];
    const missingEventNames: string[] = [];
    for (const eventName of family.canonicalEventNames) {
      const canonicalName = catalogNames.has(eventName)
        ? eventName
        : aliasToCanonical[eventName] && catalogNames.has(aliasToCanonical[eventName])
          ? aliasToCanonical[eventName]
          : null;
      if (canonicalName) {
        if (canonicalName !== eventName) aliasResolutionUsed = true;
        resolvedEventNames.push(canonicalName);
      } else {
        missingEventNames.push(eventName);
      }
    }
    return {
      familyId: family.familyId,
      canonicalEventNames: family.canonicalEventNames,
      resolvedEventNames: [...new Set(resolvedEventNames)],
      missingEventNames,
      catalogMapped: resolvedEventNames.length > 0,
      primaryResolvedEventName: resolvedEventNames[0] ?? null,
    };
  });
  const missingFamilies = familyCatalogStates
    .filter((family) => !family.catalogMapped)
    .map((family) => family.familyId);
  const catalogMappedFamilyCount = familyCatalogStates.length - missingFamilies.length;

  return {
    reportKey: "launch-critical-analytics-catalog-coverage",
    familyCount: familyCatalogStates.length,
    catalogMappedFamilyCount,
    catalogMappingCoveragePercent: Math.round((catalogMappedFamilyCount / familyCatalogStates.length) * 1000) / 10,
    missingFamilies,
    aliasResolutionUsed,
    familyCatalogStates,
    policy: {
      requiresOneCatalogEventPerFamily: true,
      compatibilityAliasesAllowed: true,
      missingCompatibilityAliasIsNotSourceCoverageFailure: true,
    },
  };
}

function normalizedReferenceFiles(value: readonly string[] | undefined) {
  return [...new Set((value ?? [])
    .map((entry) => entry.trim().replace(/\\/gu, "/"))
    .filter(Boolean))]
    .sort();
}

export function buildLaunchCriticalActiveSourceCoverageReport(input: {
  generatedAtUtc?: string;
  sourceReferencesByEventName: Record<string, readonly string[]>;
  materializerReferencesByEventName?: Record<string, readonly string[]>;
}): LaunchCriticalActiveSourceCoverageReport {
  const materializerReferencesByEventName = input.materializerReferencesByEventName ?? {};
  const familySourceStates = LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => {
    const activeSourceEventNames = getLaunchCriticalActiveSourceEventNames(family);
    const activeSourceFiles = normalizedReferenceFiles(activeSourceEventNames.flatMap((eventName) =>
      input.sourceReferencesByEventName[eventName] ?? input.sourceReferencesByEventName[eventName.toLowerCase()] ?? [],
    ));
    const materializerFiles = normalizedReferenceFiles(activeSourceEventNames.flatMap((eventName) =>
      materializerReferencesByEventName[eventName] ?? materializerReferencesByEventName[eventName.toLowerCase()] ?? [],
    ));
    const hasSource = activeSourceFiles.length > 0;
    const hasMaterializer = materializerFiles.length > 0;
    const sourceCoverageState = hasSource && hasMaterializer
      ? "source_connected"
      : hasSource
        ? "source_only"
        : hasMaterializer
          ? "materializer_only"
          : "source_missing";
    const countsForActiveSourceCoverage = hasSource || hasMaterializer;
    const sourceTruth = countsForActiveSourceCoverage ? family.defaultSourceTruth : "source_missing";
    const evidenceKind = countsForActiveSourceCoverage ? family.defaultEvidenceKind : "missing";
    const freshnessState = freshnessStateFromSourceTruth({
      sourceTruth,
      sourceObserved: countsForActiveSourceCoverage,
    });
    const confidenceScore = confidenceForEvidence({
      evidenceKind,
      sourceTruth,
      usesIdentityLink: family.identityScope.includes("linked_person"),
      sourceObserved: countsForActiveSourceCoverage,
    });

    return {
      familyId: family.familyId,
      canonicalEventNames: family.canonicalEventNames,
      activeSourceEventNames,
      proofBoundary: buildLaunchCriticalFamilyProofBoundary(family),
      activeSourceFiles: activeSourceFiles.slice(0, 12),
      activeSourceReferenceCount: activeSourceFiles.length,
      materializerFiles: materializerFiles.slice(0, 12),
      materializerReferenceCount: materializerFiles.length,
      sourceCoverageState,
      sourceTruth,
      freshnessState,
      evidenceKind,
      confidenceScore,
      confidenceBand: classifyRecoveryMetricConfidenceBand(confidenceScore),
      dedupeKey: buildLaunchAnalyticsRecoveryDedupeKey({
        semanticAction: family.familyId,
        objectId: family.familyId,
        route: "active-source-scan",
        timestampWindowMs: family.dedupeWindowMs,
      }),
      dedupeDimensions: getLaunchCriticalDedupeDimensions(family),
      lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
      countsForActiveSourceCoverage,
      productTruthEligibleFromSourceScan: false as const,
      nextAction: countsForActiveSourceCoverage
        ? "Keep this active source lane connected to first-party facts, materializers, and dedupe; historical launch rows still need bounded evidence."
        : "Add or repair the active emitter, server source, or materializer before counting this family as covered.",
    } satisfies LaunchCriticalActiveSourceFamilyState;
  });
  const activeSourceFamilyCount = familySourceStates.filter((family) => family.countsForActiveSourceCoverage).length;
  const activeSourceCoveragePercent = Math.round((activeSourceFamilyCount / familySourceStates.length) * 1000) / 10;
  const sourceCoverageStatus = activeSourceCoveragePercent >= LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT ? "pass" : "blocked";

  return {
    reportKey: "launch-critical-active-source-coverage",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    version: RECOVERY_TIMELINE_SPINE_VERSION,
    familyCount: familySourceStates.length,
    activeSourceFamilyCount,
    activeSourceCoveragePercent,
    targetCoveragePercent: LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
    sourceCoverageStatus,
    canClearHistoricalLaunchProof: false,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    familySourceStates,
    policy: {
      catalogMappingRequiredSeparately: true,
      activeSourceScanIsNotRuntimeProof: true,
      historicalRowsStillRequired: true,
      missingIsNotZero: true,
    },
  };
}

function readSummaryString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readSummaryNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function buildRecoveredMetricMissingMetadataFields(record: LaunchRecoverySummaryRecord) {
  const missingFields: RecoveredMetricRequiredMetadataField[] = [];

  if (readSummaryString(record.sourceTruth, "") === "") {
    missingFields.push("sourceTruth");
  }
  if (readSummaryString(record.freshnessState, "") === "") {
    missingFields.push("freshnessState");
  }
  if (!Number.isFinite(readSummaryNumber(record.confidenceScore, Number.NaN))) {
    missingFields.push("confidenceScore");
  }
  if (readSummaryString(record.evidenceKind, "") === "") {
    missingFields.push("evidenceKind");
  }
  if (readSummaryString(record.dedupeKey, "") === "") {
    missingFields.push("dedupeKey");
  }
  if (!Array.isArray(record.dedupeDimensions) || record.dedupeDimensions.length === 0) {
    missingFields.push("dedupeDimensions");
  }
  if (readSummaryNumber(record.lateArrivalWindowDays, Number.NaN) !== ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS) {
    missingFields.push("lateArrivalWindowDays");
  }

  return missingFields;
}

function readRecoveredMetricRowKey(record: LaunchRecoverySummaryRecord, index: number) {
  return readSummaryString(
    record.dayKey,
    readSummaryString(
      record.familyId,
      readSummaryString(record.eventName, `row:${index}`),
    ),
  );
}

export function summarizeRecoveredMetricMetadataCompleteness(
  records: readonly LaunchRecoverySummaryRecord[],
): RecoveredMetricMetadataCompletenessSummary {
  const missingFieldCounts = Object.fromEntries(
    RECOVERED_METRIC_REQUIRED_METADATA_FIELDS.map((field) => [field, 0]),
  ) as Record<RecoveredMetricRequiredMetadataField, number>;
  let completeRowCount = 0;
  const missingRowSamples: RecoveredMetricMetadataCompletenessSummary["missingRowSamples"] = [];

  records.forEach((record, index) => {
    const missingFields = buildRecoveredMetricMissingMetadataFields(record);
    if (missingFields.length === 0) {
      completeRowCount += 1;
      return;
    }

    for (const field of missingFields) {
      missingFieldCounts[field] += 1;
    }
    if (missingRowSamples.length < 8) {
      missingRowSamples.push({
        index,
        rowKey: readRecoveredMetricRowKey(record, index),
        missingFields,
      });
    }
  });

  return {
    status: completeRowCount === records.length ? "complete" : "incomplete",
    rowCount: records.length,
    completeRowCount,
    requiredFields: [...RECOVERED_METRIC_REQUIRED_METADATA_FIELDS],
    expectedLateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
    missingFieldCounts,
    missingRowSamples,
  };
}

const LAUNCH_RECOVERY_CONFIDENCE_RANK: Record<Exclude<LaunchHistoryDisplaySummaryState["confidenceLabel"], "unknown" | "review">, number> = {
  verified: 5,
  strong: 4,
  directional: 3,
  weak: 2,
};

export function summarizeLaunchRecoveryConfidenceBands(
  bands: Array<string | null | undefined>,
): Exclude<LaunchHistoryDisplaySummaryState["confidenceLabel"], "review"> {
  const normalizedBands = bands.filter((band): band is keyof typeof LAUNCH_RECOVERY_CONFIDENCE_RANK =>
    typeof band === "string" && band in LAUNCH_RECOVERY_CONFIDENCE_RANK,
  );
  if (normalizedBands.length === 0) return "unknown";
  return normalizedBands.reduce((weakest, band) =>
    LAUNCH_RECOVERY_CONFIDENCE_RANK[band] < LAUNCH_RECOVERY_CONFIDENCE_RANK[weakest] ? band : weakest,
  );
}

function resolveLaunchRecoveryWindowLabel(input: {
  coverage: LaunchHistoryDisplaySummaryCoverageInput;
  formalExpectedDayCount: number;
}) {
  const rangeProof = input.coverage.rangeProof;
  const expectedDayCount = readSummaryNumber(input.coverage.expectedDayCount);
  const usesFormalDenominator = Boolean(
    !rangeProof?.allLaunchRangeProven &&
    input.formalExpectedDayCount > expectedDayCount,
  );

  if (rangeProof?.allLaunchRangeProven) return "launch days";
  if (usesFormalDenominator) {
    return `launch days (evidence window ${readSummaryNumber(rangeProof?.evidenceDayCount, expectedDayCount)})`;
  }
  if (rangeProof?.coverageWindowKind === "fixture_only_local_window" || rangeProof?.coverageWindowKind === "local_source_window") {
    return "local evidence days";
  }
  return rangeProof ? "evidence days" : "launch days";
}

export function buildLaunchHistoryDisplaySummaryState(input: {
  launchHistoryCoverage?: LaunchHistoryDisplaySummaryCoverageInput | null;
  sourceAgreementState?: string | null;
}): LaunchHistoryDisplaySummaryState {
  const coverage = input.launchHistoryCoverage ?? null;
  const sourceAgreementState = input.sourceAgreementState ?? "not_enough_sources";

  if (!coverage) {
    return {
      sourceLabel: "Unknown",
      confidenceLabel: "unknown",
      coverageLabel: "Coverage waiting",
      sourceWindowLabel: null,
      coverageDenominatorKind: "unknown",
      missingRangeCount: 0,
      sourceAgreementState,
      sourceRoleCounts: {},
      sourceGateBlockers: [],
      mathReasonSamples: [],
    };
  }

  const expectedDayCount = readSummaryNumber(coverage.expectedDayCount);
  const formalExpectedDayCount = readSummaryNumber(coverage.rangeProof?.formalExpectedDayCount, expectedDayCount);
  const denominator = !coverage.rangeProof?.allLaunchRangeProven && formalExpectedDayCount > expectedDayCount
    ? formalExpectedDayCount
    : expectedDayCount;
  const coverageDenominatorKind: NonNullable<LaunchHistoryDisplaySummaryState["coverageDenominatorKind"]> =
    coverage.rangeProof?.allLaunchRangeProven
      ? "approved_launch_range"
      : denominator === formalExpectedDayCount && formalExpectedDayCount > expectedDayCount
        ? "formal_launch_range"
        : "evidence_window";
  const evidenceDayCount = readSummaryNumber(coverage.rangeProof?.evidenceDayCount, expectedDayCount);
  const firstPartyCoverage = coverage.firstPartyCoverage;
  const sourceCounts = coverage.sourceDayCounts;
  const familySourceStates = coverage.eventFamilyCoverage?.familySourceStates ?? [];
  const familySourceSummary = summarizeLaunchRecoveryFamilySourceStates(familySourceStates);
  const mathReasonSamples = familySourceStates
    .filter((family) => family.observedFirstParty !== true || family.productTruthEligible !== true)
    .map((family) => ({
      familyId: readSummaryString(family.familyId, "unknown"),
      sourceRole: readSummaryString(family.sourceRole, "missing_source"),
      mathReason: readSummaryString(family.mathReason, "Missing first-party launch source evidence; do not render this family as zero."),
      nextAction: readSummaryString(family.nextAction, "Repair this launch-critical family before promoting recovered launch charts."),
    }))
    .slice(0, 4);
  const firstPartySourceCount = readSummaryNumber(sourceCounts?.firstParty, readSummaryNumber(sourceCounts?.first_party));
  const productTruthRecoveredDayCount = readSummaryNumber(
    coverage.productTruthRecoveredDayCount,
    readSummaryNumber(firstPartyCoverage?.coveredDayCount, firstPartySourceCount),
  );
  const evidenceObservedDayCount = readSummaryNumber(
    coverage.evidenceObservedDayCount,
    readSummaryNumber(coverage.recoveredDayCount),
  );
  const windowLabel = resolveLaunchRecoveryWindowLabel({
    coverage,
    formalExpectedDayCount,
  });
  const firstPartyCoverageLabel = firstPartyCoverage?.state !== "available"
    ? ` - evidence present ${evidenceObservedDayCount}/${evidenceDayCount} days`
    : "";
  const coverageLabel = productTruthRecoveredDayCount > 0 || firstPartyCoverage?.state === "available"
    ? `${productTruthRecoveredDayCount}/${denominator} product-truth ${windowLabel}${firstPartyCoverageLabel}`
    : `Product-truth source missing for ${windowLabel}${firstPartyCoverageLabel}`;
  const firstRecoveredDayKey = readSummaryString(coverage.firstRecoveredDayKey, "");
  const sourceWindowLabel = firstRecoveredDayKey
    ? coverage.rangeProof?.allLaunchRangeProven
      ? `${coverage.state === "available" ? "Launch history recovered" : "Launch history partially recovered"} since ${firstRecoveredDayKey}`
      : `Launch evidence window since ${firstRecoveredDayKey}`
    : null;
  const sourceLabel = sourceCounts
    ? firstPartySourceCount > 0 && readSummaryNumber(sourceCounts.ga4) > 0
      ? "Mixed"
      : firstPartySourceCount > 0
        ? "First-party"
        : readSummaryNumber(sourceCounts.ga4) > 0
          ? "GA4"
          : readSummaryNumber(sourceCounts.legacySupport) > 0
            ? "Fallback"
            : "Unknown"
    : "Unknown";
  const evidenceConfidenceLabel = summarizeLaunchRecoveryConfidenceBands(
    coverage.days?.map((day) => day.confidenceBand) ?? [],
  );
  const confidenceLabel =
    sourceAgreementState === "failed"
      ? "review"
      : sourceAgreementState === "not_enough_sources" || coverage.state === "source_missing"
        ? "unknown"
      : coverage.state === "available"
        ? evidenceConfidenceLabel === "unknown" ? "verified" : evidenceConfidenceLabel
      : coverage.state === "partial" || sourceAgreementState === "review"
        ? evidenceConfidenceLabel === "unknown" ? "weak" : evidenceConfidenceLabel
      : sourceAgreementState === "pass"
        ? evidenceConfidenceLabel
      : "unknown";

  return {
    sourceLabel,
    confidenceLabel,
    coverageLabel,
    sourceWindowLabel,
    coverageDenominatorKind,
    missingRangeCount: firstPartyCoverage?.missingRanges?.length ?? coverage.missingRanges?.length ?? 0,
    sourceAgreementState,
    sourceRoleCounts: familySourceSummary.sourceRoleCounts,
    sourceGateBlockers: (coverage.sourceGateBlockers ?? []).slice(0, 6),
    mathReasonSamples,
  };
}

function countSummaryRecordsByString(
  records: readonly LaunchRecoverySummaryRecord[],
  field: keyof LaunchRecoverySummaryRecord,
  fallback: string,
) {
  return records.reduce<Record<string, number>>((counts, record) => {
    const key = readSummaryString(record[field], fallback);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function uniqueSummaryNumbers(records: readonly LaunchRecoverySummaryRecord[], field: keyof LaunchRecoverySummaryRecord) {
  return [...new Set(records
    .map((record) => readSummaryNumber(record[field], Number.NaN))
    .filter((value) => Number.isFinite(value)))];
}

function summaryRecordHasKnownSourceCounts(record: LaunchRecoverySummaryRecord) {
  if (record.sourceCountsKnown === true) return true;
  if (record.sourceCountsKnown === false) return false;
  const sourceCounts = record.sourceCounts;
  if (!sourceCounts || typeof sourceCounts !== "object" || Array.isArray(sourceCounts)) return false;
  return ["first_party", "ga4", "historicalSnapshot", "legacySupport"].every((key) =>
    Number.isFinite(readSummaryNumber(sourceCounts[key], Number.NaN))
  );
}

export function summarizeLaunchRecoveryDayEvidence(
  days: readonly LaunchRecoverySummaryRecord[],
): LaunchRecoveryDayEvidenceSummaryState {
  const lateArrivalWindowDayValues = uniqueSummaryNumbers(days, "lateArrivalWindowDays");
  return {
    dayCount: days.length,
    confidenceBandCounts: countSummaryRecordsByString(days, "confidenceBand", "missing"),
    evidenceKindCounts: countSummaryRecordsByString(days, "evidenceKind", "missing"),
    sourceTruthCounts: countSummaryRecordsByString(days, "sourceTruth", "source_missing"),
    freshnessStateCounts: countSummaryRecordsByString(days, "freshnessState", "unknown"),
    sourceTruthStateCounts: countSummaryRecordsByString(days, "sourceTruthState", "unknown"),
    productTruthRecoveredDayCount: days.filter((day) => day.productTruthRecovered === true).length,
    sourceCountsKnownDayCount: days.filter(summaryRecordHasKnownSourceCounts).length,
    lateArrivalWindowDays: lateArrivalWindowDayValues.length === 1 ? lateArrivalWindowDayValues[0] : null,
    lateArrivalWindowDayValues: lateArrivalWindowDayValues.slice(0, 5),
    missingDaySamples: days
      .filter((day) => readSummaryString(day.evidenceKind, "missing") === "missing")
      .map((day) => readSummaryString(day.dayKey, "unknown"))
      .slice(0, 8),
  };
}

export function summarizeLaunchRecoveryFamilySourceStates(
  familySourceStates: readonly LaunchRecoverySummaryRecord[],
): LaunchRecoveryFamilySourceSummaryState {
  return {
    familyCount: familySourceStates.length,
    confidenceBandCounts: countSummaryRecordsByString(familySourceStates, "confidenceBand", "missing"),
    evidenceKindCounts: countSummaryRecordsByString(familySourceStates, "strongestEvidenceKind", "missing"),
    sourceTruthCounts: countSummaryRecordsByString(familySourceStates, "strongestSourceTruth", "source_missing"),
    sourceCoverageStateCounts: countSummaryRecordsByString(familySourceStates, "sourceCoverageState", "source_missing"),
    sourceRoleCounts: countSummaryRecordsByString(familySourceStates, "sourceRole", "missing_source"),
    productTruthEligibleFamilyCount: familySourceStates.filter((family) => family.productTruthEligible === true).length,
    observedFirstPartyFamilySamples: familySourceStates
      .filter((family) => family.observedFirstParty === true)
      .map((family) => readSummaryString(family.familyId, "unknown"))
      .slice(0, 8),
    missingFirstPartyFamilySamples: familySourceStates
      .filter((family) => family.observedFirstParty !== true)
      .map((family) => ({
        familyId: readSummaryString(family.familyId, "unknown"),
        confidenceBand: readSummaryString(family.confidenceBand, "missing"),
        evidenceKind: readSummaryString(family.strongestEvidenceKind, "missing"),
        sourceRole: readSummaryString(family.sourceRole, "missing_source"),
        sourceCoverageState: readSummaryString(family.sourceCoverageState, "source_missing"),
        mathReason: readSummaryString(family.mathReason, "Missing first-party launch source evidence; do not render this family as zero."),
        nextAction: readSummaryString(family.nextAction, "Repair this launch-critical family before promoting recovered launch charts."),
      }))
      .slice(0, 8),
  };
}

export function summarizeLaunchActiveSourceFamilyStates(
  familySourceStates: readonly LaunchRecoverySummaryRecord[],
): LaunchActiveSourceFamilySummaryState {
  return {
    familyCount: familySourceStates.length,
    confidenceBandCounts: countSummaryRecordsByString(familySourceStates, "confidenceBand", "missing"),
    evidenceKindCounts: countSummaryRecordsByString(familySourceStates, "evidenceKind", "missing"),
    sourceTruthCounts: countSummaryRecordsByString(familySourceStates, "sourceTruth", "source_missing"),
    sourceCoverageStateCounts: countSummaryRecordsByString(familySourceStates, "sourceCoverageState", "source_missing"),
    connectedFamilyCount: familySourceStates.filter((family) => family.countsForActiveSourceCoverage === true).length,
    activeSourceReferenceCount: familySourceStates.reduce((sum, family) => sum + readSummaryNumber(family.activeSourceReferenceCount, 0), 0),
    materializerReferenceCount: familySourceStates.reduce((sum, family) => sum + readSummaryNumber(family.materializerReferenceCount, 0), 0),
    connectedFamilySamples: familySourceStates
      .filter((family) => family.countsForActiveSourceCoverage === true)
      .map((family) => readSummaryString(family.familyId, "unknown"))
      .slice(0, 8),
    disconnectedFamilySamples: familySourceStates
      .filter((family) => family.countsForActiveSourceCoverage !== true)
      .map((family) => ({
        familyId: readSummaryString(family.familyId, "unknown"),
        confidenceBand: readSummaryString(family.confidenceBand, "missing"),
        evidenceKind: readSummaryString(family.evidenceKind, "missing"),
        sourceCoverageState: readSummaryString(family.sourceCoverageState, "source_missing"),
        nextAction: readSummaryString(family.nextAction, "Repair this active source lane before treating the product surface as covered."),
      }))
      .slice(0, 8),
  };
}

export function buildLaunchCriticalObservedEventNamesFromSourceEvidence(input: LaunchCriticalSourceEvidenceCounts) {
  const observed = new Set<string>();
  for (const family of LAUNCH_CRITICAL_EVENT_FAMILIES) {
    const count = sourceEvidenceCount(input.canonicalEventCounts, family.canonicalEventNames)
      + sourceEvidenceCount(input.telemetryEventCounts, family.canonicalEventNames);
    if (count > 0) observed.add(family.canonicalEventNames[0] ?? family.familyId);
  }
  return [...observed];
}

function buildObservedLaunchRecoveryMetric(input: {
  familyId: LaunchCriticalEventFamilyId;
  sourceTruth: RecoveryMetricSourceTruth;
  count?: number;
}) {
  if (!input.count || input.count <= 0) return null;
  const family = LAUNCH_CRITICAL_EVENT_FAMILIES.find((entry) => entry.familyId === input.familyId);
  if (!family) return null;
  return buildRecoveredLaunchMetricState({
    eventName: family.canonicalEventNames[0] ?? family.familyId,
    sourceTruth: input.sourceTruth,
    sourceObserved: true,
    route: "launch_critical_source_evidence",
    objectId: `${input.familyId}:${input.count}`,
    timestampMs: 0,
  });
}

export function buildLaunchHistoryDayRecoveryState(input: {
  dayKey: string;
  firstPartyCount?: number | null;
  ga4Count?: number | null;
  historicalSnapshotCount?: number | null;
  legacySupportCount?: number | null;
  internalAdminExcludedCount?: number | null;
}): LaunchHistoryDayRecoveryState {
  const firstPartyCount = Math.max(0, input.firstPartyCount ?? 0);
  const ga4Count = Math.max(0, input.ga4Count ?? 0);
  const historicalSnapshotCount = Math.max(0, input.historicalSnapshotCount ?? 0);
  const legacySupportCount = Math.max(0, input.legacySupportCount ?? 0);
  const hasFirstParty = firstPartyCount > 0;
  const hasGa4 = ga4Count > 0;
  const hasHistoricalSnapshot = historicalSnapshotCount > 0;
  const hasLegacy = legacySupportCount > 0;
  const hasFallback = hasHistoricalSnapshot || hasLegacy;
  const sourceCount = Number(hasFirstParty) + Number(hasGa4) + Number(hasHistoricalSnapshot) + Number(hasLegacy);
  const evidenceObserved = sourceCount > 0;
  const productTruthRecovered = hasFirstParty;
  const recovered = evidenceObserved;
  const sourceTruthState: LaunchHistoryDaySourceTruthState =
    hasFirstParty && sourceCount > 1
      ? "mixed_evidence"
      : hasFirstParty
        ? "first_party_recovered"
        : hasGa4
          ? "second_source_only"
          : hasFallback
            ? "fallback_only"
            : "source_missing";
  const confidence: LaunchHistoryDayRecoveryConfidence = hasFirstParty && hasGa4 && !hasFallback
    ? "verified"
    : hasFirstParty && hasFallback
      ? "mixed"
      : hasFirstParty
        ? "partial"
        : hasGa4 || hasFallback
          ? "fallback"
          : "unknown";
  const sourceTruth: RecoveryMetricSourceTruth = hasFirstParty
    ? "first_party_event_fact"
    : hasGa4
      ? "ga4_evidence_only"
      : hasHistoricalSnapshot
        ? "hot_cache_snapshot"
        : hasLegacy
          ? "legacy_directional_only"
          : "source_missing";
  const recoveredMetric = buildRecoveredLaunchMetricState({
    eventName: "semantic_page_viewed",
    sourceTruth,
    sourceObserved: evidenceObserved,
    route: "launch_history_day",
    objectId: input.dayKey,
    timestampMs: Date.parse(`${input.dayKey}T00:00:00.000Z`),
    fromCache: hasHistoricalSnapshot && !hasFirstParty && !hasGa4,
  });

  return {
    dayKey: input.dayKey,
    expected: true,
    recovered,
    evidenceObserved,
    productTruthRecovered,
    sourceTruthState,
    sourceCounts: {
      first_party: firstPartyCount,
      ga4: ga4Count,
      historicalSnapshot: historicalSnapshotCount,
      legacySupport: legacySupportCount,
    },
    missingRangesBySource: {
      first_party: hasFirstParty ? [] : [input.dayKey],
      ga4: hasGa4 ? [] : [input.dayKey],
      historicalSnapshot: hasHistoricalSnapshot ? [] : [input.dayKey],
      legacySupport: hasLegacy ? [] : [input.dayKey],
    },
    duplicateRanges: sourceCount > 1 ? [input.dayKey] : [],
    internalAdminExcludedCount: input.internalAdminExcludedCount ?? null,
    duplicateSourceCount: Math.max(0, sourceCount - 1),
    confidence,
    sourceTruth: recoveredMetric.sourceTruth,
    freshnessState: recoveredMetric.freshnessState,
    evidenceKind: recoveredMetric.evidenceKind,
    confidenceScore: recoveredMetric.confidenceScore,
    confidenceBand: recoveredMetric.confidenceBand,
    dedupeKey: recoveredMetric.dedupeKey,
    dedupeDimensions: recoveredMetric.dedupeDimensions,
    lateArrivalWindowDays: recoveredMetric.lateArrivalWindowDays,
    reason: recovered
      ? hasFirstParty
        ? hasFallback
          ? "First-party event-fact/day-bucket evidence is present with fallback evidence; keep GA4/fallback corroborating until dedupe review is complete."
          : "First-party event-fact/day-bucket evidence is present for this day; GA4 remains comparison evidence only."
        : hasHistoricalSnapshot
          ? "Historical snapshot evidence is present without a first-party event-fact bucket; it can explain gaps but cannot replace product truth."
          : "Only external or legacy evidence is present for this day; it cannot overwrite first-party product truth."
      : "No source evidence is present for this day.",
    nextAction: hasFirstParty
      ? "Use first-party truth for identity, purchase, unlock, watch, task, creator, and admin metrics; compare GA4 only as second source."
      : "Recover first-party materialization before promoting this day to canonical product analytics.",
  };
}

function normalizeLaunchHistorySourceDayKeys(days: Iterable<string> | null | undefined) {
  return [...new Set([...(days ?? [])].filter((dayKey) => typeof dayKey === "string" && dayKey.trim().length > 0))].sort();
}

export function buildLaunchHistoryDayRecoveryStatesFromSources(input: {
  expectedDayKeys: string[];
  firstPartyDayKeys?: Iterable<string> | null;
  ga4DayKeys?: Iterable<string> | null;
  historicalSnapshotDayKeys?: Iterable<string> | null;
  legacySupportDayKeys?: Iterable<string> | null;
  sourceCountsByDay?: Record<string, LaunchHistoryDaySourceCountRecord> | null;
  internalAdminExcludedCountByDay?: Record<string, number | null | undefined> | null;
}): LaunchHistoryDayRecoveryState[] {
  const expectedDayKeys = normalizeLaunchHistorySourceDayKeys(input.expectedDayKeys);
  const firstPartyDays = new Set(normalizeLaunchHistorySourceDayKeys(input.firstPartyDayKeys));
  const ga4Days = new Set(normalizeLaunchHistorySourceDayKeys(input.ga4DayKeys));
  const historicalSnapshotDays = new Set(normalizeLaunchHistorySourceDayKeys(input.historicalSnapshotDayKeys));
  const legacySupportDays = new Set(normalizeLaunchHistorySourceDayKeys(input.legacySupportDayKeys));

  const countForDay = (
    dayKey: string,
    sourceKey: LaunchHistoryDaySourceCountKey,
    present: boolean,
  ) => {
    const rawCount = input.sourceCountsByDay?.[dayKey]?.[sourceKey];
    const count = typeof rawCount === "number" && Number.isFinite(rawCount)
      ? rawCount
      : present ? 1 : 0;
    return count > 0 ? count : 0;
  };

  return expectedDayKeys.map((dayKey) => buildLaunchHistoryDayRecoveryState({
    dayKey,
    firstPartyCount: countForDay(dayKey, "first_party", firstPartyDays.has(dayKey)),
    ga4Count: countForDay(dayKey, "ga4", ga4Days.has(dayKey)),
    historicalSnapshotCount: countForDay(dayKey, "historicalSnapshot", historicalSnapshotDays.has(dayKey)),
    legacySupportCount: countForDay(dayKey, "legacySupport", legacySupportDays.has(dayKey)),
    internalAdminExcludedCount: typeof input.internalAdminExcludedCountByDay?.[dayKey] === "number"
      ? input.internalAdminExcludedCountByDay[dayKey] ?? null
      : null,
  }));
}

export function buildFormalLaunchHistoryDayRecoveryState(input: {
  dayKey: string;
  localDay?: LaunchHistoryDayRecoveryState | null;
}): LaunchHistoryFormalDayRecoveryState {
  if (input.localDay) {
    return {
      ...input.localDay,
      formalEvidenceState: "local_evidence_window",
      sourceCountsKnown: true,
    };
  }

  const recoveredMetric = buildRecoveredLaunchMetricState({
    eventName: "semantic_page_viewed",
    sourceTruth: "source_missing",
    sourceObserved: false,
    route: "formal_launch_history_day",
    objectId: input.dayKey,
    timestampMs: Date.parse(`${input.dayKey}T00:00:00.000Z`),
  });

  return {
    dayKey: input.dayKey,
    expected: true,
    recovered: false,
    evidenceObserved: false,
    productTruthRecovered: false,
    sourceTruthState: "source_missing",
    formalEvidenceState: "outside_evidence_window",
    sourceCountsKnown: false,
    sourceCounts: {
      first_party: null,
      ga4: null,
      historicalSnapshot: null,
      legacySupport: null,
    },
    missingRangesBySource: {
      first_party: [],
      ga4: [],
      historicalSnapshot: [],
      legacySupport: [],
    },
    duplicateRanges: [],
    internalAdminExcludedCount: null,
    duplicateSourceCount: 0,
    confidence: "unknown",
    sourceTruth: recoveredMetric.sourceTruth,
    freshnessState: recoveredMetric.freshnessState,
    evidenceKind: recoveredMetric.evidenceKind,
    confidenceScore: recoveredMetric.confidenceScore,
    confidenceBand: recoveredMetric.confidenceBand,
    dedupeKey: recoveredMetric.dedupeKey,
    dedupeDimensions: recoveredMetric.dedupeDimensions,
    lateArrivalWindowDays: recoveredMetric.lateArrivalWindowDays,
    reason: "No approved all-launch evidence covers this day yet; source counts are unknown, not zero.",
    nextAction: "Attach approved all-range historical export or admin truth sample with launchHistoryCoverage rows before promoting this day.",
  };
}

export function buildFormalLaunchRangeRecoveryState(input: {
  launchStartDayKey: string;
  generatedAtUtc: string;
  allLaunchRangeProven: boolean;
  expectedDayKeys?: string[];
  localEvidenceDays?: LaunchHistoryDayRecoveryState[];
}): FormalLaunchRangeRecoveryState {
  const expectedDayKeys = [...new Set(input.expectedDayKeys ?? input.localEvidenceDays?.map((day) => day.dayKey) ?? [])].sort();
  const localEvidenceDays = input.localEvidenceDays ?? [];
  const formalLaunchEndDayKey = input.allLaunchRangeProven && expectedDayKeys.length > 0
    ? expectedDayKeys[expectedDayKeys.length - 1]
    : dayKeyFromIso(input.generatedAtUtc);
  const expectedDayCount = inclusiveDayCount(input.launchStartDayKey, formalLaunchEndDayKey);
  const localEvidenceByDay = new Map(localEvidenceDays.map((day) => [day.dayKey, day]));
  const dayCoverage = listInclusiveDays(input.launchStartDayKey, formalLaunchEndDayKey).map((dayKey) =>
    buildFormalLaunchHistoryDayRecoveryState({
      dayKey,
      localDay: localEvidenceByDay.get(dayKey),
    }),
  );
  const state = input.allLaunchRangeProven ? "all_launch_range_proven" : "formal_proof_missing";

  return {
    launchStartDayKey: input.launchStartDayKey,
    expectedThroughDayKey: formalLaunchEndDayKey,
    expectedDayCount,
    localEvidenceDayCount: expectedDayKeys.length,
    approvedCoverageDayCount: input.allLaunchRangeProven ? expectedDayCount : 0,
    localEvidenceRanges: collapseLaunchRecoveryDayRanges(expectedDayKeys),
    unprovenRanges: input.allLaunchRangeProven ? [] : [rangeLabel(input.launchStartDayKey, formalLaunchEndDayKey)],
    state,
    reason: state === "all_launch_range_proven"
      ? "Approved launch-history evidence declares the all-launch range and supplies matching day rows."
      : "Current evidence only covers the local source window; approved all-launch export or admin truth sample is still required.",
    dayCoverage,
    unprovenDayCount: dayCoverage.filter((day) => day.formalEvidenceState === "outside_evidence_window").length,
  };
}

export function buildLaunchRecoverySourceGateState(input: {
  localEvidenceDayCount: number;
  staleEvidence: boolean;
  allLaunchRangeProven: boolean;
  coverageWindowKind: string;
  launchCoverageState: LaunchRecoveryCoverageState;
  firstPartyCoverageState: LaunchRecoveryCoverageState;
  launchCriticalSourceCoverageStatus: "pass" | "blocked";
  launchCriticalObservedFirstPartyCoveragePercent: number;
  sourceAgreementState: string;
}): LaunchRecoverySourceGateState {
  const sourceAgreementPassed = input.sourceAgreementState === "pass";
  const launchCriticalCoveragePassed =
    input.launchCriticalSourceCoverageStatus === "pass"
    && input.launchCriticalObservedFirstPartyCoveragePercent >= LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT;
  const canClearSourceGate =
    input.localEvidenceDayCount > 0
    && !input.staleEvidence
    && input.allLaunchRangeProven
    && input.launchCoverageState === "available"
    && input.firstPartyCoverageState === "available"
    && launchCriticalCoveragePassed
    && sourceAgreementPassed;
  const allLaunchRangeProofReason = input.allLaunchRangeProven
    ? input.coverageWindowKind === "all_range_historical_export"
      ? "The source-agreement detail includes explicit all-launch range proof from an approved all-range historical export."
      : input.coverageWindowKind === "admin_truth_sample"
        ? "The source-agreement detail includes explicit all-launch range proof from a formal admin truth sample."
        : "The source-agreement detail includes explicit all-launch range proof from an approved all-launch source."
    : input.coverageWindowKind.includes("fixture")
      ? "The source-agreement detail is fixture/local-evidence only, not a formal all-launch proof. Formal all-launch recovery still needs the all-range historical route/admin truth sample or an approved export."
      : "The local source-agreement evidence proves only the current evidence window. Formal all-launch recovery still needs the all-range historical route/admin truth sample or an approved export.";
  const sourceGateBlockers: LaunchRecoverySourceGateBlocker[] = [];
  if (input.staleEvidence) {
    sourceGateBlockers.push({
      blocker: "stale_evidence",
      reason: "Launch recovery source evidence is stale relative to current HEAD.",
      nextAction: "Regenerate the launch recovery report for the current source head.",
    });
  }
  if (!input.allLaunchRangeProven) {
    sourceGateBlockers.push({
      blocker: "all_launch_range_proof_missing",
      reason: "The evidence window is not proven to cover the full launch range; attach an all-range historical export or admin truth sample before clearing source truth.",
      nextAction: "Attach approved all-range launch-history evidence or a redacted admin truth sample with launchHistoryCoverage day rows.",
    });
  }
  if (input.firstPartyCoverageState !== "available") {
    sourceGateBlockers.push({
      blocker: "first_party_coverage_incomplete",
      reason: "First-party product truth is incomplete; GA4, historical snapshots, and legacy support cannot clear the source gate.",
      nextAction: "Recover first-party analytics_event_facts or approved server-owned source rows for missing launch days.",
    });
  }
  if (!launchCriticalCoveragePassed) {
    sourceGateBlockers.push({
      blocker: "launch_critical_family_coverage_below_floor",
      reason: `Launch-critical first-party family coverage is ${input.launchCriticalObservedFirstPartyCoveragePercent}%; source truth needs at least ${LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT}% observed first-party coverage before clearing.`,
      nextAction: "Recover or materialize observed first-party evidence for missing launch-critical families before canonical chart promotion.",
    });
  }
  if (!sourceAgreementPassed) {
    sourceGateBlockers.push({
      blocker: "source_agreement_failed",
      reason: "Source agreement has not passed; repair the mismatched source lane before clearing source truth.",
      nextAction: "Use sourceAgreement disagreements and blocked consumer details to repair the exact mismatched source lane.",
    });
  }
  if (input.launchCoverageState !== "available") {
    sourceGateBlockers.push({
      blocker: "launch_history_coverage_unavailable",
      reason: "Launch history coverage is not fully available for the bounded evidence window.",
      nextAction: "Repair launch-history materialization or source-agreement day coverage before promoting charts.",
    });
  }
  if (input.localEvidenceDayCount <= 0) {
    sourceGateBlockers.push({
      blocker: "local_evidence_missing",
      reason: "No launch history evidence window is available.",
      nextAction: "Attach bounded first-party launch-history evidence before attempting source recovery.",
    });
  }
  const sourceGateReason = canClearSourceGate
    ? "First-party coverage is available for the all-launch window, source agreement passed, and evidence is current."
    : sourceGateBlockers[0]?.reason ?? "No launch history evidence window is available.";

  return {
    canClearSourceGate,
    sourceGateReason,
    sourceGateBlockers: canClearSourceGate ? [] : sourceGateBlockers,
    allLaunchRangeProofReason,
  };
}

export function normalizeLaunchHistoryRangeProofKind(value: string | null | undefined): LaunchHistoryRangeProofCoverageWindowKind {
  if (
    value === "all_range_historical_route"
    || value === "all_range_historical_export"
    || value === "admin_truth_sample"
    || value === "fixture_only_local_window"
    || value === "local_source_window"
    || value === "unknown"
  ) {
    return value;
  }
  if (value === "approved_all_launch_export") return "all_range_historical_export";
  if (value === "caller_supplied_expected_days" || value === "fixture_window") return "local_source_window";
  return "unknown";
}

export function buildLaunchHistoryRangeProofState(input: {
  expectedRangeSource?: string | null;
  coverageWindowKind: string;
  allLaunchRangeProven: boolean;
  formalLaunchRange: FormalLaunchRangeRecoveryState;
  reason?: string | null;
  launchStartBoundaryProven?: boolean;
  preLaunchIgnoredDayCount?: number;
  firstRecoveredDayKey?: string | null;
  firstPartyCoverageState?: LaunchRecoveryCoverageState;
  sourceAgreementState?: string;
}): LaunchHistoryRangeProofState {
  const coverageWindowKind = normalizeLaunchHistoryRangeProofKind(input.coverageWindowKind);
  const expectedRangeSource = normalizeLaunchHistoryRangeProofKind(input.expectedRangeSource ?? coverageWindowKind);
  const evidenceDayCount = input.formalLaunchRange.localEvidenceDayCount;
  const sourceAgreementPassed = input.sourceAgreementState === "pass";
  const firstPartyCoverageAvailable = input.firstPartyCoverageState === "available";
  const reason = input.reason?.trim()
    || (
      input.launchStartBoundaryProven === false
        ? `All-time historical route evidence covers ${evidenceDayCount} of ${input.formalLaunchRange.expectedDayCount} formal launch day(s) and starts at the first recovered source day (${input.firstRecoveredDayKey ?? "unknown"}); ${Math.max(0, input.preLaunchIgnoredDayCount ?? 0)} earlier expected day(s) still need launch-start proof or an approved all-launch export.`
        : input.formalLaunchRange.expectedDayCount > evidenceDayCount
          ? `All-time historical route evidence covers ${evidenceDayCount} of ${input.formalLaunchRange.expectedDayCount} formal launch day(s). Attach launch-start proof or an approved all-launch export before treating this as complete launch history.`
          : input.allLaunchRangeProven && coverageWindowKind === "all_range_historical_route"
            ? "All-time historical route coverage is bounded by recovered first-party days and source agreement passed."
            : input.allLaunchRangeProven
              ? "Approved all-launch evidence covers the formal launch range."
              : firstPartyCoverageAvailable && sourceAgreementPassed
                ? "All-time historical route coverage has first-party source agreement but still lacks formal all-launch range proof."
                : "All-time historical route coverage is not product-truth complete until first-party coverage is available and source agreement passes."
    );

  return {
    expectedRangeSource,
    coverageWindowKind,
    allLaunchRangeProven: input.allLaunchRangeProven,
    formalRangeStartDayKey: input.formalLaunchRange.launchStartDayKey,
    formalRangeEndDayKey: input.formalLaunchRange.expectedThroughDayKey,
    formalExpectedDayCount: input.formalLaunchRange.expectedDayCount,
    evidenceDayCount,
    unprovenRanges: input.formalLaunchRange.unprovenRanges,
    reason,
  };
}

export function buildLaunchHistoryCoverageRangeProofEligibility(input: {
  proofMode?: LaunchHistoryCoverageProofMode;
  expectedDayKeys: string[];
  declaredExpectedDayCount: number;
  declaredRecoveredDayCount: number;
  recoveredDayCount: number;
  rangeStartDayKey?: string | null;
  rangeEndDayKey?: string | null;
  rangeProof?: {
    allLaunchRangeProven?: boolean | null;
    expectedRangeSource?: string | null;
    coverageWindowKind?: string | null;
  } | null;
  launchCoverageState: LaunchRecoveryCoverageState;
  firstPartyCoverageState: LaunchRecoveryCoverageState;
  productTruthRecoveredDayCount: number;
  sourceAgreementState: string;
}): LaunchHistoryCoverageRangeProofEligibility {
  const expectedDayKeys = [...new Set(input.expectedDayKeys.filter(Boolean))].sort();
  const expectedFirstDayKey = expectedDayKeys[0] ?? null;
  const expectedLastDayKey = expectedDayKeys[expectedDayKeys.length - 1] ?? null;
  const rangeStartDayKey = input.rangeStartDayKey ?? null;
  const rangeEndDayKey = input.rangeEndDayKey ?? null;
  const declaredDayCount = rangeStartDayKey && rangeEndDayKey
    ? inclusiveDayCount(rangeStartDayKey, rangeEndDayKey)
    : 0;
  const explicitAllLaunchRangeProof =
    input.rangeProof?.allLaunchRangeProven === true
    && expectedDayKeys.length > 0
    && rangeStartDayKey === expectedFirstDayKey
    && rangeEndDayKey === expectedLastDayKey
    && declaredDayCount === expectedDayKeys.length;
  const proofModeAllowsLaunchRangeProof = input.proofMode === "admin_truth_sample"
    || (
      input.proofMode === "local_export"
      && (
        input.rangeProof?.coverageWindowKind === "all_range_historical_export"
        || input.rangeProof?.expectedRangeSource === "approved_all_launch_export"
      )
    );
  const coverageWindowKind: LaunchHistorySourceAgreementCoverageWindowKind = input.proofMode === "admin_truth_sample"
    ? "admin_truth_sample"
    : input.rangeProof?.coverageWindowKind === "all_range_historical_export"
      || input.rangeProof?.expectedRangeSource === "approved_all_launch_export"
      ? "all_range_historical_export"
      : "local_source_window";
  const declaredCountsMatchRows =
    input.declaredExpectedDayCount === expectedDayKeys.length
    && input.declaredRecoveredDayCount === input.recoveredDayCount;
  const allLaunchRangeProven =
    proofModeAllowsLaunchRangeProof
    && explicitAllLaunchRangeProof
    && input.launchCoverageState === "available"
    && input.firstPartyCoverageState === "available"
    && declaredCountsMatchRows
    && input.productTruthRecoveredDayCount === expectedDayKeys.length
    && input.sourceAgreementState === "pass";

  return {
    coverageWindowKind,
    proofModeAllowsLaunchRangeProof,
    explicitAllLaunchRangeProof,
    declaredCountsMatchRows,
    allLaunchRangeProven,
  };
}

export function buildLaunchHistorySourceDayCoverageState(input: {
  expectedDayKeys: string[];
  firstPartyDayKeys?: string[] | null;
  ga4DayKeys?: string[] | null;
  historicalSnapshotDayKeys?: string[] | null;
  legacySupportDayKeys?: string[] | null;
}): LaunchHistorySourceDayCoverageState {
  const expectedDayKeys = [...new Set(input.expectedDayKeys.filter(Boolean))].sort();
  const expectedDaySet = new Set(expectedDayKeys);
  const normalizeSourceDays = (days: string[] | null | undefined) =>
    [...new Set((days ?? []).filter((dayKey) => expectedDaySet.has(dayKey)))].sort();
  const firstPartyDayKeys = normalizeSourceDays(input.firstPartyDayKeys);
  const ga4DayKeys = normalizeSourceDays(input.ga4DayKeys);
  const historicalSnapshotDayKeys = normalizeSourceDays(input.historicalSnapshotDayKeys);
  const legacySupportDayKeys = normalizeSourceDays(input.legacySupportDayKeys);
  const firstPartySet = new Set(firstPartyDayKeys);
  const ga4Set = new Set(ga4DayKeys);
  const historicalSnapshotSet = new Set(historicalSnapshotDayKeys);
  const legacySupportSet = new Set(legacySupportDayKeys);
  const missingDaysBySource = {
    first_party: expectedDayKeys.filter((dayKey) => !firstPartySet.has(dayKey)),
    ga4: expectedDayKeys.filter((dayKey) => !ga4Set.has(dayKey)),
    historical_snapshot: expectedDayKeys.filter((dayKey) => !historicalSnapshotSet.has(dayKey)),
    legacy_support: expectedDayKeys.filter((dayKey) => !legacySupportSet.has(dayKey)),
  };

  return {
    expectedDayKeys,
    sourceDayCounts: {
      firstParty: firstPartyDayKeys.length,
      first_party: firstPartyDayKeys.length,
      ga4: ga4DayKeys.length,
      historicalSnapshot: historicalSnapshotDayKeys.length,
      legacySupport: legacySupportDayKeys.length,
    },
    missingDaysBySource,
    firstPartyMissingDayKeys: missingDaysBySource.first_party,
    sourceMissingDayKeys: expectedDayKeys.filter((dayKey) =>
      !firstPartySet.has(dayKey)
      && !ga4Set.has(dayKey)
      && !historicalSnapshotSet.has(dayKey)
      && !legacySupportSet.has(dayKey)
    ),
  };
}

export function buildLaunchHistorySourceCoverageRowsState(input: {
  expectedDayKeys?: Iterable<string> | null;
  firstPartyDayKeys?: Iterable<string> | null;
  ga4DayKeys?: Iterable<string> | null;
  historicalSnapshotDayKeys?: Iterable<string> | null;
  legacySupportDayKeys?: Iterable<string> | null;
  sourceCountsByDay?: Record<string, LaunchHistoryDaySourceCountRecord> | null;
  internalAdminExcludedCountByDay?: Record<string, number | null | undefined> | null;
}): LaunchHistorySourceCoverageRowsState {
  const firstPartyDayKeys = normalizeLaunchHistorySourceDayKeys(input.firstPartyDayKeys);
  const ga4DayKeys = normalizeLaunchHistorySourceDayKeys(input.ga4DayKeys);
  const historicalSnapshotDayKeys = normalizeLaunchHistorySourceDayKeys(input.historicalSnapshotDayKeys);
  const legacySupportDayKeys = normalizeLaunchHistorySourceDayKeys(input.legacySupportDayKeys);
  const sourceCountDayKeys = normalizeLaunchHistorySourceDayKeys(Object.keys(input.sourceCountsByDay ?? {}));
  const explicitExpectedDayKeys = normalizeLaunchHistorySourceDayKeys(input.expectedDayKeys);
  const expectedDayKeys = explicitExpectedDayKeys.length > 0
    ? explicitExpectedDayKeys
    : normalizeLaunchHistorySourceDayKeys([
      ...firstPartyDayKeys,
      ...ga4DayKeys,
      ...historicalSnapshotDayKeys,
      ...legacySupportDayKeys,
      ...sourceCountDayKeys,
    ]);
  const dayCoverage = buildLaunchHistoryDayRecoveryStatesFromSources({
    expectedDayKeys,
    firstPartyDayKeys,
    ga4DayKeys,
    historicalSnapshotDayKeys,
    legacySupportDayKeys,
    sourceCountsByDay: input.sourceCountsByDay,
    internalAdminExcludedCountByDay: input.internalAdminExcludedCountByDay,
  });
  const sourceDayCoverage = buildLaunchHistorySourceDayCoverageState({
    expectedDayKeys,
    firstPartyDayKeys,
    ga4DayKeys,
    historicalSnapshotDayKeys,
    legacySupportDayKeys,
  });
  const duplicateDayKeys = dayCoverage
    .filter((day) => day.duplicateSourceCount > 0)
    .map((day) => day.dayKey);

  return {
    expectedDayKeys,
    dayCoverage,
    sourceDayCoverage,
    sourceDayCounts: sourceDayCoverage.sourceDayCounts,
    missingDaysBySource: sourceDayCoverage.missingDaysBySource,
    firstPartyMissingDayKeys: sourceDayCoverage.firstPartyMissingDayKeys,
    sourceMissingDayKeys: sourceDayCoverage.sourceMissingDayKeys,
    duplicateDayKeys,
  };
}

export function buildAllLaunchHistoricalRouteRangeProofState(input: {
  launchStartDayKey: string;
  generatedAtUtc: string;
  rawExpectedDayKeys: string[];
  expectedDayKeys: string[];
  localEvidenceDays: LaunchHistoryDayRecoveryState[];
  launchStartBoundaryProven: boolean;
  preLaunchIgnoredDayCount: number;
  firstRecoveredDayKey: string | null;
  unionPresentDayCount: number;
  missingDayCount: number;
  firstPartyCoverageState: LaunchRecoveryCoverageState;
  sourceAgreementState: string;
}): AllLaunchHistoricalRouteRangeProofState {
  const rawExpectedDayKeys = [...new Set(input.rawExpectedDayKeys.filter(Boolean))].sort();
  const expectedDayKeys = [...new Set(input.expectedDayKeys.filter(Boolean))].sort();
  const formalRangeEndDayKey = [
    dayKeyFromIso(input.generatedAtUtc),
    rawExpectedDayKeys[rawExpectedDayKeys.length - 1],
    expectedDayKeys[expectedDayKeys.length - 1],
  ]
    .filter((dayKey): dayKey is string => typeof dayKey === "string" && dayKey.trim().length > 0)
    .sort()
    .at(-1) ?? dayKeyFromIso(input.generatedAtUtc);
  const formalExpectedDayCount = inclusiveDayCount(input.launchStartDayKey, formalRangeEndDayKey);
  const allLaunchRangeProven =
    input.launchStartBoundaryProven
    && expectedDayKeys.length >= formalExpectedDayCount
    && input.unionPresentDayCount > 0
    && input.missingDayCount === 0
    && input.firstPartyCoverageState === "available"
    && input.sourceAgreementState === "pass";
  const formalLaunchRange = buildFormalLaunchRangeRecoveryState({
    launchStartDayKey: input.launchStartDayKey,
    generatedAtUtc: `${formalRangeEndDayKey}T00:00:00.000Z`,
    allLaunchRangeProven,
    expectedDayKeys,
    localEvidenceDays: input.localEvidenceDays,
  });

  return {
    allLaunchRangeProven,
    formalLaunchRange,
    rangeProof: buildLaunchHistoryRangeProofState({
      expectedRangeSource: "all_range_historical_route",
      coverageWindowKind: "all_range_historical_route",
      allLaunchRangeProven,
      formalLaunchRange,
      launchStartBoundaryProven: input.launchStartBoundaryProven,
      preLaunchIgnoredDayCount: input.preLaunchIgnoredDayCount,
      firstRecoveredDayKey: input.firstRecoveredDayKey,
      firstPartyCoverageState: input.firstPartyCoverageState,
      sourceAgreementState: input.sourceAgreementState,
    }),
  };
}

export function buildLaunchHistoryCoverageSummaryState(input: {
  expectedDayKeys: string[];
  dayCoverage: LaunchHistoryDayRecoveryState[];
  firstPartyMissingDayKeys?: string[];
  sourceMissingDayKeys?: string[];
  staleEvidence: boolean;
  sourceAgreementState: string;
}): LaunchHistoryCoverageSummaryState {
  const recoveredDays = input.dayCoverage.filter((day) => day.recovered);
  const dayCoverageByKey = new Map(input.dayCoverage.map((day) => [day.dayKey, day]));
  const firstPartyMissingDayKeys = input.firstPartyMissingDayKeys ?? input.expectedDayKeys.filter((dayKey) =>
    (dayCoverageByKey.get(dayKey)?.sourceCounts.first_party ?? 0) <= 0
  );
  const sourceMissingDayKeys = input.sourceMissingDayKeys ?? input.expectedDayKeys.filter((dayKey) =>
    dayCoverageByKey.get(dayKey)?.evidenceObserved !== true
  );
  const firstPartyObservedDayCount = input.dayCoverage.filter((day) => day.sourceCounts.first_party > 0).length;
  const sourceAgreementPassed = input.sourceAgreementState === "pass";
  const sourceAgreementFailed = input.sourceAgreementState === "failed" || input.sourceAgreementState === "fail";
  const firstPartyCoverageState: LaunchRecoveryCoverageState = input.expectedDayKeys.length === 0 || firstPartyObservedDayCount === 0
    ? "source_missing"
    : firstPartyMissingDayKeys.length > 0
      ? "partial"
      : "available";
  const launchCoverageState: LaunchRecoveryCoverageState = recoveredDays.length === 0
    ? "source_missing"
    : firstPartyCoverageState !== "available" || !sourceAgreementPassed || sourceMissingDayKeys.length > 0
      ? "partial"
      : "available";
  const launchCoverageReason = launchCoverageState === "source_missing"
    ? "No launch-history source evidence was observed in the generated source agreement detail."
    : firstPartyCoverageState !== "available"
      ? "Launch-history day buckets are only partially first-party backed; GA4, historical snapshots, and legacy support remain evidence-only until first-party product truth covers the range."
      : sourceAgreementFailed
        ? "Launch-history day buckets exist, but source agreement failed; keep coverage partial until first-party and second-source lanes agree."
        : launchCoverageState === "partial"
          ? "Some launch-history day buckets are missing from all local source evidence."
          : "Every expected launch day is first-party backed and source agreement passed; source agreement still controls when charts can be treated as canonical.";
  const firstPartyCoverageReason = firstPartyCoverageState === "available"
    ? "First-party evidence exists for every expected local evidence day."
    : firstPartyCoverageState === "source_missing"
      ? "No first-party launch-history day buckets are present; missing remains missing until first-party materialization exists."
      : "First-party product truth is missing for at least one local evidence day; GA4/fallback evidence cannot replace it.";

  return {
    firstRecoveredDayKey: recoveredDays[0]?.dayKey ?? null,
    lastRecoveredDayKey: recoveredDays[recoveredDays.length - 1]?.dayKey ?? null,
    recoveredDayCount: recoveredDays.length,
    evidenceObservedDayCount: input.dayCoverage.filter((day) => day.evidenceObserved).length,
    productTruthRecoveredDayCount: input.dayCoverage.filter((day) => day.productTruthRecovered).length,
    secondSourceOnlyDayCount: input.dayCoverage.filter((day) => day.sourceTruthState === "second_source_only").length,
    fallbackOnlyDayCount: input.dayCoverage.filter((day) => day.sourceTruthState === "fallback_only").length,
    firstPartyCoverage: {
      state: firstPartyCoverageState,
      canPromoteProductTruth: firstPartyCoverageState === "available" && !input.staleEvidence && sourceAgreementPassed,
      reason: firstPartyCoverageReason,
    },
    launchCoverage: {
      state: launchCoverageState,
      reason: launchCoverageReason,
    },
  };
}

export function buildLaunchCriticalRecoveredMetricsFromSourceEvidence(input: LaunchCriticalSourceEvidenceCounts) {
  return [
    buildObservedLaunchRecoveryMetric({
      familyId: "purchase",
      sourceTruth: "server_ledger",
      count: Math.max(input.firstPartyPurchaseCount ?? 0, input.completedPurchaseTransactionsCount ?? 0),
    }),
    buildObservedLaunchRecoveryMetric({
      familyId: "unlock",
      sourceTruth: "server_ledger",
      count: Math.max(input.firstPartyUnlockCount ?? 0, input.unlockTransactionsCount ?? 0),
    }),
    buildObservedLaunchRecoveryMetric({
      familyId: "viewer_open",
      sourceTruth: "first_party_event_fact",
      count: Math.max(input.viewerSessionFactCount ?? 0, input.viewerSessionStartedLogsLength ?? 0),
    }),
    buildObservedLaunchRecoveryMetric({
      familyId: "watch_start",
      sourceTruth: "watch_session_rollup",
      count: input.watchSessionCount,
    }),
    buildObservedLaunchRecoveryMetric({
      familyId: "watch_end",
      sourceTruth: "watch_session_rollup",
      count: input.watchCaptureFullCount,
    }),
  ].filter((entry): entry is RecoveredLaunchMetricState => entry !== null);
}

export function buildLaunchCriticalRecoveryCoverageFromEvidence(input: {
  generatedAtUtc?: string;
  launchHistoryDays?: LaunchHistoryDayRecoveryState[];
  sourceEvidence?: LaunchCriticalSourceEvidenceCounts;
}) {
  const launchHistoryDays = input.launchHistoryDays ?? [];
  const firstPartyLaunchDayCount = launchHistoryDays.reduce(
    (total, day) => total + Math.max(0, day.sourceCounts.first_party),
    0,
  );
  const sourceEvidence = input.sourceEvidence ?? {};
  const canonicalEventCounts = {
    ...(sourceEvidence.canonicalEventCounts ?? {}),
  };
  if (firstPartyLaunchDayCount > 0) {
    canonicalEventCounts.semantic_page_viewed = Math.max(
      canonicalEventCounts.semantic_page_viewed ?? 0,
      firstPartyLaunchDayCount,
    );
  }

  const observedEventNames = buildLaunchCriticalObservedEventNamesFromSourceEvidence({
    ...sourceEvidence,
    canonicalEventCounts,
  });
  const recoveredMetrics = [
    ...launchHistoryDays
      .filter((day) => day.evidenceObserved && !day.productTruthRecovered)
      .map((day) => buildRecoveredLaunchMetricState({
        eventName: "semantic_page_viewed",
        sourceTruth: day.sourceTruth,
        sourceObserved: day.evidenceObserved,
        route: "launch_history_day",
        objectId: day.dayKey,
        timestampMs: Date.parse(`${day.dayKey}T00:00:00.000Z`),
        fromCache: day.sourceTruth === "hot_cache_snapshot",
      })),
    ...buildLaunchCriticalRecoveredMetricsFromSourceEvidence({
      ...sourceEvidence,
      canonicalEventCounts,
    }),
  ];

  return buildLaunchCriticalRecoveryCoverageReport({
    generatedAtUtc: input.generatedAtUtc,
    observedEventNames,
    recoveredMetrics,
  });
}

export function buildLaunchAnalyticsRecoveryDedupeKey(input: LaunchAnalyticsRecoveryDedupeInput) {
  const semanticAction = normalizeDedupePart(input.semanticAction, "unknown_action");
  const eventId = input.eventId?.trim()
    ? normalizeDedupePart(input.eventId, "unknown_event")
    : null;

  if (eventId) {
    return [
      "launch_recovery",
      semanticAction,
      `event:${eventId}`,
    ].join("|");
  }

  const windowMs = Math.max(1, input.timestampWindowMs ?? 60_000);
  const timestampBucket = timeBucket(Number.isFinite(input.timestampMs ?? Number.NaN) ? Number(input.timestampMs) : 0, windowMs);
  const identityKey = input.identityLinkId
    ? `link:${normalizeDedupePart(input.identityLinkId, "unknown_link")}`
    : input.userId
      ? `user:${normalizeDedupePart(input.userId, "unknown_user")}`
      : input.anonymousVisitorId
        ? `guest:${normalizeDedupePart(input.anonymousVisitorId, "unknown_guest")}`
        : "actor:unknown";

  return [
    "launch_recovery",
    semanticAction,
    `event:${normalizeDedupePart(input.eventId, "no_event_id")}`,
    `session:${normalizeDedupePart(input.sessionId, "no_session")}`,
    identityKey,
    `route:${normalizeDedupePart(input.route, "no_route")}`,
    `object:${normalizeDedupePart(input.objectId, "no_object")}`,
    `bucket:${timestampBucket}`,
  ].join("|");
}

export function buildRecoveryMetricIdentityStitchingState(input: {
  eventId?: string | null;
  identityLinkId?: string | null;
}): RecoveryMetricIdentityStitchingState {
  const usesIdentityLink = Boolean(input.identityLinkId);
  const doubleCountingPreventedBy = input.eventId
    ? "event_id"
    : usesIdentityLink
      ? "identity_link_id"
      : "session_semantic_window";

  return {
    usesIdentityLink,
    countsGlobalOnce: true,
    countsLinkedPersonOnce: usesIdentityLink,
    doubleCountingPreventedBy,
  };
}

export function buildRecoveredLaunchMetricState(input: {
  eventName: string;
  sourceTruth?: RecoveryMetricSourceTruth;
  sourceObserved?: boolean;
  eventId?: string | null;
  sessionId?: string | null;
  identityLinkId?: string | null;
  userId?: string | null;
  anonymousVisitorId?: string | null;
  route?: string | null;
  objectId?: string | null;
  timestampMs?: number | null;
  insideLateArrivalWindow?: boolean;
  fromCache?: boolean;
  evidenceKind?: RecoveryMetricEvidenceKindInput | string | null;
}): RecoveredLaunchMetricState {
  const family = getLaunchCriticalEventFamily(input.eventName);
  const sourceTruth = input.sourceTruth ?? family?.defaultSourceTruth ?? "source_missing";
  const sourceObserved = input.sourceObserved ?? sourceTruth !== "source_missing";
  const evidenceKind = sourceObserved
    ? normalizeRecoveryMetricEvidenceKind(input.evidenceKind ?? evidenceKindFromSourceTruth(sourceTruth))
    : "missing";
  const freshnessState = freshnessStateFromSourceTruth({
    sourceTruth,
    sourceObserved,
    insideLateArrivalWindow: input.insideLateArrivalWindow,
    fromCache: input.fromCache,
  });
  const metricKey = family?.familyId ?? "page_view";
  const semanticAction = family?.familyId ?? input.eventName;
  const dedupeKey = buildLaunchAnalyticsRecoveryDedupeKey({
    eventId: input.eventId,
    sessionId: input.sessionId,
    identityLinkId: input.identityLinkId,
    userId: input.userId,
    anonymousVisitorId: input.anonymousVisitorId,
    route: input.route,
    semanticAction,
    objectId: input.objectId,
    timestampMs: input.timestampMs,
    timestampWindowMs: family?.dedupeWindowMs,
  });
  const identityStitching = buildRecoveryMetricIdentityStitchingState({
    eventId: input.eventId,
    identityLinkId: input.identityLinkId,
  });
  const confidenceScore = confidenceForEvidence({
    evidenceKind,
    sourceTruth,
    usesIdentityLink: identityStitching.usesIdentityLink,
    sourceObserved,
  });
  const confidenceBand = classifyRecoveryMetricConfidenceBand(confidenceScore);

  return {
    metricKey,
    eventName: input.eventName,
    sourceTruth,
    freshnessState,
    confidenceScore,
    confidenceBand,
    evidenceKind,
    dedupeKey,
    dedupeDimensions: family ? getLaunchCriticalDedupeDimensions(family) : [...RECOVERY_METRIC_DEDUPE_DIMENSIONS],
    lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
    missingVsZeroState: sourceObserved ? "source_present" : "source_missing",
    identityStitching,
    mathReason: sourceObserved
      ? `${input.eventName} is normalized through the ${semanticAction} launch-critical recovery family; ${sourceTruth} supplies ${evidenceKind} evidence.`
      : `${input.eventName} has no bounded source evidence; keep it missing rather than rendering zero.`,
  };
}

export function buildLaunchCriticalRecoveryCoverageReport(input: {
  generatedAtUtc?: string;
  observedEventNames: string[];
  recoveredMetrics?: RecoveredLaunchMetricState[];
}): LaunchCriticalRecoveryCoverageReport {
  const observed = new Set(input.observedEventNames.map((eventName) => eventName.trim()).filter(Boolean));
  const recoveredMetrics = input.recoveredMetrics ?? [];
  const familySourceStates: LaunchCriticalFamilySourceState[] = LAUNCH_CRITICAL_EVENT_FAMILIES.map((family) => {
    const activeSourceEventNames = getLaunchCriticalActiveSourceEventNames(family);
    const observedByName = activeSourceEventNames.some((eventName) => observed.has(eventName));
    const familyMetrics = recoveredMetrics.filter((metric) => metric.metricKey === family.familyId);
    const strongestMetric = familyMetrics
      .slice()
      .sort((left, right) =>
        recoveryMetricSourcePriority(right) - recoveryMetricSourcePriority(left)
        || right.confidenceScore - left.confidenceScore
      )[0];
    const strongestSourceTruth = observedByName
      ? family.defaultSourceTruth
      : strongestMetric?.sourceTruth ?? "source_missing";
    const strongestEvidenceKind = observedByName
      ? family.defaultEvidenceKind
      : strongestMetric?.evidenceKind ?? "missing";
    const observedFirstParty = observedByName
      || familyMetrics.some((metric) => metric.evidenceKind === "observed" && isObservedFirstPartySourceTruth(metric.sourceTruth));
    const confidenceScore = observedByName
      ? confidenceForEvidence({
        evidenceKind: family.defaultEvidenceKind,
        sourceTruth: family.defaultSourceTruth,
        usesIdentityLink: false,
        sourceObserved: true,
      })
      : (strongestMetric?.confidenceScore ?? confidenceForEvidence({
        evidenceKind: strongestEvidenceKind,
        sourceTruth: strongestSourceTruth,
        usesIdentityLink: false,
        sourceObserved: observedFirstParty || strongestSourceTruth !== "source_missing",
      }));
    const confidenceBand = classifyRecoveryMetricConfidenceBand(confidenceScore);
    const sourceCoverageState = sourceCoverageStateForMetric({
      sourceTruth: strongestSourceTruth,
      evidenceKind: strongestEvidenceKind,
      observedFirstParty,
    });
    const sourceObserved = observedFirstParty || strongestSourceTruth !== "source_missing";
    const freshnessState = strongestMetric?.freshnessState ?? freshnessStateFromSourceTruth({
      sourceTruth: strongestSourceTruth,
      sourceObserved,
      fromCache: strongestSourceTruth === "hot_cache_snapshot",
    });

    return {
      familyId: family.familyId,
      canonicalEventNames: family.canonicalEventNames,
      proofBoundary: buildLaunchCriticalFamilyProofBoundary(family),
      observedFirstParty,
      sourceTruth: strongestSourceTruth,
      freshnessState,
      evidenceKind: strongestEvidenceKind,
      strongestSourceTruth,
      strongestEvidenceKind,
      confidenceScore,
      confidenceBand,
      dedupeKey: strongestMetric?.dedupeKey ?? buildLaunchAnalyticsRecoveryDedupeKey({
        semanticAction: family.familyId,
        objectId: family.familyId,
        route: "launch-critical-family-coverage",
        timestampWindowMs: family.dedupeWindowMs,
      }),
      dedupeDimensions: getLaunchCriticalDedupeDimensions(family),
      lateArrivalWindowDays: strongestMetric?.lateArrivalWindowDays ?? ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
      sourceRole: sourceRoleForFamilySourceState(sourceCoverageState),
      sourceCoverageState,
      productTruthEligible: observedFirstParty,
      mathReason: mathReasonForFamilySourceState({
        family,
        sourceCoverageState,
        sourceTruth: strongestSourceTruth,
        evidenceKind: strongestEvidenceKind,
      }),
      nextAction: nextActionForFamilySourceState(sourceCoverageState),
    };
  });
  const missingFamilies = LAUNCH_CRITICAL_EVENT_FAMILIES
    .filter((family) => !getLaunchCriticalActiveSourceEventNames(family).some((eventName) => observed.has(eventName)))
    .map((family) => family.familyId);
  const mappedFamilyCount = LAUNCH_CRITICAL_EVENT_FAMILIES.length - missingFamilies.length;
  const coveragePercent = Math.round((mappedFamilyCount / LAUNCH_CRITICAL_EVENT_FAMILIES.length) * 1000) / 10;
  const observedFirstPartyFamilyCount = familySourceStates.filter((family) => family.observedFirstParty).length;
  const observedFirstPartyCoveragePercent = Math.round((observedFirstPartyFamilyCount / LAUNCH_CRITICAL_EVENT_FAMILIES.length) * 1000) / 10;
  const sourceCoverageStatus = observedFirstPartyCoveragePercent >= LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT ? "pass" : "blocked";

  return {
    reportKey: "launch-critical-analytics-recovery-coverage",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    version: RECOVERY_TIMELINE_SPINE_VERSION,
    lateArrivalWindowDays: ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
    targetCoveragePercent: LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
    familyCount: LAUNCH_CRITICAL_EVENT_FAMILIES.length,
    canonicalMappedFamilyCount: LAUNCH_CRITICAL_EVENT_FAMILIES.length,
    canonicalMappingCoveragePercent: 100,
    mappedFamilyCount,
    coveragePercent,
    observedFirstPartyFamilyCount,
    observedFirstPartyCoveragePercent,
    sourceCoverageStatus,
    missingFamilies,
    familySourceStates,
    holdbackValidation: {
      observedFirstPartyRequired: true,
      modeledOrInferredCanCalibrateOnly: true,
      minObservedFirstPartyCoveragePercent: LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT,
      status: sourceCoverageStatus,
      reason: sourceCoverageStatus === "pass"
        ? `Observed first-party or server-owned launch-critical coverage meets the ${LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT}% recovery calibration floor.`
        : `Modeled, inferred, cached, or missing evidence cannot clear the ${LAUNCH_CRITICAL_FIRST_PARTY_COVERAGE_FLOOR_PERCENT}% first-party recovery calibration floor.`,
      nextAction: sourceCoverageStatus === "pass"
        ? "Keep dedupe and identity stitching active while late-arriving evidence remains inside the 12-day window."
        : "Repair the missing first-party emitters, bridges, materializers, or source exports before promoting recovered launch charts.",
    },
    sourceTruthStates: [...RECOVERY_METRIC_SOURCE_TRUTHS],
    evidenceKinds: [...RECOVERY_METRIC_EVIDENCE_KINDS],
    confidenceBands: [...RECOVERY_METRIC_CONFIDENCE_BANDS],
    freshnessStates: [...RECOVERY_METRIC_FRESHNESS_STATES],
    dedupeRules: RECOVERY_METRIC_DEDUPE_RULES,
    productTruthPolicy: RECOVERY_METRIC_PRODUCT_TRUTH_POLICY,
    modelingPolicy: RECOVERY_METRIC_MODELING_POLICY,
  };
}

function hasIdentity(entry: RecoveryTimelineEntry) {
  return Boolean(entry.actor.userId || entry.actor.anonymousVisitorId || entry.actor.sessionId || entry.actor.identityLinkId);
}

function classifySourceOnlyGap(entry: RecoveryTimelineEntry): EventFactTimelineGapClassification {
  if (!hasIdentity(entry)) return "identity_missing";
  if (entry.source === "ga4_evidence") return "ga4_only";
  if (entry.source === "legacy_analytics" || entry.source === "unknown_legacy") return "legacy_only";
  return "first_party_missing";
}

function reconciliationReason(classification: EventFactTimelineGapClassification) {
  if (classification === "first_party_present") return "First-party analytics_event_facts row is present and remains primary truth.";
  if (classification === "duplicate_candidate") return "Same actor/session/action/time window appears more than once; do not import duplicates.";
  if (classification === "timestamp_conflict") return "Event names and identity align but timestamps are outside the accepted duplicate window.";
  if (classification === "identity_missing") return "Timeline evidence lacks actor/session identity and cannot hydrate user metrics.";
  if (classification === "ga4_only") return "GA4 evidence can corroborate volume but cannot replace first-party event facts.";
  if (classification === "legacy_only") return "Legacy evidence remains recovery/archive evidence until first-party fact or owner review corroborates it.";
  return "No matching first-party event fact exists; classify as missing source, not zero.";
}

export function reconcileAnalyticsEventFactsWithRecoveryTimeline(input: {
  generatedAtUtc?: string;
  firstPartyEventFacts: AnalyticsEventFactRecoveryInput[];
  timelineEntries: RecoveryTimelineEntry[];
  sameActorSessionActionWindowMs?: number;
  timestampConflictWindowMs?: number;
}): EventFactTimelineReconciliationReport {
  const windowMs = input.sameActorSessionActionWindowMs ?? 60_000;
  const conflictWindowMs = input.timestampConflictWindowMs ?? 5 * 60_000;
  const factsById = new Map(input.firstPartyEventFacts.map((fact) => [fact.eventId, fact]));
  const factsByKey = new Map<string, AnalyticsEventFactRecoveryInput[]>();
  for (const fact of input.firstPartyEventFacts) {
    const key = factMatchingKey(fact, windowMs);
    factsByKey.set(key, [...(factsByKey.get(key) ?? []), fact]);
  }

  const matches: EventFactTimelineMatch[] = [];
  const matchedFactIds = new Set<string>();

  for (const entry of input.timelineEntries) {
    const explicitFactId = entry.corroboration.eventFactId ?? null;
    const exactFact = explicitFactId ? factsById.get(explicitFactId) : undefined;
    const key = entryMatchingKey(entry, windowMs);
    const keyMatches = factsByKey.get(key) ?? [];
    const matchedFact = exactFact ?? keyMatches[0];
    const duplicateCandidate = keyMatches.length > 1 || entry.classification === "duplicate_candidate";
    let gapClassification: EventFactTimelineGapClassification = matchedFact ? "first_party_present" : classifySourceOnlyGap(entry);

    if (matchedFact && duplicateCandidate) {
      gapClassification = "duplicate_candidate";
    } else if (!matchedFact) {
      const timestampConflict = input.firstPartyEventFacts.some((fact) => {
        const sameEvent = fact.eventName === entry.eventName;
        const sameActor = normalizeActorKey(fact) === normalizeActorKey(entry.actor);
        const delta = Math.abs(factTimestampMs(fact) - entryTimestampMs(entry));
        return sameEvent && sameActor && delta > windowMs && delta <= conflictWindowMs;
      });
      if (timestampConflict) gapClassification = "timestamp_conflict";
    }

    if (matchedFact) matchedFactIds.add(matchedFact.eventId);

    matches.push({
      matchingKey: key,
      firstPartyEventFactId: matchedFact?.eventId ?? null,
      timelineId: entry.timelineId,
      eventName: entry.eventName,
      gapClassification,
      duplicateCandidate,
      productTruthEligible: gapClassification === "first_party_present" && entry.source === "first_party_event_fact",
      reason: reconciliationReason(gapClassification),
    });
  }

  for (const fact of input.firstPartyEventFacts.filter((entry) => !matchedFactIds.has(entry.eventId))) {
    const key = factMatchingKey(fact, windowMs);
    const duplicateCandidate = (factsByKey.get(key) ?? []).length > 1;
    matches.push({
      matchingKey: key,
      firstPartyEventFactId: fact.eventId,
      timelineId: null,
      eventName: fact.eventName,
      gapClassification: duplicateCandidate ? "duplicate_candidate" : "first_party_present",
      duplicateCandidate,
      productTruthEligible: !duplicateCandidate,
      reason: reconciliationReason(duplicateCandidate ? "duplicate_candidate" : "first_party_present"),
    });
  }

  const count = (classification: EventFactTimelineGapClassification) =>
    matches.filter((entry) => entry.gapClassification === classification).length;

  return {
    reportKey: "analytics-event-facts-recovery-reconciliation",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    matchingRules: {
      exactEventFactIdWins: true,
      sameActorSessionActionWindowMs: windowMs,
      timestampConflictWindowMs: conflictWindowMs,
      missingSourceIsNotZero: true,
    },
    summary: {
      firstPartyFactCount: input.firstPartyEventFacts.length,
      timelineEntryCount: input.timelineEntries.length,
      firstPartyPresent: count("first_party_present"),
      legacyOnly: count("legacy_only"),
      ga4Only: count("ga4_only"),
      firstPartyMissing: count("first_party_missing"),
      identityMissing: count("identity_missing"),
      timestampConflict: count("timestamp_conflict"),
      duplicateCandidate: count("duplicate_candidate"),
      productTruthEligible: matches.filter((entry) => entry.productTruthEligible).length,
    },
    matches,
    productTruthPolicy: {
      firstPartyEventFactsPrimary: true,
      legacyCanOnlyCorroborate: true,
      ga4CanOnlyCorroborate: true,
      duplicateEventsNotImported: true,
      missingWindowNotZero: true,
    },
  };
}

export function reconcileTreasuryEventsWithRecoveryTimeline(input: {
  generatedAtUtc?: string;
  ledgerEvents: TreasuryLedgerRecoveryInput[];
  timelineEvidence: TreasuryTimelineEvidenceInput[];
}): TreasuryTimelineReconciliationReport {
  const findings: TreasuryTimelineReconciliationFinding[] = [];
  const evidenceByKey = new Map<string, TreasuryTimelineEvidenceInput[]>();
  const ledgerByKey = new Map<string, TreasuryLedgerRecoveryInput[]>();

  for (const evidence of input.timelineEvidence) {
    const key = treasuryEvidenceMatchingKey(evidence);
    evidenceByKey.set(key, [...(evidenceByKey.get(key) ?? []), evidence]);
  }
  for (const event of input.ledgerEvents) {
    const key = treasuryLedgerMatchingKey(event);
    ledgerByKey.set(key, [...(ledgerByKey.get(key) ?? []), event]);
  }

  const matchedEvidenceIds = new Set<string>();

  for (const ledgerEvent of input.ledgerEvents) {
    const key = treasuryLedgerMatchingKey(ledgerEvent);
    const evidenceMatches = evidenceByKey.get(key) ?? [];
    const duplicateLedger = (ledgerByKey.get(key) ?? []).length > 1;
    const firstEvidence = evidenceMatches[0];

    findings.push({
      findingId: treasuryFindingId("ledger_confirmed", key),
      status: "ledger_confirmed",
      eventType: ledgerEvent.eventType,
      ledgerId: ledgerEvent.ledgerId,
      timelineId: firstEvidence?.entry.timelineId ?? null,
      eventName: ledgerEvent.eventName,
      sourceBucket: ledgerEvent.sourceBucket,
      evidenceSourceBucket: firstEvidence?.expectedSourceBucket ?? null,
      productTruthAllowed: true,
      reason: "Server treasury ledger/source-of-funds record is the primary money truth.",
      nextAction: "Use analytics only as corroborating evidence; do not credit or debit from analytics.",
    });

    if (duplicateLedger || evidenceMatches.length > 1) {
      findings.push({
        findingId: treasuryFindingId("duplicate_risk", key),
        status: "duplicate_risk",
        eventType: ledgerEvent.eventType,
        ledgerId: ledgerEvent.ledgerId,
        timelineId: firstEvidence?.entry.timelineId ?? null,
        eventName: ledgerEvent.eventName,
        sourceBucket: ledgerEvent.sourceBucket,
        evidenceSourceBucket: firstEvidence?.expectedSourceBucket ?? null,
        productTruthAllowed: false,
        reason: "Multiple ledger/evidence rows share the same actor, action, object, and time bucket.",
        nextAction: "Review idempotency receipts and event dedupe before materializing aggregates.",
      });
    }

    if (firstEvidence) {
      matchedEvidenceIds.add(firstEvidence.entry.timelineId);
      const evidenceBucket = firstEvidence.expectedSourceBucket ?? ledgerEvent.sourceBucket;
      findings.push({
        findingId: treasuryFindingId("analytics_correlated", key),
        status: "analytics_correlated",
        eventType: ledgerEvent.eventType,
        ledgerId: ledgerEvent.ledgerId,
        timelineId: firstEvidence.entry.timelineId,
        eventName: ledgerEvent.eventName,
        sourceBucket: ledgerEvent.sourceBucket,
        evidenceSourceBucket: evidenceBucket,
        productTruthAllowed: false,
        reason: "Analytics evidence correlates to an existing treasury ledger row and can explain activity.",
        nextAction: "Keep ledger as money truth; use timeline evidence only for diagnostics or confidence.",
      });

      if (evidenceBucket !== ledgerEvent.sourceBucket) {
        findings.push({
          findingId: treasuryFindingId("source_bucket_mismatch", key),
          status: "source_bucket_mismatch",
          eventType: ledgerEvent.eventType,
          ledgerId: ledgerEvent.ledgerId,
          timelineId: firstEvidence.entry.timelineId,
          eventName: ledgerEvent.eventName,
          sourceBucket: ledgerEvent.sourceBucket,
          evidenceSourceBucket: evidenceBucket,
          productTruthAllowed: false,
          reason: "Timeline evidence source bucket differs from the server ledger source bucket.",
          nextAction: "Preserve paid/reward split from the ledger and review the analytics mapping.",
        });
      }
    } else {
      findings.push({
        findingId: treasuryFindingId("analytics_missing", key),
        status: "analytics_missing",
        eventType: ledgerEvent.eventType,
        ledgerId: ledgerEvent.ledgerId,
        timelineId: null,
        eventName: ledgerEvent.eventName,
        sourceBucket: ledgerEvent.sourceBucket,
        evidenceSourceBucket: null,
        productTruthAllowed: true,
        reason: "Ledger truth exists without matching analytics evidence; this is an analytics gap, not missing money.",
        nextAction: "Check emitter/materializer coverage. Do not reverse or backfill ledger rows from this gap.",
      });
    }
  }

  for (const evidence of input.timelineEvidence) {
    if (matchedEvidenceIds.has(evidence.entry.timelineId)) continue;
    const eventType = eventTypeFromTimelineEntry(evidence.entry);
    if (!eventType) continue;
    const key = treasuryEvidenceMatchingKey(evidence);
    const protectedMoneyDomain = evidence.entry.productDomain === "wallet_payment"
      || evidence.entry.productDomain === "gumdrop_economy"
      || eventType === "purchase"
      || eventType === "unlock_spend"
      || eventType === "creator_accrual"
      || eventType === "refund_void";
    findings.push({
      findingId: treasuryFindingId(protectedMoneyDomain ? "ledger_missing_protected" : "analytics_only_not_ledger", key),
      status: protectedMoneyDomain ? "ledger_missing_protected" : "analytics_only_not_ledger",
      eventType,
      ledgerId: null,
      timelineId: evidence.entry.timelineId,
      eventName: evidence.entry.eventName,
      sourceBucket: null,
      evidenceSourceBucket: evidence.expectedSourceBucket ?? null,
      productTruthAllowed: false,
      reason: protectedMoneyDomain
        ? "Analytics evidence references a protected money surface without a matching treasury ledger row."
        : "Analytics evidence has no matching ledger row and remains diagnostic-only.",
      nextAction: protectedMoneyDomain
        ? "Escalate for protected ledger/provider evidence review; do not create wallet truth from analytics."
        : "Use as source-only evidence or manual review context.",
    });
  }

  const summary = emptyTreasurySummary();
  summary.ledgerEventCount = input.ledgerEvents.length;
  summary.timelineEvidenceCount = input.timelineEvidence.length;
  for (const finding of findings) {
    summary[finding.status] += 1;
  }
  summary.productTruthEligibleCount = findings.filter((finding) => finding.status === "ledger_confirmed" && finding.productTruthAllowed).length;

  return {
    reportKey: "treasury-recovery-timeline-reconciliation",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    status: findings.some((finding) => finding.status === "ledger_missing_protected" || finding.status === "source_bucket_mismatch" || finding.status === "duplicate_risk") ? "review" : "pass",
    eventMap: TREASURY_TIMELINE_EVENT_MAP,
    summary,
    findings,
    productTruthPolicy: {
      treasuryLedgersPrimary: true,
      analyticsCanOnlyCorroborate: true,
      ga4CanCreditOrDebitGumdrops: false,
      legacyCanCreditOrDebitGumdrops: false,
      sourceBucketsMustMatch: true,
      noBalanceMutation: true,
      missingAnalyticsIsNotMissingMoney: true,
    },
  };
}

export function buildGumdropRecoveryQueue(input: {
  generatedAtUtc?: string;
  reconciliation: TreasuryTimelineReconciliationReport;
  ledgerEvents: TreasuryLedgerRecoveryInput[];
  timelineEvidence: TreasuryTimelineEvidenceInput[];
  capItems?: number;
}): GumdropRecoveryQueueReport {
  const ledgerById = new Map(input.ledgerEvents.map((entry) => [entry.ledgerId, entry]));
  const evidenceByTimelineId = new Map(input.timelineEvidence.map((entry) => [entry.entry.timelineId, entry]));
  const queueStatuses = new Set<TreasuryTimelineReconciliationStatus>([
    "analytics_missing",
    "analytics_only_not_ledger",
    "ledger_missing_protected",
    "duplicate_risk",
    "source_bucket_mismatch",
  ]);
  const seen = new Set<string>();
  const items: GumdropRecoveryQueueItem[] = [];

  for (const finding of input.reconciliation.findings) {
    if (!queueStatuses.has(finding.status)) continue;
    const stableKey = queueFindingKey(finding);
    if (seen.has(stableKey)) continue;
    seen.add(stableKey);

    const ledger = finding.ledgerId ? ledgerById.get(finding.ledgerId) : undefined;
    const evidence = finding.timelineId ? evidenceByTimelineId.get(finding.timelineId) : undefined;
    const timestamp = ledger?.occurredAt ?? evidence?.entry.timestamp ?? null;
    const actor = ledger?.actor ?? evidence?.entry.actor ?? {};
    const evidenceSources: GumdropRecoveryQueueItem["evidenceSources"] = [];

    if (ledger) {
      evidenceSources.push({
        evidenceId: ledger.ledgerId,
        kind: "treasury_ledger",
        source: TREASURY_TIMELINE_EVENT_MAP.find((entry) => entry.eventType === ledger.eventType)?.ledgerOwner ?? "gumdrop_ledger",
        productTruthAllowed: true,
        note: "Server ledger/source-of-funds row is the only balance-affecting truth.",
      });
    }
    if (evidence) {
      evidenceSources.push({
        evidenceId: evidence.entry.timelineId,
        kind: evidenceKindFromTimelineSource(evidence.entry.source),
        source: evidence.entry.source,
        productTruthAllowed: false,
        note: "Timeline evidence is diagnostic/corroborating and cannot credit or debit GumDrops.",
      });
    }

    items.push({
      recoveryId: `gumdrop_recovery:${finding.status}:${stableKey.replace(/[^a-z0-9:_-]+/giu, "_").slice(0, 96)}`,
      actor: {
        actorScope: evidence?.entry.actor.actorType ?? (actor.userId ? "signed_in_user" : actor.anonymousVisitorId ? "guest" : "unknown"),
        userId: actor.userId ?? null,
        anonymousVisitorId: actor.anonymousVisitorId ?? null,
        sessionId: actor.sessionId ?? null,
        identityLinkId: evidence?.entry.actor.identityLinkId ?? null,
      },
      timeWindow: queueTimeWindow(timestamp, ledger ? "ledger_occurred_at" : evidence ? "timeline_timestamp" : "unknown"),
      suspectedAction: finding.eventType,
      eventName: finding.eventName,
      amountGd: ledger?.amountGd ?? null,
      sourceBucket: finding.sourceBucket ?? finding.evidenceSourceBucket ?? null,
      evidenceSources,
      confidence: queueConfidenceFromFinding(finding.status),
      ledgerCorroboration: {
        status: ledgerCorroborationForFinding(finding),
        ledgerId: finding.ledgerId,
        sourceBucket: finding.sourceBucket,
        serverProofRequiredForMoneyAction: true,
      },
      requiredHumanProof: requiredProofForFinding(finding),
      allowedRecoveryAction: allowedActionForFinding(finding),
      forbiddenAction: "Do not credit, debit, backfill, unlock, refund, or adjust balances from analytics/GA4/legacy evidence alone.",
    });
  }

  const cappedItems = items.slice(0, input.capItems ?? 50);
  const analyticsOnlyRejectedCount = cappedItems.filter((item) => (
    !item.ledgerCorroboration.ledgerId
    && item.evidenceSources.length > 0
    && item.evidenceSources.every((source) => source.kind !== "treasury_ledger")
    && item.allowedRecoveryAction === "reject_analytics_only_balance_recovery"
  )).length;

  return {
    reportKey: "gumdrop-recovery-queue",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    status: cappedItems.some((item) => item.ledgerCorroboration.status !== "ledger_present") ? "review" : "pass",
    summary: {
      queueItemCount: cappedItems.length,
      ledgerProofRequiredCount: cappedItems.filter((item) => item.ledgerCorroboration.status === "ledger_missing").length,
      analyticsOnlyRejectedCount,
      duplicateRiskCount: cappedItems.filter((item) => item.ledgerCorroboration.status === "duplicate_risk").length,
      sourceBucketMismatchCount: cappedItems.filter((item) => item.ledgerCorroboration.status === "source_bucket_mismatch").length,
      moneyAffectingRecoveryAllowedCount: 0,
    },
    schema: {
      requiredFields: [
        "recoveryId",
        "actor",
        "timeWindow",
        "suspectedAction",
        "eventName",
        "evidenceSources",
        "confidence",
        "ledgerCorroboration",
        "requiredHumanProof",
        "allowedRecoveryAction",
        "forbiddenAction",
      ],
      moneyTruthRule: "ledger_or_server_proof_required_before_balance_recovery",
      analyticsOnlyRecoveryAllowed: false,
    },
    items: cappedItems,
    productTruthPolicy: {
      dryRunOnly: true,
      creditsOrDebitsUsers: false,
      backfillsTransactions: false,
      analyticsOnlyCanChangeBalance: false,
      requiresLedgerOrServerProofBeforeMoneyAction: true,
      exposesPii: false,
    },
  };
}

export function validateGumdropRecoveryQueue(report: GumdropRecoveryQueueReport): string[] {
  const failures: string[] = [];
  if (report.productTruthPolicy.creditsOrDebitsUsers || report.productTruthPolicy.backfillsTransactions) {
    failures.push("GumDrop recovery queue must remain dry-run and must not credit/debit or backfill transactions.");
  }
  if (report.productTruthPolicy.analyticsOnlyCanChangeBalance || report.schema.analyticsOnlyRecoveryAllowed) {
    failures.push("Analytics-only recovery must never be allowed to change GumDrop balances.");
  }
  if (report.summary.moneyAffectingRecoveryAllowedCount !== 0) {
    failures.push("Queue summary cannot allow money-affecting recovery actions.");
  }

  for (const item of report.items) {
    const hasLedgerEvidence = item.evidenceSources.some((source) => source.kind === "treasury_ledger");
    const analyticsOnly = item.evidenceSources.length > 0 && !hasLedgerEvidence;
    if (analyticsOnly && item.allowedRecoveryAction !== "reject_analytics_only_balance_recovery") {
      failures.push(`${item.recoveryId} is analytics-only and must reject balance recovery.`);
    }
    if (analyticsOnly && item.ledgerCorroboration.status !== "ledger_missing" && item.ledgerCorroboration.status !== "not_required_non_money") {
      failures.push(`${item.recoveryId} analytics-only item has invalid ledger corroboration status.`);
    }
    if (!item.ledgerCorroboration.serverProofRequiredForMoneyAction) {
      failures.push(`${item.recoveryId} must require server proof before any money action.`);
    }
    if (!item.forbiddenAction.toLowerCase().includes("analytics")) {
      failures.push(`${item.recoveryId} must explicitly forbid analytics-only balance recovery.`);
    }
  }

  return failures;
}

export function inferRecoveryProductDomain(eventName: string, objectType?: string | null): RecoveryProductDomain {
  const text = `${eventName} ${objectType ?? ""}`.toLowerCase();
  if (/paypal|payment|purchase|checkout|transaction/u.test(text)) return "wallet_payment";
  if (/gumdrop|reward|balance|daily_task|task_completed/u.test(text)) return "gumdrop_economy";
  if (/unlock|drop_content|entitlement/u.test(text)) return "drop_unlock";
  if (/page|view|watch|click|search|notification/u.test(text)) return "telemetry_behavior";
  if (/identity|login|signup|session/u.test(text)) return "identity_handoff";
  if (/support|bug_report/u.test(text)) return "support_recovery";
  if (/admin|debug/u.test(text)) return "admin_debug";
  if (/task|reward/u.test(text)) return "daily_rewards";
  return "unknown";
}

export function getGa4RecoveryEventMapping(ga4EventName: string): Ga4RecoveryEventMapping {
  const normalized = ga4EventName.trim().toLowerCase();
  return GA4_RECOVERY_EVENT_MAPPINGS.find((entry) => entry.ga4EventName === normalized) ?? {
    ga4EventName: normalized || "unknown",
    canonicalEventName: normalized || "unknown_ga4_event",
    confidence: "unknown",
    objectType: "unknown",
    productDomain: "unknown",
    commerceTruthRequiresLedger: false,
  };
}

export function sourceToRecoveryClassification(source: RecoveryTimelineSource, confidence: RecoveryConfidence): RecoveryTimelineClassification {
  if (source === "first_party_event_fact" || source === "transaction_ledger" || source === "gumdrop_ledger" || source === "unlock_record" || source === "reward_record") {
    return "canonical";
  }
  if (source === "ga4_evidence") return "corroborating_evidence";
  if (confidence === "low" || confidence === "directional") return "weak_match";
  if (confidence === "unknown" || source === "unknown_legacy") return "unknown_legacy";
  return "corroborating_evidence";
}

export function classifyRecoveryEligibility(input: {
  source: RecoveryTimelineSource;
  productDomain: RecoveryProductDomain;
  classification: RecoveryTimelineClassification;
  corroboration: RecoveryCorroboration;
}): RecoveryTruthEligibility {
  if (input.classification === "rejected") return "rejected";
  if (input.source === "ga4_evidence" || input.source === "legacy_analytics" || input.source === "unknown_legacy") {
    if (input.productDomain === "wallet_payment" || input.productDomain === "gumdrop_economy") {
      return input.corroboration.treasuryLedgerCorroborated
        ? "manual_review_required"
        : "ledger_corroboration_required";
    }
    return input.classification === "weak_match" || input.classification === "unknown_legacy"
      ? "manual_review_required"
      : "evidence_only";
  }
  if (input.productDomain === "wallet_payment" || input.productDomain === "gumdrop_economy") {
    return input.corroboration.treasuryLedgerCorroborated
      ? "product_truth_eligible"
      : "ledger_corroboration_required";
  }
  return input.classification === "canonical" ? "product_truth_eligible" : "evidence_only";
}

export function buildRecoveryTimelineEntryFromCanonicalEvent(
  event: CanonicalAnalyticsEvent,
  input: {
    source?: RecoveryTimelineSource;
    sourceRecordId?: string | null;
    classification?: RecoveryTimelineClassification;
    corroboration?: Partial<RecoveryCorroboration>;
    notes?: string[];
  } = {},
): RecoveryTimelineEntry {
  const source = input.source ?? "first_party_event_fact";
  const timestamp = readTimestamp(event.occurredAt);
  const productDomain = inferRecoveryProductDomain(event.eventName, event.objectType);
  const eventConfidence: RecoveryConfidence =
    source === "first_party_event_fact"
      ? "canonical"
      : source === "transaction_ledger" || source === "gumdrop_ledger" || source === "unlock_record" || source === "reward_record"
        ? "ledger_confirmed"
        : event.legacyConfidence ?? "unknown";
  const classification = input.classification ?? sourceToRecoveryClassification(source, eventConfidence);
  const corroboration: RecoveryCorroboration = {
    transactionId: input.corroboration?.transactionId ?? (event.objectType === "purchase" ? event.objectId : null),
    gumdropLedgerId: input.corroboration?.gumdropLedgerId ?? null,
    unlockId: input.corroboration?.unlockId ?? (event.objectType === "unlock" ? event.objectId : null),
    rewardEventId: input.corroboration?.rewardEventId ?? null,
    eventFactId: input.corroboration?.eventFactId ?? event.eventId,
    sourceCount: input.corroboration?.sourceCount ?? 1,
    treasuryLedgerCorroborated: input.corroboration?.treasuryLedgerCorroborated
      ?? Boolean(input.corroboration?.transactionId || input.corroboration?.gumdropLedgerId || (source === "transaction_ledger" || source === "gumdrop_ledger")),
  };

  return {
    timelineId: stableTimelineId(source, input.sourceRecordId ?? event.eventId, event.eventName, timestamp),
    source,
    sourceRecordId: input.sourceRecordId ?? event.eventId,
    timestamp,
    eventName: event.eventName,
    actor: {
      actorType: actorScopeFromEvent(event),
      userId: event.userId,
      anonymousVisitorId: event.anonymousVisitorId,
      sessionId: event.sessionId,
      identityLinkId: event.identityLinkId,
    },
    identityConfidence: event.identityLinkId || event.userId || event.anonymousVisitorId || event.sessionId ? eventConfidence : "unknown",
    eventConfidence,
    productDomain,
    classification,
    recoveryEligibility: classifyRecoveryEligibility({ source, productDomain, classification, corroboration }),
    missingVsZeroState: "source_present",
    corroboration,
    evidenceLabels: [
      ...(source === "ga4_evidence" ? ["ga4_evidence_only" as const] : []),
      ...(source === "legacy_analytics" || source === "unknown_legacy" ? ["legacy_directional_only" as const] : []),
      ...(classification === "canonical" ? ["source_truth" as const] : ["corroborating_evidence" as const]),
      ...(classification === "weak_match" || classification === "unknown_legacy" ? ["manual_review" as const] : []),
    ],
    notes: input.notes ?? [],
  };
}

export function buildRecoveryTimelineEntryFromLegacyRecord(record: LegacyRecoveredEventRecord): RecoveryTimelineEntry {
  return buildRecoveryTimelineEntryFromCanonicalEvent(record.canonicalEvent, {
    source: record.legacySource.startsWith("ga4") ? "ga4_evidence" : "legacy_analytics",
    sourceRecordId: record.legacyId,
    classification: sourceToRecoveryClassification(
      record.legacySource.startsWith("ga4") ? "ga4_evidence" : "legacy_analytics",
      record.mappingConfidence,
    ),
    notes: [
      "Legacy recovered records are dry-run evidence and cannot overwrite canonical product truth.",
      ...record.mappingWarnings,
    ],
  });
}

export function buildRecoveryTimelineEntryFromGa4Event(input: Ga4RecoveryTimelineInput): RecoveryTimelineEntry {
  const mapping = getGa4RecoveryEventMapping(input.ga4EventName);
  const occurredAt = readTimestamp(input.occurredAt);
  const event = createCanonicalAnalyticsEvent({
    eventId: `ga4:${input.ga4EventId ?? mapping.ga4EventName}:${occurredAt}`,
    eventName: mapping.canonicalEventName,
    occurredAt,
    receivedAt: input.importedAt ? readTimestamp(input.importedAt) : occurredAt,
    actorType: input.userPseudoId || input.sessionId ? "guest" as AnalyticsActorType : "unknown",
    anonymousVisitorId: input.userPseudoId ?? null,
    sessionId: input.sessionId ?? null,
    source: "ga4_daily",
    consentState: "unknown",
    route: input.pagePath ?? null,
    objectType: mapping.objectType,
    objectId: input.objectId ?? input.transactionId ?? null,
    legacySource: "ga4_imported_sample",
    legacyId: input.ga4EventId ?? null,
    legacyConfidence: mapping.confidence,
    mappingWarnings: [
      "GA4 imported samples are external evidence only.",
      ...(mapping.commerceTruthRequiresLedger ? ["Commerce, GumDrop, unlock, and entitlement recovery requires first-party ledger/source corroboration."] : []),
    ],
  });

  const entry = buildRecoveryTimelineEntryFromCanonicalEvent(event, {
    source: "ga4_evidence",
    sourceRecordId: input.ga4EventId ?? null,
    classification: mapping.commerceTruthRequiresLedger && input.ledgerCorroborated !== true
      ? "rejected"
      : sourceToRecoveryClassification("ga4_evidence", mapping.confidence),
    corroboration: {
      transactionId: input.transactionId ?? null,
      sourceCount: 1,
      treasuryLedgerCorroborated: input.ledgerCorroborated === true,
    },
    notes: [
      `GA4 ${mapping.ga4EventName} maps to ${mapping.canonicalEventName} as ${mapping.confidence} confidence evidence.`,
      "Do not use GA4 evidence to credit GumDrops, unlock content, repair balances, or replace first-party analytics.",
    ],
  });

  return {
    ...entry,
    productDomain: mapping.productDomain,
    recoveryEligibility: classifyRecoveryEligibility({
      source: entry.source,
      productDomain: mapping.productDomain,
      classification: entry.classification,
      corroboration: entry.corroboration,
    }),
  };
}

export function validateRecoveryTimelineEntries(entries: RecoveryTimelineEntry[]): RecoveryTimelineValidationResult {
  const findings: string[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (seen.has(entry.timelineId)) {
      findings.push(`duplicate timelineId: ${entry.timelineId}`);
    }
    seen.add(entry.timelineId);

    if (entry.source === "ga4_evidence" && entry.recoveryEligibility === "product_truth_eligible") {
      findings.push(`${entry.timelineId}: GA4 evidence cannot be product_truth_eligible`);
    }
    if ((entry.source === "legacy_analytics" || entry.source === "unknown_legacy") && entry.recoveryEligibility === "product_truth_eligible") {
      findings.push(`${entry.timelineId}: legacy evidence cannot directly be product_truth_eligible`);
    }
    if (
      (entry.productDomain === "wallet_payment" || entry.productDomain === "gumdrop_economy")
      && entry.recoveryEligibility === "product_truth_eligible"
      && !entry.corroboration.treasuryLedgerCorroborated
    ) {
      findings.push(`${entry.timelineId}: payment/GumDrop timeline entry lacks treasury ledger corroboration`);
    }
    if (entry.missingVsZeroState !== "source_present" && entry.classification === "canonical") {
      findings.push(`${entry.timelineId}: canonical entries cannot claim missing source state`);
    }
  }

  return {
    ok: findings.length === 0,
    findings,
  };
}
