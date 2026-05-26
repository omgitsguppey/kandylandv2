import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildBodySystemWiringRepairReport,
  validateBodySystemWiringRepairReport,
} from "@/lib/product-integrity/body-system-wiring-repair";
import type { BodySystemWiringRepairReport } from "@/lib/product-integrity/body-system-wiring-repair";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/body-system-wiring-repair.generated.json";
const DOC_PATH = "docs/agent-truth/body-system-wiring-repair.md";

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
  const healthScore = typeof score.healthScore === "number"
    ? score.healthScore
    : typeof score.overallHealthScore === "number"
      ? score.overallHealthScore
      : 0;
  return {
    sourceHealth: typeof score.sourceHealthScore === "number" ? score.sourceHealthScore : 0,
    runtimeHealth: typeof score.runtimeHealthScore === "number" ? score.runtimeHealthScore : 0,
    evidenceCompleteness: typeof score.evidenceCompletenessScore === "number" ? score.evidenceCompletenessScore : 0,
    freshness: typeof score.freshnessScore === "number" ? score.freshnessScore : 0,
    costRisk: typeof score.costRiskScore === "number" ? score.costRiskScore : 0,
    regressionRisk: typeof score.regressionRiskScore === "number" ? score.regressionRiskScore : 0,
    overallHealthScore: healthScore,
  };
}

function renderDoc(report: BodySystemWiringRepairReport) {
  return [
    "# Body System Wiring Repair",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    `Status: ${report.status}`,
    "",
    "## Scope",
    "",
    "This source-only pass repairs the highest-impact disconnected product limbs discovered by Product body map, Central normalizer, and Product brain evidence. It does not add product features, mutate production data, run providers, deploy, alter payment runtime, change GumDrop math, or touch navigation.",
    "",
    "## Summary",
    "",
    `- gaps before: ${report.gapsBefore}`,
    `- gaps fixed: ${report.gapsFixed.length}`,
    `- gaps deferred with owner: ${report.gapsDeferred.length}`,
    `- unsafe unknown: ${report.unsafeUnknown.length}`,
    `- body systems affected: ${report.bodySystemsAffected.join(", ") || "none"}`,
    `- score dimensions: ${report.scoreDimensions.join(", ") || "none"}`,
    "",
    "## Fixed Wiring Gaps",
    "",
    ...(report.gapsFixed.length
      ? report.gapsFixed.map((gap) => `- ${gap.limbId}: ${gap.reason} Validators=${gap.validators.join(", ")} Tests=${gap.testCoverage.join(", ")}`)
      : ["- none"]),
    "",
    "## Deferred Gaps",
    "",
    ...(report.gapsDeferred.length
      ? report.gapsDeferred.map((gap) => `- ${gap.limbId}: owner=${gap.owner}; policy=${gap.evidencePolicy}; next=${gap.nextAction}`)
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

export function buildAndWriteBodySystemWiringRepairReport() {
  const scoreBefore = scoreSnapshot();
  const report = buildBodySystemWiringRepairReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    dirtyFiles: changedFiles(),
    openPullRequests: listOpenPullRequests(),
    packageScripts: packageScripts(),
    scoreBefore,
    scoreAfter: scoreSnapshot(),
  });

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));
  return report;
}

function main() {
  const report = buildAndWriteBodySystemWiringRepairReport();
  const failures = validateBodySystemWiringRepairReport(report);
  if (failures.length > 0) {
    console.error(`Body system wiring repair validation failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Body system wiring repair validated: ${report.gapsFixed.length} fixed, ${report.gapsDeferred.length} deferred.`);
}

if (require.main === module) {
  main();
}
