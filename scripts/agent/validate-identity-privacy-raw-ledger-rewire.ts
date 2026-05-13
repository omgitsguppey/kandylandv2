import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  IDENTITY_PRIVACY_RAW_LEDGER_REPORT_PATH,
  buildIdentityPrivacyRawLedgerReport,
  validateIdentityPrivacyRawLedgerReport,
  writeIdentityPrivacyRawLedgerReport,
} from "./identity-privacy-raw-ledger-rewire";

function readRequired(relativePath: string) {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(fullPath, "utf8");
}

function assertDocIncludes(source: string, expected: string, label: string, failures: string[]) {
  if (!source.includes(expected)) failures.push(`${label} must include "${expected}".`);
}

function main() {
  const report = buildIdentityPrivacyRawLedgerReport();
  const failures = validateIdentityPrivacyRawLedgerReport(report);

  const doc = readRequired("docs/agent-truth/identity-privacy-raw-ledger-rewire.md");
  for (const expected of [
    "subject_*",
    "anon_*",
    "pseudonymous",
    "required_operational",
    "limited_consent_off_measurement",
    "optional_analytics_personalization",
    "Raw ledger contract",
    "Recovery eligibility",
    "must not be used",
  ]) {
    assertDocIncludes(doc, expected, "identity/privacy/raw-ledger doctrine", failures);
  }

  if (failures.length > 0) {
    console.error("Identity/privacy/raw-ledger rewire validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  writeIdentityPrivacyRawLedgerReport(report);

  const severityCounts = report.issues.reduce<Record<string, number>>((counts, issue) => {
    counts[issue.severity] = (counts[issue.severity] ?? 0) + 1;
    return counts;
  }, {});

  console.log(`Identity/privacy/raw-ledger rewire report written to ${IDENTITY_PRIVACY_RAW_LEDGER_REPORT_PATH}`);
  console.log(`Identity lanes: ${report.summary.identityLaneCount}`);
  console.log(`Privacy modes: ${report.summary.privacyRuleCount}`);
  console.log(`Raw ledger rules: ${report.summary.rawLedgerRuleCount}`);
  console.log(`Recovery eligibility rules: ${report.summary.recoveryEligibilityRuleCount}`);
  console.log(`Issues: ${report.summary.issueCount} (${JSON.stringify(severityCounts)})`);
}

main();

