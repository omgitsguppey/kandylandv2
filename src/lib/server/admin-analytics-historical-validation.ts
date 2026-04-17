import "server-only";

import { TELEMETRY_MODULE_INDEXES } from "@/lib/telemetry-catalog";

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
  validations: Array<{
    label: string;
    status: string;
    detail: string;
  }>;
}

export function buildHistoricalValidationSummary(input: {
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
  filteredSessionFactsLength: number;
  viewerSessionStartedLogsLength: number;
  pipelineFailureCount: number;
}): HistoricalValidationSummary {
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
  const parityScore = Math.round((purchaseParity.score + unlockParity.score + onboardingParity.score + taskGuidanceParity.score) / 4);

  const validations = [
    {
      label: "GA property",
      status: input.propertyId ? "pass" : "fail",
      detail: input.propertyId ? "Google Analytics 4 reports loaded." : "GA property is missing.",
    },
    {
      label: "Telemetry depth",
      status: (input.telemetryLogCount > 0 || input.firstPartyAuthenticatedEvents > 0) ? "pass" : "warn",
      detail: (input.telemetryLogCount > 0 || input.firstPartyAuthenticatedEvents > 0)
        ? `${input.firstPartyAuthenticatedEvents.toLocaleString()} canonical authenticated events with ${input.telemetryLogCount.toLocaleString()} canonical event samples in range.`
        : "No authenticated telemetry events matched the selected range.",
    },
    {
      label: "Task lifecycle",
      status: (input.normalizedTaskEventCount > 0 || input.firstPartyTaskLifecycleEvents > 0) ? "pass" : "warn",
      detail: (input.normalizedTaskEventCount > 0 || input.firstPartyTaskLifecycleEvents > 0)
        ? `${input.firstPartyTaskLifecycleEvents.toLocaleString()} canonical task events with ${input.normalizedTaskEventCount.toLocaleString()} raw lifecycle log entries in range.`
        : "No task lifecycle events matched the selected range.",
    },
    {
      label: "Pipeline health",
      status: input.pipelineFailureCount === 0 ? "pass" : input.pipelineFailureCount <= 5 ? "warn" : "fail",
      detail: input.pipelineFailureCount === 0
        ? "No analytics pipeline failures were recorded in the selected range."
        : `${input.pipelineFailureCount.toLocaleString()} analytics pipeline failures were recorded in the selected range. Review server diagnostics for route-level detail.`,
    },
    {
      label: "Purchase parity",
      status: purchaseParity.status,
      detail: `${input.completedPurchaseTransactionsCount.toLocaleString()} completed purchase transactions vs ${input.firstPartyPurchaseCount.toLocaleString()} canonical purchase rollups. Telemetry captured ${input.telemetryPurchaseCount.toLocaleString()} purchase events in the same range. Confidence ${purchaseParity.score}%.`,
    },
    {
      label: "Unlock parity",
      status: unlockParity.status,
      detail: `${input.unlockTransactionsCount.toLocaleString()} unlock transactions vs ${input.firstPartyUnlockCount.toLocaleString()} canonical unlock rollups. Telemetry captured ${input.telemetryUnlockCount.toLocaleString()} unlock events in the same range. Confidence ${unlockParity.score}%.`,
    },
    {
      label: "Onboarding coverage",
      status: input.normalizedOnboardingCompletions > 0 && input.onboardingStartSource === "completion_fallback" ? "warn" : "pass",
      detail: input.onboardingStartCount > 0
        ? input.onboardingStartSource === "tracked"
          ? `${input.onboardingStartCount.toLocaleString()} onboarding starts and ${input.normalizedOnboardingCompletions.toLocaleString()} completions were tracked directly. Confidence ${onboardingParity.score}%.`
          : `${input.normalizedOnboardingCompletions.toLocaleString()} onboarding completions were tracked, so the legacy start counter is falling back to completed sessions until more start events land. Confidence ${onboardingParity.score}%.`
        : "No onboarding activity matched the selected range.",
    },
    {
      label: "Task guidance parity",
      status: input.taskGuidance.completed <= input.taskGuidance.tapped && input.taskGuidance.tapped <= input.taskGuidance.viewed ? taskGuidanceParity.status : "warn",
      detail: `${input.taskGuidance.viewed.toLocaleString()} guide views, ${input.taskGuidance.dismissed.toLocaleString()} dismissals, ${input.taskGuidance.tapped.toLocaleString()} guide taps, and ${input.taskGuidance.completed.toLocaleString()} guided completions were collected in range. Confidence ${taskGuidanceParity.score}%.`,
    },
    {
      label: "Module coverage",
      status: unhealthyModules.length === 0 ? "pass" : unhealthyModules.length <= 3 ? "warn" : "fail",
      detail: unhealthyModules.length === 0
        ? `All ${moduleCoverage.length.toLocaleString()} indexed analytics modules are populated across the selected range. Parity score ${parityScore}%.`
        : `${unhealthyModules.length.toLocaleString()} of ${moduleCoverage.length.toLocaleString()} indexed analytics modules are partial or empty. Parity score ${parityScore}%.`,
    },
    {
      label: "Viewer drilldown",
      status: (input.watchSessionCount > 0 || input.filteredSessionFactsLength > 0 || input.viewerSessionStartedLogsLength > 0) ? "pass" : "warn",
      detail: (input.watchSessionCount > 0 || input.filteredSessionFactsLength > 0 || input.viewerSessionStartedLogsLength > 0)
        ? `${input.watchSessionCount.toLocaleString()} canonical watch sessions, ${input.watchAssetCount.toLocaleString()} watch assets, ${input.filteredSessionFactsLength.toLocaleString()} session facts, and ${input.viewerSessionStartedLogsLength.toLocaleString()} raw session-start events matched the selected range.`
        : "No viewer sessions matched the selected range and filter.",
    },
  ];

  return {
    moduleCoverage,
    unhealthyModules,
    parityScore,
    validations,
  };
}
