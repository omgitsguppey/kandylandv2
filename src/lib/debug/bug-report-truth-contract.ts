export type BugReportTruthStatus =
  | "loading"
  | "loaded_with_reports"
  | "loaded_empty"
  | "source_ready_no_sample_loaded"
  | "source_missing_actionable"
  | "unavailable"
  | "failed"
  | "stale"
  | "blocked_by_permissions"
  | "unknown";

export type BugReportTruthSourceWindow = {
  fromUtc: string;
  toUtc: string;
  label: string;
};

export type BugReportTruthInputReport = {
  id?: string;
  createdAt?: number;
  status?: string;
  rewardGd?: number;
  userMessage?: string;
  operatorMessage?: string;
  translatedError?: string;
};

export type BugReportTruthState = {
  status: BugReportTruthStatus;
  reportCount: number;
  recentCount: number;
  olderBacklogCount: number;
  needsTriageCount: number;
  rewardStateCount: number;
  operatorMessageCount: number;
  translatedErrorCount: number;
  sourceWindow: BugReportTruthSourceWindow | null;
  generatedAtMs: number | null;
  loadError: string | null;
  sourcePath: string;
  redactionStatus: "summary_only_raw_bodies_redacted" | "not_loaded";
  nextAction: string;
};

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function safeLoadError(error: unknown) {
  if (!error) return null;
  return "Bug report truth route failed. Inspect admin/debug/bug-reports route diagnostics.";
}

function isNeedsTriage(report: BugReportTruthInputReport) {
  const status = typeof report.status === "string" ? report.status : "received";
  return status === "received" || status === "new" || status === "in_progress";
}

export function buildBugReportTruthState(input: {
  sourceLoaded: boolean;
  sourceExists: boolean;
  reports?: BugReportTruthInputReport[] | null;
  sourceWindow?: BugReportTruthSourceWindow | null;
  generatedAtMs?: number | null;
  loadError?: unknown;
  sourcePath?: string;
  permissionBlocked?: boolean;
  stale?: boolean;
}): BugReportTruthState {
  const sourcePath = input.sourcePath || "/api/admin/debug/bug-reports";
  const generatedAtMs = typeof input.generatedAtMs === "number" && Number.isFinite(input.generatedAtMs)
    ? input.generatedAtMs
    : null;
  const reports = Array.isArray(input.reports) ? input.reports : [];
  const nowMs = generatedAtMs ?? Date.now();
  const recentCutoffMs = nowMs - RECENT_WINDOW_MS;
  const recentCount = reports.filter((report) => (report.createdAt ?? 0) >= recentCutoffMs).length;
  const rewardStateCount = reports.filter((report) => (report.rewardGd ?? 0) > 0 || /reward/iu.test(report.status || "")).length;
  const operatorMessageCount = reports.filter((report) => typeof report.operatorMessage === "string" && report.operatorMessage.length > 0).length;
  const translatedErrorCount = reports.filter((report) => typeof report.translatedError === "string" && report.translatedError.length > 0).length;
  const needsTriageCount = reports.filter(isNeedsTriage).length;

  let status: BugReportTruthStatus = "unknown";
  let nextAction = "Load Bug Report Truth before relying on this lane.";

  if (input.permissionBlocked) {
    status = "blocked_by_permissions";
    nextAction = "Use an admin account with Debug permission before loading bug report truth.";
  } else if (input.loadError) {
    status = "failed";
    nextAction = "Inspect admin/debug/bug-reports route diagnostics; the UI has resolved to a safe failed state.";
  } else if (!input.sourceExists) {
    status = "source_missing_actionable";
    nextAction = "Restore the bounded bug report source route before treating this lane as healthy.";
  } else if (input.stale) {
    status = "stale";
    nextAction = "Refresh the bug report source window before using the loaded sample.";
  } else if (!input.sourceLoaded) {
    status = "source_ready_no_sample_loaded";
    nextAction = "Load the bounded bug report sample before treating loaded=0 as healthy.";
  } else if (!input.sourceWindow) {
    status = reports.length > 0 ? "loaded_with_reports" : "source_ready_no_sample_loaded";
    nextAction = "Attach the bug report source window before calling the lane empty or current.";
  } else if (reports.length === 0) {
    status = "loaded_empty";
    nextAction = "No bug reports were found in the loaded source window.";
  } else {
    status = "loaded_with_reports";
    nextAction = needsTriageCount > 0
      ? "Review bug report summary counts and triage current report clusters from the drilldown."
      : "No current triage action required; keep raw report bodies in drilldown-only views.";
  }

  return {
    status,
    reportCount: reports.length,
    recentCount,
    olderBacklogCount: Math.max(0, reports.length - recentCount),
    needsTriageCount,
    rewardStateCount,
    operatorMessageCount,
    translatedErrorCount,
    sourceWindow: input.sourceWindow ?? null,
    generatedAtMs,
    loadError: safeLoadError(input.loadError),
    sourcePath,
    redactionStatus: input.sourceLoaded ? "summary_only_raw_bodies_redacted" : "not_loaded",
    nextAction,
  };
}
