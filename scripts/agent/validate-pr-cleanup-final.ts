import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type PrCleanupClassification =
  | "merge_now"
  | "close_duplicate"
  | "close_superseded"
  | "close_stale_failing"
  | "preserve_post_launch"
  | "preserve_dependency_security_review"
  | "needs_human_review"
  | "unsafe_do_not_touch";

type ReviewedPr = {
  number: number;
  title: string;
  author: string;
  url: string;
  classification: PrCleanupClassification;
  reason: string;
};

export type PrCleanupFinalReport = {
  generatedAtUtc: string;
  reportKey: "pr-cleanup-final";
  currentHead: string;
  workingTreeStatusBefore: string;
  workingTreeStatusAfter: string;
  dirtyFilesClassified: Array<{
    path: string;
    classification: string;
    action: string;
  }>;
  prsReviewed: ReviewedPr[];
  prsMerged: Array<ReviewedPr & { mergeMethod: "squash" }>;
  prsClosed: ReviewedPr[];
  prsPreserved: Array<ReviewedPr & { owner: string }>;
  unsafeUntouched: ReviewedPr[];
  remainingOpenPrs: ReviewedPr[];
  nextExactSteps: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactPath = join(repoRoot, "agent/state/pr-cleanup-final.generated.json");

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readReport() {
  if (!existsSync(artifactPath)) {
    throw new Error("Missing agent/state/pr-cleanup-final.generated.json");
  }
  return JSON.parse(readFileSync(artifactPath, "utf8").replace(/^\uFEFF/u, "")) as PrCleanupFinalReport;
}

export function validatePrCleanupFinalReport(report: PrCleanupFinalReport, expectedHead = currentHead()) {
  const failures: string[] = [];

  if (report.reportKey !== "pr-cleanup-final") failures.push("reportKey must be pr-cleanup-final.");
  if (report.currentHead !== expectedHead) failures.push("report currentHead must match git HEAD after cleanup actions.");
  if (!report.workingTreeStatusBefore) failures.push("workingTreeStatusBefore must be recorded.");
  if (!report.workingTreeStatusAfter) failures.push("workingTreeStatusAfter must be recorded.");
  if (!Array.isArray(report.dirtyFilesClassified)) failures.push("dirtyFilesClassified must be present.");
  if (!Array.isArray(report.prsReviewed) || report.prsReviewed.length === 0) failures.push("prsReviewed must not be empty when open PRs existed.");
  if (!Array.isArray(report.nextExactSteps) || report.nextExactSteps.length === 0) failures.push("nextExactSteps must not be empty.");

  for (const pr of report.prsMerged ?? []) {
    if (!pr.classification || pr.classification !== "merge_now") failures.push(`merged PR #${pr.number} lacks merge_now classification.`);
  }
  for (const pr of report.prsClosed ?? []) {
    if (!pr.reason || !pr.classification.startsWith("close_")) failures.push(`closed PR #${pr.number} lacks close reason/classification.`);
  }
  for (const pr of report.prsPreserved ?? []) {
    if (!pr.owner || !pr.reason) failures.push(`preserved PR #${pr.number} lacks owner/reason.`);
  }
  for (const pr of report.unsafeUntouched ?? []) {
    if (!pr.reason) failures.push(`unsafe PR #${pr.number} lacks reason.`);
  }

  const reviewedNumbers = new Set(report.prsReviewed.map((pr) => pr.number));
  for (const bucket of [report.prsMerged, report.prsClosed, report.prsPreserved, report.remainingOpenPrs]) {
    for (const pr of bucket ?? []) {
      if (!reviewedNumbers.has(pr.number)) failures.push(`PR #${pr.number} appears in an action bucket but not prsReviewed.`);
    }
  }

  return failures;
}

function main() {
  const report = readReport();
  const failures = validatePrCleanupFinalReport(report);
  if (failures.length > 0) {
    console.error("PR cleanup final validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`PR cleanup final validation passed. reviewed=${report.prsReviewed.length} closed=${report.prsClosed.length} preserved=${report.prsPreserved.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
