export type AdminDebugDrilldownLoaderStatus =
  | "planned"
  | "ui_not_ready_for_section_requests"
  | "manual_split_required";

export type AdminDebugDrilldownLoaderPlan = {
  sectionId: string;
  owner: string;
  status: AdminDebugDrilldownLoaderStatus;
  futureLoaderName: string;
  prerequisite: string;
  nextAction: string;
};

export const ADMIN_DEBUG_DRILLDOWN_LOADER_SPLIT_PLAN: AdminDebugDrilldownLoaderPlan[] = [
  {
    sectionId: "tracking_summary",
    owner: "admin-debug",
    status: "ui_not_ready_for_section_requests",
    futureLoaderName: "loadTrackingSummaryDebugSection",
    prerequisite: "Admin Debug UI callers must request section-specific drilldowns before the all-section branch is split.",
    nextAction: "Extract tracking summary evidence only after section request plumbing is available.",
  },
  {
    sectionId: "route_runtime",
    owner: "admin-debug",
    status: "ui_not_ready_for_section_requests",
    futureLoaderName: "loadRouteRuntimeDebugSection",
    prerequisite: "Route runtime rows must stay grouped by current/stale/listener status during split.",
    nextAction: "Move route runtime grouping into a section loader without adding new evidence lanes to the monolith.",
  },
  {
    sectionId: "generated_reports",
    owner: "admin-debug",
    status: "planned",
    futureLoaderName: "loadGeneratedReportDebugSection",
    prerequisite: "Generated report freshness must stay evidence-only and cannot override runtime source truth.",
    nextAction: "Split generated report ingestion from live debug evidence when UI consumers support per-section loading.",
  },
];

export const ADMIN_DEBUG_DRILLDOWN_LOADER_CONTRACT = {
  sourceFile: "src/app/api/admin/debug/route.ts",
  status: "manual_split_required",
  rule: "Do not add more evidence lanes directly to the admin debug route monolith before section-specific loaders exist.",
  splitPlan: ADMIN_DEBUG_DRILLDOWN_LOADER_SPLIT_PLAN,
} as const;
