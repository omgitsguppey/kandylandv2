import {
  buildControlTowerReportFreshnessCleanupReport,
  validateControlTowerReportFreshnessCleanupReport,
  writeAndValidateReport,
} from "./control-tower-cleanup-shared";

const report = buildControlTowerReportFreshnessCleanupReport();
const failures = validateControlTowerReportFreshnessCleanupReport(report);

try {
  writeAndValidateReport(
    "agent/state/control-tower-report-freshness-cleanup.generated.json",
    "docs/agent-truth/control-tower-report-freshness-cleanup.md",
    "Control Tower Report Freshness Cleanup",
    report,
    failures,
  );
  console.log("Control Tower report freshness cleanup passed");
} catch (error) {
  console.error("Control Tower report freshness cleanup validation failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
