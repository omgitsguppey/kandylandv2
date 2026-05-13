import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  LOST_DATA_RECOVERY_REPORT_PATH,
  buildLostDataRecoveryDryRunReport,
  validateLostDataRecoveryDryRunReport,
  writeLostDataRecoveryDryRunReport,
} from "./lost-data-recovery-dry-run";

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
  const report = buildLostDataRecoveryDryRunReport();
  const failures = validateLostDataRecoveryDryRunReport(report);
  const doc = readRequired("docs/agent-truth/lost-data-recovery-dry-run.md");

  for (const expected of [
    "lost data",
    "production reads",
    "Debug-first",
    "Admin Analytics",
    "privacy",
    "consent",
    "productionAllowedNow: false",
    "must not be used",
  ]) {
    requireIncludes(doc, expected, "lost-data recovery doctrine", failures);
  }

  if (failures.length > 0) {
    console.error("Lost-data recovery dry-run validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  writeLostDataRecoveryDryRunReport(report);

  const severityCounts = report.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`Lost-data recovery dry-run report written to ${LOST_DATA_RECOVERY_REPORT_PATH}`);
  console.log(`Recovery lanes: ${report.summary.recoverableLaneCount}`);
  console.log(`Debug-first lanes: ${report.summary.debugFirstCount}`);
  console.log(`Admin Analytics eligible lanes: ${report.summary.adminAnalyticsEligibleCount}`);
  console.log(`Backfill eligible lanes: ${report.summary.backfillEligibleCount}`);
  console.log(`Issues: ${report.summary.issueCount} (${JSON.stringify(severityCounts)})`);
}

main();

