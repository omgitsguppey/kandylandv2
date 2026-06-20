import {
  ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS,
  buildLaunchHistoryDayRecoveryState,
  buildLaunchHistoryCoverageRangeProofEligibility,
  buildLaunchHistoryCoverageSummaryState,
  buildLaunchHistorySourceCoverageRowsState,
  type LaunchHistoryDaySourceTruthState,
  type RecoveryMetricConfidenceBand,
  type RecoveryMetricDedupeDimension,
  type RecoveryMetricEvidenceKind,
  type RecoveryMetricFreshnessState,
  type RecoveryMetricSourceTruth,
} from "@/lib/analytics/recovery-timeline-spine";

export type SourceAgreementCoverageInput = {
  source: string;
  days: string[];
};

export type SourceAgreementFailureClassification =
  | "identity_mismatch"
  | "event_translation_mismatch"
  | "date_range_mismatch"
  | "internal_traffic_mismatch"
  | "route_normalization_mismatch"
  | "duplicate_event"
  | "missing_materializer"
  | "external_source_gap"
  | "stale_generated_evidence"
  | "not_enough_sources";

export type SourceAgreementRecoveryLane =
  | "first_party_materialization"
  | "ga4_export_verification"
  | "legacy_support_review"
  | "source_overlap_review"
  | "source_agreement_review";

export type SourceAgreementDisagreementDetail = {
  dayKey: string;
  sourcesPresent: string[];
  sourcesMissing: string[];
  sourceTruthState: LaunchHistoryDaySourceTruthState;
  sourceTruth: RecoveryMetricSourceTruth;
  freshnessState: RecoveryMetricFreshnessState;
  evidenceKind: RecoveryMetricEvidenceKind;
  confidenceScore: number;
  confidenceBand: RecoveryMetricConfidenceBand;
  dedupeKey: string;
  dedupeDimensions: RecoveryMetricDedupeDimension[];
  lateArrivalWindowDays: typeof ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS;
  primarySourceState: "first_party_present" | "first_party_missing";
  secondSourceState: "ga4_present" | "ga4_missing";
  fallbackState: "fallback_present" | "fallback_missing";
  classifications: SourceAgreementFailureClassification[];
  likelyRootCause: string;
  nextAction: string;
  recoveryLane: SourceAgreementRecoveryLane;
  blockingOwner: string;
  proofRequired: string[];
  productTruthEligible: boolean;
};

export type SourceAgreementBlockedConsumerDetail = {
  consumer: string;
  label: string;
  currentState:
    | "connected"
    | "source_agreement_failed"
    | "materializer_missing";
  allowedDisplayState:
    | "connected"
    | "source_missing"
    | "second_source_only"
    | "chart_promotion_blocked";
  blockingOwner: string;
  nextAction: string;
};

export const LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY = {
  firstPartyPrimary: true,
  ga4SecondSourceOnly: true,
  fallbackEvidenceOnly: true,
  missingIsNotZero: true,
} as const;

export type SourceAgreementFailureDetail = {
  comparedSources: string[];
  sourceAgreementStatus: "pass" | "review" | "failed" | "not_enough_sources";
  rangeStartDayKey: string | null;
  rangeEndDayKey: string | null;
  expectedDayCount: number;
  expectedRangeSource: "caller_supplied_expected_days" | "union_of_local_source_days";
  coverageWindowKind:
    | "caller_supplied_expected_days"
    | "fixture_only_local_window"
    | "local_source_window"
    | "all_range_historical_export"
    | "admin_truth_sample";
  allLaunchRangeProven: boolean;
  disagreementCount: number;
  maxDeltaPct: number;
  disagreements: SourceAgreementDisagreementDetail[];
  perSourceCoverage: Array<{ source: string; dayCount: number; days: string[] }>;
  perDaySourceCounts?: Record<string, {
    first_party: number;
    ga4: number;
    historicalSnapshot: number;
    legacySupport: number;
  }>;
  internalAdminExcludedCountByDay?: Record<string, number>;
  perDayMetricDeltas?: Array<{
    dayKey: string;
    metric: "source_count_delta";
    sourceTruthState: LaunchHistoryDaySourceTruthState;
    sourceTruth: RecoveryMetricSourceTruth;
    freshnessState: RecoveryMetricFreshnessState;
    evidenceKind: RecoveryMetricEvidenceKind;
    confidenceScore: number;
    confidenceBand: RecoveryMetricConfidenceBand;
    dedupeKey: string;
    dedupeDimensions: RecoveryMetricDedupeDimension[];
    lateArrivalWindowDays: typeof ANALYTICS_RECOVERY_LATE_ARRIVAL_WINDOW_DAYS;
    primarySource: "first_party";
    secondSource: "ga4";
    primaryCount: number;
    secondSourceCount: number;
    deltaPct: number;
    classifications: SourceAgreementFailureClassification[];
    nextAction: string;
  }>;
  missingDaysBySource: Record<string, string[]>;
  extraDaysBySource: Record<string, string[]>;
  comparedMetrics: string[];
  toleranceThresholds: {
    reviewDeltaPct: number;
    failDeltaPct: number;
  };
  blockedConsumers: string[];
  blockedConsumerDetails: SourceAgreementBlockedConsumerDetail[];
  nextAction: string;
  nextExactSteps: string[];
  sourceTruthPolicy: typeof LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY;
};

export type SourceAgreementCoverageClassificationInput = {
  expectedDays: string[];
  ga4Days: Iterable<string>;
  firstPartyDays: Iterable<string>;
  historicalSnapshotDays: Iterable<string>;
  legacySupportDays: Iterable<string>;
  staleEvidence?: boolean;
  activeSourceCount?: number;
  disagreementCount?: number;
  maxDeltaPct?: number | null;
};

export type SourceAgreementCoveragePresenceInput = {
  hasGa4: boolean;
  hasFirstParty: boolean;
  hasHistoricalSnapshot?: boolean;
  hasLegacy?: boolean;
};

export type SourceAgreementCoverageSummaryInput = {
  expectedDays: string[];
  perSourceCoverage?: Array<{ source: string; days: Iterable<string>; dayCount?: number }>;
  coverageBySource?: Record<string, Iterable<string>>;
  comparisonDayKeys?: string[];
  blockingContinuityGap?: boolean;
  tolerance?: { reviewDeltaPct?: number; failDeltaPct?: number };
  reviewDeltaPct?: number;
  failDeltaPct?: number;
};

export type SourceAgreementCoverageSummaryState = {
  activeSourceCount: number;
  activeSourceDayCounts: number[];
  disagreementCount: number;
  maxDeltaPct: number;
  reviewDeltaPct: number;
  failDeltaPct: number;
  sourceAgreementStatus: SourceAgreementFailureDetail["sourceAgreementStatus"];
};

type SourceAgreementRecoverySourceCounts = {
  first_party?: number | null;
  ga4?: number | null;
  historicalSnapshot?: number | null;
  legacySupport?: number | null;
};

function buildSourceAgreementRecoveredMetricMetadata(input: {
  dayKey: string;
  sourceCounts?: SourceAgreementRecoverySourceCounts;
  defaultCounts?: {
    first_party?: number;
    ga4?: number;
    historicalSnapshot?: number;
    legacySupport?: number;
  };
  internalAdminExcludedCount?: number | null;
}) {
  const recoveryState = buildLaunchHistoryDayRecoveryState({
    dayKey: input.dayKey,
    firstPartyCount: input.sourceCounts?.first_party ?? input.defaultCounts?.first_party ?? 0,
    ga4Count: input.sourceCounts?.ga4 ?? input.defaultCounts?.ga4 ?? 0,
    historicalSnapshotCount: input.sourceCounts?.historicalSnapshot ?? input.defaultCounts?.historicalSnapshot ?? 0,
    legacySupportCount: input.sourceCounts?.legacySupport ?? input.defaultCounts?.legacySupport ?? 0,
    internalAdminExcludedCount: input.internalAdminExcludedCount,
  });

  return {
    sourceTruthState: recoveryState.sourceTruthState,
    sourceTruth: recoveryState.sourceTruth,
    freshnessState: recoveryState.freshnessState,
    evidenceKind: recoveryState.evidenceKind,
    confidenceScore: recoveryState.confidenceScore,
    confidenceBand: recoveryState.confidenceBand,
    dedupeKey: recoveryState.dedupeKey,
    dedupeDimensions: [...recoveryState.dedupeDimensions],
    lateArrivalWindowDays: recoveryState.lateArrivalWindowDays,
  };
}

export type LaunchCoverageInputEvidenceSummary = {
  inputMode: string;
  inputPath: string;
  usableInputFound: boolean;
  candidateCount: number;
  candidates: Array<{
    path: string;
    state: string;
    proofMode: string;
    nextAction: string;
  }>;
  stateCounts: Record<string, number>;
};

export const LAUNCH_ANALYTICS_DEFAULT_BLOCKED_CONSUMERS = [
  "admin_analytics_overview",
  "admin_analytics_charts",
  "admin_analytics_device_mix",
  "admin_analytics_region_demand",
  "admin_analytics_top_paths",
  "admin_analytics_insight_cards",
  "admin_analytics_source_health",
  "debug_data_validation",
  "public_beta_score_evidence",
] as const;

// February 12, 2026 is the earliest source-backed public launch anchor
// (`src/app/sitemap.ts` and `src/lib/platform-config.ts`). Recovery reports
// must not silently narrow formal launch proof to later May evidence windows.
export const LAUNCH_ANALYTICS_FIRST_DAY_KEY = "2026-02-12";

const DEFAULT_LAUNCH_COVERAGE_EXPORT_PATHS = [
  "agent/evidence/launch-analytics/launch-history-coverage.local.json",
  "agent/evidence/launch-analytics/launch-history-coverage.export.json",
] as const;

function asSummaryRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readSummaryString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readSummaryBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function summarizeLaunchCoverageInputEvidence(
  evidenceProvenance: Record<string, unknown> | null | undefined,
): LaunchCoverageInputEvidenceSummary {
  const provenance = asSummaryRecord(evidenceProvenance);
  const statuses = Array.isArray(provenance.candidateLaunchCoverageInputStatuses)
    ? provenance.candidateLaunchCoverageInputStatuses
    : [];
  const stateCounts = new Map<string, number>();
  const candidates = statuses
    .map((entry) => {
      const record = asSummaryRecord(entry);
      const state = readSummaryString(record.state, "unknown");
      stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
      return {
        path: readSummaryString(record.path, "unknown"),
        state,
        proofMode: readSummaryString(record.proofMode, "none"),
        nextAction: readSummaryString(record.nextAction, "Attach a launch-history coverage input before promoting analytics truth."),
      };
    })
    .slice(0, 8);

  return {
    inputMode: readSummaryString(provenance.sourceAgreementInputMode, "unknown"),
    inputPath: readSummaryString(provenance.sourceAgreementInputPath, "none"),
    usableInputFound: readSummaryBoolean(provenance.usableLaunchCoverageInputFound, false),
    candidateCount: statuses.length,
    candidates,
    stateCounts: Object.fromEntries(stateCounts),
  };
}

export function launchCoverageInputEvidenceNextAction(input: LaunchCoverageInputEvidenceSummary) {
  if (input.usableInputFound && (input.stateCounts.usable_launch_history_coverage ?? 0) > 0) return null;

  if ((input.stateCounts.usable_local_window_only ?? 0) > 0) {
    return "The attached launch-history input is complete and redacted, but it only proves a local evidence window. Add explicit all-launch range proof covering February launch through the current recovery date before clearing source truth.";
  }

  const acceptedPaths = input.candidates
    .filter((entry) => entry.path.includes("agent/evidence/launch-analytics/launch-history-coverage"))
    .map((entry) => entry.path);
  const pathList = acceptedPaths.length > 0
    ? acceptedPaths.join(" or ")
    : DEFAULT_LAUNCH_COVERAGE_EXPORT_PATHS.join(" or ");

  return `Attach approved launch-history coverage at ${pathList}, or run npm run capture:truthful-evidence -- --launch-coverage-from <redacted all-range historical export> to convert a saved admin historical response into the compact local export. A redacted admin truth sample with launchHistoryCoverage day rows is also accepted. Then run npm run check:analytics-panel-hydration before treating launch analytics charts as canonical.`;
}

export function hasBlockingSourceCoverageMismatch(input: SourceAgreementCoveragePresenceInput) {
  const hasAnySource = input.hasGa4 || input.hasFirstParty || Boolean(input.hasHistoricalSnapshot) || Boolean(input.hasLegacy);
  if (!hasAnySource) return false;
  return !input.hasFirstParty || !input.hasGa4;
}

export function classifySourceAgreementCoverage(input: SourceAgreementCoverageClassificationInput) {
  const classifications = new Set<SourceAgreementFailureClassification>();
  const ga4Days = new Set(input.ga4Days);
  const firstPartyDays = new Set(input.firstPartyDays);
  const historicalSnapshotDays = new Set(input.historicalSnapshotDays);
  const legacySupportDays = new Set(input.legacySupportDays);
  const activeSourceCount = input.activeSourceCount ?? [
    ga4Days.size,
    firstPartyDays.size,
    historicalSnapshotDays.size,
    legacySupportDays.size,
  ].filter((count) => count > 0).length;

  if (input.staleEvidence) {
    classifications.add("stale_generated_evidence");
  }

  if (activeSourceCount < 2 || input.expectedDays.length === 0) {
    classifications.add("not_enough_sources");
    return [...classifications];
  }

  if ((input.disagreementCount ?? 0) > 0 || (input.maxDeltaPct ?? 0) > 10) {
    classifications.add("date_range_mismatch");
  }

  for (const dayKey of input.expectedDays) {
    const hasGa4 = ga4Days.has(dayKey);
    const hasFirstParty = firstPartyDays.has(dayKey);
    const hasHistoricalSnapshot = historicalSnapshotDays.has(dayKey);
    const hasLegacy = legacySupportDays.has(dayKey);

    if (hasGa4 && !hasFirstParty) {
      classifications.add("external_source_gap");
      classifications.add("missing_materializer");
    }

    if (hasLegacy && !hasFirstParty) {
      classifications.add("missing_materializer");
    }

    if (hasHistoricalSnapshot && !hasFirstParty) {
      classifications.add("missing_materializer");
    }
  }

  return [...classifications];
}

function classifyDayDisagreement(input: {
  dayKey: string;
  sourcesPresent: string[];
  sourcesMissing: string[];
  sourceCounts?: {
    first_party?: number | null;
    ga4?: number | null;
    historicalSnapshot?: number | null;
    legacySupport?: number | null;
  };
  internalAdminExcludedCount?: number | null;
}): SourceAgreementDisagreementDetail | null {
  const sourceSet = new Set(input.sourcesPresent);
  const missingSet = new Set(input.sourcesMissing);
  if (input.sourcesPresent.length === 0 || input.sourcesMissing.length === 0) return null;

  const hasFirstParty = sourceSet.has("first_party");
  const hasGa4 = sourceSet.has("ga4");
  const hasFallback = sourceSet.has("historical_snapshot") || sourceSet.has("legacy_support");
  const hasOnlyMissingFallback = hasFirstParty && hasGa4 && input.sourcesMissing.every((source) =>
    source === "historical_snapshot" || source === "legacy_support"
  );
  if (hasOnlyMissingFallback) return null;

  const classifications = new Set<SourceAgreementFailureClassification>();
  classifications.add("date_range_mismatch");

  if (hasGa4 && !hasFirstParty) {
    classifications.add("external_source_gap");
    classifications.add("missing_materializer");
  }
  if (!hasGa4 && hasFirstParty) {
    classifications.add("external_source_gap");
  }
  if (hasFallback && !hasFirstParty) {
    classifications.add("missing_materializer");
  }
  // GA4 plus legacy/fallback overlap can corroborate that a day had activity,
  // but without first-party facts it is not proof of a duplicated product event.
  if (missingSet.has("first_party") && !hasGa4 && hasFallback) {
    classifications.add("event_translation_mismatch");
  }

  const likelyRootCause = !hasFirstParty && hasGa4
    ? "GA4 observed the day, but first-party product facts are missing or not materialized."
    : hasFirstParty && !hasGa4
      ? "First-party product facts exist, but GA4/export evidence is missing for the day."
      : !hasFirstParty && hasFallback
        ? "Only fallback historical or legacy evidence exists; it cannot replace first-party truth."
        : hasFirstParty && hasGa4 && hasFallback
          ? "Multiple evidence lanes overlap; use first-party product truth and keep GA4/fallback as corroboration."
          : "Compared source lanes do not cover the same day range.";

  const nextAction = !hasFirstParty
    ? "Recover or repair first-party day-bucket materialization before promoting this day to canonical analytics."
    : !hasGa4
      ? "Refresh or attach GA4/export evidence as second-source comparison; do not downgrade first-party product truth."
      : "Keep first-party as primary and use secondary/fallback evidence only for corroboration.";
  const recoveryLane: SourceAgreementRecoveryLane = !hasFirstParty
    ? hasGa4
      ? "first_party_materialization"
      : "legacy_support_review"
    : !hasGa4
      ? "ga4_export_verification"
      : input.sourcesPresent.length > 1
        ? "source_overlap_review"
        : "source_agreement_review";
  const blockingOwner = !hasFirstParty
    ? "analytics_event_facts materialization"
    : !hasGa4
      ? "GA4/export evidence lane"
      : hasFallback
        ? "source agreement overlap review"
        : "source agreement comparison";
  const proofRequired = [
    ...(!hasFirstParty ? ["first_party_day_bucket_or_analytics_event_facts_sample", "identity_materializer_parity_check"] : []),
    ...(!hasGa4 ? ["approved_ga4_export_or_config_evidence"] : []),
    ...(hasFallback ? ["fallback_archive_label_and_dedupe_review"] : []),
  ];
  const recoveryMetadata = buildSourceAgreementRecoveredMetricMetadata({
    dayKey: input.dayKey,
    sourceCounts: input.sourceCounts,
    defaultCounts: {
      first_party: hasFirstParty ? 1 : 0,
      ga4: hasGa4 ? 1 : 0,
      historicalSnapshot: sourceSet.has("historical_snapshot") ? 1 : 0,
      legacySupport: sourceSet.has("legacy_support") ? 1 : 0,
    },
    internalAdminExcludedCount: input.internalAdminExcludedCount,
  });

  return {
    dayKey: input.dayKey,
    sourcesPresent: input.sourcesPresent,
    sourcesMissing: input.sourcesMissing,
    ...recoveryMetadata,
    primarySourceState: hasFirstParty ? "first_party_present" : "first_party_missing",
    secondSourceState: hasGa4 ? "ga4_present" : "ga4_missing",
    fallbackState: hasFallback ? "fallback_present" : "fallback_missing",
    classifications: [...classifications],
    likelyRootCause,
    nextAction,
    recoveryLane,
    blockingOwner,
    proofRequired,
    productTruthEligible: hasFirstParty,
  };
}

function isBlockingCoverageMismatch(input: {
  sourcesPresent: string[];
  sourcesMissing: string[];
}) {
  if (input.sourcesPresent.length === 0 || input.sourcesMissing.length === 0) return false;
  const sourceSet = new Set(input.sourcesPresent);
  return hasBlockingSourceCoverageMismatch({
    hasFirstParty: sourceSet.has("first_party"),
    hasGa4: sourceSet.has("ga4"),
    hasHistoricalSnapshot: sourceSet.has("historical_snapshot"),
    hasLegacy: sourceSet.has("legacy_support"),
  });
}

export function buildSourceAgreementCoverageSummaryState(
  input: SourceAgreementCoverageSummaryInput,
): SourceAgreementCoverageSummaryState {
  const expectedDays = [...new Set(input.expectedDays.filter(Boolean))].sort();
  const expectedDaySet = new Set(expectedDays);
  const perSourceCoverage: Array<{ source: string; days: Iterable<string>; dayCount?: number }> = input.perSourceCoverage
    ?? Object.entries(input.coverageBySource ?? {}).map(([source, days]) => ({ source, days }));
  const normalizedCoverage = perSourceCoverage.map((entry) => {
    const days = [...new Set([...entry.days].filter(Boolean))].sort();
    const expectedWindowDayCount = days.filter((dayKey) => expectedDaySet.has(dayKey)).length;
    return {
      source: entry.source,
      days,
      dayCount: expectedDaySet.size > 0
        ? expectedWindowDayCount
        : typeof entry.dayCount === "number"
        ? entry.dayCount
        : days.filter((dayKey) => expectedDaySet.has(dayKey)).length,
    };
  });
  const sourceDaySets = new Map(normalizedCoverage.map((entry) => [entry.source, new Set(entry.days)]));
  const comparisonDayKeys = [...new Set((input.comparisonDayKeys ?? expectedDays).filter(Boolean))].sort();
  const disagreementCount = comparisonDayKeys.filter((dayKey) => isBlockingCoverageMismatch({
    sourcesPresent: normalizedCoverage
      .map((entry) => entry.source)
      .filter((source) => sourceDaySets.get(source)?.has(dayKey)),
    sourcesMissing: normalizedCoverage
      .map((entry) => entry.source)
      .filter((source) => !sourceDaySets.get(source)?.has(dayKey)),
  })).length;
  const activeSourceDayCounts = normalizedCoverage
    .filter((entry) => entry.dayCount > 0)
    .map((entry) => entry.dayCount);
  const primarySecondSourceCounts = normalizedCoverage
    .filter((entry) => entry.source === "first_party" || entry.source === "ga4")
    .filter((entry) => entry.dayCount > 0)
    .map((entry) => entry.dayCount);
  const deltaCounts = primarySecondSourceCounts.length >= 2
    ? primarySecondSourceCounts
    : activeSourceDayCounts;
  const maxCoverage = deltaCounts.length > 0 ? Math.max(...deltaCounts) : 0;
  const minCoverage = deltaCounts.length > 0 ? Math.min(...deltaCounts) : 0;
  const maxDeltaPct = deltaCounts.length > 1 && maxCoverage > 0
    ? Math.round(((maxCoverage - minCoverage) / maxCoverage) * 100)
    : 0;
  const reviewDeltaPct = input.tolerance?.reviewDeltaPct ?? input.reviewDeltaPct ?? 10;
  const failDeltaPct = input.tolerance?.failDeltaPct ?? input.failDeltaPct ?? 25;
  const sourceAgreementStatus: SourceAgreementFailureDetail["sourceAgreementStatus"] =
    activeSourceDayCounts.length < 2 || expectedDays.length === 0
      ? "not_enough_sources"
      : input.blockingContinuityGap || disagreementCount > 1 || maxDeltaPct > failDeltaPct
        ? "failed"
        : disagreementCount > 0 || maxDeltaPct > reviewDeltaPct
          ? "review"
          : "pass";

  return {
    activeSourceCount: activeSourceDayCounts.length,
    activeSourceDayCounts,
    disagreementCount,
    maxDeltaPct,
    reviewDeltaPct,
    failDeltaPct,
    sourceAgreementStatus,
  };
}

function labelForBlockedConsumer(consumer: string) {
  const labels: Record<string, string> = {
    admin_analytics_overview: "Analytics overview",
    admin_analytics_charts: "Analytics charts",
    admin_analytics_device_mix: "Device mix",
    admin_analytics_region_demand: "Region demand",
    admin_analytics_top_paths: "Top paths",
    admin_analytics_insight_cards: "Insight cards",
    admin_analytics_source_health: "Source health",
    debug_data_validation: "Debug source agreement",
    public_beta_score_evidence: "Public beta evidence",
  };
  return labels[consumer] ?? consumer.replaceAll("_", " ").replace(/\b\w/gu, (char) => char.toUpperCase());
}

function allowsSecondSourceDisplay(consumer: string) {
  return consumer === "admin_analytics_device_mix"
    || consumer === "admin_analytics_region_demand"
    || consumer === "admin_analytics_top_paths";
}

function buildBlockedConsumerDetails(
  blockedConsumers: string[],
  sourceAgreementStatus: SourceAgreementFailureDetail["sourceAgreementStatus"],
  disagreements: SourceAgreementDisagreementDetail[],
): SourceAgreementBlockedConsumerDetail[] {
  const hasMaterializerGap = disagreements.some((entry) => entry.classifications.includes("missing_materializer"));
  const currentState: SourceAgreementBlockedConsumerDetail["currentState"] = sourceAgreementStatus === "pass"
    ? "connected"
    : hasMaterializerGap
      ? "materializer_missing"
      : "source_agreement_failed";

  return [...new Set(blockedConsumers)].map((consumer) => {
    const secondSourceOnly = sourceAgreementStatus !== "pass" && allowsSecondSourceDisplay(consumer);
    const allowedDisplayState: SourceAgreementBlockedConsumerDetail["allowedDisplayState"] = sourceAgreementStatus === "pass"
      ? "connected"
      : secondSourceOnly
        ? "second_source_only"
        : consumer === "public_beta_score_evidence" || consumer === "debug_data_validation" || consumer === "admin_analytics_source_health"
          ? "chart_promotion_blocked"
          : "source_missing";
    const blockingOwner = sourceAgreementStatus === "pass"
      ? "none"
      : secondSourceOnly
        ? "GA4/external evidence lane, waiting for first-party agreement"
        : hasMaterializerGap
          ? "analytics_event_facts materialization"
          : "source agreement comparison";
    const nextAction = sourceAgreementStatus === "pass"
      ? "Keep this panel connected to the verified source window."
      : secondSourceOnly
        ? "Show GA4 as second-source evidence only; keep this panel waiting for first-party source agreement before treating it as product truth."
        : "Show source missing or keep charts waiting for proof until first-party day buckets and source agreement pass.";

    return {
      consumer,
      label: labelForBlockedConsumer(consumer),
      currentState,
      allowedDisplayState,
      blockingOwner,
      nextAction,
    };
  });
}

export const LAUNCH_ANALYTICS_SOURCE_AGREEMENT_COVERAGE: Record<string, string[]> = {
  first_party: [LAUNCH_ANALYTICS_FIRST_DAY_KEY],
  ga4: [LAUNCH_ANALYTICS_FIRST_DAY_KEY, "2026-02-13", "2026-02-14"],
  historical_snapshot: [LAUNCH_ANALYTICS_FIRST_DAY_KEY],
  legacy_support: ["2026-02-14"],
};

export const LAUNCH_ANALYTICS_SOURCE_AGREEMENT_SOURCES = [
  "first_party",
  "ga4",
  "historical_snapshot",
  "legacy_support",
] as const;

export type LaunchHistoryCoverageForSourceAgreement = {
  expectedDayCount: number;
  recoveredDayCount: number;
  state: "available" | "partial" | "source_missing";
  rangeStartDayKey?: string | null;
  rangeEndDayKey?: string | null;
  rangeProof?: {
    allLaunchRangeProven?: boolean;
    expectedRangeSource?: string;
    coverageWindowKind?: string;
    reason?: string;
  };
  days: Array<{
    dayKey: string;
    expected: boolean;
    sourceCounts: {
      first_party: number;
      ga4: number;
      historicalSnapshot: number;
      legacySupport: number;
    };
    internalAdminExcludedCount?: number | null;
  }>;
};

export function buildSourceAgreementFailureDetail(input: {
  comparedSources: SourceAgreementCoverageInput[] | string[];
  coverageBySource?: Record<string, string[]>;
  expectedDays?: string[];
  sourceCountsByDay?: Record<string, {
    first_party?: number | null;
    ga4?: number | null;
    historicalSnapshot?: number | null;
    legacySupport?: number | null;
  }>;
  internalAdminExcludedCountByDay?: Record<string, number | null | undefined>;
  comparedMetrics?: string[];
  tolerance?: { reviewDeltaPct?: number; failDeltaPct?: number };
  reviewDeltaPct?: number;
  failDeltaPct?: number;
  blockedConsumers?: string[];
  coverageWindowKind?: SourceAgreementFailureDetail["coverageWindowKind"];
}): SourceAgreementFailureDetail {
  const comparedSources: SourceAgreementCoverageInput[] = input.comparedSources.map((entry) => {
    if (typeof entry !== "string") return entry;
    return {
      source: entry,
      days: input.coverageBySource?.[entry] ?? [],
    };
  });
  const expectedRangeSource = input.expectedDays
    ? "caller_supplied_expected_days"
    : "union_of_local_source_days";
  const coverageWindowKind = input.coverageWindowKind
    ?? (input.expectedDays ? "caller_supplied_expected_days" : "local_source_window");
  const expectedDays = [...new Set((input.expectedDays ?? [
    ...Object.values(input.coverageBySource ?? {}).flat(),
    ...comparedSources.flatMap((entry) => entry.days),
  ]).filter(Boolean))].sort();
  const expectedDaySet = new Set(expectedDays);
  const perSourceCoverage = comparedSources.map((entry) => {
    const days = [...new Set(entry.days.filter(Boolean))].sort();
    return {
      source: entry.source,
      dayCount: days.filter((day) => expectedDaySet.has(day)).length,
      days,
    };
  });
  const sourceDaySets = new Map(perSourceCoverage.map((entry) => [entry.source, new Set(entry.days)]));
  const allDays = [...new Set([...expectedDays, ...perSourceCoverage.flatMap((entry) => entry.days)])].sort();
  const sourceAgreementSummary = buildSourceAgreementCoverageSummaryState({
    expectedDays,
    perSourceCoverage,
    comparisonDayKeys: allDays,
    tolerance: input.tolerance,
    reviewDeltaPct: input.reviewDeltaPct,
    failDeltaPct: input.failDeltaPct,
  });
  const {
    disagreementCount,
    maxDeltaPct,
    reviewDeltaPct,
    failDeltaPct,
    sourceAgreementStatus,
  } = sourceAgreementSummary;
  const disagreements = allDays
    .map((dayKey) => classifyDayDisagreement({
      dayKey,
      sourcesPresent: comparedSources
        .map((entry) => entry.source)
        .filter((source) => sourceDaySets.get(source)?.has(dayKey)),
      sourcesMissing: comparedSources
        .map((entry) => entry.source)
        .filter((source) => !sourceDaySets.get(source)?.has(dayKey)),
      sourceCounts: input.sourceCountsByDay?.[dayKey],
      internalAdminExcludedCount: input.internalAdminExcludedCountByDay?.[dayKey] ?? null,
    }))
    .filter((entry): entry is SourceAgreementDisagreementDetail => Boolean(entry));
  const missingDaysBySource = Object.fromEntries(
    perSourceCoverage.map((entry) => [
      entry.source,
      expectedDays.filter((day) => !sourceDaySets.get(entry.source)?.has(day)),
    ]),
  );
  const extraDaysBySource = Object.fromEntries(
    perSourceCoverage.map((entry) => [
      entry.source,
      entry.days.filter((day) => !expectedDaySet.has(day)),
    ]),
  );
  const blockedConsumers = input.blockedConsumers ?? [...LAUNCH_ANALYTICS_DEFAULT_BLOCKED_CONSUMERS];

  return {
    comparedSources: comparedSources.map((entry) => entry.source),
    sourceAgreementStatus,
    rangeStartDayKey: expectedDays[0] ?? null,
    rangeEndDayKey: expectedDays[expectedDays.length - 1] ?? null,
    expectedDayCount: expectedDays.length,
    expectedRangeSource,
    coverageWindowKind,
    allLaunchRangeProven: false,
    disagreementCount,
    maxDeltaPct,
    disagreements,
    perSourceCoverage,
    missingDaysBySource,
    extraDaysBySource,
    comparedMetrics: input.comparedMetrics ?? ["day_bucket_presence", "coverage_delta_pct"],
    toleranceThresholds: {
      reviewDeltaPct,
      failDeltaPct,
    },
    blockedConsumers,
    blockedConsumerDetails: buildBlockedConsumerDetails(blockedConsumers, sourceAgreementStatus, disagreements),
    nextAction: "Refresh or repair the mismatched source lane, inspect first-party day buckets first, keep GA4 as external comparison evidence, classify fallback historical/legacy evidence as archive-only until it agrees, and verify the GA4 property before promoting analytics parity.",
    nextExactSteps: [
      "Run the existing all-range historical analytics route or approved local export path to produce first-party day buckets.",
      "Compare GA4 only as second-source evidence for sessions, views, devices, regions, top paths, and acquisition-style checks.",
      "Keep fallback historical and legacy support rows archive/evidence-only until first-party materialization or dedupe proves the day.",
      "Promote admin charts only after sourceAgreementStatus is pass and first-party product truth covers the bounded window.",
    ],
    sourceTruthPolicy: LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY,
  };
}

export function buildLaunchAnalyticsSourceAgreementFailureDetail(input: {
  expectedDays?: string[];
  comparedMetrics?: string[];
  tolerance?: { reviewDeltaPct?: number; failDeltaPct?: number };
  blockedConsumers?: string[];
} = {}) {
  return buildSourceAgreementFailureDetail({
    comparedSources: [...LAUNCH_ANALYTICS_SOURCE_AGREEMENT_SOURCES],
    coverageBySource: LAUNCH_ANALYTICS_SOURCE_AGREEMENT_COVERAGE,
    comparedMetrics: input.comparedMetrics,
    expectedDays: input.expectedDays,
    tolerance: input.tolerance,
    blockedConsumers: input.blockedConsumers,
    coverageWindowKind: input.expectedDays ? "caller_supplied_expected_days" : "fixture_only_local_window",
  });
}

export function buildSourceAgreementFailureDetailFromLaunchHistoryCoverage(input: {
  launchHistoryCoverage: LaunchHistoryCoverageForSourceAgreement;
  proofMode?: "local_export" | "admin_truth_sample";
  comparedMetrics?: string[];
  tolerance?: { reviewDeltaPct?: number; failDeltaPct?: number };
  blockedConsumers?: string[];
}): SourceAgreementFailureDetail {
  const expectedRows = input.launchHistoryCoverage.days.filter((day) => day.expected);
  const expectedDays = [...new Set(
    expectedRows
      .map((day) => day.dayKey)
      .filter(Boolean),
  )].sort();
  const sourceCountsByDay = Object.fromEntries(
    expectedRows.map((day) => [
      day.dayKey,
      day.sourceCounts,
    ]),
  );
  const sourceStateInternalAdminExcludedCountByDay = Object.fromEntries(
    expectedRows.map((day) => [
      day.dayKey,
      typeof day.internalAdminExcludedCount === "number"
        ? Math.max(0, day.internalAdminExcludedCount)
        : null,
    ]),
  );
  const sourceCoverageRows = buildLaunchHistorySourceCoverageRowsState({
    expectedDayKeys: expectedDays,
    sourceCountsByDay,
    internalAdminExcludedCountByDay: sourceStateInternalAdminExcludedCountByDay,
  });
  const expectedCoverageRows = sourceCoverageRows.dayCoverage;
  const initialRangeProofEligibility = buildLaunchHistoryCoverageRangeProofEligibility({
    proofMode: input.proofMode,
    expectedDayKeys: expectedDays,
    declaredExpectedDayCount: input.launchHistoryCoverage.expectedDayCount,
    declaredRecoveredDayCount: input.launchHistoryCoverage.recoveredDayCount,
    recoveredDayCount: 0,
    rangeStartDayKey: input.launchHistoryCoverage.rangeStartDayKey,
    rangeEndDayKey: input.launchHistoryCoverage.rangeEndDayKey,
    rangeProof: input.launchHistoryCoverage.rangeProof,
    launchCoverageState: "source_missing",
    firstPartyCoverageState: "source_missing",
    productTruthRecoveredDayCount: 0,
    sourceAgreementState: "not_enough_sources",
  });
  const coverageBySource = {
    first_party: expectedCoverageRows
      .filter((day) => day.sourceCounts.first_party > 0)
      .map((day) => day.dayKey),
    ga4: expectedCoverageRows
      .filter((day) => day.sourceCounts.ga4 > 0)
      .map((day) => day.dayKey),
    historical_snapshot: expectedCoverageRows
      .filter((day) => day.sourceCounts.historicalSnapshot > 0)
      .map((day) => day.dayKey),
    legacy_support: expectedCoverageRows
      .filter((day) => day.sourceCounts.legacySupport > 0)
      .map((day) => day.dayKey),
  };
  const detail = buildSourceAgreementFailureDetail({
    comparedSources: [...LAUNCH_ANALYTICS_SOURCE_AGREEMENT_SOURCES],
    coverageBySource,
    expectedDays,
    sourceCountsByDay,
    internalAdminExcludedCountByDay: sourceStateInternalAdminExcludedCountByDay,
    comparedMetrics: input.comparedMetrics,
    tolerance: input.tolerance,
    blockedConsumers: input.blockedConsumers,
    coverageWindowKind: initialRangeProofEligibility.coverageWindowKind,
  });
  const perDaySourceCounts = Object.fromEntries(
    expectedCoverageRows
      .map((day) => [
        day.dayKey,
        day.sourceCounts,
      ]),
  );
  const internalAdminExcludedCountByDay = Object.fromEntries(
    expectedCoverageRows
      .filter((day) => typeof day.internalAdminExcludedCount === "number")
      .map((day) => [day.dayKey, day.internalAdminExcludedCount ?? 0]),
  );
  const reviewDeltaPct = input.tolerance?.reviewDeltaPct ?? 10;
  const failDeltaPct = input.tolerance?.failDeltaPct ?? 25;
  const perDayMetricDeltas = expectedCoverageRows
    .map((day) => {
      const primaryCount = day.sourceCounts.first_party;
      const secondSourceCount = day.sourceCounts.ga4;
      const denominator = Math.max(primaryCount, secondSourceCount);
      const deltaPct = denominator > 0
        ? Math.round((Math.abs(primaryCount - secondSourceCount) / denominator) * 100)
        : 0;
      const classifications: SourceAgreementFailureClassification[] = [];
      if (deltaPct > reviewDeltaPct && primaryCount > 0 && secondSourceCount > 0) {
        classifications.push(
          typeof day.internalAdminExcludedCount === "number" && day.internalAdminExcludedCount > 0
            ? "internal_traffic_mismatch"
            : "route_normalization_mismatch",
        );
      }
      const recoveryMetadata = buildSourceAgreementRecoveredMetricMetadata({
        dayKey: day.dayKey,
        sourceCounts: day.sourceCounts,
        internalAdminExcludedCount: day.internalAdminExcludedCount ?? null,
      });
      return {
        dayKey: day.dayKey,
        metric: "source_count_delta" as const,
        ...recoveryMetadata,
        primarySource: "first_party" as const,
        secondSource: "ga4" as const,
        primaryCount,
        secondSourceCount,
        deltaPct,
        classifications,
        nextAction: classifications.includes("internal_traffic_mismatch")
          ? "Compare first-party internal/admin filtering against GA4 before promoting this day."
          : "Compare route/event normalization between first-party facts and GA4 before promoting this day.",
      };
    })
    .filter((entry) => entry.classifications.length > 0);
  const metricDisagreements = perDayMetricDeltas.map((entry): SourceAgreementDisagreementDetail => {
    const row = expectedCoverageRows.find((day) => day.dayKey === entry.dayKey);
    const hasFallback = Boolean(row && (row.sourceCounts.historicalSnapshot > 0 || row.sourceCounts.legacySupport > 0));
    const recoveryMetadata = buildSourceAgreementRecoveredMetricMetadata({
      dayKey: entry.dayKey,
      sourceCounts: row?.sourceCounts,
      defaultCounts: {
        first_party: 1,
        ga4: 1,
        historicalSnapshot: 0,
        legacySupport: 0,
      },
      internalAdminExcludedCount: row?.internalAdminExcludedCount ?? null,
    });
    return {
      dayKey: entry.dayKey,
      sourcesPresent: [
        "first_party",
        "ga4",
        ...(row?.sourceCounts.historicalSnapshot ? ["historical_snapshot"] : []),
        ...(row?.sourceCounts.legacySupport ? ["legacy_support"] : []),
      ],
      sourcesMissing: [
        ...(row?.sourceCounts.historicalSnapshot ? [] : ["historical_snapshot"]),
        ...(row?.sourceCounts.legacySupport ? [] : ["legacy_support"]),
      ],
      ...recoveryMetadata,
      primarySourceState: "first_party_present",
      secondSourceState: "ga4_present",
      fallbackState: hasFallback ? "fallback_present" : "fallback_missing",
      classifications: entry.classifications,
      likelyRootCause: entry.classifications.includes("internal_traffic_mismatch")
        ? "First-party and GA4 counts differ beyond tolerance, likely because internal/admin traffic filtering differs."
        : "First-party and GA4 counts differ beyond tolerance, likely because route or event normalization differs.",
      nextAction: entry.nextAction,
      recoveryLane: "source_agreement_review",
      blockingOwner: "source agreement count-delta review",
      proofRequired: entry.classifications.includes("internal_traffic_mismatch")
        ? ["internal_traffic_filter_review", "ga4_export_day_bucket_review"]
        : ["route_normalization_mapping_review", "ga4_export_day_bucket_review"],
      productTruthEligible: false,
    };
  });
  const metricStatus: SourceAgreementFailureDetail["sourceAgreementStatus"] =
    perDayMetricDeltas.some((entry) => entry.deltaPct > failDeltaPct)
      ? "failed"
      : perDayMetricDeltas.length > 0
        ? "review"
        : "pass";
  const sourceAgreementStatus: SourceAgreementFailureDetail["sourceAgreementStatus"] =
    detail.sourceAgreementStatus === "failed" || metricStatus === "failed"
      ? "failed"
      : detail.sourceAgreementStatus === "review" || metricStatus === "review"
        ? "review"
        : detail.sourceAgreementStatus;
  const maxMetricDeltaPct = perDayMetricDeltas.reduce((max, entry) => Math.max(max, entry.deltaPct), 0);
  const coverageSummary = buildLaunchHistoryCoverageSummaryState({
    expectedDayKeys: expectedDays,
    dayCoverage: expectedCoverageRows,
    staleEvidence: false,
    sourceAgreementState: sourceAgreementStatus,
  });
  const rangeProofEligibility = buildLaunchHistoryCoverageRangeProofEligibility({
    proofMode: input.proofMode,
    expectedDayKeys: expectedDays,
    declaredExpectedDayCount: input.launchHistoryCoverage.expectedDayCount,
    declaredRecoveredDayCount: input.launchHistoryCoverage.recoveredDayCount,
    recoveredDayCount: coverageSummary.recoveredDayCount,
    rangeStartDayKey: input.launchHistoryCoverage.rangeStartDayKey,
    rangeEndDayKey: input.launchHistoryCoverage.rangeEndDayKey,
    rangeProof: input.launchHistoryCoverage.rangeProof,
    launchCoverageState: coverageSummary.launchCoverage.state,
    firstPartyCoverageState: coverageSummary.firstPartyCoverage.state,
    productTruthRecoveredDayCount: coverageSummary.productTruthRecoveredDayCount,
    sourceAgreementState: sourceAgreementStatus,
  });

  return {
    ...detail,
    sourceAgreementStatus,
    disagreementCount: detail.disagreementCount + metricDisagreements.length,
    maxDeltaPct: Math.max(detail.maxDeltaPct, maxMetricDeltaPct),
    disagreements: [...detail.disagreements, ...metricDisagreements],
    perDaySourceCounts,
    internalAdminExcludedCountByDay,
    perDayMetricDeltas,
    allLaunchRangeProven: rangeProofEligibility.allLaunchRangeProven,
  };
}
