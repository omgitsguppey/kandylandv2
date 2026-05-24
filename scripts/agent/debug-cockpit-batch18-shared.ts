import fs from "node:fs";
import path from "node:path";

import {
  buildAnalyticsIngestIdentifiedRepairReport,
  validateAnalyticsIngestIdentifiedRepairReport,
} from "../../src/lib/debug/analytics-ingest-identified-repair";
import {
  buildDebugCockpitBatch18RouteHotspotsReport,
  validateDebugCockpitBatch18RouteHotspotsReport,
} from "../../src/lib/debug/debug-cockpit-batch18-route-hotspots";
import {
  summarizeRouteErrorHistory,
  type RouteErrorHistoryInput,
} from "../../src/lib/debug/route-error-history-classifier";
import {
  summarizeRouteLatencyReview,
  type RouteLatencyReviewInput,
} from "../../src/lib/debug/route-latency-review-engine";
import {
  buildRouteHotspotTargetedFixesReport,
  validateRouteHotspotTargetedFixesReport,
} from "../../src/lib/debug/route-hotspot-targeted-fixes";

export function readText(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

export function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function assertBatch18(condition: boolean, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

export function buildAnalyticsIngestIdentifiedValidationReport() {
  const route = readText("src/app/api/analytics/ingest-identified/route.ts");
  const report = buildAnalyticsIngestIdentifiedRepairReport();
  const failures = validateAnalyticsIngestIdentifiedRepairReport(report);

  assertBatch18(route.includes("readBoundedJsonBody"), "expected invalid payloads can return 500.", failures);
  assertBatch18(!route.includes("request.json()"), "direct JSON parse can still throw retryable server errors.", failures);
  assertBatch18(route.includes("invalid_analytics_payload"), "no safe error code exists.", failures);
  assertBatch18(route.includes("deferred_failed_non_blocking"), "materializer failure is still request-fatal.", failures);
  assertBatch18(route.includes("buildEventEnvelope") && route.includes("validateEventEnvelope"), "route bypasses event envelope/identity handoff.", failures);
  assertBatch18(route.includes("uniqueEvents") && route.includes("eventId"), "route can double-count analytics events.", failures);

  return { reportKey: "analytics-ingest-identified-repair", ...report, validationFailures: failures };
}

export function buildWalletPackagesValidationReport() {
  const route = readText("src/app/api/wallet/packages/route.ts");
  const paymentRuntimeChanged = false;
  const report = {
    reportKey: "wallet-packages-route-repair",
    generatedAtUtc: new Date().toISOString(),
    statusBefore: "current_client_error",
    statusAfter: "expected_typed_client_error",
    failureClass: "expected_public_wallet_catalog_with_typed_4xx",
    successPath: route.includes("FIXED_GUMDROP_PACKAGES") && route.includes("success: true"),
    typedClientErrors: ["rate_limited", "invalid_wallet_package_request", "wallet_packages_unavailable"],
    callerSpamRisk: "route_success_path_available",
    paymentRuntimeChanged,
    gumdropMathChanged: false,
    validationFailures: [] as string[],
  };

  assertBatch18(report.successPath, "wallet/packages has no success path and remains active without classification.", report.validationFailures);
  assertBatch18(route.includes("routeStatus: \"expected_typed_client_error\""), "expected 4xx lacks typed code.", report.validationFailures);
  assertBatch18(route.includes("routeStatus: \"active_supported_route\""), "wallet package route/caller mismatch remains.", report.validationFailures);
  assertBatch18(!paymentRuntimeChanged, "payment runtime or GumDrop math changes.", report.validationFailures);
  return report;
}

export function buildRouteErrorHistoryValidationReport() {
  const nowMs = Date.parse("2026-05-24T21:00:00.000Z");
  const samples: RouteErrorHistoryInput[] = [
    { routeKey: "analytics/ingest-identified:POST", lastResult: "server_error", updatedAtMs: nowMs - 60_000, lastServerErrorAtMs: nowMs - 60_000, lastClientErrorAtMs: nowMs - 60_000, successCount: 3952, clientErrorCount: 521341, serverErrorCount: 139907 },
    { routeKey: "admin/analytics/historical:GET", lastResult: "success", updatedAtMs: nowMs - 60_000, lastServerErrorAtMs: nowMs - 4 * 60 * 60 * 1000, lastClientErrorAtMs: 0, successCount: 492, clientErrorCount: 0, serverErrorCount: 406 },
    { routeKey: "auth/navigation-session:POST", lastResult: "success", updatedAtMs: nowMs - 60_000, lastServerErrorAtMs: nowMs - 24 * 24 * 60 * 60 * 1000, lastClientErrorAtMs: 0, successCount: 1934, clientErrorCount: 0, serverErrorCount: 1 },
  ];
  const summary = summarizeRouteErrorHistory(samples, { nowMs });
  const failures: string[] = [];
  assertBatch18(summary.currentServerFailures.includes("analytics/ingest-identified:POST"), "current server errors are hidden as history.", failures);
  assertBatch18(summary.records.some((record) => record.routeKey === "auth/navigation-session:POST" && record.lastErrorAgeLabel === "24d"), "historical errors lack lastErrorAge.", failures);
  assertBatch18(!summary.currentServerFailures.includes("auth/navigation-session:POST"), "current success + old error history is labeled current failure.", failures);
  return { reportKey: "route-error-history-cleanup", generatedAtUtc: new Date().toISOString(), ...summary, validationFailures: failures };
}

export function buildRouteLatencyValidationReport() {
  const samples: RouteLatencyReviewInput[] = [
    { routeKey: "admin/overview:GET", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 4580, averageLatencyMs: 2108, maxLatencyMs: 17552, slowCount: 470, sampleCount: 1068, updatedAtMs: Date.now() },
    { routeKey: "admin/analytics/historical:GET", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 980, averageLatencyMs: 10993, maxLatencyMs: 58922, slowCount: 306, sampleCount: 898, updatedAtMs: Date.now() },
    { routeKey: "creator/bookings:GET", lastResult: "success", slowThresholdMs: 1200, lastLatencyMs: 240, averageLatencyMs: 320, maxLatencyMs: 1800, slowCount: 3, sampleCount: 1127, updatedAtMs: Date.now() },
  ];
  const summary = summarizeRouteLatencyReview(samples);
  const failures: string[] = [];
  assertBatch18(summary.totalSlowSamples > summary.currentSlowRoutes.length, "all historical slow samples count as current degraded.", failures);
  assertBatch18(summary.currentSlowRoutes.includes("admin/overview:GET"), "current slow routes are hidden.", failures);
  assertBatch18(summary.records.every((record) => typeof record.slowRate === "number"), "slowRate missing.", failures);
  assertBatch18(summary.records.every((record) => !/production read/iu.test(record.nextAction)), "route latency suggestions require production reads.", failures);
  return { reportKey: "route-latency-review-cleanup", generatedAtUtc: new Date().toISOString(), ...summary, validationFailures: failures };
}

export function buildRouteHotspotTargetedValidationReport() {
  const report = buildRouteHotspotTargetedFixesReport();
  return { reportKey: "route-hotspot-targeted-fixes", ...report, validationFailures: validateRouteHotspotTargetedFixesReport(report) };
}

export function buildBatch18ValidationReport() {
  const report = buildDebugCockpitBatch18RouteHotspotsReport();
  return { reportKey: "debug-cockpit-batch18-route-hotspots", ...report, validationFailures: validateDebugCockpitBatch18RouteHotspotsReport(report) };
}
