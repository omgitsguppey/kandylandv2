import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  SNAPSHOT_ADMIN_VENDOR_COST_REPORT_PATH,
  buildSnapshotAdminVendorCostRewireReport,
  validateSnapshotAdminVendorCostRewireReport,
  writeSnapshotAdminVendorCostRewireReport,
} from "./snapshot-admin-vendor-cost-rewire";

function readRequired(relativePath: string) {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, expected: string, label: string, failures: string[]) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function main() {
  const report = buildSnapshotAdminVendorCostRewireReport();
  const failures = validateSnapshotAdminVendorCostRewireReport(report);
  const doc = readRequired("docs/agent-truth/snapshot-admin-vendor-cost-rewire.md");

  for (const expected of [
    "analytics_admin_metric_snapshots",
    "analytics_aggregate_stats/realtime_summary",
    "Admin Analytics",
    "Admin Debug",
    "GA4",
    "PostHog",
    "BigQuery",
    "fake zero",
    "runtime UI/route changes",
    "must not be used",
  ]) {
    requireIncludes(doc, expected, "snapshot/admin/vendor/cost doctrine", failures);
  }

  if (failures.length > 0) {
    console.error("Snapshot/Admin/Vendor/Cost rewire validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  writeSnapshotAdminVendorCostRewireReport(report);

  const severityCounts = report.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`Snapshot/Admin/Vendor/Cost rewire report written to ${SNAPSHOT_ADMIN_VENDOR_COST_REPORT_PATH}`);
  console.log(`Snapshot authorities: ${report.summary.snapshotAuthorityCount}`);
  console.log(`Raw display fallback candidates: ${report.summary.rawDisplayFallbackCount}`);
  console.log(`Vendor boundary issues: ${report.summary.vendorBoundaryIssueCount}`);
  console.log(`Cost simplification candidates: ${report.summary.costRiskCount}`);
  console.log(`Recovery surfacing plans: ${report.recoverySurfacingPlan.length}`);
  console.log(`Issues: ${report.summary.issueCount} (${JSON.stringify(severityCounts)})`);
}

main();
