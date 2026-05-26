import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildProductBodyMapReport,
  classifyProductBodyMapDirtyFile,
  classifyProductBodyMapOpenPullRequest,
  validateProductBodyMapReport,
} from "@/lib/product-integrity/product-body-map";
import type {
  ProductBodyMapDirtyFile,
  ProductBodyMapOpenPullRequest,
  ProductBodyMapReport,
} from "@/lib/product-integrity/product-body-system-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/product-body-map.generated.json";
const DOC_PATH = "docs/agent-truth/product-body-map.md";

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

function changedFiles(): ProductBodyMapDirtyFile[] {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort().map((path) => ({
    path,
    classification: classifyProductBodyMapDirtyFile(path),
  }));
}

function packageScripts() {
  const packageJson = readJson("package.json");
  return packageJson.scripts && typeof packageJson.scripts === "object" && !Array.isArray(packageJson.scripts)
    ? packageJson.scripts as Record<string, string>
    : {};
}

function listOpenPullRequests(): ProductBodyMapOpenPullRequest[] {
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
    const parsed = JSON.parse(raw) as Array<Omit<ProductBodyMapOpenPullRequest, "classification">>;
    return parsed.map((pr) => ({
      ...pr,
      classification: classifyProductBodyMapOpenPullRequest(pr),
    }));
  } catch {
    return [{
      number: 0,
      title: "gh pr list parse failed",
      url: "",
      mergeStateStatus: "UNKNOWN",
      isDraft: false,
      classification: "unsafe_unknown",
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

function renderDoc(report: ProductBodyMapReport) {
  const disconnected = report.disconnectedLimbs.filter((limb) => limb.status !== "connected");
  return [
    "# Product Body Map",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    `Status: ${report.status}`,
    "",
    "## Scope",
    "",
    "This source-only pass maps product features, surfaces, routes, telemetry events, materializers, metrics, journey steps, debug lanes, score gates, validators, and generated artifacts into canonical product body systems. It does not change payment runtime, GumDrop math, navigation, deployed runtime, provider state, or production data.",
    "",
    "## Summary",
    "",
    `- body systems covered: ${report.bodySystemsCovered}/${report.bodySystems.length}`,
    `- total limbs: ${report.totalLimbs}`,
    `- features mapped: ${report.majorFeaturesMapped}`,
    `- surfaces mapped: ${report.majorSurfacesMapped}`,
    `- telemetry events mapped: ${report.telemetryEventsMapped}`,
    `- metrics mapped: ${report.metricsMapped}`,
    `- routes mapped: ${report.routesMapped}`,
    `- materializers mapped: ${report.materializersMapped}`,
    "",
    "## Debug Lane",
    "",
    `- default view: ${report.debugLane.defaultView}`,
    `- connected: ${report.debugLane.connectedCount}`,
    `- disconnected: ${report.debugLane.disconnectedCount}`,
    `- orphaned: ${report.debugLane.orphanedCount}`,
    `- duplicated: ${report.debugLane.duplicatedCount}`,
    `- stale: ${report.debugLane.staleCount}`,
    `- in flight: ${report.debugLane.inFlightCount}`,
    `- unsafe unknown: ${report.debugLane.unsafeUnknownCount}`,
    "",
    "## Body Systems",
    "",
    ...report.bodySystems.map((system) => {
      const primaryCount = report.limbs.filter((limb) => limb.primaryBodySystem === system).length;
      const secondaryCount = report.limbs.filter((limb) => limb.secondaryBodySystems.includes(system)).length;
      return `- ${system}: primary=${primaryCount}, secondary=${secondaryCount}, score=${(report.scoreDimensionImpact[system] ?? []).join(", ")}`;
    }),
    "",
    "## Disconnected Limbs",
    "",
    ...(disconnected.length
      ? disconnected.slice(0, 80).map((limb) => `- ${limb.limbId}: ${limb.status}; ${limb.nextAction}`)
      : ["- none"]),
    disconnected.length > 80 ? `- ${disconnected.length - 80} additional disconnected limbs are in the generated JSON catalog.` : "",
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
  ].filter(Boolean).join("\n");
}

export function buildAndWriteProductBodyMapReport() {
  const scoreBefore = scoreSnapshot();
  const report = buildProductBodyMapReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    dirtyFiles: changedFiles(),
    openPullRequests: listOpenPullRequests(),
    packageScripts: packageScripts(),
  });
  const scoreAfter = scoreSnapshot();
  const reportWithScore = {
    ...report,
    scoreBefore,
    scoreAfter,
    scoreDimensions: report.scoreDimensionImpact,
  };

  writeJson(REPORT_PATH, reportWithScore);
  writeText(DOC_PATH, renderDoc(report));
  return reportWithScore;
}

function main() {
  const report = buildAndWriteProductBodyMapReport();
  const failures = validateProductBodyMapReport(report);
  if (failures.length > 0) {
    console.error(`Product body map validation failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Product body map validated: ${report.totalLimbs} limbs across ${report.bodySystemsCovered} body systems.`);
}

if (require.main === module) {
  main();
}
