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
}

type DataValidationStatus = "pass" | "warn" | "fail" | "unavailable" | "stale" | "unknown";

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
}) {
  const requiredSourcesPresent = input.requiredSourcesPresent ?? true;
  const sampleRequired = input.sampleRequired ?? false;
  const sampleCount = Math.max(0, Math.round(input.sampleCount ?? 0));
  const freshnessState = input.freshnessState ?? "fresh";
  const passBlockedReason = !requiredSourcesPresent
    ? "required_source_missing"
    : sampleRequired && sampleCount <= 0
      ? "required_sample_missing"
      : freshnessState === "stale"
        ? "stale_validation"
        : null;
  const passAllowed = passBlockedReason === null;
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
  } satisfies DataValidationCheck;
}

export function buildHistoricalValidationSummary(input: {
  selectedRange?: string | null;
  lastValidatedAt?: number;
  propertyId: string;
  gaEventCounts: Record<string, number>;
  telemetryEventCounts: Record<string, number>;
  canonicalEventCounts: Record<string, number>;
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
  telemetryLogCount: number;
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
  const parityScore = Math.round((
    purchaseParity.score
    + unlockParity.score
    + onboardingParity.score
    + taskGuidanceParity.score
    + creatorSpendParityScore
    + input.truthState.score
  ) / 6);

  const validations = [
    buildValidationCheck({
      checkKey: "ga_property",
      title: "GA property",
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
      status: (input.telemetryLogCount > 0 && input.firstPartyAuthenticatedEvents > 0) ? "pass" : "warn",
      detail: (input.telemetryLogCount > 0 || input.firstPartyAuthenticatedEvents > 0)
        ? `${input.firstPartyAuthenticatedEvents.toLocaleString()} canonical authenticated events with ${input.telemetryLogCount.toLocaleString()} canonical event samples in range.`
        : "No authenticated telemetry events matched the selected range.",
      source: "first-party telemetry + canonical event samples",
      selectedRange,
      lastValidatedAt,
      sampleRequired: true,
      sampleCount: Math.min(input.telemetryLogCount, input.firstPartyAuthenticatedEvents),
      confidence: input.telemetryLogCount > 0 && input.firstPartyAuthenticatedEvents > 0 ? 100 : 60,
      action: input.telemetryLogCount > 0 && input.firstPartyAuthenticatedEvents > 0 ? "No action required." : "Confirm canonical telemetry samples are landing for the selected range.",
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
        : `${input.pipelineFailureCount.toLocaleString()} analytics pipeline failures were recorded in the selected range. Review server diagnostics for route-level detail.`,
      source: "analytics pipeline diagnostics",
      selectedRange,
      lastValidatedAt,
      sampleCount: input.pipelineFailureCount,
      action: input.pipelineFailureCount === 0 ? "No action required." : "Open Admin Debug route diagnostics and clear active analytics pipeline failures.",
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
      checkKey: "historical_freshness",
      title: "Historical freshness",
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
      checkKey: "legacy_history_coverage",
      title: "Legacy history coverage",
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
  };
}
