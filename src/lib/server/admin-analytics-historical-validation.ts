import "server-only";

import { TELEMETRY_MODULE_INDEXES } from "@/lib/telemetry-catalog";
import type { AnalyticsTruthSummary } from "@/lib/admin-analytics-truth";

import { buildModuleCoverageReport, buildParityInsight, sumCountBuckets } from "./analytics-parity";
import { sumEventCounts } from "./admin-analytics-shared";

export interface HistoricalTaskGuidanceSummary {
  viewed: number;
  dismissed: number;
  tapped: number;
  completed: number;
}

export interface HistoricalValidationSummary {
  moduleCoverage: ReturnType<typeof buildModuleCoverageReport>[];
  unhealthyModules: ReturnType<typeof buildModuleCoverageReport>[];
  parityScore: number;
  truthState: AnalyticsTruthSummary;
  validations: DataValidationCheck[];
  analyticsSourceHealth: AnalyticsSourceHealth;
  telemetryParityValidation: TelemetryParityValidation;
}

type DataValidationStatus = "pass" | "warn" | "fail" | "unavailable" | "stale" | "unknown";
type DataValidationCacheState = "hit" | "miss" | "stale" | "unknown" | "not_loaded";

export interface SourceCheck {
  status: "pass" | "review" | "fail" | "unknown";
  freshnessState: "fresh" | "stale" | "missing" | "unknown";
  confidence: number | null;
  sampleCount: number | null;
  lastSeenAtUtc: string | null;
  passAllowed: boolean;
  reason: string;
}

export interface AnalyticsSourceHealth {
  range: "7d" | "30d" | "90d" | string;
  generatedAtUtc: string;
  availability: {
    ga4: SourceCheck;
    historicalSnapshot: SourceCheck;
    legacySupport: SourceCheck;
  };
  continuity: {
    expectedDays: number;
    presentDays: number;
    missingDays: string[];
    recentGapDays: string[];
    lastCompleteDayUtc: string | null;
    gapSeverity: "none" | "info" | "review" | "error";
    gapReason: string;
  };
  sourceAgreement: {
    comparedSources: string[];
    disagreementCount: number;
    maxDeltaPct: number | null;
    state: "pass" | "review" | "failed" | "not_enough_sources";
  };
  chartReadiness: {
    state: "ready" | "partial" | "gap_detected" | "unavailable";
    reason: string;
  };
}

export interface DataValidationPanelState {
  status: "loading" | "loaded" | "not_validated" | "stale" | "failed" | "unavailable";
  checkCount: number | null;
  failCount: number | null;
  warnCount: number | null;
  staleCount: number | null;
  blockedPassCount: number | null;
  range: string;
  cacheState: DataValidationCacheState;
  lastValidatedAtUtc: string | null;
  generatedAtUtc: string | null;
  sourcePath: string;
  loadError?: string;
  nextAction: string;
}

export interface DataValidationCheck {
  checkKey: string;
  label: string;
  title: string;
  status: DataValidationStatus;
  detail: string;
  operatorSummary: string;
  whyItMatters: string;
  source: string;
  sourceDetails: string;
  selectedRange: string;
  lastValidatedAt: number;
  freshnessState: "fresh" | "stale" | "unknown";
  confidence: number | null;
  requiredSourcesPresent: boolean;
  sampleRequired: boolean;
  sampleCount: number;
  passAllowed: boolean;
  passBlockedReason: string | null;
  action: string;
  recommendedNextCheck: string;
  technicalEvidence: string;
  fullDetails: string;
  eventSource?: string;
  sampleSource?: string;
  blockedReason?: string;
  failureClusters?: FailureCluster[];
}

export interface FailureCluster {
  source: string;
  reasonCode: string;
  count: number;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  affectedRoute?: string;
  suggestedAction: string;
}

export interface TelemetryParityValidation {
  range: string;
  generatedAtUtc: string;
  canonicalAuthenticatedEventCount: number;
  canonicalSampleCount: number;
  sampleCoveragePct: number;
  sampleSource: string;
  eventSource: string;
  status: "pass" | "review" | "fail";
  blockedReason?: "required_sample_missing" | "materializer_failed" | "range_mismatch" | "source_mismatch" | "unknown";
  failureClusters: FailureCluster[];
}

function toUtcString(timestamp?: number | null) {
  return timestamp && Number.isFinite(timestamp) && timestamp > 0
    ? new Date(timestamp).toISOString()
    : null;
}

function maxValidationTimestamp(validations: DataValidationCheck[]) {
  return validations.reduce((latest, validation) => {
    return Math.max(latest, validation.lastValidatedAt || 0);
  }, 0);
}

function normalizeCacheState(cacheState?: "miss" | "fresh" | "stale" | null): DataValidationCacheState {
  if (cacheState === "fresh") return "hit";
  if (cacheState === "miss") return "miss";
  if (cacheState === "stale") return "stale";
  return "unknown";
}

function dayKeyToUtcIso(dayKey: string) {
  return new Date(`${dayKey}T00:00:00.000Z`).toISOString();
}

function summarizeContinuityStatus(
  continuity: AnalyticsSourceHealth["continuity"],
  chartReadiness: AnalyticsSourceHealth["chartReadiness"],
) {
  if (chartReadiness.state === "unavailable") return "fail" as const;
  if (continuity.gapSeverity === "error" || chartReadiness.state === "gap_detected") return "fail" as const;
  if (continuity.gapSeverity === "review" || continuity.gapSeverity === "info" || chartReadiness.state === "partial") return "warn" as const;
  return "pass" as const;
}

function summarizeSourceAgreementStatus(sourceAgreement: AnalyticsSourceHealth["sourceAgreement"]) {
  if (sourceAgreement.state === "failed") return "fail" as const;
  if (sourceAgreement.state === "review" || sourceAgreement.state === "not_enough_sources") return "warn" as const;
  return "pass" as const;
}

function summarizeRecentWindowStatus(continuity: AnalyticsSourceHealth["continuity"]) {
  if (continuity.recentGapDays.length >= 2) return "fail" as const;
  if (continuity.recentGapDays.length === 1) return "warn" as const;
  return "pass" as const;
}

function buildAnalyticsSourceHealth(input: {
  selectedRange: string;
  generatedAtMs: number;
  gaAvailable: boolean;
  gaConfidence: number | null;
  gaPresentDayKeys: string[];
  gaLastSeenAtMs: number;
  snapshotPresentDayKeys: string[];
  snapshotLastSeenAtMs: number;
  legacyPresentDayKeys: string[];
  legacyLastSeenAtMs: number;
  expectedDayKeys: string[];
  recentWindowDayKeys: string[];
  truthState: AnalyticsTruthSummary;
}) {
  const gaPresentDays = new Set(input.gaPresentDayKeys);
  const snapshotPresentDays = new Set(input.snapshotPresentDayKeys);
  const legacyPresentDays = new Set(input.legacyPresentDayKeys);
  const expectedDays = input.expectedDayKeys.filter(Boolean);
  const expectedDaySet = new Set(expectedDays);
  const unionPresentDays = new Set<string>([
    ...input.gaPresentDayKeys,
    ...input.snapshotPresentDayKeys,
    ...input.legacyPresentDayKeys,
  ].filter((dayKey) => expectedDaySet.has(dayKey)));

  const missingDays = expectedDays.filter((dayKey) => !unionPresentDays.has(dayKey));
  const recentGapDays = input.recentWindowDayKeys.filter((dayKey) => !unionPresentDays.has(dayKey));
  const lastCompleteDay = [...expectedDays].reverse().find((dayKey) => unionPresentDays.has(dayKey)) ?? null;
  let recentGapStreak = 0;
  let currentRecentGapStreak = 0;
  input.recentWindowDayKeys.forEach((dayKey) => {
    if (unionPresentDays.has(dayKey)) {
      currentRecentGapStreak = 0;
      return;
    }
    currentRecentGapStreak += 1;
    recentGapStreak = Math.max(recentGapStreak, currentRecentGapStreak);
  });
  const gapSeverity: AnalyticsSourceHealth["continuity"]["gapSeverity"] =
    recentGapDays.length >= 2 || recentGapStreak >= 2
      ? "error"
      : recentGapDays.length === 1 || missingDays.length > 0
        ? "review"
        : "none";
  const gapReason = recentGapDays.length > 0
    ? `Recent analytics continuity gap detected: missing daily buckets for ${recentGapDays[0]} through ${recentGapDays[recentGapDays.length - 1]}.`
    : missingDays.length > 0
      ? `Historical analytics continuity gap detected: ${missingDays.length} expected daily bucket(s) are missing in ${input.selectedRange}.`
      : "Expected daily buckets are present or backed by explicit source evidence.";

  const comparedSources = ["ga4", "historical_snapshot", "legacy_support"];
  const coverageBySource = [
    { key: "ga4", days: gaPresentDays.size },
    { key: "historical_snapshot", days: snapshotPresentDays.size },
    { key: "legacy_support", days: legacyPresentDays.size },
  ];
  const activeCoverage = coverageBySource.filter((entry) => entry.days > 0);
  const disagreementCount = expectedDays.filter((dayKey) => {
    const coverageValues = [gaPresentDays.has(dayKey), snapshotPresentDays.has(dayKey), legacyPresentDays.has(dayKey)];
    return coverageValues.some(Boolean) && !coverageValues.every(Boolean);
  }).length;
  const maxCoverage = activeCoverage.length > 0 ? Math.max(...activeCoverage.map((entry) => entry.days)) : 0;
  const minCoverage = activeCoverage.length > 0 ? Math.min(...activeCoverage.map((entry) => entry.days)) : 0;
  const maxDeltaPct = activeCoverage.length > 1 && maxCoverage > 0
    ? Math.round(((maxCoverage - minCoverage) / maxCoverage) * 100)
    : null;
  const sourceAgreementState: AnalyticsSourceHealth["sourceAgreement"]["state"] =
    activeCoverage.length < 2
      ? "not_enough_sources"
      : recentGapDays.length > 0 || disagreementCount > 1 || (maxDeltaPct ?? 0) > 25
        ? "failed"
        : disagreementCount > 0 || (maxDeltaPct ?? 0) > 10
          ? "review"
          : "pass";
  const chartReadinessState: AnalyticsSourceHealth["chartReadiness"]["state"] =
    expectedDays.length === 0
      ? "unavailable"
      : recentGapDays.length > 0
        ? "gap_detected"
        : missingDays.length > 0 || sourceAgreementState === "review" || sourceAgreementState === "not_enough_sources"
          ? "partial"
          : "ready";
  const chartReadinessReason =
    chartReadinessState === "gap_detected"
      ? gapReason
      : chartReadinessState === "partial"
        ? "Historical snapshot is fresh enough to load, but chart continuity or source agreement still needs review."
        : chartReadinessState === "unavailable"
          ? "No day-bucket evidence was available for the selected range."
          : "Availability and continuity checks both passed for the selected chart range.";

  const ga4: SourceCheck = {
    status: input.gaAvailable ? "pass" : "fail",
    freshnessState: input.gaAvailable ? "fresh" : "missing",
    confidence: input.gaConfidence,
    sampleCount: gaPresentDays.size,
    lastSeenAtUtc: toUtcString(input.gaLastSeenAtMs),
    passAllowed: Boolean(input.gaAvailable),
    reason: input.gaAvailable
      ? `${gaPresentDays.size} GA day bucket(s) responded for ${input.selectedRange}.`
      : "GA property is missing or did not return data for the selected range.",
  };
  const historicalSnapshot: SourceCheck = {
    status: input.truthState.fail > 0
      ? "fail"
      : input.truthState.warn > 0 || snapshotPresentDays.size === 0
        ? "review"
        : "pass",
    freshnessState: input.truthState.fail > 0
      ? "missing"
      : input.truthState.warn > 0
        ? "stale"
        : snapshotPresentDays.size > 0
          ? "fresh"
          : "missing",
    confidence: input.truthState.score,
    sampleCount: snapshotPresentDays.size,
    lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
    passAllowed: input.truthState.fail === 0 && snapshotPresentDays.size > 0,
    reason: input.truthState.fail > 0
      ? "Required historical snapshot sources failed freshness or are missing."
      : input.truthState.warn > 0
        ? "Historical snapshot sources are available, but some are stale or partial."
        : snapshotPresentDays.size > 0
          ? `${snapshotPresentDays.size} snapshot-backed day bucket(s) are present for ${input.selectedRange}.`
          : "Historical snapshot exists, but no day buckets were observed for this range.",
  };
  const legacySupport: SourceCheck = {
    status: input.truthState.legacyCoverageWarnings > 0
      ? "review"
      : legacyPresentDays.size > 0
        ? "pass"
        : "unknown",
    freshnessState: input.truthState.legacyCoverageWarnings > 0
      ? "stale"
      : legacyPresentDays.size > 0
        ? "fresh"
        : "unknown",
    confidence: input.truthState.legacyCoverageWarnings > 0 ? 60 : legacyPresentDays.size > 0 ? 100 : null,
    sampleCount: legacyPresentDays.size,
    lastSeenAtUtc: toUtcString(input.legacyLastSeenAtMs),
    passAllowed: input.truthState.legacyCoverageWarnings === 0,
    reason: input.truthState.legacyCoverageWarnings > 0
      ? `${input.truthState.legacyCoverageWarnings} legacy support source(s) are stale or missing.`
      : legacyPresentDays.size > 0
        ? `${legacyPresentDays.size} legacy-support day bucket(s) are available for cross-checking.`
        : "Legacy support did not contribute enough day-bucket evidence in this range.",
  };

  return {
    range: input.selectedRange,
    generatedAtUtc: toUtcString(input.generatedAtMs) ?? new Date(input.generatedAtMs).toISOString(),
    availability: {
      ga4,
      historicalSnapshot,
      legacySupport,
    },
    continuity: {
      expectedDays: expectedDays.length,
      presentDays: unionPresentDays.size,
      missingDays,
      recentGapDays,
      lastCompleteDayUtc: lastCompleteDay ? dayKeyToUtcIso(lastCompleteDay) : null,
      gapSeverity,
      gapReason,
    },
    sourceAgreement: {
      comparedSources,
      disagreementCount,
      maxDeltaPct,
      state: sourceAgreementState,
    },
    chartReadiness: {
      state: chartReadinessState,
      reason: chartReadinessReason,
    },
  } satisfies AnalyticsSourceHealth;
}

export function buildDataValidationPanelState(input: {
  validations?: DataValidationCheck[] | null;
  range?: string | null;
  cacheState?: "miss" | "fresh" | "stale" | null;
  lastValidatedAt?: number | null;
  generatedAtMs?: number | null;
  sourcePath?: string;
  loadError?: string | null;
}): DataValidationPanelState {
  const validations = Array.isArray(input.validations) ? input.validations : [];
  const range = input.range || validations[0]?.selectedRange || "30d";
  const sourcePath = input.sourcePath || "/admin/debug?tab=advanced#data-validation";
  const generatedAtUtc = toUtcString(input.generatedAtMs ?? null);
  const cacheState = generatedAtUtc ? normalizeCacheState(input.cacheState ?? null) : "not_loaded";

  if (input.loadError) {
    return {
      status: "failed",
      checkCount: null,
      failCount: null,
      warnCount: null,
      staleCount: null,
      blockedPassCount: null,
      range,
      cacheState,
      lastValidatedAtUtc: null,
      generatedAtUtc,
      sourcePath,
      loadError: input.loadError,
      nextAction: "Retry the validation route or inspect admin analytics historical route errors.",
    };
  }

  if (validations.length === 0) {
    return {
      status: "not_validated",
      checkCount: null,
      failCount: null,
      warnCount: null,
      staleCount: null,
      blockedPassCount: null,
      range,
      cacheState,
      lastValidatedAtUtc: null,
      generatedAtUtc,
      sourcePath,
      nextAction: "Validation has not run for this range yet.",
    };
  }

  const failCount = validations.filter((check) => check.status === "fail" || check.status === "unavailable").length;
  const warnCount = validations.filter((check) => check.status === "warn" || check.status === "unknown").length;
  const staleCount = validations.filter((check) => check.status === "stale" || check.freshnessState === "stale").length;
  const blockedPassCount = validations.filter((check) => check.passAllowed === false).length;
  const lastValidatedAt = maxValidationTimestamp(validations) || input.lastValidatedAt || 0;

  return {
    status: failCount > 0 ? "failed" : staleCount > 0 ? "stale" : "loaded",
    checkCount: validations.length,
    failCount,
    warnCount,
    staleCount,
    blockedPassCount,
    range,
    cacheState,
    lastValidatedAtUtc: toUtcString(lastValidatedAt),
    generatedAtUtc,
    sourcePath,
    nextAction: failCount > 0
      ? "Review failed validation rows before trusting analytics parity."
      : staleCount > 0 || warnCount > 0 || blockedPassCount > 0
        ? "Review warnings, stale checks, or blocked passes before treating validation as clean."
        : "No action required.",
  };
}

const VALIDATION_OPERATOR_COPY: Record<string, {
  pass: string;
  warn: string;
  fail: string;
  source: string;
  whyItMatters: string;
  action: string;
}> = {
  ga_property: {
    pass: "Google Analytics reports are available.",
    warn: "Google Analytics setup needs review.",
    fail: "Google Analytics setup is missing.",
    source: "Google Analytics setup",
    whyItMatters: "Audience totals depend on this connection.",
    action: "Check the Analytics setup if reports are unavailable.",
  },
  telemetry_depth: {
    pass: "Event samples are available for this range.",
    warn: "No event sample is available for this range.",
    fail: "Event samples are unavailable.",
    source: "Event samples",
    whyItMatters: "Samples help prove that tracked activity supports the displayed totals.",
    action: "Use Debug to check which event source is missing.",
  },
  task_lifecycle: {
    pass: "Task activity samples are available.",
    warn: "Task activity needs more verified samples.",
    fail: "Task activity samples are unavailable.",
    source: "Task activity",
    whyItMatters: "Task analytics need activity evidence before they should guide reward decisions.",
    action: "Check task events and task completion records.",
  },
  pipeline_health: {
    pass: "Analytics refresh checks have no recorded failures.",
    warn: "Analytics refresh checks need review.",
    fail: "Analytics refresh checks are failing.",
    source: "Refresh diagnostics",
    whyItMatters: "Refresh failures can delay new analytics snapshots.",
    action: "Open route diagnostics and inspect active refresh failures.",
  },
  purchase_parity: {
    pass: "Purchase tracking matches for this range.",
    warn: "Purchase tracking needs review.",
    fail: "Purchase tracking needs review.",
    source: "Purchase records",
    whyItMatters: "Revenue may be correct while purchase funnel analytics can undercount.",
    action: "Check purchase event emission after payment confirmation.",
  },
  unlock_parity: {
    pass: "Unlock tracking matches for this range.",
    warn: "Unlock tracking needs review.",
    fail: "Unlock tracking needs review.",
    source: "Unlock records",
    whyItMatters: "Unlock totals may be correct while unlock funnel analytics can undercount.",
    action: "Check unlock event emission after access is granted.",
  },
  onboarding_coverage: {
    pass: "Onboarding activity is verified for this range.",
    warn: "Onboarding activity needs more verified starts.",
    fail: "Onboarding activity is unavailable.",
    source: "Onboarding records",
    whyItMatters: "Start and completion evidence keeps onboarding performance truthful.",
    action: "Check onboarding start and completion records.",
  },
  task_guidance_parity: {
    pass: "Task guidance tracking is consistent.",
    warn: "Task guidance tracking needs review.",
    fail: "Task guidance tracking needs review.",
    source: "Task guidance records",
    whyItMatters: "Guidance analytics show whether task prompts are helping users finish.",
    action: "Check guide view, tap, and completion evidence.",
  },
  creator_spend_parity: {
    pass: "Creator spend checks are clear.",
    warn: "Creator spend needs more samples.",
    fail: "Creator spend needs review.",
    source: "Creator spend records",
    whyItMatters: "Creator spend checks protect reward balances and restricted funds.",
    action: "Review creator spend records for mismatches or restricted spend.",
  },
  historical_freshness: {
    pass: "Historical data is up to date for this range.",
    warn: "Showing last verified historical data.",
    fail: "Historical data needs review.",
    source: "Historical snapshot",
    whyItMatters: "Older or delayed sources can make trend decisions lag recent activity.",
    action: "Refresh analytics or inspect source freshness in Debug.",
  },
  legacy_history_coverage: {
    pass: "Older history support is available.",
    warn: "Older history support is incomplete.",
    fail: "Older history support is unavailable.",
    source: "History support",
    whyItMatters: "Older trend charts can miss activity when support data is incomplete.",
    action: "Refresh older history support before using long-range trends.",
  },
  module_coverage: {
    pass: "Analytics modules have verified data.",
    warn: "Some analytics modules do not have verified data yet.",
    fail: "Analytics module coverage needs review.",
    source: "Analytics modules",
    whyItMatters: "Module coverage explains whether every analytics section has enough evidence.",
    action: "Review partial or empty modules in Debug.",
  },
  viewer_drilldown: {
    pass: "Viewer activity samples are available.",
    warn: "Viewer activity is waiting for verified samples.",
    fail: "Viewer activity samples are unavailable.",
    source: "Viewer activity",
    whyItMatters: "Viewer samples support watch-time and content-engagement details.",
    action: "Confirm viewer activity is expected for this range.",
  },
  watch_capture_health: {
    pass: "Watch capture quality is verified.",
    warn: "Watch capture quality needs review.",
    fail: "Watch capture quality needs review.",
    source: "Watch capture records",
    whyItMatters: "Capture quality affects watch-time and viewer drilldown accuracy.",
    action: "Investigate watch sessions with missing close signals.",
  },
};

function statusFamily(status: DataValidationStatus): "pass" | "warn" | "fail" {
  if (status === "pass") return "pass";
  if (status === "fail" || status === "unavailable") return "fail";
  return "warn";
}

function validationCopyFor(checkKey: string, status: DataValidationStatus) {
  const copy = VALIDATION_OPERATOR_COPY[checkKey] ?? {
    pass: "Validation is clear.",
    warn: "Validation needs review.",
    fail: "Validation failed.",
    source: "Validation check",
    whyItMatters: "This check protects the dashboard from unsupported claims.",
    action: "Open Debug for the technical evidence.",
  };
  return {
    summary: copy[statusFamily(status)],
    source: copy.source,
    whyItMatters: copy.whyItMatters,
    action: copy.action,
  };
}

function buildValidationCheck(input: {
  checkKey: string;
  title: string;
  status: DataValidationStatus;
  detail: string;
  source: string;
  selectedRange: string;
  lastValidatedAt: number;
  freshnessState?: "fresh" | "stale" | "unknown";
  confidence?: number | null;
  requiredSourcesPresent?: boolean;
  sampleRequired?: boolean;
  sampleCount?: number;
  action: string;
  operatorSummary?: string;
  operatorDetail?: string;
  operatorSource?: string;
  whyItMatters?: string;
  recommendedNextCheck?: string;
  technicalEvidence?: string;
  sourceDetails?: string;
  eventSource?: string;
  sampleSource?: string;
  blockedReason?: string | null;
  failureClusters?: FailureCluster[];
  passAllowed?: boolean;
}) {
  const requiredSourcesPresent = input.requiredSourcesPresent ?? true;
  const sampleRequired = input.sampleRequired ?? false;
  const sampleCount = Math.max(0, Math.round(input.sampleCount ?? 0));
  const freshnessState = input.freshnessState ?? "fresh";
  const inferredBlockedReason = !requiredSourcesPresent
    ? "required_source_missing"
    : sampleRequired && sampleCount <= 0
      ? "required_sample_missing"
      : freshnessState === "stale"
        ? "stale_validation"
        : null;
  const passBlockedReason = input.blockedReason ?? inferredBlockedReason;
  const passAllowed = input.passAllowed ?? (passBlockedReason === null && input.status !== "fail" && input.status !== "unavailable");
  const status = input.status === "pass" && !passAllowed
    ? freshnessState === "stale" ? "stale" : "warn"
    : input.status;
  const operatorCopy = validationCopyFor(input.checkKey, status);
  const operatorSummary = input.operatorSummary || operatorCopy.summary;
  const technicalEvidence = input.technicalEvidence || input.detail;

  return {
    checkKey: input.checkKey,
    label: input.title,
    title: input.title,
    status,
    detail: input.operatorDetail || operatorSummary,
    operatorSummary,
    whyItMatters: input.whyItMatters || operatorCopy.whyItMatters,
    source: input.operatorSource || operatorCopy.source,
    sourceDetails: input.sourceDetails || input.source,
    selectedRange: input.selectedRange,
    lastValidatedAt: input.lastValidatedAt,
    freshnessState,
    confidence: input.confidence ?? null,
    requiredSourcesPresent,
    sampleRequired,
    sampleCount,
    passAllowed,
    passBlockedReason,
    action: input.recommendedNextCheck || operatorCopy.action || input.action,
    recommendedNextCheck: input.recommendedNextCheck || operatorCopy.action || input.action,
    technicalEvidence,
    fullDetails: input.detail,
    eventSource: input.eventSource,
    sampleSource: input.sampleSource,
    blockedReason: passBlockedReason ?? undefined,
    failureClusters: input.failureClusters,
  } satisfies DataValidationCheck;
}

export function buildHistoricalValidationSummary(input: {
  selectedRange?: string | null;
  lastValidatedAt?: number;
  propertyId: string;
  generatedAtMs?: number;
  gaEventCounts: Record<string, number>;
  telemetryEventCounts: Record<string, number>;
  canonicalEventCounts: Record<string, number>;
  gaPresentDayKeys: string[];
  snapshotPresentDayKeys: string[];
  legacyPresentDayKeys: string[];
  expectedDayKeys: string[];
  recentWindowDayKeys: string[];
  gaLastSeenAtMs: number;
  snapshotLastSeenAtMs: number;
  legacyLastSeenAtMs: number;
  taskPipeline: Array<{ label: string; count: number }>;
  normalizedTaskEventCount: number;
  firstPartyTaskLifecycleEvents: number;
  firstPartyPurchaseCount: number;
  firstPartyUnlockCount: number;
  completedPurchaseTransactionsCount: number;
  unlockTransactionsCount: number;
  guestInteractionCount: number;
  pageRollupViewCount: number;
  dropRollupActivityCount: number;
  viewerSessionFactCount: number;
  securityEventsCount: number;
  securityLogCount: number;
  guidedOnboardingCompletionCount: number;
  legacyOnboardingCompletionCount: number;
  normalizedOnboardingCompletions: number;
  onboardingStartCount: number;
  onboardingStartSource: string;
  taskGuidance: HistoricalTaskGuidanceSummary;
  firstPartyAuthenticatedEvents: number;
  canonicalSampleCount: number;
  telemetryParityEventSource: string;
  telemetryParitySampleSource: string;
  telemetryPurchaseCount: number;
  telemetryUnlockCount: number;
  viewerSessionCount: number;
  watchSessionCount: number;
  watchAssetCount: number;
  watchCaptureFullCount: number;
  watchCaptureDegradedCount: number;
  watchCaptureCloseMissingCount: number;
  watchCaptureReplayRecoveredCount: number;
  filteredSessionFactsLength: number;
  viewerSessionStartedLogsLength: number;
  pipelineFailureCount: number;
  pipelineFailureClusters: FailureCluster[];
  creatorSpendTransactionCount: number;
  creatorSpendParityMismatchCount: number;
  creatorRestrictedSpendViolationCount: number;
  truthState: AnalyticsTruthSummary;
}): HistoricalValidationSummary {
  const selectedRange = input.selectedRange || "30d";
  const lastValidatedAt = input.lastValidatedAt || Date.now();
  const moduleCoverage = TELEMETRY_MODULE_INDEXES.map((moduleIndex) => {
    const sources = [
      { key: "ga4", label: "GA4", count: sumEventCounts(input.gaEventCounts, moduleIndex.eventNames) },
      { key: "facts", label: "Event facts", count: sumEventCounts(input.canonicalEventCounts, moduleIndex.eventNames) },
      { key: "logs", label: "Telemetry logs", count: sumEventCounts(input.telemetryEventCounts, moduleIndex.eventNames) },
    ];

    if (moduleIndex.key === "navigation" || moduleIndex.key === "engagement") {
      sources.push({ key: "pages", label: "Page rollups", count: input.pageRollupViewCount });
    }
    if (moduleIndex.key === "engagement") {
      sources.push({ key: "guest", label: "Guest batches", count: input.guestInteractionCount });
    }
    if (moduleIndex.key === "tasks") {
      sources.push({ key: "task_events", label: "Task lifecycle", count: input.normalizedTaskEventCount || input.firstPartyTaskLifecycleEvents });
    }
    if (moduleIndex.key === "task_guidance") {
      sources.push({ key: "task_pipeline", label: "Task pipeline", count: sumCountBuckets(input.taskPipeline) });
    }
    if (moduleIndex.key === "commerce") {
      sources.push({ key: "transactions", label: "Transactions", count: input.completedPurchaseTransactionsCount + input.unlockTransactionsCount });
      sources.push({ key: "commerce_rollups", label: "Commerce rollups", count: input.firstPartyPurchaseCount + input.firstPartyUnlockCount });
    }
    if (moduleIndex.key === "content") {
      sources.push({ key: "drop_rollups", label: "Drop rollups", count: input.dropRollupActivityCount });
      sources.push({ key: "unlock_transactions", label: "Unlock transactions", count: input.unlockTransactionsCount });
    }
    if (moduleIndex.key === "viewer") {
      sources.push({ key: "watch_sessions", label: "Watch sessions", count: input.watchSessionCount });
      sources.push({ key: "watch_assets", label: "Watch assets", count: input.watchAssetCount });
      sources.push({ key: "session_facts", label: "Session facts", count: input.viewerSessionFactCount });
    }
    if (moduleIndex.key === "security") {
      sources.push({ key: "security_events", label: "Security logs", count: input.securityEventsCount });
      sources.push({ key: "flagged_users", label: "Flagged accounts", count: input.securityLogCount });
    }

    return buildModuleCoverageReport({
      key: moduleIndex.key,
      label: moduleIndex.label,
      sources,
      emptyDetail: `No indexed ${moduleIndex.label.toLowerCase()} signals landed in this range. Expected sources: ${moduleIndex.fallbackSources.join(", ")}.`,
    });
  });

  const unhealthyModules = moduleCoverage.filter((module) => module.status !== "healthy");
  const purchaseParity = buildParityInsight([
    { key: "transactions", label: "Transactions", count: input.completedPurchaseTransactionsCount },
    { key: "rollups", label: "Canonical rollups", count: input.firstPartyPurchaseCount },
    { key: "telemetry", label: "Telemetry", count: input.telemetryPurchaseCount },
  ]);
  const unlockParity = buildParityInsight([
    { key: "transactions", label: "Transactions", count: input.unlockTransactionsCount },
    { key: "rollups", label: "Canonical rollups", count: input.firstPartyUnlockCount },
    { key: "telemetry", label: "Telemetry", count: input.telemetryUnlockCount },
  ]);
  const onboardingParity = buildParityInsight([
    { key: "ga4", label: "GA4", count: input.guidedOnboardingCompletionCount + input.legacyOnboardingCompletionCount },
    { key: "facts", label: "Onboarding facts", count: input.normalizedOnboardingCompletions },
    { key: "starts", label: "Normalized starts", count: input.onboardingStartCount },
  ], { tolerance: 2, relativeTolerance: 0.25 });
  const taskGuidanceParity = buildParityInsight([
    { key: "views", label: "Guide views", count: input.taskGuidance.viewed },
    { key: "taps", label: "Guide taps", count: input.taskGuidance.tapped },
    { key: "wins", label: "Guide wins", count: input.taskGuidance.completed },
  ], { tolerance: 2, relativeTolerance: 0.35 });
  const creatorSpendParityScore = input.creatorSpendTransactionCount === 0
    ? 100
    : (input.creatorSpendParityMismatchCount > 0 || input.creatorRestrictedSpendViolationCount > 0)
      ? 20
      : 100;
  const analyticsSourceHealth = buildAnalyticsSourceHealth({
    selectedRange,
    generatedAtMs: input.generatedAtMs ?? lastValidatedAt,
    gaAvailable: Boolean(input.propertyId),
    gaConfidence: input.propertyId ? 100 : null,
    gaPresentDayKeys: input.gaPresentDayKeys,
    gaLastSeenAtMs: input.gaLastSeenAtMs,
    snapshotPresentDayKeys: input.snapshotPresentDayKeys,
    snapshotLastSeenAtMs: input.snapshotLastSeenAtMs,
    legacyPresentDayKeys: input.legacyPresentDayKeys,
    legacyLastSeenAtMs: input.legacyLastSeenAtMs,
    expectedDayKeys: input.expectedDayKeys,
    recentWindowDayKeys: input.recentWindowDayKeys,
    truthState: input.truthState,
  });
  const parityScore = Math.round((
    purchaseParity.score
    + unlockParity.score
    + onboardingParity.score
    + taskGuidanceParity.score
    + creatorSpendParityScore
    + input.truthState.score
  ) / 6);
  const telemetrySampleCoveragePct = input.firstPartyAuthenticatedEvents > 0
    ? Number(((input.canonicalSampleCount / input.firstPartyAuthenticatedEvents) * 100).toFixed(2))
    : 0;
  const telemetryParityStatus: TelemetryParityValidation["status"] =
    input.firstPartyAuthenticatedEvents > 0 && input.canonicalSampleCount === 0
      ? "fail"
      : input.firstPartyAuthenticatedEvents > 0 && telemetrySampleCoveragePct < 1
        ? "review"
        : input.firstPartyAuthenticatedEvents > 0
          ? "pass"
          : "review";
  const telemetryParityBlockedReason: TelemetryParityValidation["blockedReason"] =
    input.firstPartyAuthenticatedEvents > 0 && input.canonicalSampleCount === 0
      ? "required_sample_missing"
      : undefined;
  const telemetryParityValidation: TelemetryParityValidation = {
    range: selectedRange,
    generatedAtUtc: toUtcString(input.generatedAtMs ?? lastValidatedAt) ?? new Date(input.generatedAtMs ?? lastValidatedAt).toISOString(),
    canonicalAuthenticatedEventCount: input.firstPartyAuthenticatedEvents,
    canonicalSampleCount: input.canonicalSampleCount,
    sampleCoveragePct: telemetrySampleCoveragePct,
    sampleSource: input.telemetryParitySampleSource,
    eventSource: input.telemetryParityEventSource,
    status: telemetryParityStatus,
    blockedReason: telemetryParityBlockedReason,
    failureClusters: input.pipelineFailureClusters,
  };

  const validations = [
    buildValidationCheck({
      checkKey: "ga_property",
      title: "Google Analytics setup",
      status: input.propertyId ? "pass" : "fail",
      detail: input.propertyId ? "Google Analytics 4 reports loaded." : "GA property is missing.",
      source: "GA4 configuration",
      selectedRange,
      lastValidatedAt,
      requiredSourcesPresent: Boolean(input.propertyId),
      sampleRequired: false,
      action: input.propertyId ? "No action required." : "Configure the GA4 property before treating GA validation as available.",
    }),
    buildValidationCheck({
      checkKey: "telemetry_depth",
      title: "Telemetry depth",
      status: telemetryParityValidation.status === "pass" ? "pass" : telemetryParityValidation.status === "review" ? "warn" : "fail",
      detail: input.firstPartyAuthenticatedEvents > 0 || input.canonicalSampleCount > 0
        ? `${input.firstPartyAuthenticatedEvents.toLocaleString()} canonical authenticated events with ${input.canonicalSampleCount.toLocaleString()} canonical event samples in range. Coverage ${telemetryParityValidation.sampleCoveragePct}%.`
        : "No authenticated telemetry events matched the selected range.",
      source: "first-party telemetry + canonical event samples",
      selectedRange,
      lastValidatedAt,
      sampleRequired: true,
      sampleCount: input.canonicalSampleCount,
      confidence: input.firstPartyAuthenticatedEvents > 0 && input.canonicalSampleCount > 0
        ? Math.max(1, Math.min(100, Math.round(telemetryParityValidation.sampleCoveragePct)))
        : input.firstPartyAuthenticatedEvents > 0
          ? 60
          : null,
      requiredSourcesPresent: input.firstPartyAuthenticatedEvents > 0 || input.canonicalSampleCount > 0,
      passAllowed: telemetryParityValidation.status === "pass",
      blockedReason: telemetryParityValidation.blockedReason ?? null,
      action: telemetryParityValidation.status === "pass"
        ? "No action required."
        : "Confirm the canonical sample materializer/read path is using analytics_event_facts for the selected range.",
      eventSource: telemetryParityValidation.eventSource,
      sampleSource: telemetryParityValidation.sampleSource,
      sourceDetails: `${telemetryParityValidation.eventSource} -> ${telemetryParityValidation.sampleSource}`,
      technicalEvidence: telemetryParityValidation.blockedReason === "required_sample_missing"
        ? `${input.firstPartyAuthenticatedEvents.toLocaleString()} canonical authenticated events were counted from ${telemetryParityValidation.eventSource}, but ${telemetryParityValidation.sampleSource} returned 0 representative samples in range.`
        : `${input.canonicalSampleCount.toLocaleString()} canonical samples were observed from ${telemetryParityValidation.sampleSource}.`,
    }),
    buildValidationCheck({
      checkKey: "task_lifecycle",
      title: "Task lifecycle",
      status: (input.normalizedTaskEventCount > 0 && input.firstPartyTaskLifecycleEvents > 0) ? "pass" : "warn",
      detail: (input.normalizedTaskEventCount > 0 || input.firstPartyTaskLifecycleEvents > 0)
        ? `${input.firstPartyTaskLifecycleEvents.toLocaleString()} canonical task events with ${input.normalizedTaskEventCount.toLocaleString()} raw lifecycle log entries in range.`
        : "No task lifecycle events matched the selected range.",
      source: "task lifecycle logs + canonical task rollups",
      selectedRange,
      lastValidatedAt,
      sampleRequired: true,
      sampleCount: Math.min(input.normalizedTaskEventCount, input.firstPartyTaskLifecycleEvents),
      action: input.normalizedTaskEventCount > 0 && input.firstPartyTaskLifecycleEvents > 0 ? "No action required." : "Check task event ingestion and canonical task rollup freshness.",
    }),
    buildValidationCheck({
      checkKey: "pipeline_health",
      title: "Pipeline health",
      status: input.pipelineFailureCount === 0 ? "pass" : input.pipelineFailureCount <= 5 ? "warn" : "fail",
      detail: input.pipelineFailureCount === 0
        ? "No analytics pipeline failures were recorded in the selected range."
        : `${input.pipelineFailureCount.toLocaleString()} analytics pipeline failures were recorded in the selected range. Review route and reason clusters before trusting analytics refresh output.`,
      source: "analytics pipeline diagnostics",
      selectedRange,
      lastValidatedAt,
      sampleCount: input.pipelineFailureCount,
      confidence: input.pipelineFailureCount === 0 ? 100 : null,
      passAllowed: input.pipelineFailureCount === 0,
      blockedReason: input.pipelineFailureCount > 0 ? "analytics_refresh_failures_present" : null,
      action: input.pipelineFailureCount === 0 ? "No action required." : "Open Admin Debug route diagnostics and clear the top analytics refresh failure clusters.",
      failureClusters: input.pipelineFailureClusters,
      technicalEvidence: input.pipelineFailureCount === 0
        ? "No pipeline failure diagnostics were recorded for the selected range."
        : input.pipelineFailureClusters.length > 0
          ? input.pipelineFailureClusters.map((cluster) => `${cluster.reasonCode} (${cluster.count})${cluster.affectedRoute ? ` on ${cluster.affectedRoute}` : ""}`).join("; ")
          : "Pipeline failures were recorded, but no cluster details were derived.",
    }),
    buildValidationCheck({
      checkKey: "purchase_parity",
      title: "Purchase parity",
      status: purchaseParity.status,
      detail: `${input.completedPurchaseTransactionsCount.toLocaleString()} completed purchase transactions vs ${input.firstPartyPurchaseCount.toLocaleString()} canonical purchase rollups. Telemetry captured ${input.telemetryPurchaseCount.toLocaleString()} purchase events in the same range. Confidence ${purchaseParity.score}%.`,
      source: "transactions + commerce rollups + telemetry purchase events",
      selectedRange,
      lastValidatedAt,
      confidence: purchaseParity.score,
      sampleRequired: true,
      sampleCount: Math.min(input.completedPurchaseTransactionsCount, input.firstPartyPurchaseCount, input.telemetryPurchaseCount),
      action: purchaseParity.status === "pass" ? "No action required." : "Compare canonical payment/internal records against telemetry purchase events.",
    }),
    buildValidationCheck({
      checkKey: "unlock_parity",
      title: "Unlock parity",
      status: unlockParity.status,
      detail: `${input.unlockTransactionsCount.toLocaleString()} unlock transactions vs ${input.firstPartyUnlockCount.toLocaleString()} canonical unlock rollups. Telemetry captured ${input.telemetryUnlockCount.toLocaleString()} unlock events in the same range. Confidence ${unlockParity.score}%.`,
      source: "unlock transactions + commerce rollups + telemetry unlock events",
      selectedRange,
      lastValidatedAt,
      confidence: unlockParity.score,
      sampleRequired: true,
      sampleCount: Math.min(input.unlockTransactionsCount, input.firstPartyUnlockCount, input.telemetryUnlockCount),
      action: unlockParity.status === "pass" ? "No action required." : "Compare unlock transactions, rollups, and telemetry unlock events.",
    }),
    buildValidationCheck({
      checkKey: "onboarding_coverage",
      title: "Onboarding coverage",
      status: input.onboardingStartCount <= 0
        ? "warn"
        : input.normalizedOnboardingCompletions > 0 && input.onboardingStartSource === "completion_fallback" ? "warn" : "pass",
      detail: input.onboardingStartCount > 0
        ? input.onboardingStartSource === "tracked"
          ? `${input.onboardingStartCount.toLocaleString()} onboarding starts and ${input.normalizedOnboardingCompletions.toLocaleString()} completions were tracked directly. Confidence ${onboardingParity.score}%.`
          : `${input.normalizedOnboardingCompletions.toLocaleString()} onboarding completions were tracked, so the legacy start counter is falling back to completed sessions until more start events land. Confidence ${onboardingParity.score}%.`
        : "No onboarding activity matched the selected range.",
      source: "onboarding facts + GA4 onboarding events",
      selectedRange,
      lastValidatedAt,
      confidence: onboardingParity.score,
      sampleRequired: true,
      sampleCount: input.onboardingStartCount,
      action: input.onboardingStartCount > 0 ? "No action required." : "Confirm onboarding start events are landing before using onboarding coverage.",
    }),
    buildValidationCheck({
      checkKey: "task_guidance_parity",
      title: "Task guidance parity",
      status: input.taskGuidance.viewed === 0 && input.taskGuidance.tapped === 0 && input.taskGuidance.completed === 0
        ? "warn"
        : input.taskGuidance.completed <= input.taskGuidance.tapped && input.taskGuidance.tapped <= input.taskGuidance.viewed ? taskGuidanceParity.status : "warn",
      detail: `${input.taskGuidance.viewed.toLocaleString()} guide views, ${input.taskGuidance.dismissed.toLocaleString()} dismissals, ${input.taskGuidance.tapped.toLocaleString()} guide taps, and ${input.taskGuidance.completed.toLocaleString()} guided completions were collected in range. Confidence ${taskGuidanceParity.score}%.`,
      source: "task guidance telemetry",
      selectedRange,
      lastValidatedAt,
      confidence: taskGuidanceParity.score,
      sampleRequired: true,
      sampleCount: input.taskGuidance.viewed + input.taskGuidance.tapped + input.taskGuidance.completed,
      action: input.taskGuidance.viewed + input.taskGuidance.tapped + input.taskGuidance.completed > 0 ? "No action required." : "Confirm task guidance telemetry is expected for this range before treating parity as sampled.",
    }),
    buildValidationCheck({
      checkKey: "creator_spend_parity",
      title: "Creator spend parity",
      status: input.creatorSpendParityMismatchCount > 0 || input.creatorRestrictedSpendViolationCount > 0
        ? "fail"
        : input.creatorSpendTransactionCount > 0
          ? "pass"
          : "warn",
      detail: input.creatorSpendTransactionCount > 0
        ? `${input.creatorSpendTransactionCount.toLocaleString()} creator spend transaction(s) were sampled. ${input.creatorSpendParityMismatchCount.toLocaleString()} amount mismatches and ${input.creatorRestrictedSpendViolationCount.toLocaleString()} restricted reward-spend violations were detected. Confidence ${creatorSpendParityScore}%.`
        : "No creator spend transactions matched the selected range, so creator purchase/source parity could not be sampled in this window.",
      source: "creator spend transactions",
      selectedRange,
      lastValidatedAt,
      confidence: creatorSpendParityScore,
      sampleRequired: true,
      sampleCount: input.creatorSpendTransactionCount,
      action: input.creatorSpendTransactionCount > 0 ? "No action required." : "Use a range with creator spend records before treating creator spend parity as sampled.",
    }),
    buildValidationCheck({
      checkKey: "historical_snapshot_availability",
      title: "Historical snapshot",
      status: input.truthState.fail > 0
        ? "fail"
        : input.truthState.warn > 0
          ? "warn"
          : "pass",
      detail: input.truthState.fail > 0 || input.truthState.warn > 0
        ? `${input.truthState.fail.toLocaleString()} required analytics source(s) failed freshness and ${input.truthState.warn.toLocaleString()} source(s) are stale or partial. Truth score ${input.truthState.score}%.`
        : `All ${input.truthState.sources.length.toLocaleString()} sampled analytics source(s) are fresh enough for this window. Truth score ${input.truthState.score}%.`,
      source: "analytics truth source freshness",
      selectedRange,
      lastValidatedAt,
      confidence: input.truthState.score,
      requiredSourcesPresent: input.truthState.fail === 0,
      freshnessState: input.truthState.warn > 0 ? "stale" : "fresh",
      action: input.truthState.fail > 0 || input.truthState.warn > 0 ? "Refresh or repair stale analytics truth sources." : "No action required.",
    }),
    buildValidationCheck({
      checkKey: "legacy_support_availability",
      title: "History support",
      status: input.truthState.legacyCoverageWarnings > 0 ? "warn" : "pass",
      detail: input.truthState.legacyCoverageWarnings > 0
        ? `${input.truthState.legacyCoverageWarnings.toLocaleString()} legacy-history support source(s) are stale or missing, so older trend history may be incomplete until those rollups are refreshed.`
        : "Legacy-history support sources are present and fresh enough to contribute historical analytics truth.",
      source: "legacy historical support rollups",
      selectedRange,
      lastValidatedAt,
      sampleRequired: false,
      sampleCount: input.truthState.sources.length,
      action: input.truthState.legacyCoverageWarnings > 0 ? "Refresh legacy-history support rollups before trusting older trend history." : "No action required.",
    }),
    buildValidationCheck({
      checkKey: "daily_continuity_coverage",
      title: "Daily continuity coverage",
      status: summarizeContinuityStatus(analyticsSourceHealth.continuity, analyticsSourceHealth.chartReadiness),
      detail: analyticsSourceHealth.continuity.gapSeverity === "none"
        ? `${analyticsSourceHealth.continuity.presentDays.toLocaleString()} of ${analyticsSourceHealth.continuity.expectedDays.toLocaleString()} expected day buckets are backed by source evidence.`
        : `${analyticsSourceHealth.continuity.presentDays.toLocaleString()} of ${analyticsSourceHealth.continuity.expectedDays.toLocaleString()} expected day buckets are backed by source evidence. Missing days: ${analyticsSourceHealth.continuity.missingDays.join(", ")}.`,
      source: "GA4 + historical snapshot + legacy support day coverage",
      selectedRange,
      lastValidatedAt,
      confidence: analyticsSourceHealth.continuity.expectedDays > 0
        ? Math.round((analyticsSourceHealth.continuity.presentDays / analyticsSourceHealth.continuity.expectedDays) * 100)
        : null,
      requiredSourcesPresent: analyticsSourceHealth.continuity.missingDays.length === 0,
      sampleRequired: true,
      sampleCount: analyticsSourceHealth.continuity.presentDays,
      action: analyticsSourceHealth.continuity.gapSeverity === "none"
        ? "No action required."
        : "Inspect missing daily buckets before treating analytics charts as continuous.",
      operatorSummary: analyticsSourceHealth.continuity.gapSeverity === "none"
        ? "Daily continuity coverage is complete."
        : "Daily continuity coverage has missing buckets.",
      technicalEvidence: analyticsSourceHealth.continuity.gapReason,
    }),
    buildValidationCheck({
      checkKey: "recent_6_day_coverage",
      title: "Recent 6-day coverage",
      status: summarizeRecentWindowStatus(analyticsSourceHealth.continuity),
      detail: analyticsSourceHealth.continuity.recentGapDays.length === 0
        ? "The last six completed days have source-backed analytics buckets."
        : `Recent analytics continuity gap detected: missing daily buckets for ${analyticsSourceHealth.continuity.recentGapDays.join(", ")}.`,
      source: "recent day-bucket continuity",
      selectedRange,
      lastValidatedAt,
      confidence: analyticsSourceHealth.continuity.recentGapDays.length === 0 ? 100 : 25,
      requiredSourcesPresent: analyticsSourceHealth.continuity.recentGapDays.length === 0,
      sampleRequired: true,
      sampleCount: analyticsSourceHealth.continuity.recentGapDays.length === 0 ? input.recentWindowDayKeys.length : input.recentWindowDayKeys.length - analyticsSourceHealth.continuity.recentGapDays.length,
      action: analyticsSourceHealth.continuity.recentGapDays.length === 0
        ? "No action required."
        : "Review recent-day continuity before trusting the current trend line.",
      operatorSummary: analyticsSourceHealth.continuity.recentGapDays.length === 0
        ? "Recent coverage is complete."
        : "Recent coverage gap needs review.",
      technicalEvidence: analyticsSourceHealth.continuity.gapReason,
    }),
    buildValidationCheck({
      checkKey: "source_agreement_chart_readiness",
      title: "Source agreement / chart readiness",
      status: summarizeSourceAgreementStatus(analyticsSourceHealth.sourceAgreement) === "fail"
        ? "fail"
        : summarizeSourceAgreementStatus(analyticsSourceHealth.sourceAgreement) === "warn"
          ? "warn"
          : analyticsSourceHealth.chartReadiness.state === "ready"
            ? "pass"
            : analyticsSourceHealth.chartReadiness.state === "unavailable"
              ? "unavailable"
              : "warn",
      detail: `Chart readiness is ${analyticsSourceHealth.chartReadiness.state}. Source disagreement count ${analyticsSourceHealth.sourceAgreement.disagreementCount.toLocaleString()} across ${analyticsSourceHealth.sourceAgreement.comparedSources.join(", ")}.${analyticsSourceHealth.sourceAgreement.maxDeltaPct !== null ? ` Max day-coverage delta ${analyticsSourceHealth.sourceAgreement.maxDeltaPct}%.` : ""} ${analyticsSourceHealth.chartReadiness.reason}`,
      source: "source agreement + chart continuity",
      selectedRange,
      lastValidatedAt,
      confidence: analyticsSourceHealth.sourceAgreement.maxDeltaPct === null ? null : Math.max(0, 100 - analyticsSourceHealth.sourceAgreement.maxDeltaPct),
      requiredSourcesPresent: analyticsSourceHealth.chartReadiness.state === "ready",
      sampleRequired: true,
      sampleCount: analyticsSourceHealth.continuity.presentDays,
      action: analyticsSourceHealth.chartReadiness.state === "ready"
        ? "No action required."
        : "Review source agreement and missing buckets before trusting the chart as ready.",
      operatorSummary: analyticsSourceHealth.chartReadiness.state === "ready"
        ? "Chart readiness passed."
        : analyticsSourceHealth.chartReadiness.state === "gap_detected"
          ? "Chart readiness blocked by continuity gaps."
          : "Chart readiness needs review.",
      technicalEvidence: analyticsSourceHealth.chartReadiness.reason,
    }),
    buildValidationCheck({
      checkKey: "module_coverage",
      title: "Module coverage",
      status: unhealthyModules.length === 0 ? "pass" : unhealthyModules.length <= 3 ? "warn" : "fail",
      detail: unhealthyModules.length === 0
        ? `All ${moduleCoverage.length.toLocaleString()} indexed analytics modules are populated across the selected range. Parity score ${parityScore}%.`
        : `${unhealthyModules.length.toLocaleString()} of ${moduleCoverage.length.toLocaleString()} indexed analytics modules are partial or empty. Parity score ${parityScore}%.`,
      source: "indexed analytics module coverage",
      selectedRange,
      lastValidatedAt,
      confidence: parityScore,
      requiredSourcesPresent: unhealthyModules.length === 0,
      sampleRequired: true,
      sampleCount: moduleCoverage.length - unhealthyModules.length,
      action: unhealthyModules.length === 0 ? "No action required." : "Review partial or empty analytics modules in Debug before treating coverage as complete.",
    }),
    buildValidationCheck({
      checkKey: "viewer_drilldown",
      title: "Viewer drilldown",
      status: (input.watchSessionCount > 0 || input.filteredSessionFactsLength > 0 || input.viewerSessionStartedLogsLength > 0) ? "pass" : "warn",
      detail: (input.watchSessionCount > 0 || input.filteredSessionFactsLength > 0 || input.viewerSessionStartedLogsLength > 0)
        ? `${input.watchSessionCount.toLocaleString()} canonical watch sessions, ${input.watchAssetCount.toLocaleString()} watch assets, ${input.filteredSessionFactsLength.toLocaleString()} session facts, and ${input.viewerSessionStartedLogsLength.toLocaleString()} raw session-start events matched the selected range.`
        : "No viewer sessions matched the selected range and filter.",
      source: "watch sessions + session facts + raw viewer events",
      selectedRange,
      lastValidatedAt,
      sampleRequired: true,
      sampleCount: input.watchSessionCount + input.filteredSessionFactsLength + input.viewerSessionStartedLogsLength,
      action: input.watchSessionCount > 0 || input.filteredSessionFactsLength > 0 || input.viewerSessionStartedLogsLength > 0 ? "No action required." : "Confirm viewer watch events are landing for this range.",
    }),
    buildValidationCheck({
      checkKey: "watch_capture_health",
      title: "Watch capture health",
      status: input.watchSessionCount === 0
        ? "warn"
        : input.watchCaptureCloseMissingCount > 0
          ? "fail"
          : input.watchCaptureDegradedCount > 0
            ? "warn"
            : "pass",
      detail: input.watchSessionCount === 0
        ? "No canonical watch sessions matched the selected range, so capture quality could not be evaluated."
        : `${input.watchCaptureFullCount.toLocaleString()} full captures, ${input.watchCaptureDegradedCount.toLocaleString()} degraded captures, ${input.watchCaptureReplayRecoveredCount.toLocaleString()} replay-recovered sessions, and ${input.watchCaptureCloseMissingCount.toLocaleString()} close-missing sessions were recorded in the selected range.`,
      source: "watch capture records",
      selectedRange,
      lastValidatedAt,
      sampleRequired: true,
      sampleCount: input.watchSessionCount,
      action: input.watchSessionCount === 0 ? "Confirm watch session capture is expected for this range." : input.watchCaptureCloseMissingCount > 0 ? "Investigate close-missing watch sessions." : "No action required.",
    }),
  ];

  return {
    moduleCoverage,
    unhealthyModules,
    parityScore,
    truthState: input.truthState,
    validations,
    analyticsSourceHealth,
    telemetryParityValidation,
  };
}
