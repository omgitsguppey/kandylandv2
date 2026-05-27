import type { BackendRouteInventoryReport, ValidationResult } from "./backend-route-inventory";
import { buildBackendRouteInventoryReport } from "./backend-route-inventory";

export interface BackendCostConsolidationReport {
  reportKey: "backend-cost-consolidation";
  generatedAtUtc: string;
  currentHead: string;
  adminDebugDefaultMode: "summary_first";
  rawDrilldownPolicy: "explicit_paged_drilldown_only";
  nonCriticalAnalyticsRefresh: "24h";
  realtimePolicy: "user_critical_only";
  diagnosticsPolicy: "fingerprinted_hourly";
  topCostRisks: string[];
  costRisksReduced: string[];
  unsafeUnknowns: string[];
}

export function buildBackendCostConsolidationReport(input: { generatedAtUtc?: string; currentHead?: string; inventory?: BackendRouteInventoryReport } = {}): BackendCostConsolidationReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const inventory = input.inventory ?? buildBackendRouteInventoryReport({ generatedAtUtc, currentHead });
  const topCostRisks = inventory.entries
    .filter((entry) => /review_read_bound|medium_parallel_collection|high_unbounded_collection/u.test(entry.productionReadRisk))
    .slice(0, 10)
    .map((entry) => `${entry.method} ${entry.routePath}: ${entry.productionReadRisk}; owner=${entry.canonicalServiceOwner}`);
  return {
    reportKey: "backend-cost-consolidation",
    generatedAtUtc,
    currentHead,
    adminDebugDefaultMode: "summary_first",
    rawDrilldownPolicy: "explicit_paged_drilldown_only",
    nonCriticalAnalyticsRefresh: "24h",
    realtimePolicy: "user_critical_only",
    diagnosticsPolicy: "fingerprinted_hourly",
    topCostRisks,
    costRisksReduced: [
      "Admin/debug default summary only",
      "Raw drilldowns paged and explicit",
      "Non-critical analytics refresh 24h",
      "Realtime only for user-critical features",
      "Diagnostics fingerprinted/hourly",
      "No per-event BigQuery export from runtime routes",
      "No casual Cloud SQL/Data Connect mirror sync",
      "No paid AI/Gemini/Cloud Assist calls from runtime paths",
      "Firestore reads classified as bounded, review, or drilldown",
      "Broad Promise.all fanout classified for service consolidation",
    ],
    unsafeUnknowns: inventory.unsafeUnknowns,
  };
}

export function validateBackendCostConsolidationReport(report: BackendCostConsolidationReport): ValidationResult {
  const failures: string[] = [];
  if (report.adminDebugDefaultMode !== "summary_first") failures.push("Admin/debug default output must be summary-first.");
  if (report.rawDrilldownPolicy !== "explicit_paged_drilldown_only") failures.push("Raw debug detail must be explicit paged drilldown only.");
  if (report.unsafeUnknowns.length) failures.push(`Unsafe unknown cost risks: ${report.unsafeUnknowns.join(", ")}`);
  if (report.topCostRisks.length > 10) failures.push("Default cost report must not dump every route risk.");
  return { failures };
}
