import {
  ANALYTICS_REWIRE_REPORT_PATH,
  buildAnalyticsRewirePhaseOneReport,
  validateAnalyticsRewirePhaseOneReport,
  writeAnalyticsRewirePhaseOneReport,
} from "./analytics-rewire-phase-one";

function main() {
  const report = buildAnalyticsRewirePhaseOneReport();
  const failures = validateAnalyticsRewirePhaseOneReport(report);

  if (failures.length > 0) {
    console.error("Analytics rewire phase one validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  writeAnalyticsRewirePhaseOneReport(report);

  const severityCounts = report.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`Analytics rewire phase one report written to ${ANALYTICS_REWIRE_REPORT_PATH}`);
  console.log(`Lanes: ${report.summary.laneCount}`);
  console.log(`Issues: ${report.summary.issueCount} (${JSON.stringify(severityCounts)})`);
  console.log(`Duplicate authorities: ${report.summary.duplicateAuthorityCount}`);
  console.log(`Orphan candidates: ${report.summary.orphanCandidateCount}`);
  console.log(`Stale generated reports: ${report.summary.staleAuthorityReportCount}`);
}

main();

