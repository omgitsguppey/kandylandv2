import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

type ManualPrAction = PrAction & {
  commitReference: string;
  checkReference: string;
};

export type FinalOpenPrZeroReport = {
  generatedAtUtc: string;
  reportKey: "final-open-pr-zero";
  currentHead: string;
  prsBefore: PrAction[];
  prsMerged: MergedPrAction[];
  prsManuallyIncorporated: ManualPrAction[];
  prsClosedRejected: PrAction[];
  remainingOpenPrs: PrAction[];
  workingTreeStatusBefore: string;
  workingTreeStatusAfter: string;
  checksRun: string[];
  finalOpenPrCount: number;
  notes: string[];
  nextExactSteps: string[];
};

const requiredPrNumbers = new Set([216, 251, 252, 260]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportPath = join(repoRoot, "agent/state/final-open-pr-zero.generated.json");

function gitHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function isAncestorOrSelf(candidate: string, head: string) {
  if (candidate === head) return true;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", candidate, head], { cwd: repoRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function validateFinalOpenPrZeroReport(report: FinalOpenPrZeroReport, head = "HEAD") {
  const failures: string[] = [];
  if (report.reportKey !== "final-open-pr-zero") failures.push("reportKey must be final-open-pr-zero.");
  if (!report.currentHead) failures.push("currentHead missing.");
  if (head !== "HEAD" && report.currentHead && !isAncestorOrSelf(report.currentHead, head)) {
    failures.push(`currentHead must match or be an ancestor of git HEAD (${head}).`);
  }
  if (!report.workingTreeStatusBefore || !report.workingTreeStatusAfter) failures.push("working tree status missing.");
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) failures.push("nextExactSteps missing.");
  if (!Array.isArray(report.checksRun) || report.checksRun.length === 0) failures.push("checksRun missing.");
  if (report.finalOpenPrCount !== 0) failures.push("finalOpenPrCount must be 0 unless GitHub API failure prevented action.");
  for (const pr of report.remainingOpenPrs ?? []) {
    if (!pr.reason) failures.push(`remaining open PR #${pr.number} lacks explicit reason.`);
  }

  const seen = new Set<number>();
  for (const bucket of [report.prsBefore, report.prsMerged, report.prsManuallyIncorporated, report.prsClosedRejected, report.remainingOpenPrs]) {
    for (const pr of bucket ?? []) seen.add(pr.number);
  }
  for (const number of requiredPrNumbers) {
    if (!seen.has(number)) failures.push(`required PR #${number} missing from report.`);
  }
  for (const pr of report.prsMerged ?? []) {
    if (!Array.isArray(pr.checks) || pr.checks.length === 0 || !pr.mergeCommit) {
      failures.push(`merged PR #${pr.number} lacks checks.`);
    }
  }
  for (const pr of report.prsManuallyIncorporated ?? []) {
    if (!pr.commitReference || !pr.checkReference) {
      failures.push(`manually incorporated PR #${pr.number} lacks commit/check reference.`);
    }
  }
  for (const pr of report.prsClosedRejected ?? []) {
    if (!pr.reason) failures.push(`rejected PR #${pr.number} lacks reason.`);
  }
  return failures;
}

function main() {
  if (!existsSync(reportPath)) {
    console.error("Missing agent/state/final-open-pr-zero.generated.json");
    process.exit(1);
  }
  const report = JSON.parse(readFileSync(reportPath, "utf8").replace(/^\uFEFF/u, "")) as FinalOpenPrZeroReport;
  const failures = validateFinalOpenPrZeroReport(report, gitHead());
  if (failures.length > 0) {
    console.error("Final open PR zero validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Final open PR zero validation passed. merged=${report.prsMerged.length} open=${report.finalOpenPrCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
