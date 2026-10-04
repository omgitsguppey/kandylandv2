export function collectAdminDebugControlTowerTestStaticProbeFailures(
  {
    modelTest,
    summaryCardTest,
    adminOpsHealthTest,
    adminDataValidationTest,
  }: {
    modelTest: string;
    summaryCardTest: string;
    adminOpsHealthTest: string;
    adminDataValidationTest: string;
  },
): string[] {
  const failures: string[] = [];

  for (const expected of [
    "labels required missing reports as missing and critical",
    "labels stale reports as stale instead of live",
    "surfaces critical findings and next actions first",
    "keeps debug evidence redacted and support-scoped",
  ]) {
    if (!modelTest.includes(expected)) {
      failures.push(`Admin debug Control Tower model tests must include "${expected}".`);
    }
  }

  for (const expected of [
    "explains aggregate route failures when the per-route sample is empty",
    "surfaces active diagnostic clusters with validator context",
  ]) {
    if (!summaryCardTest.includes(expected)) {
      failures.push(`Admin debug summary card tests must include "${expected}".`);
    }
  }

  for (const expected of [
    "separates current diagnostics from loaded sample error history",
    "marks stale channels stale instead of live when current counts are empty",
    "labels traffic-dependent writer inactivity as quiet instead of live",
    "labels recent warehouse heartbeats as live",
    "clusters repeated AI assistant SyntaxError fallback warnings",
  ]) {
    if (!adminOpsHealthTest.includes(expected)) {
      failures.push(`Admin ops health diagnostics truth tests must include "${expected}".`);
    }
  }

  for (const expected of [
    "returns not_validated when no validation rows are available",
    "returns loaded counts only after validation rows exist",
    "returns failed when the validation route errors",
    "buildDataValidationPanelState",
  ]) {
    if (!adminDataValidationTest.includes(expected)) {
      failures.push(`Admin data validation tests must cover not_validated and failed states must include "${expected}".`);
    }
  }

  return failures;
}
