import "server-only";

import { TELEMETRY_MODULE_INDEXES } from "@/lib/telemetry-catalog";
import type { AnalyticsTruthSummary } from "@/lib/admin-analytics-truth";
import { classifyTaskOnboardingParity } from "@/lib/analytics/task-onboarding-parity-semantics";
import { buildTelemetryParityPassGate } from "@/lib/analytics/telemetry-parity-pass-gate";
import {
  buildModuleSourceMap,
  type AnalyticsModuleCoverageId,
  type AnalyticsModuleCoverageSourceType,
  type ModuleEvidenceByModule,
} from "@/lib/analytics/module-source-mapping-engine";
import { classifyViewerStartCoverage } from "@/lib/analytics/viewer-start-telemetry-contract";
import { classifyWatchCaptureQuality } from "@/lib/analytics/watch-capture-quality-contract";
import { classifyPurchaseTelemetryCoverage } from "@/lib/commerce/commerce-parity-contract";
import { reconcileCommerceRollups } from "@/lib/commerce/commerce-rollup-reconciliation";
import { classifyUnlockTelemetryCoverage } from "@/lib/commerce/unlock-watch-parity-contract";
import { reconcileUnlockRollups } from "@/lib/commerce/unlock-rollup-reconciliation";
import {
  TASK_GUIDANCE_EVENT_NAMES,
  TASK_GUIDANCE_IMPLEMENTED,
  TASK_GUIDANCE_REQUIRED_IN_BETA,
} from "@/lib/task-guidance";

import { buildModuleCoverageReport, buildParityInsight, sumCountBuckets } from "./analytics-parity";
import { sumEventCounts } from "./admin-analytics-shared";

export interface HistoricalTaskGuidanceSummary {
  viewed: number;
  dismissed: number;
  tapped: number;
  completed: number;
  guidanceViews?: number;
  guidanceTaps?: number;
  guidanceDismissals?: number;
  guidanceCompletions?: number;
  taskCardExpansions?: number;
  taskHelpOpens?: number;
}

export interface HistoricalValidationSummary {
  moduleCoverage: ReturnType<typeof buildModuleCoverageReport>[];
  unhealthyModules: ReturnType<typeof buildModuleCoverageReport>[];
  analyticsModuleCoverage: AnalyticsModuleCoverage;
  parityScore: number;
  truthState: AnalyticsTruthSummary;
  validations: DataValidationCheck[];
  analyticsSourceHealth: AnalyticsSourceHealth;
  telemetryParityValidation: TelemetryParityValidation;
}

type DataValidationStatus = "pass" | "warn" | "fail" | "unavailable" | "stale" | "unknown";
type DataValidationCacheState = "hit" | "miss" | "stale" | "unknown" | "not_loaded";
type AnalyticsSourceAgreementClassification =
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
  launchHistoryCoverage?: {
    rangeProof: {
      expectedRangeSource:
        | "all_range_historical_route"
        | "all_range_historical_export"
        | "admin_truth_sample"
        | "fixture_only_local_window"
        | "local_source_window"
        | "unknown";
      coverageWindowKind:
        | "all_range_historical_route"
        | "all_range_historical_export"
        | "admin_truth_sample"
        | "fixture_only_local_window"
        | "local_source_window"
        | "unknown";
      allLaunchRangeProven: boolean;
      reason: string;
    };
    rangeStartDayKey: string | null;
    rangeEndDayKey: string | null;
    firstRecoveredDayKey: string | null;
    lastRecoveredDayKey: string | null;
    expectedDayCount: number;
    recoveredDayCount: number;
    preLaunchIgnoredDayCount: number;
    sourceDayCounts: {
      firstParty: number;
      ga4: number;
      historicalSnapshot: number;
      legacySupport: number;
    };
    firstPartyCoverage: {
      state: "available" | "partial" | "source_missing";
      coveredDayCount: number;
      missingRanges: string[];
      canPromoteProductTruth: boolean;
      reason: string;
    };
    missingRanges: string[];
    duplicateRanges: string[];
    sourceOverlapRanges: string[];
    days: Array<{
      dayKey: string;
      expected: true;
      recovered: boolean;
      sourceCounts: {
        first_party: 0 | 1;
        ga4: 0 | 1;
        historicalSnapshot: 0 | 1;
        legacySupport: 0 | 1;
      };
      internalAdminExcludedCount: number | null;
      duplicateSourceCount: number;
      confidence: "verified" | "mixed" | "partial" | "fallback" | "unknown";
      reason: string;
      nextAction: string;
    }>;
    state: "available" | "partial" | "source_missing";
    reason: string;
  };
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
    failedSources: string[];
    comparedMetrics: string[];
    tolerance: string;
    confidence: number | null;
    disagreementCount: number;
    maxDeltaPct: number | null;
    state: "pass" | "review" | "failed" | "not_enough_sources";
    classifications: AnalyticsSourceAgreementClassification[];
    reason: string;
    nextAction: string;
  };
  chartReadiness: {
    state: "ready" | "partial" | "source_disagreement" | "gap_detected" | "unavailable";
    reason: string;
  };
}

function collapseDayRanges(days: string[]) {
  const sorted = [...new Set(days)].sort();
  const ranges: string[] = [];
  let start: string | null = null;
  let previous: string | null = null;

  const nextDay = (dayKey: string) => {
    const next = new Date(`${dayKey}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().slice(0, 10);
  };

  for (const dayKey of sorted) {
    if (!start) {
      start = dayKey;
      previous = dayKey;
      continue;
    }

    if (previous && dayKey === nextDay(previous)) {
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

function buildLaunchHistoryDayCoverage(input: {
  expectedDays: string[];
  gaPresentDays: Set<string>;
  firstPartyPresentDays: Set<string>;
  snapshotPresentDays: Set<string>;
  legacyPresentDays: Set<string>;
}) {
  return input.expectedDays.map((dayKey) => {
    const hasGa4 = input.gaPresentDays.has(dayKey);
    const hasFirstParty = input.firstPartyPresentDays.has(dayKey);
    const hasHistoricalSnapshot = input.snapshotPresentDays.has(dayKey);
    const hasLegacy = input.legacyPresentDays.has(dayKey);
    const hasFallback = hasHistoricalSnapshot || hasLegacy;
    const sourceCount = Number(hasFirstParty) + Number(hasGa4) + Number(hasHistoricalSnapshot) + Number(hasLegacy);
    const recovered = sourceCount > 0;
    const confidence: "verified" | "mixed" | "partial" | "fallback" | "unknown" = hasFirstParty && hasGa4 && !hasFallback
      ? "verified"
      : hasFirstParty && hasFallback
        ? "mixed"
        : hasFirstParty
          ? "partial"
          : hasGa4 || hasFallback
            ? "fallback"
            : "unknown";
    const reason = !recovered
      ? "No launch-history source bucket was found for this day."
      : hasFirstParty && hasGa4 && !hasFallback
        ? "First-party event-fact/day-bucket evidence and GA4 second-source evidence both cover this day."
      : hasFirstParty && hasGa4 && hasFallback
        ? "First-party and GA4 evidence cover this day, with fallback evidence also present; keep the fallback lane as corroborating evidence until dedupe review is complete."
      : hasFirstParty
          ? "First-party event-fact/day-bucket evidence covers this day; second-source agreement is incomplete."
        : hasHistoricalSnapshot
          ? "Historical snapshot covers this day as support evidence; first-party product truth is still required."
          : hasGa4
            ? "GA4 covers this day as external evidence only; first-party truth is still required for identity, purchase, unlock, watch, and creator metrics."
            : "Legacy support covers this day as fallback evidence only.";
    const nextAction = !recovered
      ? "Recover a first-party daily snapshot or keep this day marked source missing."
      : hasFirstParty
        ? "Use first-party truth for product metrics and compare GA4 only as second-source evidence."
        : "Require first-party materialization before treating this day as canonical product truth.";

    return {
      dayKey,
      expected: true as const,
      recovered,
      sourceCounts: {
        first_party: hasFirstParty ? 1 as const : 0 as const,
        ga4: hasGa4 ? 1 as const : 0 as const,
        historicalSnapshot: hasHistoricalSnapshot ? 1 as const : 0 as const,
        legacySupport: hasLegacy ? 1 as const : 0 as const,
      },
      internalAdminExcludedCount: null,
      duplicateSourceCount: Math.max(0, sourceCount - 1),
      confidence,
      reason,
      nextAction,
    };
  });
}

function classifySourceAgreementDisagreements(input: {
  expectedDays: string[];
  gaPresentDays: Set<string>;
  firstPartyPresentDays: Set<string>;
  snapshotPresentDays: Set<string>;
  legacyPresentDays: Set<string>;
  activeSourceCount: number;
  disagreementCount: number;
  maxDeltaPct: number | null;
}): NonNullable<AnalyticsSourceHealth["sourceAgreement"]["classifications"]> {
  const classifications = new Set<NonNullable<AnalyticsSourceHealth["sourceAgreement"]["classifications"]>[number]>();

  if (input.activeSourceCount < 2) {
    classifications.add("not_enough_sources");
    return [...classifications];
  }

  if (input.disagreementCount > 0 || (input.maxDeltaPct ?? 0) > 10) {
    classifications.add("date_range_mismatch");
  }

  for (const dayKey of input.expectedDays) {
    const hasGa4 = input.gaPresentDays.has(dayKey);
    const hasFirstParty = input.firstPartyPresentDays.has(dayKey);
    const hasHistoricalSnapshot = input.snapshotPresentDays.has(dayKey);
    const hasLegacy = input.legacyPresentDays.has(dayKey);

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

    if (!hasFirstParty && Number(hasGa4) + Number(hasHistoricalSnapshot) + Number(hasLegacy) > 1) {
      classifications.add("duplicate_event");
    }
  }

  return [...classifications];
}

function hasBlockingSourceCoverageMismatch(input: {
  hasGa4: boolean;
  hasFirstParty: boolean;
  hasHistoricalSnapshot: boolean;
  hasLegacy: boolean;
}) {
  const hasAnySource = input.hasGa4 || input.hasFirstParty || input.hasHistoricalSnapshot || input.hasLegacy;
  if (!hasAnySource) return false;
  return !input.hasFirstParty || !input.hasGa4;
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
  implemented?: boolean;
  required?: boolean;
  eventNames?: string[];
  moduleCoverage?: AnalyticsModuleCoverage;
}

export interface FailureCluster {
  source: string;
  reasonCode: string;
  count: number;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  affectedRoute?: string;
  severity?: "info" | "warning" | "error" | "blocking";
  current?: boolean;
  routeAttribution?: "known" | "unknown" | "inferred" | "missing";
  likelyOwner?: string;
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
  blockedReason?: "required_sample_missing" | "materializer_failed" | "range_mismatch" | "source_mismatch" | "analytics_refresh_failures_present" | "low_confidence" | "route_unknown_diagnostics" | "ingest_identified_failures" | "unknown";
  failureClusters: FailureCluster[];
}

export interface AnalyticsModuleCoverageItem {
  moduleId: string;
  moduleLabel: string;
  status: "verified" | "partial" | "empty" | "stale" | "failed" | "optional";
  severity: "info" | "review" | "error";
  requiredForBeta: boolean;
  sourceCount: number;
  expectedSources: string[];
  requiredSources: string[];
  acceptedSubstituteSources: string[];
  optionalSources: string[];
  externalEvidenceOnlySources: string[];
  internalCanonicalSources: string[];
  presentSources: string[];
  presentAcceptedSources: string[];
  missingSources: string[];
  missingRequiredSources: string[];
  missingOptionalSources: string[];
  missingExternalOnlySources: string[];
  sampleCount: number;
  evidenceSamples: number;
  lastSeenAtUtc: string | null;
  dependentPanels: string[];
  validators: string[];
  nextValidator: string;
  nextAction: string;
  blockedReason?: string;
  coverageWeight?: number;
  scoreContribution?: number;
  passPolicy?: string;
  blockPolicy?: string;
}

export interface AnalyticsModuleCoverage {
  range: string;
  generatedAtUtc: string;
  totalModules: number;
  requiredModules: number;
  optionalModules: number;
  verifiedModules: number;
  partialModules: number;
  emptyModules: number;
  verifiedRequired: number;
  partialRequired: number;
  emptyRequired: number;
  verifiedOptional: number;
  partialOptional: number;
  emptyOptional: number;
  requiredGaps: number;
  optionalGaps: number;
  requiredGapModules: string[];
  optionalGapModules: string[];
  sampledModules: number;
  evidenceSamples: number;
  parityScore: number;
  optionalParityScore: number;
  parityScoreFormula: string;
  passAllowed: boolean;
  blockedReason?: "required_source_missing" | "module_empty" | "module_partial" | "unknown" | string;
  modules: AnalyticsModuleCoverageItem[];
}

export interface CommerceParityCheck {
  range: string;
  generatedAtUtc: string;
  revenueTruth: {
    completedTransactions: number;
    canonicalPurchaseRollups: number;
    mismatchReason: string;
    comparableUnitsStatus: string;
    dateWindowStatus: string;
    state: "pass" | "review" | "fail";
    confidence: number;
    technicalEvidence: string;
    nextAction: string;
  };
  funnelTelemetryTruth: {
    purchaseTelemetryEvents: number;
    expectedPurchaseEvents: number;
    missingPurchaseTelemetryCount: number;
    coveragePct: number;
    state: "pass" | "review" | "fail";
    passAllowed: boolean;
    blockedReason?: "purchase_telemetry_undercount" | "missing_server_purchase_event" | "unknown";
  };
  creatorSpendTruth: {
    sampledTransactions: number;
    amountMismatches: number;
    restrictedRewardSpendViolations: number;
    state: "pass" | "review" | "fail";
  };
}

export interface UnlockWatchParity {
  range: string;
  generatedAtUtc: string;
  unlockAccessTruth: {
    unlockTransactions: number;
    canonicalUnlockRollups: number;
    delta: number;
    mismatchReason: string;
    comparableUnitsStatus: string;
    dateWindowStatus: string;
    confidence: number;
    technicalEvidence: string;
    nextAction: string;
    state: "pass" | "review" | "fail";
  };
  unlockFunnelTelemetry: {
    unlockTelemetryEvents: number;
    expectedUnlockEvents: number;
    missingUnlockTelemetryCount: number;
    coveragePct: number;
    state: "pass" | "review" | "fail";
    passAllowed: boolean;
    blockedReason?: "required_sample_missing" | "unlock_telemetry_undercount" | "missing_server_unlock_telemetry";
  };
  viewerActivityTruth: {
    watchSessions: number;
    watchAssets: number;
    sessionFacts: number;
    rawSessionStartEvents: number;
    rawStartRequired: boolean;
    passAllowed: boolean;
    blockedReason?: "viewer_start_missing";
    nextAction: string;
    state: "pass" | "review" | "fail";
  };
  watchCaptureQuality: {
    fullCaptures: number;
    degradedCaptures: number;
    replayRecoveredSessions: number;
    closeMissingSessions: number;
    replayRecoveryRate: number;
    degradedCaptureRate: number;
    missingCloseoutRate: number;
    confidence: number;
    passAllowed: boolean;
    blockedReason?: "replay_recovery_rate_high" | "closeout_missing" | "degraded_capture_present";
    nextAction: string;
    state: "pass" | "review" | "fail";
  };
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

function normalizeCacheState(cacheState?: "miss" | "fresh" | "refresh_due" | "stale" | null): DataValidationCacheState {
  if (cacheState === "fresh") return "hit";
  if (cacheState === "miss") return "miss";
  if (cacheState === "refresh_due") return "stale";
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
  firstPartyPresentDayKeys?: string[];
  snapshotPresentDayKeys: string[];
  snapshotLastSeenAtMs: number;
  legacyPresentDayKeys: string[];
  legacyLastSeenAtMs: number;
  expectedDayKeys: string[];
  recentWindowDayKeys: string[];
  truthState: AnalyticsTruthSummary;
}) {
  const gaPresentDays = new Set(input.gaPresentDayKeys);
  const firstPartyPresentDayKeys = input.firstPartyPresentDayKeys ?? input.snapshotPresentDayKeys;
  const firstPartyPresentDays = new Set(firstPartyPresentDayKeys);
  const snapshotPresentDays = new Set(input.snapshotPresentDayKeys);
  const legacyPresentDays = new Set(input.legacyPresentDayKeys);
  const rawExpectedDays = input.expectedDayKeys.filter(Boolean);
  const rawExpectedDaySet = new Set(rawExpectedDays);
  const observedExpectedDays = Array.from(new Set([
    ...firstPartyPresentDayKeys,
    ...input.gaPresentDayKeys,
    ...input.snapshotPresentDayKeys,
    ...input.legacyPresentDayKeys,
  ].filter((dayKey) => rawExpectedDaySet.has(dayKey)))).sort();
  const firstRecoveredDayKey = observedExpectedDays[0] ?? null;
  const allRangeLaunchScoped = input.selectedRange === "all" && Boolean(firstRecoveredDayKey);
  const expectedDays = allRangeLaunchScoped
    ? rawExpectedDays.filter((dayKey) => dayKey >= (firstRecoveredDayKey as string))
    : rawExpectedDays;
  const preLaunchIgnoredDayCount = Math.max(0, rawExpectedDays.length - expectedDays.length);
  const launchStartBoundaryProven = input.selectedRange !== "all" || preLaunchIgnoredDayCount === 0;
  const expectedDaySet = new Set(expectedDays);
  const unionPresentDays = new Set<string>(observedExpectedDays.filter((dayKey) => expectedDaySet.has(dayKey)));

  const missingDays = expectedDays.filter((dayKey) => !unionPresentDays.has(dayKey));
  const firstPartyExpectedDayCount = expectedDays.filter((dayKey) => firstPartyPresentDays.has(dayKey)).length;
  const firstPartyMissingDays = expectedDays.filter((dayKey) => !firstPartyPresentDays.has(dayKey));
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

  const comparedSources = ["first_party", "ga4", "historical_snapshot", "legacy_support"];
  const coverageBySource = [
    { key: "first_party", days: firstPartyPresentDays.size },
    { key: "ga4", days: gaPresentDays.size },
    { key: "historical_snapshot", days: snapshotPresentDays.size },
    { key: "legacy_support", days: legacyPresentDays.size },
  ];
  const activeCoverage = coverageBySource.filter((entry) => entry.days > 0);
  const disagreementCount = expectedDays.filter((dayKey) => hasBlockingSourceCoverageMismatch({
    hasFirstParty: firstPartyPresentDays.has(dayKey),
    hasGa4: gaPresentDays.has(dayKey),
    hasHistoricalSnapshot: snapshotPresentDays.has(dayKey),
    hasLegacy: legacyPresentDays.has(dayKey),
  })).length;
  const primarySecondSourceCoverage = activeCoverage.filter((entry) => entry.key === "first_party" || entry.key === "ga4");
  const deltaCoverage = primarySecondSourceCoverage.length >= 2 ? primarySecondSourceCoverage : activeCoverage;
  const maxCoverage = deltaCoverage.length > 0 ? Math.max(...deltaCoverage.map((entry) => entry.days)) : 0;
  const minCoverage = deltaCoverage.length > 0 ? Math.min(...deltaCoverage.map((entry) => entry.days)) : 0;
  const maxDeltaPct = deltaCoverage.length > 1 && maxCoverage > 0
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
  const sourceAgreementClassifications = classifySourceAgreementDisagreements({
    expectedDays,
    gaPresentDays,
    firstPartyPresentDays,
    snapshotPresentDays,
    legacyPresentDays,
    activeSourceCount: activeCoverage.length,
    disagreementCount,
    maxDeltaPct,
  });
  const chartReadinessState: AnalyticsSourceHealth["chartReadiness"]["state"] =
    expectedDays.length === 0
      ? "unavailable"
      : input.selectedRange === "all" && !launchStartBoundaryProven
        ? "partial"
      : recentGapDays.length > 0
        ? "gap_detected"
        : sourceAgreementState === "failed"
          ? "source_disagreement"
          : missingDays.length > 0 || sourceAgreementState === "review" || sourceAgreementState === "not_enough_sources"
          ? "partial"
          : "ready";
  const chartReadinessReason =
    chartReadinessState === "gap_detected"
      ? gapReason
      : input.selectedRange === "all" && !launchStartBoundaryProven
        ? "All-time historical route evidence starts at the first recovered source day. Attach launch-start proof or an approved all-launch export before treating this as complete launch history."
      : chartReadinessState === "source_disagreement"
        ? "Chart buckets are available, but source agreement failed across first-party, GA4, historical snapshot, and legacy support. Do not treat this chart as canonical until source agreement is resolved."
      : chartReadinessState === "partial"
        ? sourceAgreementState === "review" || sourceAgreementState === "not_enough_sources"
          ? "Historical snapshot is fresh enough to load, but source agreement needs review before the chart is canonical."
          : "Historical snapshot is fresh enough to load, but chart continuity still needs review."
        : chartReadinessState === "unavailable"
          ? "No day-bucket evidence was available for the selected range."
          : "Availability, continuity, and source agreement checks passed for the selected chart range.";
  const lastRecoveredDayKey = observedExpectedDays[observedExpectedDays.length - 1] ?? null;
  const firstPartyCoverageState: NonNullable<AnalyticsSourceHealth["launchHistoryCoverage"]>["firstPartyCoverage"]["state"] =
    expectedDays.length === 0 || firstPartyExpectedDayCount === 0
      ? "source_missing"
      : firstPartyMissingDays.length === 0
        ? "available"
        : "partial";
  const launchHistoryDays = buildLaunchHistoryDayCoverage({
    expectedDays,
    gaPresentDays,
    firstPartyPresentDays,
    snapshotPresentDays,
    legacyPresentDays,
  });
  const duplicateRangeDays = launchHistoryDays
    .filter((day) => day.duplicateSourceCount > 0)
    .map((day) => day.dayKey);
  const launchHistoryCoverage: AnalyticsSourceHealth["launchHistoryCoverage"] = input.selectedRange === "all"
    ? {
        rangeProof: {
          expectedRangeSource: "all_range_historical_route",
          coverageWindowKind: "all_range_historical_route",
          allLaunchRangeProven:
            launchStartBoundaryProven &&
            unionPresentDays.size > 0 &&
            missingDays.length === 0 &&
            firstPartyCoverageState === "available" &&
            sourceAgreementState === "pass",
          reason:
            !launchStartBoundaryProven
              ? `All-time historical route coverage starts at the first recovered source day (${firstRecoveredDayKey}); ${preLaunchIgnoredDayCount} earlier expected day(s) still need launch-start proof or an approved all-launch export.`
              : unionPresentDays.size > 0 &&
                missingDays.length === 0 &&
                firstPartyCoverageState === "available" &&
                sourceAgreementState === "pass"
                ? "All-time historical route coverage is bounded by recovered first-party days and source agreement passed."
                : "All-time historical route coverage is not product-truth complete until first-party coverage is available and source agreement passes.",
        },
        rangeStartDayKey: expectedDays[0] ?? null,
        rangeEndDayKey: expectedDays[expectedDays.length - 1] ?? null,
        firstRecoveredDayKey,
        lastRecoveredDayKey,
        expectedDayCount: expectedDays.length,
        recoveredDayCount: unionPresentDays.size,
        preLaunchIgnoredDayCount,
        sourceDayCounts: {
          firstParty: firstPartyPresentDayKeys.filter((dayKey) => expectedDaySet.has(dayKey)).length,
          ga4: input.gaPresentDayKeys.filter((dayKey) => expectedDaySet.has(dayKey)).length,
          historicalSnapshot: input.snapshotPresentDayKeys.filter((dayKey) => expectedDaySet.has(dayKey)).length,
          legacySupport: input.legacyPresentDayKeys.filter((dayKey) => expectedDaySet.has(dayKey)).length,
        },
        firstPartyCoverage: {
          state: firstPartyCoverageState,
          coveredDayCount: firstPartyExpectedDayCount,
          missingRanges: collapseDayRanges(firstPartyMissingDays),
          canPromoteProductTruth: launchStartBoundaryProven && firstPartyCoverageState === "available" && sourceAgreementState === "pass",
          reason: firstPartyCoverageState === "available"
            ? "First-party product truth covers every recovered launch-history day."
            : "First-party product truth is missing for at least one launch-history day; GA4, historical snapshots, and legacy support remain evidence-only.",
        },
        missingRanges: collapseDayRanges(missingDays),
        duplicateRanges: [],
        sourceOverlapRanges: collapseDayRanges(duplicateRangeDays),
        days: launchHistoryDays,
        state: unionPresentDays.size === 0
          ? "source_missing"
          : missingDays.length === 0
            ? "available"
            : "partial",
        reason: unionPresentDays.size === 0
          ? "No launch-history source evidence was observed for the all-time range."
          : allRangeLaunchScoped
            ? `All-time continuity starts at the first recovered source day (${firstRecoveredDayKey}); pre-launch days are not counted as missing analytics.`
            : "All-time continuity uses the configured range because no earlier launch-history source boundary was needed.",
      }
    : undefined;

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
    ...(launchHistoryCoverage ? { launchHistoryCoverage } : {}),
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
      failedSources: sourceAgreementState === "failed"
        ? comparedSources
        : [],
      comparedMetrics: ["day_bucket_presence", "coverage_delta_pct"],
      tolerance: "10% day coverage delta triggers review; 25% day coverage delta or repeated disagreement fails.",
      confidence: maxDeltaPct === null ? null : Math.max(0, 100 - maxDeltaPct),
      disagreementCount,
      maxDeltaPct,
      state: sourceAgreementState,
      classifications: sourceAgreementClassifications,
      reason: sourceAgreementState === "failed"
        ? "First-party, GA4, historical snapshot, and legacy support do not agree for the selected range."
        : sourceAgreementState === "review"
          ? "Compared sources have limited disagreement and need review before parity promotion."
          : sourceAgreementState === "not_enough_sources"
            ? "Not enough source lanes are present to prove source agreement."
            : "Compared sources agree inside tolerance.",
      nextAction: sourceAgreementState === "failed"
        ? "Inspect source agreement rows and repair the stale or missing source lane before promoting analytics parity."
        : sourceAgreementState === "review" || sourceAgreementState === "not_enough_sources"
          ? "Collect matching source evidence before marking source agreement clean."
          : "No action required.",
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
  cacheState?: "miss" | "fresh" | "refresh_due" | "stale" | null;
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
    pass: "Google Analytics setup reports are reachable; chart data still requires loaded samples.",
    warn: "Google Analytics setup needs review.",
    fail: "Google Analytics setup is missing.",
    source: "Google Analytics setup",
    whyItMatters: "Audience totals depend on this connection.",
    action: "Check the Analytics setup if reports are unavailable.",
  },
  telemetry_depth: {
    pass: "Event samples are available for this range.",
    warn: "Event samples need confidence or refresh-diagnostic review.",
    fail: "Event sample parity is blocked.",
    source: "Event samples",
    whyItMatters: "Samples help prove that tracked activity supports the displayed totals.",
    action: "Review event sample confidence and refresh diagnostics before promoting telemetry parity.",
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
  purchase_revenue_truth: {
    pass: "Purchase revenue truth matches for this range.",
    warn: "Purchase revenue truth needs review.",
    fail: "Purchase revenue truth needs review.",
    source: "Revenue ledger",
    whyItMatters: "Transactions and canonical commerce rollups must agree before revenue is treated as settled truth.",
    action: "Compare completed purchase transactions against canonical purchase rollups.",
  },
  purchase_funnel_telemetry: {
    pass: "Purchase funnel telemetry matches completed purchases for this range.",
    warn: "Purchase funnel telemetry needs review.",
    fail: "Purchase funnel telemetry is undercounting completed purchases.",
    source: "Purchase funnel telemetry",
    whyItMatters: "Revenue may be correct while conversion analytics, attribution, and value scoring undercount paid behavior.",
    action: "Check canonical server purchase telemetry after PayPal capture confirmation.",
  },
  unlock_access_truth: {
    pass: "Unlock access truth matches for this range.",
    warn: "Unlock access truth needs review.",
    fail: "Unlock access truth is mismatched.",
    source: "Unlock access truth",
    whyItMatters: "Unlock transactions and canonical unlock rollups must agree before access reporting is treated as settled truth.",
    action: "Compare unlock transactions against canonical unlock rollups and show the delta explicitly.",
  },
  unlock_funnel_telemetry: {
    pass: "Unlock funnel telemetry matches successful unlock access for this range.",
    warn: "Unlock funnel telemetry needs review.",
    fail: "Unlock funnel telemetry is missing or undercounting successful unlock access.",
    source: "Unlock funnel telemetry",
    whyItMatters: "Access can succeed while funnel analytics, attribution, and behavioral scoring still miss the unlock step.",
    action: "Verify the drops/unlock server event emission path and canonical unlock normalization.",
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
  viewer_activity_truth: {
    pass: "Viewer activity truth is available.",
    warn: "Viewer activity truth needs review.",
    fail: "Viewer activity truth is incomplete.",
    source: "Viewer activity truth",
    whyItMatters: "Canonical watch sessions can exist while raw viewer-start funnel context is still missing.",
    action: "Confirm raw viewer start telemetry policy and restore start-event visibility if it is required.",
  },
  watch_capture_quality: {
    pass: "Watch capture quality is verified.",
    warn: "Watch capture quality needs review.",
    fail: "Watch capture quality needs review.",
    source: "Watch capture quality",
    whyItMatters: "Canonical watch truth can still degrade if replay recovery or degraded capture becomes the dominant path.",
    action: "Investigate degraded or replay-recovered watch capture before trusting viewer funnel detail.",
  },
};

const MODULE_COVERAGE_METADATA: Record<string, {
  requiredForBeta: boolean;
  dependentPanels: string[];
  nextValidator: string;
  nextAction: string;
}> = {
  auth: {
    requiredForBeta: true,
    dependentPanels: ["Telemetry parity", "Analytics source health", "Admin analytics overview"],
    nextValidator: "check:telemetry-identified-parity",
    nextAction: "Verify authenticated telemetry parity and route/session attribution for auth flows.",
  },
  onboarding: {
    requiredForBeta: true,
    dependentPanels: ["Onboarding/task parity", "Audience snapshot", "User behavior scoring"],
    nextValidator: "check:event-fact-truth",
    nextAction: "Verify onboarding event facts and completion/start source agreement.",
  },
  navigation: {
    requiredForBeta: true,
    dependentPanels: ["Telemetry parity", "Analytics source health", "Admin analytics overview"],
    nextValidator: "check:telemetry-identified-parity",
    nextAction: "Verify page/navigation telemetry continuity before trusting surface traffic coverage.",
  },
  notifications: {
    requiredForBeta: true,
    dependentPanels: ["Recent event flow", "Return loop", "Behavioral intelligence"],
    nextValidator: "check:telemetry-identified-parity",
    nextAction: "Verify notification system vs user-action telemetry and missing ownership context.",
  },
  tasks: {
    requiredForBeta: true,
    dependentPanels: ["Onboarding/task parity", "Recent task activity sample", "Task rollups"],
    nextValidator: "check:daily-task-telemetry-truth",
    nextAction: "Check task lifecycle logs, rollups, and canonical task event coverage.",
  },
  task_guidance: {
    requiredForBeta: true,
    dependentPanels: ["Onboarding/task parity", "Task completion guidance", "Behavioral intelligence"],
    nextValidator: "check:daily-task-telemetry-truth",
    nextAction: "Check task guidance view/tap/dismiss/completion telemetry and source component coverage.",
  },
  commerce: {
    requiredForBeta: true,
    dependentPanels: ["Commerce parity", "Recent receipts / dedupe sample", "User value score"],
    nextValidator: "check:purchase-telemetry-truth",
    nextAction: "Check canonical server purchase telemetry after PayPal capture and purchase alias normalization.",
  },
  content: {
    requiredForBeta: true,
    dependentPanels: ["Unlock/watch parity", "Drop performance", "Behavioral intelligence"],
    nextValidator: "check:unlock-telemetry-truth",
    nextAction: "Check drops/unlock server event emission and unlock alias normalization.",
  },
  viewer: {
    requiredForBeta: true,
    dependentPanels: ["Unlock/watch parity", "Watch-time", "Recommendations"],
    nextValidator: "check:watch-time-truth-v2",
    nextAction: "Check viewer_session_started/watch session coverage and raw-to-canonical watch reconstruction.",
  },
  creator: {
    requiredForBeta: false,
    dependentPanels: ["Creator lane", "Creator dashboard", "Creator performance"],
    nextValidator: "check:admin-analytics-overview",
    nextAction: "Check creator telemetry sources and dependent creator analytics panels.",
  },
  engagement: {
    requiredForBeta: true,
    dependentPanels: ["Analytics source health", "Audience snapshot", "Behavioral intelligence"],
    nextValidator: "check:analytics:continuity",
    nextAction: "Check engagement day coverage and whether missing buckets are being surfaced as continuity gaps.",
  },
  admin: {
    requiredForBeta: false,
    dependentPanels: ["Admin debug control tower", "Admin AI diagnostics", "Ops health"],
    nextValidator: "check:admin-debug-control-tower",
    nextAction: "Check admin-only telemetry and diagnostics routes before treating the module as verified.",
  },
  runtime: {
    requiredForBeta: false,
    dependentPanels: ["Analytics source health", "Refresh diagnostics", "Ops health"],
    nextValidator: "check:admin-debug-control-tower",
    nextAction: "Check runtime diagnostics and pipeline-health sources for missing route evidence.",
  },
  security: {
    requiredForBeta: false,
    dependentPanels: ["Security logs", "Moderation evidence", "Admin debug control tower"],
    nextValidator: "check:admin-debug-control-tower",
    nextAction: "Check security event and flagged-account sources before treating the module as verified.",
  },
};

function resolveModuleCoverageSeverity(status: "verified" | "partial" | "empty" | "stale" | "failed" | "optional", requiredForBeta: boolean) {
  if (!requiredForBeta) {
    return status === "empty" ? "info" : status === "verified" || status === "optional" ? "info" : "review";
  }
  if (status === "empty" || status === "failed") return "error" as const;
  if (status === "partial" || status === "stale") return "review" as const;
  return "info" as const;
}

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
  implemented?: boolean;
  required?: boolean;
  eventNames?: string[];
  moduleCoverage?: AnalyticsModuleCoverage;
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
    action: input.recommendedNextCheck || input.action || operatorCopy.action,
    recommendedNextCheck: input.recommendedNextCheck || input.action || operatorCopy.action,
    technicalEvidence,
    fullDetails: input.detail,
    eventSource: input.eventSource,
    sampleSource: input.sampleSource,
    blockedReason: passBlockedReason ?? undefined,
    failureClusters: input.failureClusters,
    implemented: input.implemented,
    required: input.required,
    eventNames: input.eventNames,
    moduleCoverage: input.moduleCoverage,
  } satisfies DataValidationCheck;
}

function moduleEventNames(...keys: string[]) {
  return TELEMETRY_MODULE_INDEXES
    .filter((moduleIndex) => keys.includes(moduleIndex.key))
    .flatMap((moduleIndex) => moduleIndex.eventNames);
}

function setEvidence(
  evidence: ModuleEvidenceByModule,
  moduleId: AnalyticsModuleCoverageId,
  source: AnalyticsModuleCoverageSourceType,
  count: number,
  lastSeenAtUtc?: string | null,
) {
  const rounded = Math.max(0, Math.round(count || 0));
  if (!evidence[moduleId]) evidence[moduleId] = {};
  evidence[moduleId]![source] = {
    count: rounded,
    lastSeenAtUtc: rounded > 0 ? lastSeenAtUtc ?? null : null,
  };
}

export function buildModuleCoverageEvidence(input: {
  gaEventCounts: Record<string, number>;
  telemetryEventCounts: Record<string, number>;
  canonicalEventCounts: Record<string, number>;
  gaLastSeenAtMs: number;
  snapshotLastSeenAtMs: number;
  legacyLastSeenAtMs: number;
  normalizedTaskEventCount: number;
  firstPartyTaskLifecycleEvents: number;
  normalizedOnboardingCompletions?: number;
  onboardingStartCount?: number;
  taskPipeline: Array<{ label: string; count: number }>;
  pageRollupViewCount: number;
  guestInteractionCount: number;
  completedPurchaseTransactionsCount: number;
  firstPartyPurchaseCount: number;
  telemetryPurchaseCount: number;
  unlockTransactionsCount: number;
  firstPartyUnlockCount: number;
  telemetryUnlockCount: number;
  watchSessionCount: number;
  viewerSessionFactCount: number;
  filteredSessionFactsLength: number;
  viewerSessionStartedLogsLength: number;
  pipelineFailureCount: number;
  pipelineFailureClusters: FailureCluster[];
  truthStateScore: number;
  generatedAtUtc: string;
}): ModuleEvidenceByModule {
  const evidence: ModuleEvidenceByModule = {};
  const gaLastSeenAtUtc = toUtcString(input.gaLastSeenAtMs);
  const snapshotLastSeenAtUtc = toUtcString(input.snapshotLastSeenAtMs);
  const legacyLastSeenAtUtc = toUtcString(input.legacyLastSeenAtMs);

  const addTelemetryModuleEvidence = (moduleId: keyof ModuleEvidenceByModule, telemetryKeys: string[]) => {
    const names = moduleEventNames(...telemetryKeys);
    setEvidence(evidence, moduleId, "ga4", sumEventCounts(input.gaEventCounts, names), gaLastSeenAtUtc);
    setEvidence(evidence, moduleId, "event_facts", sumEventCounts(input.canonicalEventCounts, names), legacyLastSeenAtUtc);
    setEvidence(evidence, moduleId, "telemetry_logs", sumEventCounts(input.telemetryEventCounts, names), legacyLastSeenAtUtc);
  };

  addTelemetryModuleEvidence("auth", ["auth"]);
  addTelemetryModuleEvidence("onboarding", ["onboarding"]);
  addTelemetryModuleEvidence("navigation", ["navigation"]);
  addTelemetryModuleEvidence("notifications", ["notifications"]);
  addTelemetryModuleEvidence("daily_tasks", ["tasks"]);
  addTelemetryModuleEvidence("task_guidance", ["task_guidance"]);
  addTelemetryModuleEvidence("commerce", ["commerce"]);
  addTelemetryModuleEvidence("unlock_watch", ["content", "viewer"]);
  addTelemetryModuleEvidence("creator_experiences", ["creator"]);
  addTelemetryModuleEvidence("engagement", ["engagement", "viewer", "content"]);
  addTelemetryModuleEvidence("admin", ["admin"]);
  addTelemetryModuleEvidence("runtime", ["runtime"]);

  setEvidence(evidence, "navigation", "page_rollups", input.pageRollupViewCount, snapshotLastSeenAtUtc);
  setEvidence(evidence, "navigation", "route_runtime", input.pageRollupViewCount > 0 ? 1 : 0, snapshotLastSeenAtUtc);
  setEvidence(evidence, "auth", "auth_outcomes", Math.max(evidence.auth?.event_facts?.count ?? 0, evidence.auth?.telemetry_logs?.count ?? 0), legacyLastSeenAtUtc);
  setEvidence(evidence, "onboarding", "event_facts", Math.max(evidence.onboarding?.event_facts?.count ?? 0, input.normalizedOnboardingCompletions ?? 0, input.onboardingStartCount ?? 0), legacyLastSeenAtUtc);
  setEvidence(evidence, "notifications", "notification_outcomes", Math.max(evidence.notifications?.event_facts?.count ?? 0, evidence.notifications?.telemetry_logs?.count ?? 0), legacyLastSeenAtUtc);

  setEvidence(evidence, "daily_tasks", "task_lifecycle", input.normalizedTaskEventCount || input.firstPartyTaskLifecycleEvents, snapshotLastSeenAtUtc);
  setEvidence(evidence, "task_guidance", "task_pipeline", sumCountBuckets(input.taskPipeline), snapshotLastSeenAtUtc);

  setEvidence(evidence, "commerce", "commerce_transactions", input.completedPurchaseTransactionsCount, snapshotLastSeenAtUtc);
  setEvidence(evidence, "commerce", "commerce_rollups", input.firstPartyPurchaseCount, snapshotLastSeenAtUtc);
  setEvidence(evidence, "commerce", "purchase_server_telemetry", input.telemetryPurchaseCount, legacyLastSeenAtUtc);

  setEvidence(evidence, "unlock_watch", "unlock_transactions", input.unlockTransactionsCount, snapshotLastSeenAtUtc);
  setEvidence(evidence, "unlock_watch", "unlock_rollups", input.firstPartyUnlockCount, snapshotLastSeenAtUtc);
  setEvidence(evidence, "unlock_watch", "unlock_server_telemetry", input.telemetryUnlockCount, legacyLastSeenAtUtc);
  setEvidence(evidence, "unlock_watch", "watch_sessions", input.watchSessionCount, snapshotLastSeenAtUtc);
  setEvidence(evidence, "unlock_watch", "session_facts", Math.max(input.viewerSessionFactCount, input.filteredSessionFactsLength), legacyLastSeenAtUtc);
  setEvidence(evidence, "unlock_watch", "viewer_start_events", input.viewerSessionStartedLogsLength, legacyLastSeenAtUtc);

  setEvidence(evidence, "engagement", "page_rollups", input.pageRollupViewCount, snapshotLastSeenAtUtc);
  setEvidence(evidence, "engagement", "guest_batches", input.guestInteractionCount, legacyLastSeenAtUtc);
  setEvidence(evidence, "engagement", "watch_sessions", input.watchSessionCount, snapshotLastSeenAtUtc);
  setEvidence(evidence, "engagement", "session_facts", Math.max(input.viewerSessionFactCount, input.filteredSessionFactsLength), legacyLastSeenAtUtc);

  const adminTruthSnapshotCount = Number.isFinite(input.truthStateScore) ? 1 : 0;
  const runtimeEvidenceCount = Math.max(1, input.pipelineFailureCount + input.pipelineFailureClusters.length);
  setEvidence(evidence, "admin", "admin_truth_snapshot", adminTruthSnapshotCount, input.generatedAtUtc);
  setEvidence(evidence, "admin", "debug_evidence", adminTruthSnapshotCount, input.generatedAtUtc);
  setEvidence(evidence, "runtime", "route_runtime", runtimeEvidenceCount, input.generatedAtUtc);
  setEvidence(evidence, "runtime", "debug_evidence", runtimeEvidenceCount, input.generatedAtUtc);

  return evidence;
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
  firstPartyPresentDayKeys?: string[];
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
  firstPartyPurchaseRollupDocumentCount?: number;
  completedPurchaseTransactionIds?: string[];
  commerceRollupSourceIds?: string[];
  duplicateCommerceRollupIds?: string[];
  legacyCommerceRollupIds?: string[];
  operatorConfirmedCommerceRollupIds?: string[];
  commerceWindowStartDayKey?: string | null;
  commerceWindowEndDayKey?: string | null;
  commerceRollupStartDayKey?: string | null;
  commerceRollupEndDayKey?: string | null;
  firstPartyUnlockCount: number;
  firstPartyUnlockRollupDocumentCount?: number;
  completedUnlockTransactionIds?: string[];
  unlockRollupSourceIds?: string[];
  duplicateUnlockRollupIds?: string[];
  legacyUnlockRollupIds?: string[];
  unlockWindowStartDayKey?: string | null;
  unlockWindowEndDayKey?: string | null;
  unlockRollupStartDayKey?: string | null;
  unlockRollupEndDayKey?: string | null;
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
  const generatedAtUtc = toUtcString(input.generatedAtMs ?? lastValidatedAt) ?? new Date(input.generatedAtMs ?? lastValidatedAt).toISOString();
  const moduleCoverage = TELEMETRY_MODULE_INDEXES.map((moduleIndex) => {
    const sources: Array<{ key: string; label: string; count: number; lastSeenAtUtc: string | null }> = [
      {
        key: "ga4",
        label: "GA4",
        count: sumEventCounts(input.gaEventCounts, moduleIndex.eventNames),
        lastSeenAtUtc: toUtcString(input.gaLastSeenAtMs),
      },
      {
        key: "facts",
        label: "Event facts",
        count: sumEventCounts(input.canonicalEventCounts, moduleIndex.eventNames),
        lastSeenAtUtc: toUtcString(input.legacyLastSeenAtMs),
      },
      {
        key: "logs",
        label: "Telemetry logs",
        count: sumEventCounts(input.telemetryEventCounts, moduleIndex.eventNames),
        lastSeenAtUtc: toUtcString(input.legacyLastSeenAtMs),
      },
    ];

    if (moduleIndex.key === "navigation" || moduleIndex.key === "engagement") {
      sources.push({
        key: "pages",
        label: "Page rollups",
        count: input.pageRollupViewCount,
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
    }
    if (moduleIndex.key === "engagement") {
      sources.push({
        key: "guest",
        label: "Guest batches",
        count: input.guestInteractionCount,
        lastSeenAtUtc: toUtcString(input.legacyLastSeenAtMs),
      });
    }
    if (moduleIndex.key === "tasks") {
      sources.push({
        key: "task_events",
        label: "Task lifecycle",
        count: input.normalizedTaskEventCount || input.firstPartyTaskLifecycleEvents,
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
    }
    if (moduleIndex.key === "task_guidance") {
      sources.push({
        key: "task_pipeline",
        label: "Task pipeline",
        count: sumCountBuckets(input.taskPipeline),
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
    }
    if (moduleIndex.key === "commerce") {
      sources.push({
        key: "transactions",
        label: "Transactions",
        count: input.completedPurchaseTransactionsCount + input.unlockTransactionsCount,
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
      sources.push({
        key: "commerce_rollups",
        label: "Commerce rollups",
        count: input.firstPartyPurchaseCount + input.firstPartyUnlockCount,
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
    }
    if (moduleIndex.key === "content") {
      sources.push({
        key: "drop_rollups",
        label: "Drop rollups",
        count: input.dropRollupActivityCount,
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
      sources.push({
        key: "unlock_transactions",
        label: "Unlock transactions",
        count: input.unlockTransactionsCount,
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
    }
    if (moduleIndex.key === "viewer") {
      sources.push({
        key: "watch_sessions",
        label: "Watch sessions",
        count: input.watchSessionCount,
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
      sources.push({
        key: "watch_assets",
        label: "Watch assets",
        count: input.watchAssetCount,
        lastSeenAtUtc: toUtcString(input.snapshotLastSeenAtMs),
      });
      sources.push({
        key: "session_facts",
        label: "Session facts",
        count: input.viewerSessionFactCount,
        lastSeenAtUtc: toUtcString(input.legacyLastSeenAtMs),
      });
    }
    if (moduleIndex.key === "security") {
      sources.push({
        key: "security_events",
        label: "Security logs",
        count: input.securityEventsCount,
        lastSeenAtUtc: toUtcString(input.legacyLastSeenAtMs),
      });
      sources.push({
        key: "flagged_users",
        label: "Flagged accounts",
        count: input.securityLogCount,
        lastSeenAtUtc: toUtcString(input.legacyLastSeenAtMs),
      });
    }

    return buildModuleCoverageReport({
      key: moduleIndex.key,
      label: moduleIndex.label,
      sources: sources.map(({ key, label, count }) => ({ key, label, count })),
      emptyDetail: `No indexed ${moduleIndex.label.toLowerCase()} signals landed in this range. Expected sources: ${moduleIndex.fallbackSources.join(", ")}.`,
    });
  });

  const unhealthyModules = moduleCoverage.filter((module) => module.status !== "healthy");
  const moduleCoverageEvidence = buildModuleCoverageEvidence({
    gaEventCounts: input.gaEventCounts,
    telemetryEventCounts: input.telemetryEventCounts,
    canonicalEventCounts: input.canonicalEventCounts,
    gaLastSeenAtMs: input.gaLastSeenAtMs,
    snapshotLastSeenAtMs: input.snapshotLastSeenAtMs,
    legacyLastSeenAtMs: input.legacyLastSeenAtMs,
    normalizedTaskEventCount: input.normalizedTaskEventCount,
    firstPartyTaskLifecycleEvents: input.firstPartyTaskLifecycleEvents,
    normalizedOnboardingCompletions: input.normalizedOnboardingCompletions,
    onboardingStartCount: input.onboardingStartCount,
    taskPipeline: input.taskPipeline,
    pageRollupViewCount: input.pageRollupViewCount,
    guestInteractionCount: input.guestInteractionCount,
    completedPurchaseTransactionsCount: input.completedPurchaseTransactionsCount,
    firstPartyPurchaseCount: input.firstPartyPurchaseCount,
    telemetryPurchaseCount: input.telemetryPurchaseCount,
    unlockTransactionsCount: input.unlockTransactionsCount,
    firstPartyUnlockCount: input.firstPartyUnlockCount,
    telemetryUnlockCount: input.telemetryUnlockCount,
    watchSessionCount: input.watchSessionCount,
    viewerSessionFactCount: input.viewerSessionFactCount,
    filteredSessionFactsLength: input.filteredSessionFactsLength,
    viewerSessionStartedLogsLength: input.viewerSessionStartedLogsLength,
    pipelineFailureCount: input.pipelineFailureCount,
    pipelineFailureClusters: input.pipelineFailureClusters,
    truthStateScore: input.truthState.score,
    generatedAtUtc,
  });
  const moduleCoverageMap = buildModuleSourceMap({
    range: selectedRange,
    generatedAtUtc,
    evidenceByModule: moduleCoverageEvidence,
  });
  const moduleCoverageItems: AnalyticsModuleCoverageItem[] = moduleCoverageMap.modules;
  const purchaseRevenueReconciliation = reconcileCommerceRollups({
    selectedRange,
    transactionCount: input.completedPurchaseTransactionsCount,
    rollupPurchaseCount: input.firstPartyPurchaseCount,
    rollupDocumentCount: input.firstPartyPurchaseRollupDocumentCount ?? input.firstPartyPurchaseCount,
    telemetryEventCount: input.telemetryPurchaseCount,
    completedTransactionIds: input.completedPurchaseTransactionIds ?? [],
    rollupSourceIds: input.commerceRollupSourceIds ?? [],
    duplicateRollupIds: input.duplicateCommerceRollupIds ?? [],
    legacyRollupIds: input.legacyCommerceRollupIds ?? [],
    operatorConfirmedOnlyIds: input.operatorConfirmedCommerceRollupIds ?? [],
    startDayKey: input.commerceWindowStartDayKey,
    endDayKey: input.commerceWindowEndDayKey,
    rollupStartDayKey: input.commerceRollupStartDayKey,
    rollupEndDayKey: input.commerceRollupEndDayKey,
  });
  const purchaseTelemetryCoverage = classifyPurchaseTelemetryCoverage({
    completedTransactionCount: input.completedPurchaseTransactionsCount,
    telemetryEventCount: input.telemetryPurchaseCount,
  });
  const commerceParityCheck: CommerceParityCheck = {
    range: selectedRange,
    generatedAtUtc: toUtcString(input.generatedAtMs ?? lastValidatedAt) ?? new Date(input.generatedAtMs ?? lastValidatedAt).toISOString(),
    revenueTruth: {
      completedTransactions: input.completedPurchaseTransactionsCount,
      canonicalPurchaseRollups: input.firstPartyPurchaseCount,
      mismatchReason: purchaseRevenueReconciliation.mismatchReason,
      comparableUnitsStatus: purchaseRevenueReconciliation.comparableUnitsStatus,
      dateWindowStatus: purchaseRevenueReconciliation.dateWindowStatus,
      state: purchaseRevenueReconciliation.state,
      confidence: purchaseRevenueReconciliation.confidence,
      technicalEvidence: purchaseRevenueReconciliation.technicalEvidence,
      nextAction: purchaseRevenueReconciliation.nextAction,
    },
    funnelTelemetryTruth: {
      purchaseTelemetryEvents: purchaseTelemetryCoverage.purchaseTelemetryEvents,
      expectedPurchaseEvents: purchaseTelemetryCoverage.expectedPurchaseEvents,
      missingPurchaseTelemetryCount: purchaseTelemetryCoverage.missingPurchaseTelemetryCount,
      coveragePct: purchaseTelemetryCoverage.coveragePct,
      state: purchaseTelemetryCoverage.state,
      passAllowed: purchaseTelemetryCoverage.passAllowed,
      blockedReason: purchaseTelemetryCoverage.missingPurchaseTelemetryCount > 0 ? "purchase_telemetry_undercount" : undefined,
    },
    creatorSpendTruth: {
      sampledTransactions: input.creatorSpendTransactionCount,
      amountMismatches: input.creatorSpendParityMismatchCount,
      restrictedRewardSpendViolations: input.creatorRestrictedSpendViolationCount,
      state: input.creatorSpendParityMismatchCount > 0 || input.creatorRestrictedSpendViolationCount > 0
        ? "fail"
        : input.creatorSpendTransactionCount > 0
          ? "pass"
          : "review",
    },
  };
  const unlockRollupReconciliation = reconcileUnlockRollups({
    selectedRange,
    transactionCount: input.unlockTransactionsCount,
    rollupUnlockCount: input.firstPartyUnlockCount,
    rollupDocumentCount: input.firstPartyUnlockRollupDocumentCount ?? input.firstPartyUnlockCount,
    telemetryEventCount: input.telemetryUnlockCount,
    completedTransactionIds: input.completedUnlockTransactionIds ?? [],
    rollupSourceIds: input.unlockRollupSourceIds ?? [],
    duplicateRollupIds: input.duplicateUnlockRollupIds ?? [],
    legacyRollupIds: input.legacyUnlockRollupIds ?? [],
    startDayKey: input.unlockWindowStartDayKey,
    endDayKey: input.unlockWindowEndDayKey,
    rollupStartDayKey: input.unlockRollupStartDayKey,
    rollupEndDayKey: input.unlockRollupEndDayKey,
  });
  const unlockTelemetryCoverage = classifyUnlockTelemetryCoverage({
    unlockTransactionCount: input.unlockTransactionsCount,
    telemetryEventCount: input.telemetryUnlockCount,
  });
  const viewerStartCoverage = classifyViewerStartCoverage({
    watchSessionCount: input.watchSessionCount,
    sessionFactCount: input.filteredSessionFactsLength,
    viewerStartEventCount: input.viewerSessionStartedLogsLength,
  });
  const watchCaptureQuality = classifyWatchCaptureQuality({
    watchSessions: input.watchSessionCount,
    fullCaptures: input.watchCaptureFullCount,
    degradedCaptures: input.watchCaptureDegradedCount,
    replayRecoveredSessions: input.watchCaptureReplayRecoveredCount,
    closeMissingSessions: input.watchCaptureCloseMissingCount,
  });
  const unlockWatchParity: UnlockWatchParity = {
    range: selectedRange,
    generatedAtUtc: toUtcString(input.generatedAtMs ?? lastValidatedAt) ?? new Date(input.generatedAtMs ?? lastValidatedAt).toISOString(),
    unlockAccessTruth: {
      unlockTransactions: input.unlockTransactionsCount,
      canonicalUnlockRollups: input.firstPartyUnlockCount,
      delta: unlockRollupReconciliation.countDelta,
      mismatchReason: unlockRollupReconciliation.mismatchReason,
      comparableUnitsStatus: unlockRollupReconciliation.comparableUnitsStatus,
      dateWindowStatus: unlockRollupReconciliation.dateWindowStatus,
      confidence: unlockRollupReconciliation.confidence,
      technicalEvidence: unlockRollupReconciliation.technicalEvidence,
      nextAction: unlockRollupReconciliation.nextAction,
      state: unlockRollupReconciliation.state,
    },
    unlockFunnelTelemetry: {
      unlockTelemetryEvents: unlockTelemetryCoverage.unlockTelemetryEvents,
      expectedUnlockEvents: unlockTelemetryCoverage.expectedUnlockEvents,
      missingUnlockTelemetryCount: unlockTelemetryCoverage.missingUnlockTelemetryCount,
      coveragePct: unlockTelemetryCoverage.coveragePct,
      state: unlockTelemetryCoverage.state,
      passAllowed: unlockTelemetryCoverage.passAllowed,
      blockedReason: input.unlockTransactionsCount > 0 && input.telemetryUnlockCount === 0
        ? "required_sample_missing"
        : unlockTelemetryCoverage.missingUnlockTelemetryCount > 0
          ? "unlock_telemetry_undercount"
          : undefined,
    },
    viewerActivityTruth: {
      watchSessions: input.watchSessionCount,
      watchAssets: input.watchAssetCount,
      sessionFacts: input.filteredSessionFactsLength,
      rawSessionStartEvents: input.viewerSessionStartedLogsLength,
      rawStartRequired: viewerStartCoverage.rawStartRequired,
      passAllowed: viewerStartCoverage.passAllowed,
      blockedReason: viewerStartCoverage.attributionGap === "viewer_start_missing" ? "viewer_start_missing" : undefined,
      nextAction: viewerStartCoverage.nextAction,
      state: viewerStartCoverage.state,
    },
    watchCaptureQuality: {
      fullCaptures: watchCaptureQuality.fullCaptures,
      degradedCaptures: watchCaptureQuality.degradedCaptures,
      replayRecoveredSessions: watchCaptureQuality.replayRecoveredSessions,
      closeMissingSessions: watchCaptureQuality.closeMissingSessions,
      replayRecoveryRate: watchCaptureQuality.replayRecoveryRate,
      degradedCaptureRate: watchCaptureQuality.degradedCaptureRate,
      missingCloseoutRate: watchCaptureQuality.missingCloseoutRate,
      confidence: watchCaptureQuality.confidence,
      passAllowed: watchCaptureQuality.passAllowed,
      blockedReason: watchCaptureQuality.blockedReason ?? undefined,
      nextAction: watchCaptureQuality.nextAction,
      state: watchCaptureQuality.state,
    },
  };
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
  const taskGuidanceSampleCount = input.taskGuidance.viewed
    + input.taskGuidance.dismissed
    + input.taskGuidance.tapped
    + input.taskGuidance.completed;
  const taskOnboardingSemantics = classifyTaskOnboardingParity({
    taskActivitySamples: Math.min(input.normalizedTaskEventCount, input.firstPartyTaskLifecycleEvents),
    taskLifecycleEvents: input.firstPartyTaskLifecycleEvents,
    onboardingSamples: input.onboardingStartCount,
    guidanceSamples: taskGuidanceSampleCount,
    guidanceImplemented: TASK_GUIDANCE_IMPLEMENTED,
    guidanceRequired: TASK_GUIDANCE_REQUIRED_IN_BETA,
  });
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
    firstPartyPresentDayKeys: input.firstPartyPresentDayKeys,
    snapshotPresentDayKeys: input.snapshotPresentDayKeys,
    snapshotLastSeenAtMs: input.snapshotLastSeenAtMs,
    legacyPresentDayKeys: input.legacyPresentDayKeys,
    legacyLastSeenAtMs: input.legacyLastSeenAtMs,
    expectedDayKeys: input.expectedDayKeys,
    recentWindowDayKeys: input.recentWindowDayKeys,
    truthState: input.truthState,
  });
  const parityScore = Math.round((
    commerceParityCheck.revenueTruth.confidence
    + Math.max(0, Math.min(100, Math.round(commerceParityCheck.funnelTelemetryTruth.coveragePct)))
    + Math.round((Math.max(0, 100 - (unlockWatchParity.unlockAccessTruth.delta * 10)) + unlockWatchParity.unlockFunnelTelemetry.coveragePct) / 2)
    + onboardingParity.score
    + taskGuidanceParity.score
    + creatorSpendParityScore
    + input.truthState.score
  ) / 7);
  const analyticsModuleCoverage: AnalyticsModuleCoverage = {
    range: selectedRange,
    generatedAtUtc,
    totalModules: moduleCoverageMap.totalModules,
    requiredModules: moduleCoverageMap.requiredModules,
    optionalModules: moduleCoverageMap.optionalModules,
    verifiedModules: moduleCoverageMap.verifiedModules,
    partialModules: moduleCoverageMap.partialModules,
    emptyModules: moduleCoverageMap.emptyModules,
    verifiedRequired: moduleCoverageMap.verifiedRequired,
    partialRequired: moduleCoverageMap.partialRequired,
    emptyRequired: moduleCoverageMap.emptyRequired,
    verifiedOptional: moduleCoverageMap.verifiedOptional,
    partialOptional: moduleCoverageMap.partialOptional,
    emptyOptional: moduleCoverageMap.emptyOptional,
    requiredGaps: moduleCoverageMap.requiredGaps,
    optionalGaps: moduleCoverageMap.optionalGaps,
    requiredGapModules: moduleCoverageMap.requiredGapModules,
    optionalGapModules: moduleCoverageMap.optionalGapModules,
    sampledModules: moduleCoverageMap.sampledModules,
    evidenceSamples: moduleCoverageMap.evidenceSamples,
    parityScore: moduleCoverageMap.parityScore,
    optionalParityScore: moduleCoverageMap.optionalParityScore,
    parityScoreFormula: moduleCoverageMap.parityScoreFormula,
    passAllowed: moduleCoverageMap.passAllowed,
    blockedReason: moduleCoverageMap.blockedReason,
    modules: moduleCoverageItems,
  };
  const telemetrySampleCoveragePct = input.firstPartyAuthenticatedEvents > 0
    ? Number(((input.canonicalSampleCount / input.firstPartyAuthenticatedEvents) * 100).toFixed(2))
    : 0;
  const telemetryConfidence = input.firstPartyAuthenticatedEvents > 0 && input.canonicalSampleCount > 0
    ? Math.max(1, Math.min(100, Math.round(telemetrySampleCoveragePct)))
    : input.firstPartyAuthenticatedEvents > 0
      ? 60
      : null;
  const refreshDiagnosticsStatus = input.pipelineFailureCount === 0
    ? "pass" as const
    : input.pipelineFailureCount <= 5
      ? "review" as const
      : "fail" as const;
  const telemetryGate = buildTelemetryParityPassGate({
    eventSampleCount: input.canonicalSampleCount,
    canonicalSampleCount: input.canonicalSampleCount,
    confidence: telemetryConfidence,
    eventSource: input.telemetryParityEventSource,
    sampleSource: input.telemetryParitySampleSource,
    refreshDiagnosticsStatus,
    refreshFailureCount: input.pipelineFailureCount,
    failureClusters: input.pipelineFailureClusters,
    blockedReason: input.pipelineFailureCount > 0 ? "analytics_refresh_failures_present" : null,
    range: selectedRange,
    generatedAtUtc: toUtcString(input.generatedAtMs ?? lastValidatedAt) ?? new Date(input.generatedAtMs ?? lastValidatedAt).toISOString(),
  });
  const telemetryParityStatus: TelemetryParityValidation["status"] =
    telemetryGate.status === "pass"
      ? "pass"
      : telemetryGate.status === "review"
        ? "review"
        : "fail";
  const telemetryParityBlockedReason: TelemetryParityValidation["blockedReason"] =
    input.firstPartyAuthenticatedEvents > 0 && input.canonicalSampleCount === 0
      ? "required_sample_missing"
      : telemetryGate.blockers.includes("refresh_failures_present")
        ? "analytics_refresh_failures_present"
        : telemetryGate.blockers.includes("low_confidence")
          ? "low_confidence"
          : telemetryGate.blockers.includes("route_unknown_diagnostics")
            ? "route_unknown_diagnostics"
            : telemetryGate.blockers.includes("ingest_identified_failures")
              ? "ingest_identified_failures"
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
      detail: input.propertyId ? "Google Analytics 4 report configuration loaded; this setup check does not prove usable chart samples." : "GA property is missing.",
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
      confidence: telemetryConfidence,
      requiredSourcesPresent: input.firstPartyAuthenticatedEvents > 0 || input.canonicalSampleCount > 0,
      passAllowed: telemetryGate.passAllowed,
      blockedReason: telemetryParityValidation.blockedReason ?? null,
      action: telemetryGate.nextAction,
      eventSource: telemetryParityValidation.eventSource,
      sampleSource: telemetryParityValidation.sampleSource,
      sourceDetails: `${telemetryParityValidation.eventSource} -> ${telemetryParityValidation.sampleSource}`,
      operatorSummary: telemetryGate.displaySummary,
      technicalEvidence: telemetryParityValidation.blockedReason === "required_sample_missing"
        ? `${input.firstPartyAuthenticatedEvents.toLocaleString()} canonical authenticated events were counted from ${telemetryParityValidation.eventSource}, but ${telemetryParityValidation.sampleSource} returned 0 representative samples in range.`
        : `${input.canonicalSampleCount.toLocaleString()} canonical samples were observed from ${telemetryParityValidation.sampleSource}; confidence ${telemetryConfidence ?? "n/a"} and ${input.pipelineFailureCount.toLocaleString()} refresh diagnostics failures mean sample presence is not parity proof.`,
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
      technicalEvidence: taskOnboardingSemantics.taskActivity.technicalEvidence,
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
      checkKey: "purchase_revenue_truth",
      title: "Purchase revenue truth",
      status: commerceParityCheck.revenueTruth.state === "pass"
        ? "pass"
        : commerceParityCheck.revenueTruth.state === "review"
          ? "warn"
          : "fail",
      detail: `${input.completedPurchaseTransactionsCount.toLocaleString()} completed purchase transactions vs ${input.firstPartyPurchaseCount.toLocaleString()} canonical purchase rollup purchase(s). Mismatch reason: ${commerceParityCheck.revenueTruth.mismatchReason}.`,
      source: "transactions + commerce rollups",
      sourceDetails: `${commerceParityCheck.revenueTruth.comparableUnitsStatus}; date window ${commerceParityCheck.revenueTruth.dateWindowStatus}`,
      selectedRange,
      lastValidatedAt,
      confidence: commerceParityCheck.revenueTruth.confidence,
      sampleRequired: true,
      sampleCount: Math.min(input.completedPurchaseTransactionsCount, input.firstPartyPurchaseCount),
      passAllowed: commerceParityCheck.revenueTruth.state === "pass",
      technicalEvidence: commerceParityCheck.revenueTruth.technicalEvidence,
      action: commerceParityCheck.revenueTruth.state === "pass"
        ? "No action required."
        : commerceParityCheck.revenueTruth.nextAction,
    }),
    buildValidationCheck({
      checkKey: "purchase_funnel_telemetry",
      title: "Purchase funnel telemetry",
      status: commerceParityCheck.funnelTelemetryTruth.state === "pass"
        ? "pass"
        : commerceParityCheck.funnelTelemetryTruth.state === "review"
          ? "warn"
          : "fail",
      detail: `${input.telemetryPurchaseCount.toLocaleString()} canonical purchase telemetry event(s) vs ${input.completedPurchaseTransactionsCount.toLocaleString()} completed purchase transactions. Missing purchase telemetry: ${commerceParityCheck.funnelTelemetryTruth.missingPurchaseTelemetryCount.toLocaleString()}. Coverage ${commerceParityCheck.funnelTelemetryTruth.coveragePct}%.`,
      source: "canonical server purchase telemetry",
      selectedRange,
      lastValidatedAt,
      confidence: input.completedPurchaseTransactionsCount > 0
        ? Math.max(0, Math.min(100, Math.round(commerceParityCheck.funnelTelemetryTruth.coveragePct)))
        : null,
      sampleRequired: true,
      sampleCount: input.telemetryPurchaseCount,
      passAllowed: commerceParityCheck.funnelTelemetryTruth.passAllowed,
      blockedReason: commerceParityCheck.funnelTelemetryTruth.blockedReason ?? null,
      technicalEvidence: commerceParityCheck.funnelTelemetryTruth.missingPurchaseTelemetryCount > 0
        ? `${input.completedPurchaseTransactionsCount.toLocaleString()} completed purchase transactions were recorded, but only ${input.telemetryPurchaseCount.toLocaleString()} canonical server purchase telemetry event(s) were found in range. Missing ${commerceParityCheck.funnelTelemetryTruth.missingPurchaseTelemetryCount.toLocaleString()}.`
        : `${input.telemetryPurchaseCount.toLocaleString()} canonical server purchase telemetry event(s) matched ${input.completedPurchaseTransactionsCount.toLocaleString()} completed purchase transactions in range.`,
      action: commerceParityCheck.funnelTelemetryTruth.passAllowed
        ? "No action required."
        : "Wire canonical server purchase telemetry after verified PayPal capture before trusting funnel analytics.",
    }),
    buildValidationCheck({
      checkKey: "unlock_access_truth",
      title: "Unlock access truth",
      status: unlockWatchParity.unlockAccessTruth.state === "pass"
        ? "pass"
        : unlockWatchParity.unlockAccessTruth.state === "review"
          ? "warn"
          : "fail",
      detail: `${input.unlockTransactionsCount.toLocaleString()} unlock transactions vs ${input.firstPartyUnlockCount.toLocaleString()} canonical unlock rollups. Delta ${unlockWatchParity.unlockAccessTruth.delta.toLocaleString()}.`,
      source: "unlock transactions + canonical unlock rollups",
      selectedRange,
      lastValidatedAt,
      confidence: input.unlockTransactionsCount > 0 || input.firstPartyUnlockCount > 0
        ? unlockWatchParity.unlockAccessTruth.confidence
        : null,
      sampleRequired: true,
      sampleCount: Math.max(input.unlockTransactionsCount, input.firstPartyUnlockCount),
      passAllowed: unlockWatchParity.unlockAccessTruth.state === "pass",
      blockedReason: unlockWatchParity.unlockAccessTruth.state === "pass"
        ? null
        : unlockWatchParity.unlockAccessTruth.mismatchReason === "missing_server_unlock_telemetry"
          ? "missing_server_unlock_telemetry"
          : unlockWatchParity.unlockAccessTruth.mismatchReason,
      technicalEvidence: unlockWatchParity.unlockAccessTruth.technicalEvidence,
      action: unlockWatchParity.unlockAccessTruth.state === "pass"
        ? "No action required."
        : unlockWatchParity.unlockAccessTruth.nextAction,
    }),
    buildValidationCheck({
      checkKey: "unlock_funnel_telemetry",
      title: "Unlock funnel telemetry",
      status: unlockWatchParity.unlockFunnelTelemetry.state === "pass"
        ? "pass"
        : unlockWatchParity.unlockFunnelTelemetry.state === "review"
          ? "warn"
          : "fail",
      detail: `${input.telemetryUnlockCount.toLocaleString()} unlock telemetry event(s) vs ${input.unlockTransactionsCount.toLocaleString()} expected successful unlocks. Missing telemetry ${unlockWatchParity.unlockFunnelTelemetry.missingUnlockTelemetryCount.toLocaleString()}. Coverage ${unlockWatchParity.unlockFunnelTelemetry.coveragePct}%.`,
      source: "canonical server unlock telemetry",
      selectedRange,
      lastValidatedAt,
      confidence: input.unlockTransactionsCount > 0
        ? Math.max(0, Math.min(100, Math.round(unlockWatchParity.unlockFunnelTelemetry.coveragePct)))
        : null,
      sampleRequired: true,
      sampleCount: input.telemetryUnlockCount,
      passAllowed: unlockWatchParity.unlockFunnelTelemetry.passAllowed,
      blockedReason: unlockWatchParity.unlockFunnelTelemetry.blockedReason ?? null,
      technicalEvidence: input.unlockTransactionsCount > 0 && input.telemetryUnlockCount === 0
        ? `${input.unlockTransactionsCount.toLocaleString()} unlock transactions were recorded, but canonical unlock telemetry captured 0 unlock events in range.`
        : `${input.telemetryUnlockCount.toLocaleString()} canonical unlock telemetry event(s) were found for ${input.unlockTransactionsCount.toLocaleString()} successful unlock transactions in range.`,
      action: unlockWatchParity.unlockFunnelTelemetry.passAllowed
        ? "No action required."
        : "Wire canonical server unlock telemetry after successful drops/unlock before trusting unlock funnel analytics.",
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
      technicalEvidence: taskOnboardingSemantics.onboardingActivity.technicalEvidence,
      action: input.onboardingStartCount > 0 ? "No action required." : "Confirm onboarding start events are landing before using onboarding coverage.",
    }),
    buildValidationCheck({
      checkKey: "task_guidance_parity",
      title: "Task guidance parity",
      status: TASK_GUIDANCE_IMPLEMENTED
        ? input.taskGuidance.viewed === 0
          && input.taskGuidance.dismissed === 0
          && input.taskGuidance.tapped === 0
          && input.taskGuidance.completed === 0
          ? TASK_GUIDANCE_REQUIRED_IN_BETA ? "fail" : "unavailable"
          : input.taskGuidance.completed <= input.taskGuidance.tapped && input.taskGuidance.tapped <= input.taskGuidance.viewed
            ? taskGuidanceParity.status
            : "warn"
        : "unavailable",
      detail: TASK_GUIDANCE_IMPLEMENTED
        ? taskGuidanceSampleCount > 0
          ? `${input.taskGuidance.viewed.toLocaleString()} guide views, ${input.taskGuidance.dismissed.toLocaleString()} dismissals, ${input.taskGuidance.tapped.toLocaleString()} guide taps, and ${input.taskGuidance.completed.toLocaleString()} guided completions were collected in range.`
          : taskOnboardingSemantics.taskGuidance.copy
        : "Guidance UI is not implemented for this range, so task guidance parity is unavailable.",
      source: "task guidance telemetry",
      selectedRange,
      lastValidatedAt,
      confidence: taskGuidanceSampleCount > 0
        ? taskGuidanceParity.score
        : null,
      sampleRequired: TASK_GUIDANCE_IMPLEMENTED && TASK_GUIDANCE_REQUIRED_IN_BETA,
      sampleCount: taskGuidanceSampleCount,
      passAllowed: !TASK_GUIDANCE_REQUIRED_IN_BETA || taskGuidanceSampleCount > 0,
      blockedReason: !TASK_GUIDANCE_IMPLEMENTED
        ? "not_implemented"
        : taskGuidanceSampleCount <= 0
          ? "required_sample_missing"
          : null,
      implemented: TASK_GUIDANCE_IMPLEMENTED,
      required: TASK_GUIDANCE_REQUIRED_IN_BETA,
      eventNames: [...TASK_GUIDANCE_EVENT_NAMES],
      technicalEvidence: TASK_GUIDANCE_IMPLEMENTED
        ? `${taskOnboardingSemantics.taskGuidance.technicalEvidence} Rollup fields: guidanceViews=${(input.taskGuidance.guidanceViews ?? 0).toLocaleString()}, guidanceTaps=${(input.taskGuidance.guidanceTaps ?? 0).toLocaleString()}, guidanceDismissals=${(input.taskGuidance.guidanceDismissals ?? 0).toLocaleString()}, guidanceCompletions=${(input.taskGuidance.guidanceCompletions ?? 0).toLocaleString()}, taskCardExpansions=${(input.taskGuidance.taskCardExpansions ?? 0).toLocaleString()}, taskHelpOpens=${(input.taskGuidance.taskHelpOpens ?? 0).toLocaleString()}. Expected events: ${TASK_GUIDANCE_EVENT_NAMES.join(", ")}.`
        : `Task guidance UI is not implemented. Expected events are ${TASK_GUIDANCE_EVENT_NAMES.join(", ")} when the feature ships.`,
      action: !TASK_GUIDANCE_IMPLEMENTED
        ? "Guidance UI is not implemented. Mark this lane unavailable until the prompt surface ships."
        : taskGuidanceSampleCount > 0
          ? "No action required."
          : "Lifecycle and onboarding are active, but guidance UI telemetry is missing. Confirm task guidance emitters are deployed, then wait for real guidance activity in analytics_event_facts before promoting parity.",
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
      sampleRequired: true,
      sampleCount: analyticsSourceHealth.continuity.presentDays,
      requiredSourcesPresent: analyticsSourceHealth.chartReadiness.state === "ready" && analyticsSourceHealth.sourceAgreement.state === "pass",
      passAllowed: analyticsSourceHealth.chartReadiness.state === "ready" && analyticsSourceHealth.sourceAgreement.state === "pass",
      blockedReason: analyticsSourceHealth.sourceAgreement.state === "failed"
        ? "source_agreement_failed"
        : analyticsSourceHealth.chartReadiness.state === "gap_detected"
          ? "chart_continuity_gap"
          : analyticsSourceHealth.chartReadiness.state === "unavailable"
            ? "chart_day_bucket_missing"
            : analyticsSourceHealth.chartReadiness.state === "partial"
              ? "chart_readiness_partial"
              : null,
      action: analyticsSourceHealth.chartReadiness.state === "ready" && analyticsSourceHealth.sourceAgreement.state === "pass"
        ? "No action required."
        : analyticsSourceHealth.sourceAgreement.state === "failed"
          ? "Inspect source agreement failure details, repair the mismatched source lane, and do not promote the chart to canonical until agreement passes."
          : "Review source agreement and missing buckets before trusting the chart as ready.",
      operatorSummary: analyticsSourceHealth.chartReadiness.state === "ready" && analyticsSourceHealth.sourceAgreement.state === "pass"
        ? "Chart readiness passed."
        : analyticsSourceHealth.chartReadiness.state === "gap_detected"
          ? "Chart readiness blocked by continuity gaps."
          : analyticsSourceHealth.chartReadiness.state === "source_disagreement"
            ? "Chart readiness blocked by source agreement failure."
          : "Chart readiness needs review.",
      technicalEvidence: [
        `Availability ${analyticsSourceHealth.availability.ga4.status === "pass" || analyticsSourceHealth.availability.historicalSnapshot.status === "pass" || analyticsSourceHealth.availability.legacySupport.status === "pass" ? "passed" : "failed"}.`,
        `Continuity ${analyticsSourceHealth.continuity.gapSeverity === "none" ? "passed" : "needs review"}.`,
        `Source agreement ${analyticsSourceHealth.sourceAgreement.state === "failed" ? "failed" : analyticsSourceHealth.sourceAgreement.state}.`,
        `Chart readiness ${analyticsSourceHealth.chartReadiness.state === "ready" ? "ready" : "blocked"}.`,
        analyticsSourceHealth.chartReadiness.reason,
      ].join(" "),
    }),
    buildValidationCheck({
      checkKey: "module_coverage",
      title: "Module coverage",
      status: analyticsModuleCoverage.passAllowed
        ? "pass"
        : analyticsModuleCoverage.emptyRequired > 0
          ? "fail"
          : "warn",
      detail: analyticsModuleCoverage.passAllowed
        ? `All ${analyticsModuleCoverage.requiredModules.toLocaleString()} required analytics modules are verified. Optional modules are reported separately. Required parity score ${analyticsModuleCoverage.parityScore}%.`
        : `${analyticsModuleCoverage.requiredGaps} required module gap(s) and ${analyticsModuleCoverage.optionalGaps} optional module gap(s). Required gaps: ${analyticsModuleCoverage.modules.filter((module) => module.requiredForBeta && module.status !== "verified").map((module) => `${module.moduleLabel} [${module.status}]`).join("; ") || "none"}. Required parity score ${analyticsModuleCoverage.parityScore}%.`,
      source: "indexed analytics module coverage",
      selectedRange,
      lastValidatedAt,
      confidence: analyticsModuleCoverage.parityScore,
      requiredSourcesPresent: analyticsModuleCoverage.passAllowed,
      sampleRequired: true,
      sampleCount: analyticsModuleCoverage.evidenceSamples,
      action: analyticsModuleCoverage.passAllowed ? "No action required." : `Review required module gaps (${analyticsModuleCoverage.requiredGapModules.join(", ") || "none"}) before treating coverage as complete; optional gaps are nonblocking.`,
      operatorSummary: analyticsModuleCoverage.passAllowed
        ? "Analytics modules verified."
        : "Required analytics module coverage gaps need review.",
      operatorDetail: analyticsModuleCoverage.passAllowed
        ? `Verified ${analyticsModuleCoverage.verifiedRequired}/${analyticsModuleCoverage.requiredModules} required analytics modules.`
        : `Required gaps: ${analyticsModuleCoverage.modules.filter((module) => module.requiredForBeta && module.status !== "verified").map((module) => `${module.moduleLabel} [${module.status}] missing canonical ${module.missingRequiredSources.join(", ") || "none"}; accepted ${module.presentAcceptedSources.join(", ") || "none"}`).join("; ") || "none"}. Optional gaps: ${analyticsModuleCoverage.optionalGapModules.join(", ") || "none"}.`,
      passAllowed: analyticsModuleCoverage.passAllowed,
      blockedReason: analyticsModuleCoverage.blockedReason ?? null,
      technicalEvidence: analyticsModuleCoverage.passAllowed
        ? `Verified ${analyticsModuleCoverage.verifiedRequired}/${analyticsModuleCoverage.requiredModules} required modules. Optional score ${analyticsModuleCoverage.optionalParityScore}%. ${analyticsModuleCoverage.parityScoreFormula}`
        : [
          `Required gaps: ${analyticsModuleCoverage.requiredGapModules.join(", ") || "none"}.`,
          `Optional gaps: ${analyticsModuleCoverage.optionalGapModules.join(", ") || "none"}.`,
          analyticsModuleCoverage.parityScoreFormula,
          ...analyticsModuleCoverage.modules
            .filter((module) => module.status !== "verified")
            .map((module) => `${module.moduleLabel}: status ${module.status}; accepted sources ${module.presentAcceptedSources.join(", ") || "none"}; canonical gaps ${module.missingRequiredSources.join(", ") || "none"}; optional external gaps ${module.missingExternalOnlySources.join(", ") || "none"}; panels ${module.dependentPanels.join(", ")}; validator ${module.nextValidator}.`),
        ].join(" "),
      sampleSource: "module evidence samples",
      moduleCoverage: analyticsModuleCoverage,
    }),
    buildValidationCheck({
      checkKey: "viewer_activity_truth",
      title: "Viewer activity truth",
      status: unlockWatchParity.viewerActivityTruth.state === "pass"
        ? "pass"
        : unlockWatchParity.viewerActivityTruth.state === "review"
          ? "warn"
          : "fail",
      detail: `${input.watchSessionCount.toLocaleString()} canonical watch sessions, ${input.watchAssetCount.toLocaleString()} watch assets, ${input.filteredSessionFactsLength.toLocaleString()} session facts, and ${input.viewerSessionStartedLogsLength.toLocaleString()} raw session-start events matched the selected range. Raw starts required: ${unlockWatchParity.viewerActivityTruth.rawStartRequired ? "yes" : "no"}.`,
      source: "watch sessions + session facts + raw viewer events",
      selectedRange,
      lastValidatedAt,
      sampleRequired: true,
      sampleCount: input.watchSessionCount + input.filteredSessionFactsLength + input.viewerSessionStartedLogsLength,
      passAllowed: unlockWatchParity.viewerActivityTruth.passAllowed,
      blockedReason: unlockWatchParity.viewerActivityTruth.blockedReason ?? null,
      technicalEvidence: input.watchSessionCount > 0 && input.viewerSessionStartedLogsLength === 0
        ? `${input.watchSessionCount.toLocaleString()} canonical watch sessions and ${input.filteredSessionFactsLength.toLocaleString()} session facts were present, but raw viewer start events were 0 in range.`
        : `${input.viewerSessionStartedLogsLength.toLocaleString()} raw viewer start event(s) supported ${input.watchSessionCount.toLocaleString()} canonical watch session(s) in range.`,
      action: unlockWatchParity.viewerActivityTruth.state === "pass"
        ? "No action required."
        : unlockWatchParity.viewerActivityTruth.nextAction,
    }),
    buildValidationCheck({
      checkKey: "watch_capture_quality",
      title: "Watch capture quality",
      status: unlockWatchParity.watchCaptureQuality.state === "pass"
        ? "pass"
        : unlockWatchParity.watchCaptureQuality.state === "review"
          ? "warn"
          : "fail",
      detail: input.watchSessionCount === 0
        ? "No canonical watch sessions matched the selected range, so capture quality could not be evaluated."
        : `${input.watchCaptureFullCount.toLocaleString()} full captures, ${input.watchCaptureDegradedCount.toLocaleString()} degraded captures, ${input.watchCaptureReplayRecoveredCount.toLocaleString()} replay-recovered sessions, and ${input.watchCaptureCloseMissingCount.toLocaleString()} close-missing sessions were recorded in the selected range.`,
      source: "watch capture records",
      selectedRange,
      lastValidatedAt,
      confidence: input.watchSessionCount > 0 ? unlockWatchParity.watchCaptureQuality.confidence : null,
      sampleRequired: true,
      sampleCount: input.watchSessionCount,
      passAllowed: unlockWatchParity.watchCaptureQuality.passAllowed,
      blockedReason: unlockWatchParity.watchCaptureQuality.blockedReason ?? null,
      technicalEvidence: input.watchSessionCount === 0
        ? "No canonical watch sessions matched the selected range."
        : `${input.watchCaptureReplayRecoveredCount.toLocaleString()} replay-recovered sessions were recorded (${unlockWatchParity.watchCaptureQuality.replayRecoveryRate}%). Replay recovery can be useful, but a high recovery count means capture is not clean enough to treat as invisible.`,
      action: input.watchSessionCount === 0
        ? "Confirm watch session capture is expected for this range."
        : unlockWatchParity.watchCaptureQuality.nextAction,
    }),
  ];

  return {
    moduleCoverage,
    unhealthyModules,
    analyticsModuleCoverage,
    parityScore,
    truthState: input.truthState,
    validations,
    analyticsSourceHealth,
    telemetryParityValidation,
  };
}
