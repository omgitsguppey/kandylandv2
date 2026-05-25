import { ADMIN_HEARTBEAT_INTERVAL_MS } from "@/lib/admin/admin-heartbeat-contract";

export type AdminHotCacheCostEstimate = {
  oldEstimatedReadsPerLoad: number;
  newEstimatedReadsPerLoad: number;
  oldReadPaths: string[];
  newReadPaths: string[];
  oldListenerReadRisk: "high";
  newListenerReadRisk: "low";
  oldPollingIntervalMs: number;
  newHeartbeatIntervalMs: number;
  estimatedReadReductionPct: number;
  estimatedListenerReductionPct: number;
  estimatedPollingReductionPct: number;
  notes: string[];
};

export function buildAdminHotCacheCostEstimate(): AdminHotCacheCostEstimate {
  const oldReadPaths = [
    "users query up to 5000 docs",
    "drops query up to 5000 docs",
    "recent transactions query",
    "admin adjustments query",
    "analytics_commerce_rollup summary doc",
    "analytics_commerce_daily rolling window query",
    "analytics_task_daily rolling window query",
    "analytics_drop_daily rolling window query",
    "admin user truth snapshot doc",
    "admin telemetry logs query",
    "support and bug report bounded count aggregates",
  ];
  const newReadPaths = [
    "admin_overview_snapshot hot-cache doc",
    "admin_overview_snapshot heartbeat doc",
    "optional bounded recent feed summary doc",
  ];
  const oldEstimatedReadsPerLoad = 5_000 + 5_000 + 20 + 20 + 1 + 90 + 90 + 90 + 1 + 20 + 4;
  const newEstimatedReadsPerLoad = newReadPaths.length;
  const oldPollingIntervalMs = 60_000;
  const estimatedReadReductionPct = Number((((oldEstimatedReadsPerLoad - newEstimatedReadsPerLoad) / oldEstimatedReadsPerLoad) * 100).toFixed(2));
  const estimatedPollingReductionPct = Number((((ADMIN_HEARTBEAT_INTERVAL_MS - oldPollingIntervalMs) / ADMIN_HEARTBEAT_INTERVAL_MS) * 100).toFixed(2));

  return {
    oldEstimatedReadsPerLoad,
    newEstimatedReadsPerLoad,
    oldReadPaths,
    newReadPaths,
    oldListenerReadRisk: "high",
    newListenerReadRisk: "low",
    oldPollingIntervalMs,
    newHeartbeatIntervalMs: ADMIN_HEARTBEAT_INTERVAL_MS,
    estimatedReadReductionPct,
    estimatedListenerReductionPct: 100,
    estimatedPollingReductionPct,
    notes: [
      "Operation estimate only; no billing amount is claimed without billing export evidence.",
      "New page-load path reads hot-cache/heartbeat summary documents and does not start Firestore listeners.",
    ],
  };
}
