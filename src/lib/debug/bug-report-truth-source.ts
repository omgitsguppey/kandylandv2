import { summarizeBugReportsForAdmin } from "@/lib/errors/bug-report-admin-summary";

import {
  buildBugReportTruthState,
  type BugReportTruthInputReport,
} from "./bug-report-truth-contract";

export function buildBugReportTruthSource(input: {
  reports: Array<Record<string, unknown>>;
  readLimit: number;
  generatedAtMs?: number;
  sourcePath?: string;
  loadError?: unknown;
}) {
  const limit = Math.min(Math.max(input.readLimit || 50, 1), 50);
  const generatedAtMs = input.generatedAtMs ?? Date.now();
  const sourcePath = input.sourcePath || "/api/admin/debug/bug-reports";
  const reports = input.reports.slice(0, limit);
  const reportTimes = reports
    .map((report) => typeof report.createdAt === "number" ? report.createdAt : 0)
    .filter((value) => value > 0);
  const sourceWindow = {
    fromUtc: new Date(reportTimes.length > 0 ? Math.min(...reportTimes) : generatedAtMs).toISOString(),
    toUtc: new Date(reportTimes.length > 0 ? Math.max(...reportTimes) : generatedAtMs).toISOString(),
    label: `latest_${limit}`,
  };
  const truthReports: BugReportTruthInputReport[] = reports.map((report) => ({
    id: typeof report.id === "string" ? report.id : undefined,
    createdAt: typeof report.createdAt === "number" ? report.createdAt : undefined,
    status: typeof report.status === "string" ? report.status : undefined,
    rewardGd: typeof report.rewardGd === "number" ? report.rewardGd : undefined,
  }));
  const truth = buildBugReportTruthState({
    sourceLoaded: !input.loadError,
    sourceExists: true,
    reports: input.loadError ? [] : truthReports,
    sourceWindow,
    generatedAtMs,
    loadError: input.loadError,
    sourcePath,
  });

  return {
    success: !input.loadError,
    generatedAtMs,
    source: "bug_reports",
    sourcePath,
    sourceWindow,
    readOnly: true,
    limit,
    redactionStatus: "summary_only_raw_bodies_redacted" as const,
    reports: truthReports,
    counts: {
      reportCount: truth.reportCount,
      recentCount: truth.recentCount,
      olderBacklogCount: truth.olderBacklogCount,
      needsTriageCount: truth.needsTriageCount,
      rewardStateCount: truth.rewardStateCount,
      operatorMessageCount: truth.operatorMessageCount,
      translatedErrorCount: truth.translatedErrorCount,
    },
    issues: truth.loadError ? [truth.loadError] : [],
    truth,
    summary: input.loadError ? null : summarizeBugReportsForAdmin(reports, {
      readLimit: limit,
      generatedAtUtc: new Date(generatedAtMs).toISOString(),
    }),
  };
}
