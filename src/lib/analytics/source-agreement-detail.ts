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
  nextAction: string;
  nextExactSteps: string[];
  sourceTruthPolicy: {
    firstPartyPrimary: true;
    ga4SecondSourceOnly: true;
    fallbackEvidenceOnly: true;
    missingIsNotZero: true;
  };
};

function classifyDayDisagreement(input: {
  dayKey: string;
  sourcesPresent: string[];
  sourcesMissing: string[];
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
  if (!hasFirstParty && input.sourcesPresent.length > 1) {
    classifications.add("duplicate_event");
  }
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

  return {
    dayKey: input.dayKey,
    sourcesPresent: input.sourcesPresent,
    sourcesMissing: input.sourcesMissing,
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
  const hasFirstParty = sourceSet.has("first_party");
  const hasGa4 = sourceSet.has("ga4");
  return !hasFirstParty || !hasGa4;
}

export const LAUNCH_ANALYTICS_SOURCE_AGREEMENT_COVERAGE: Record<string, string[]> = {
  first_party: ["2026-05-01"],
  ga4: ["2026-05-01", "2026-05-02", "2026-05-03"],
  historical_snapshot: ["2026-05-01"],
  legacy_support: ["2026-05-03"],
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

function parseDayStartUtc(dayKey: string | null | undefined) {
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/u.test(dayKey)) return null;
  const timestamp = Date.parse(`${dayKey}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().startsWith(dayKey) ? timestamp : null;
}

function inclusiveDayCount(startDayKey: string | null | undefined, endDayKey: string | null | undefined) {
  const start = parseDayStartUtc(startDayKey);
  const end = parseDayStartUtc(endDayKey);
  if (start === null || end === null || end < start) return null;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function hasExplicitAllLaunchRangeProof(
  coverage: LaunchHistoryCoverageForSourceAgreement,
  expectedDays: string[],
) {
  if (coverage.rangeProof?.allLaunchRangeProven !== true) return false;
  if (expectedDays.length === 0) return false;
  const rangeStartDayKey = coverage.rangeStartDayKey ?? null;
  const rangeEndDayKey = coverage.rangeEndDayKey ?? null;
  if (rangeStartDayKey !== expectedDays[0] || rangeEndDayKey !== expectedDays[expectedDays.length - 1]) {
    return false;
  }
  return inclusiveDayCount(rangeStartDayKey, rangeEndDayKey) === expectedDays.length;
}

export function buildSourceAgreementFailureDetail(input: {
  comparedSources: SourceAgreementCoverageInput[] | string[];
  coverageBySource?: Record<string, string[]>;
  expectedDays?: string[];
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
  const disagreementCount = allDays.filter((day) => isBlockingCoverageMismatch({
    sourcesPresent: comparedSources
      .map((entry) => entry.source)
      .filter((source) => sourceDaySets.get(source)?.has(day)),
    sourcesMissing: comparedSources
      .map((entry) => entry.source)
      .filter((source) => !sourceDaySets.get(source)?.has(day)),
  })).length;
  const activeCounts = perSourceCoverage.filter((entry) => entry.dayCount > 0).map((entry) => entry.dayCount);
  const primarySecondSourceCounts = perSourceCoverage
    .filter((entry) => entry.source === "first_party" || entry.source === "ga4")
    .filter((entry) => entry.dayCount > 0)
    .map((entry) => entry.dayCount);
  const deltaCounts = primarySecondSourceCounts.length >= 2 ? primarySecondSourceCounts : activeCounts;
  const maxCoverage = deltaCounts.length > 0 ? Math.max(...deltaCounts) : 0;
  const minCoverage = deltaCounts.length > 0 ? Math.min(...deltaCounts) : 0;
  const maxDeltaPct = deltaCounts.length > 1 && maxCoverage > 0
    ? Math.round(((maxCoverage - minCoverage) / maxCoverage) * 100)
    : 0;
  const reviewDeltaPct = input.tolerance?.reviewDeltaPct ?? input.reviewDeltaPct ?? 10;
  const failDeltaPct = input.tolerance?.failDeltaPct ?? input.failDeltaPct ?? 25;
  const sourceAgreementStatus =
    activeCounts.length < 2 || expectedDays.length === 0
      ? "not_enough_sources"
      : disagreementCount > 1 || maxDeltaPct > failDeltaPct
        ? "failed"
        : disagreementCount > 0 || maxDeltaPct > reviewDeltaPct
          ? "review"
          : "pass";
  const disagreements = allDays
    .map((dayKey) => classifyDayDisagreement({
      dayKey,
      sourcesPresent: comparedSources
        .map((entry) => entry.source)
        .filter((source) => sourceDaySets.get(source)?.has(dayKey)),
      sourcesMissing: comparedSources
        .map((entry) => entry.source)
        .filter((source) => !sourceDaySets.get(source)?.has(dayKey)),
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
    blockedConsumers: input.blockedConsumers ?? [
      "admin_analytics_overview",
      "admin_analytics_charts",
      "admin_analytics_insight_cards",
      "public_beta_score_evidence",
    ],
    nextAction: "Refresh or repair the mismatched source lane, inspect first-party day buckets first, keep GA4 as external comparison evidence, classify fallback historical/legacy evidence as archive-only until it agrees, and verify the GA4 property before promoting analytics parity.",
    nextExactSteps: [
      "Run the existing all-range historical analytics route or approved local export path to produce first-party day buckets.",
      "Compare GA4 only as second-source evidence for sessions, views, devices, regions, top paths, and acquisition-style checks.",
      "Keep fallback historical and legacy support rows archive/evidence-only until first-party materialization or dedupe proves the day.",
      "Promote admin charts only after sourceAgreementStatus is pass and first-party product truth covers the bounded window.",
    ],
    sourceTruthPolicy: {
      firstPartyPrimary: true,
      ga4SecondSourceOnly: true,
      fallbackEvidenceOnly: true,
      missingIsNotZero: true,
    },
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
  const expectedDays = [...new Set(
    input.launchHistoryCoverage.days
      .filter((day) => day.expected)
      .map((day) => day.dayKey)
      .filter(Boolean),
  )].sort();
  const coverageBySource = {
    first_party: input.launchHistoryCoverage.days
      .filter((day) => day.expected && day.sourceCounts.first_party > 0)
      .map((day) => day.dayKey),
    ga4: input.launchHistoryCoverage.days
      .filter((day) => day.expected && day.sourceCounts.ga4 > 0)
      .map((day) => day.dayKey),
    historical_snapshot: input.launchHistoryCoverage.days
      .filter((day) => day.expected && day.sourceCounts.historicalSnapshot > 0)
      .map((day) => day.dayKey),
    legacy_support: input.launchHistoryCoverage.days
      .filter((day) => day.expected && day.sourceCounts.legacySupport > 0)
      .map((day) => day.dayKey),
  };
  const detail = buildSourceAgreementFailureDetail({
    comparedSources: [...LAUNCH_ANALYTICS_SOURCE_AGREEMENT_SOURCES],
    coverageBySource,
    expectedDays,
    comparedMetrics: input.comparedMetrics,
    tolerance: input.tolerance,
    blockedConsumers: input.blockedConsumers,
    coverageWindowKind: input.proofMode === "admin_truth_sample"
      ? "admin_truth_sample"
      : "all_range_historical_export",
  });
  const perDaySourceCounts = Object.fromEntries(
    input.launchHistoryCoverage.days
      .filter((day) => day.expected)
      .map((day) => [
        day.dayKey,
        {
          first_party: Math.max(0, Number(day.sourceCounts.first_party) || 0),
          ga4: Math.max(0, Number(day.sourceCounts.ga4) || 0),
          historicalSnapshot: Math.max(0, Number(day.sourceCounts.historicalSnapshot) || 0),
          legacySupport: Math.max(0, Number(day.sourceCounts.legacySupport) || 0),
        },
      ]),
  );
  const internalAdminExcludedCountByDay = Object.fromEntries(
    input.launchHistoryCoverage.days
      .filter((day) => day.expected && typeof day.internalAdminExcludedCount === "number")
      .map((day) => [day.dayKey, Math.max(0, day.internalAdminExcludedCount ?? 0)]),
  );
  const reviewDeltaPct = input.tolerance?.reviewDeltaPct ?? 10;
  const failDeltaPct = input.tolerance?.failDeltaPct ?? 25;
  const perDayMetricDeltas = input.launchHistoryCoverage.days
    .filter((day) => day.expected)
    .map((day) => {
      const primaryCount = Math.max(0, Number(day.sourceCounts.first_party) || 0);
      const secondSourceCount = Math.max(0, Number(day.sourceCounts.ga4) || 0);
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
      return {
        dayKey: day.dayKey,
        metric: "source_count_delta" as const,
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
    const row = input.launchHistoryCoverage.days.find((day) => day.dayKey === entry.dayKey);
    const hasFallback = Boolean(row && (row.sourceCounts.historicalSnapshot > 0 || row.sourceCounts.legacySupport > 0));
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
      productTruthEligible: true,
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
  const recoveredExpectedDayCount = input.launchHistoryCoverage.days
    .filter((day) =>
      day.expected &&
      Object.values(day.sourceCounts).some((count) => Number(count) > 0)
    ).length;
  const declaredCountsMatchRows =
    input.launchHistoryCoverage.expectedDayCount === expectedDays.length &&
    input.launchHistoryCoverage.recoveredDayCount === recoveredExpectedDayCount;
  const explicitAllLaunchRangeProof = hasExplicitAllLaunchRangeProof(input.launchHistoryCoverage, expectedDays);

  return {
    ...detail,
    sourceAgreementStatus,
    disagreementCount: detail.disagreementCount + metricDisagreements.length,
    maxDeltaPct: Math.max(detail.maxDeltaPct, maxMetricDeltaPct),
    disagreements: [...detail.disagreements, ...metricDisagreements],
    perDaySourceCounts,
    internalAdminExcludedCountByDay,
    perDayMetricDeltas,
    allLaunchRangeProven: input.proofMode === "admin_truth_sample"
      && explicitAllLaunchRangeProof
      && input.launchHistoryCoverage.state === "available"
      && declaredCountsMatchRows
      && recoveredExpectedDayCount === expectedDays.length
      && sourceAgreementStatus === "pass",
  };
}
