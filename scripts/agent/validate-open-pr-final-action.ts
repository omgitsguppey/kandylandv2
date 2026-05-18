import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type PrAction = {
  number: number;
  title: string;
  url: string;
  reason: string;
};

type MergedPrAction = PrAction & {
  checks: string[];
  mergeCommit: string;
};

export type OpenPrFinalActionReport = {
  generatedAtUtc: string;
  reportKey: "open-pr-final-action";
  currentHead: string;
  openPrsBefore: PrAction[];
  closedPrs: PrAction[];
  mergedPrs: MergedPrAction[];
  preservedPrs: PrAction[];
  remainingOpenPrs: PrAction[];
  unsafeUntouched: PrAction[];
  checksRun: string[];
  workingTreeStatusBefore: string;
  workingTreeStatusAfter: string;
  nextExactSteps: string[];
};

const REQUIRED_PR_NUMBERS = new Set([216, 217, 218, 228, 233, 241, 242, 243, 247, 251, 252, 259, 260]);

export function validateOpenPrFinalActionReport(report: OpenPrFinalActionReport) {
  const failures: string[] = [];
  if (report.reportKey !== "open-pr-final-action") failures.push("reportKey must be open-pr-final-action.");
  if (!report.currentHead) failures.push("currentHead missing.");
  if (!report.workingTreeStatusBefore || !report.workingTreeStatusAfter) failures.push("working tree status missing.");
  if (!Array.isArray(report.remainingOpenPrs)) failures.push("remaining open PR list missing.");
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) failures.push("nextExactSteps missing.");

  const seen = new Set<number>();
  for (const bucket of [report.openPrsBefore, report.closedPrs, report.mergedPrs, report.preservedPrs, report.remainingOpenPrs]) {
    for (const pr of bucket ?? []) seen.add(pr.number);
  }
  for (const number of REQUIRED_PR_NUMBERS) {
    if (!seen.has(number)) failures.push(`required PR #${number} missing from report.`);
  }
  for (const pr of report.closedPrs ?? []) {
    if (!pr.reason) failures.push(`closed PR #${pr.number} lacks reason.`);
  }
  for (const pr of report.preservedPrs ?? []) {
    if (!pr.reason) failures.push(`preserved PR #${pr.number} lacks reason.`);
  }
  for (const pr of report.mergedPrs ?? []) {
    if (!Array.isArray(pr.checks) || pr.checks.length === 0 || !pr.mergeCommit) {
      failures.push(`merged PR #${pr.number} lacks checks.`);
    }
  }
  if (!Array.isArray(report.checksRun) || report.checksRun.length === 0) failures.push("checksRun missing.");
  return failures;
}

function main() {
  const reportPath = join(process.cwd(), "agent/state/open-pr-final-action.generated.json");
  if (!existsSync(reportPath)) {
    console.error("Missing agent/state/open-pr-final-action.generated.json");
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8").replace(/^\uFEFF/u, "")) as OpenPrFinalActionReport;
  const failures = validateOpenPrFinalActionReport(report);
  if (failures.length > 0) {
    console.error("Open PR final action validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Open PR final action validation passed. closed=${report.closedPrs.length} merged=${report.mergedPrs.length} preserved=${report.preservedPrs.length}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
