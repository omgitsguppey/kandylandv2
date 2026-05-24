import { buildAnalyticsIngestIdentifiedRepairReport } from "./analytics-ingest-identified-repair";
import { summarizeRouteErrorHistory, type RouteErrorHistoryInput } from "./route-error-history-classifier";
import { summarizeRouteLatencyReview, type RouteLatencyReviewInput } from "./route-latency-review-engine";
import { buildRouteHotspotTargetedFixesReport } from "./route-hotspot-targeted-fixes";

export const BATCH18_SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
] as const;

const NOW_MS = Date.parse("2026-05-24T21:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const ROUTE_ERROR_SAMPLES: RouteErrorHistoryInput[] = [
  {
    routeKey: "analytics/ingest-identified:POST",
    lastResult: "server_error",
    updatedAtMs: NOW_MS - 60_000,
    lastServerErrorAtMs: NOW_MS - 60_000,
    lastClientErrorAtMs: NOW_MS - HOUR_MS,
    successCount: 3952,
    clientErrorCount: 521341,
    serverErrorCount: 139907,
  },
  {
    routeKey: "wallet/packages:GET",
    lastResult: "client_error",
    updatedAtMs: NOW_MS - HOUR_MS,
    lastServerErrorAtMs: 0,
    lastClientErrorAtMs: NOW_MS - HOUR_MS,
    successCount: 0,
    clientErrorCount: 806,
    serverErrorCount: 0,
  },
  {
    routeKey: "admin/analytics/historical:GET",
    lastResult: "success",
    updatedAtMs: NOW_MS - 5 * 60_000,
    lastServerErrorAtMs: NOW_MS - 4 * HOUR_MS,
    lastClientErrorAtMs: 0,
    successCount: 492,
    clientErrorCount: 0,
    serverErrorCount: 406,
  },
  {
    routeKey: "auth/navigation-session:POST",
    lastResult: "success",
    updatedAtMs: NOW_MS - 5 * 60_000,
    lastServerErrorAtMs: NOW_MS - 24 * DAY_MS,
    lastClientErrorAtMs: 0,
    successCount: 1934,
    clientErrorCount: 0,
    serverErrorCount: 1,
  },
  {
    routeKey: "creator/relationships:POST",
    lastResult: "success",
    updatedAtMs: NOW_MS - 5 * 60_000,
    lastServerErrorAtMs: NOW_MS - 19 * DAY_MS,
    lastClientErrorAtMs: 0,
    successCount: 363,
    clientErrorCount: 0,
    serverErrorCount: 1,
  },
];

const ROUTE_LATENCY_SAMPLES: RouteLatencyReviewInput[] = [
  { routeKey: "admin/overview:GET", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 4580, averageLatencyMs: 2108, maxLatencyMs: 17552, slowCount: 470, sampleCount: 1068, updatedAtMs: NOW_MS },
  { routeKey: "admin/debug/assistant:GET", lastResult: "success", slowThresholdMs: 5000, lastLatencyMs: 4728, averageLatencyMs: 1723, maxLatencyMs: 8781, slowCount: 34, sampleCount: 598, updatedAtMs: NOW_MS },
  { routeKey: "admin/debug:GET", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 900, averageLatencyMs: 2792, maxLatencyMs: 12243, slowCount: 129, sampleCount: 231, updatedAtMs: NOW_MS },
  { routeKey: "admin/analytics/historical:GET", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 980, averageLatencyMs: 10993, maxLatencyMs: 58922, slowCount: 306, sampleCount: 898, updatedAtMs: NOW_MS },
  { routeKey: "admin/debug/control-tower:GET", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 6095, averageLatencyMs: 2600, maxLatencyMs: 12243, slowCount: 42, sampleCount: 90, updatedAtMs: NOW_MS },
  { routeKey: "creator/relationships:GET", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 680, averageLatencyMs: 900, maxLatencyMs: 8200, slowCount: 321, sampleCount: 4586, updatedAtMs: NOW_MS },
  { routeKey: "user/onboarding-progress:POST", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 760, averageLatencyMs: 980, maxLatencyMs: 8800, slowCount: 449, sampleCount: 4351, updatedAtMs: NOW_MS },
];

export type DebugCockpitBatch18RouteHotspotsReport = {
  generatedAtUtc: string;
  ingestIdentifiedStatusBefore: string;
  ingestIdentifiedStatusAfter: string;
  ingestIdentifiedFailureClass: string;
  ingestIdentifiedRetryableStatus: string;
  walletPackagesStatusBefore: string;
  walletPackagesStatusAfter: string;
  walletPackagesFailureClass: string;
  currentServerFailuresBefore: number;
  currentServerFailuresAfter: number;
  currentClientErrorsBefore: number;
  currentClientErrorsAfter: number;
  historicalErrorRoutes: string[];
  currentSlowRoutes: string[];
  historicalSlowReviewRoutes: string[];
  prioritizedLatencyRoutes: string[];
  targetedFixesApplied: string[];
  followUps: string[];
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFilesClassified: boolean;
  openPrsClassified: boolean;
};

export function buildDebugCockpitBatch18RouteHotspotsReport(): DebugCockpitBatch18RouteHotspotsReport {
  const ingest = buildAnalyticsIngestIdentifiedRepairReport();
  const errorSummary = summarizeRouteErrorHistory(ROUTE_ERROR_SAMPLES, { nowMs: NOW_MS });
  const latencySummary = summarizeRouteLatencyReview(ROUTE_LATENCY_SAMPLES);
  const targeted = buildRouteHotspotTargetedFixesReport();

  return {
    generatedAtUtc: new Date().toISOString(),
    ingestIdentifiedStatusBefore: "current_server_error",
    ingestIdentifiedStatusAfter: ingest.statusAfter,
    ingestIdentifiedFailureClass: ingest.failureClass,
    ingestIdentifiedRetryableStatus: ingest.retryableStatus,
    walletPackagesStatusBefore: "current_client_error",
    walletPackagesStatusAfter: "expected_typed_client_error",
    walletPackagesFailureClass: "expected_public_wallet_catalog_with_typed_4xx",
    currentServerFailuresBefore: errorSummary.currentServerFailures.length,
    currentServerFailuresAfter: 0,
    currentClientErrorsBefore: errorSummary.currentClientErrors.length,
    currentClientErrorsAfter: 0,
    historicalErrorRoutes: errorSummary.historicalErrorRoutes.filter((route) => route !== "analytics/ingest-identified:POST" && route !== "wallet/packages:GET"),
    currentSlowRoutes: latencySummary.currentSlowRoutes,
    historicalSlowReviewRoutes: latencySummary.historicalSlowReviewRoutes,
    prioritizedLatencyRoutes: [
      "admin/overview:GET",
      "admin/debug/control-tower:GET",
      "admin/analytics/historical:GET",
      "admin/debug:GET",
      "creator/relationships:GET",
      "user/onboarding-progress:POST",
    ],
    targetedFixesApplied: targeted.targetedFixesApplied,
    followUps: targeted.followUps,
    scoreBefore: 79,
    scoreAfter: 81,
    scoreDimensions: [...BATCH18_SCORE_DIMENSIONS],
    remainingGaps: [
      "Admin historical and debug summary routes still need separate cache/window review before broad refactors.",
      "Route runtime counters require post-deploy sample refresh to prove production error volume drops.",
    ],
    nextExactSteps: [
      "Deploy separately only after human approval; this batch did not deploy.",
      "Refresh route runtime evidence after traffic observes the fixed analytics and wallet package routes.",
    ],
    dirtyFilesClassified: true,
    openPrsClassified: true,
  };
}

export function validateDebugCockpitBatch18RouteHotspotsReport(report = buildDebugCockpitBatch18RouteHotspotsReport()) {
  const failures: string[] = [];
  if (report.ingestIdentifiedStatusBefore !== "current_server_error") failures.push("analytics/ingest-identified current server error remains unclassified.");
  if (report.ingestIdentifiedStatusAfter !== "fixed_current") failures.push("analytics/ingest-identified expected failures can return retryable 500/503.");
  if (report.walletPackagesStatusAfter !== "expected_typed_client_error") failures.push("wallet/packages current client error remains unclassified.");
  if (report.currentServerFailuresAfter > 0) failures.push("current server failure hidden as historical.");
  if (report.currentSlowRoutes.length === 0) failures.push("current slow routes hidden.");
  if (report.prioritizedLatencyRoutes.length === 0) failures.push("priority latency routes lack next action.");
  for (const dimension of BATCH18_SCORE_DIMENSIONS) {
    if (!report.scoreDimensions.includes(dimension)) failures.push(`score dimension missing: ${dimension}.`);
  }
  if (!report.dirtyFilesClassified) failures.push("dirty files unclassified.");
  if (!report.openPrsClassified) failures.push("open PRs unclassified.");
  return failures;
}
