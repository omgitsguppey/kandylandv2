export type MonolithRiskLevel = "low" | "medium" | "high" | "critical";

export interface MonolithRiskRegistryItem {
  filePath: string;
  lineCount: number;
  domainsMixed: string[];
  riskLevel: MonolithRiskLevel;
  splitRecommendation: string;
  owner: string;
  linkedMetrics: string[];
  linkedRoutes: string[];
  nextAction: string;
}

export const MONOLITH_LINE_THRESHOLD = 1_000;

const DEFAULT_MONOLITH_REGISTRY: MonolithRiskRegistryItem[] = [
  {
    filePath: "src/app/api/admin/debug/route.ts",
    lineCount: 6791,
    domainsMixed: ["admin-debug", "telemetry", "runtime-evidence", "route-diagnostics", "cost-evidence"],
    riskLevel: "critical",
    splitRecommendation: "Split the all-section branch into section-specific drilldown loaders after UI callers support section-specific requests.",
    owner: "admin-debug",
    linkedMetrics: ["admin_debug_evidence", "runtime_watch_time", "external_ga4_evidence", "behavior_signals"],
    linkedRoutes: ["/api/admin/debug"],
    nextAction: "Extract named drilldown loaders for the highest-churn debug sections before adding more evidence lanes.",
  },
  {
    filePath: "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
    lineCount: 3205,
    domainsMixed: ["admin-analytics", "state", "metric-snapshots", "telemetry-freshness"],
    riskLevel: "critical",
    splitRecommendation: "Move metric fetch, freshness derivation, and tab-specific state into named admin analytics hooks.",
    owner: "admin-analytics",
    linkedMetrics: ["page_views", "sessions", "purchase_events", "creator_interactions"],
    linkedRoutes: ["/admin/analytics"],
    nextAction: "Split state by tab the next time a metric source or consumer changes in admin analytics.",
  },
  {
    filePath: "src/app/api/admin/analytics/historical/route.ts",
    lineCount: 2004,
    domainsMixed: ["admin-analytics", "historical-rollups", "validation", "telemetry"],
    riskLevel: "high",
    splitRecommendation: "Keep routing thin and continue moving validation/math helpers into server admin-analytics modules.",
    owner: "admin-analytics",
    linkedMetrics: ["page_views", "sessions", "behavior_signals", "purchase_events"],
    linkedRoutes: ["/api/admin/analytics/historical"],
    nextAction: "When touching historical analytics, extract one cohesive validation helper instead of adding route-local branches.",
  },
  {
    filePath: "functions/src/behavioral-intelligence-runtime.ts",
    lineCount: 2381,
    domainsMixed: ["behavioral-intelligence", "recommendations", "materialization", "scoring"],
    riskLevel: "high",
    splitRecommendation: "Separate materializer orchestration from scoring feature extraction and recommendation output shaping.",
    owner: "behavioral-intelligence",
    linkedMetrics: ["behavior_signals", "runtime_watch_time", "creator_interactions"],
    linkedRoutes: ["scheduled behavioral intelligence rebuild"],
    nextAction: "Add split plan before new behavior metrics are added to the runtime materializer.",
  },
  {
    filePath: "scripts/agent/validate-admin-debug-control-tower.ts",
    lineCount: 2581,
    domainsMixed: ["debug-validation", "admin-debug", "generated-report-validation"],
    riskLevel: "high",
    splitRecommendation: "Move report-specific assertions into small validator modules and keep the top-level script as an orchestrator.",
    owner: "debug-validation",
    linkedMetrics: ["admin_debug_evidence", "runtime_watch_time"],
    linkedRoutes: ["npm run check:admin-debug-control-tower"],
    nextAction: "Split one report-specific assertion cluster when the validator is next edited.",
  },
];

export function buildMonolithRiskRegistry(items: readonly MonolithRiskRegistryItem[] = DEFAULT_MONOLITH_REGISTRY): MonolithRiskRegistryItem[] {
  return items.map((item) => ({
    ...item,
    domainsMixed: [...item.domainsMixed],
    linkedMetrics: [...item.linkedMetrics],
    linkedRoutes: [...item.linkedRoutes],
  }));
}

export function validateMonolithRiskRegistry(items: readonly MonolithRiskRegistryItem[]): string[] {
  const failures: string[] = [];
  const paths = new Set<string>();

  for (const item of items) {
    if (!item.filePath) failures.push("monolith item lacks file path.");
    if (item.filePath && paths.has(item.filePath)) failures.push(`${item.filePath} is duplicated.`);
    paths.add(item.filePath);

    if (item.lineCount > MONOLITH_LINE_THRESHOLD && !item.owner) {
      failures.push(`${item.filePath} lacks owner for monolith over threshold.`);
    }
    if (item.lineCount > MONOLITH_LINE_THRESHOLD && !item.splitRecommendation) {
      failures.push(`${item.filePath} lacks split recommendation for monolith over threshold.`);
    }
    if ((item.riskLevel === "high" || item.riskLevel === "critical") && !item.nextAction) {
      failures.push(`${item.filePath} lacks next action for high-risk monolith.`);
    }
    if ((item.riskLevel === "high" || item.riskLevel === "critical") && item.domainsMixed.length < 2) {
      failures.push(`${item.filePath} lacks mixed-domain classification.`);
    }
    if (!item.linkedMetrics.length && !item.linkedRoutes.length) {
      failures.push(`${item.filePath} lacks linked metrics/routes.`);
    }
  }

  return failures;
}
