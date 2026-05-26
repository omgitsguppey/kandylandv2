import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildFinalProductIntegrityLockReport,
  validateFinalProductIntegrityLockReport,
  type FinalProductIntegrityLockReport,
} from "@/lib/product-integrity/final-product-integrity-lock";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/final-product-integrity-lock.generated.json";
const DOC_PATH = "docs/agent-truth/final-product-integrity-lock.md";

type JsonRecord = Record<string, unknown>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value)}\n`, "utf8");
}

function writeText(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function currentHead() {
  return run("git", ["rev-parse", "HEAD"]);
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function packageScripts() {
  const packageJson = readJson("package.json");
  return packageJson.scripts && typeof packageJson.scripts === "object" && !Array.isArray(packageJson.scripts)
    ? packageJson.scripts as Record<string, string>
    : {};
}

function listOpenPullRequests() {
  const raw = run("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,mergeStateStatus,isDraft",
  ]);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Array<{ number: number; title: string; url: string; mergeStateStatus?: string; isDraft?: boolean }>;
  } catch {
    return [{
      number: 0,
      title: "gh pr list parse failed",
      url: "",
      mergeStateStatus: "UNKNOWN",
      isDraft: false,
    }];
  }
}

function scoreSnapshot() {
  const score = readJson("agent/state/public-beta-score.generated.json");
  return {
    sourceHealth: typeof score.sourceHealthScore === "number" ? score.sourceHealthScore : 0,
    runtimeHealth: typeof score.runtimeHealthScore === "number" ? score.runtimeHealthScore : 0,
    evidenceCompleteness: typeof score.evidenceCompletenessScore === "number" ? score.evidenceCompletenessScore : 0,
    freshness: typeof score.freshnessScore === "number" ? score.freshnessScore : 0,
    costRisk: typeof score.costRiskScore === "number" ? score.costRiskScore : 0,
    regressionRisk: typeof score.regressionRiskScore === "number" ? score.regressionRiskScore : 0,
    overallHealthScore: typeof score.healthScore === "number" ? score.healthScore : 0,
  };
}

function launchBlockers() {
  const score = readJson("agent/state/public-beta-score.generated.json");
  return Array.isArray(score.launchBlockers)
    ? score.launchBlockers.map((blocker) => String(blocker))
    : [];
}

function renderDoc(report: FinalProductIntegrityLockReport) {
  return [
    "# Final Product Integrity Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    `Status: ${report.status}`,
    "",
    "## Scope",
    "",
    "This source-only lock composes Product body map, Central normalizer, Product brain debug triage, and Body system wiring repair. It does not mutate production data, run providers, deploy, alter payment runtime, change GumDrop math, or touch navigation.",
    "",
    "## Summary",
    "",
    `- body systems: ${report.bodySystems.length}`,
    `- mapped limbs: ${report.mappedLimbCount}`,
    `- connected limbs: ${report.connectedLimbCount}`,
    `- orphaned limbs: ${report.orphanedLimbCount}`,
    `- duplicated limbs: ${report.duplicatedLimbCount}`,
    `- stale limbs: ${report.staleLimbCount}`,
    `- unsafe unknown limbs: ${report.unsafeUnknownCount}`,
    `- central normalizer: ${report.centralNormalizerStatus}`,
    `- interpretive brain: ${report.interpretiveBrainStatus}`,
    `- wiring repair: ${report.wiringRepairStatus}`,
    `- debug summary: ${report.debugSummaryStatus}`,
    "",
    "## Score Dimensions",
    "",
    ...Object.entries(report.scoreDimensions).map(([dimension, value]) =>
      `- ${dimension}: before=${value.before}; after=${value.after}; status=${value.status}; next=${value.nextAction}`),
    "",
    "## Launch Blockers",
    "",
    ...(report.launchBlockers.length
      ? report.launchBlockers.map((blocker) => `- ${blocker.blockerId}: ${blocker.classification}; formalGateCleared=${blocker.formalGateCleared}; next=${blocker.nextAction}`)
      : ["- none"]),
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length
      ? report.remainingGaps.map((gap) => `- ${gap.gapId}: ${gap.classification}; owner=${gap.owner}; next=${gap.nextAction}`)
      : ["- none"]),
    "",
    "## Dirty Files",
    "",
    ...(report.dirtyFiles.length
      ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`)
      : ["- none"]),
    "",
    "## Open PR Classification",
    "",
    ...(report.openPullRequests.length
      ? report.openPullRequests.map((pr) => `- #${pr.number} ${pr.title}: ${pr.classification}`)
      : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length
      ? report.validationFailures.map((failure) => `- ${failure}`)
      : ["- none"]),
    "",
  ].join("\n");
}

export function buildAndWriteFinalProductIntegrityLockReport() {
  const scoreBefore = scoreSnapshot();
  const report = buildFinalProductIntegrityLockReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    dirtyFiles: changedFiles(),
    openPullRequests: listOpenPullRequests(),
    packageScripts: packageScripts(),
    scoreBefore,
    scoreAfter: scoreSnapshot(),
    launchBlockers: launchBlockers(),
  });

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));
  return report;
}

function main() {
  const report = buildAndWriteFinalProductIntegrityLockReport();
  const failures = validateFinalProductIntegrityLockReport(report);
  if (failures.length > 0) {
    console.error(`Final product integrity lock validation failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(
    `Final product integrity lock validated: systems=${report.bodySystems.length}, ` +
      `mapped=${report.mappedLimbCount}, gaps=${report.remainingGaps.length}.`,
  );
}

if (require.main === module) {
  main();
}
