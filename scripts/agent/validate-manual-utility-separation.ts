import { assertBatch16, buildManualUtilityValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch16-shared";

const REPORT_PATH = "agent/state/manual-utility-separation.generated.json";
const DOC_PATH = "docs/agent-truth/manual-utility-separation.md";

export function validateManualUtilitySeparationReport() {
  const report = buildManualUtilityValidationReport();
  const failures = [...report.validationFailures];
  assertBatch16(report.status === "manual_utility_not_health", "Manual utilities must remain outside live health.", failures);
  assertBatch16(report.summary.healthImpactingUtilities === 0, "Manual utilities must not affect health score.", failures);
  assertBatch16(report.summary.scoreImpactingUtilities === 0, "Manual utilities must not affect score.", failures);
  assertBatch16(report.utilities.every((utility) => utility.adminOnly && utility.audited && utility.sourceOfFundsGuard), "Balance utility must keep admin/audit/source-of-funds guard.", failures);
  if (failures.length > 0) throw new Error(`Manual utility separation validation failed:\n- ${failures.join("\n- ")}`);

  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Manual Utility Separation",
    "",
    "Status: manual utilities are operator actions, not monitoring signals.",
    `- Utility count: ${report.summary.total}`,
    `- Health-impacting utilities: ${report.summary.healthImpactingUtilities}`,
    `- Score-impacting utilities: ${report.summary.scoreImpactingUtilities}`,
    "- Balance adjustment remains admin-only, audited, and source-of-funds guarded.",
  ]);
  return report;
}

if (require.main === module) {
  const report = validateManualUtilitySeparationReport();
  console.log(`Manual utility separation passed: utilities=${report.summary.total}.`);
}
