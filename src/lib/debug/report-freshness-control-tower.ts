export type ControlTowerRequiredReportInput = {
  artifactPath: string;
  owner: string;
  generatedAtUtc?: string | null;
  artifactHead?: string | null;
  requiredFreshnessWindowHours: number;
  status?: string | null;
  replacementArtifact?: string | null;
  refreshCommand?: string | null;
  scoreImpact?: number | null;
  formalGateOnly?: boolean;
};

export type ControlTowerReportFreshnessInput = {
  currentHead: string;
  reports: ControlTowerRequiredReportInput[];
  nowUtc?: string;
};

export type ControlTowerReportFreshnessResult = {
  requiredReports: number;
  staleReports: string[];
  missingReports: string[];
  staleButFormalGateOnly: string[];
  staleAndRefreshable: string[];
  refreshedCurrent: string[];
  supersededRetired: string[];
  sourceBugArtifacts: string[];
  reportAverageDisplay: string;
};

function ageHours(generatedAtUtc: string | null | undefined, nowMs: number) {
  if (!generatedAtUtc) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(generatedAtUtc);
  return Number.isFinite(parsed) ? Math.max(0, (nowMs - parsed) / 36e5) : Number.POSITIVE_INFINITY;
}

function isCleanCurrent(report: ControlTowerRequiredReportInput, currentHead: string, nowMs: number) {
  return report.artifactHead === currentHead
    && ageHours(report.generatedAtUtc, nowMs) <= report.requiredFreshnessWindowHours
    && /clean_current|current|source_ready|pass|passed/iu.test(String(report.status ?? "current"));
}

export function classifyControlTowerReportFreshness(input: ControlTowerReportFreshnessInput): ControlTowerReportFreshnessResult {
  const nowMs = Date.parse(input.nowUtc ?? new Date().toISOString());
  const staleReports: string[] = [];
  const missingReports: string[] = [];
  const staleButFormalGateOnly: string[] = [];
  const staleAndRefreshable: string[] = [];
  const refreshedCurrent: string[] = [];
  const supersededRetired: string[] = [];
  const sourceBugArtifacts: string[] = [];

  for (const report of input.reports) {
    const missing = !report.generatedAtUtc && !report.status;
    const stale = missing
      || report.artifactHead !== input.currentHead
      || ageHours(report.generatedAtUtc, nowMs) > report.requiredFreshnessWindowHours
      || /stale/iu.test(String(report.status ?? ""));
    if (missing) missingReports.push(report.artifactPath);
    if (!stale || isCleanCurrent(report, input.currentHead, nowMs)) {
      refreshedCurrent.push(report.artifactPath);
      continue;
    }
    staleReports.push(report.artifactPath);
    if (report.replacementArtifact || /score-80-path-lock|final-launch-readiness-report/iu.test(report.artifactPath)) {
      supersededRetired.push(report.artifactPath);
    }
    if (report.formalGateOnly) {
      staleButFormalGateOnly.push(report.artifactPath);
    } else if (report.refreshCommand) {
      staleAndRefreshable.push(report.artifactPath);
      if ((report.scoreImpact ?? 0) > 0) sourceBugArtifacts.push(report.artifactPath);
    }
  }

  return {
    requiredReports: input.reports.length,
    staleReports,
    missingReports,
    staleButFormalGateOnly,
    staleAndRefreshable,
    refreshedCurrent,
    supersededRetired,
    sourceBugArtifacts,
    reportAverageDisplay: `Report evidence summary includes current/stale split: ${refreshedCurrent.length} current, ${staleReports.length} stale, ${missingReports.length} missing.`,
  };
}
