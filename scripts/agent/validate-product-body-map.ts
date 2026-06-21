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
  BodySystemId,
  ProductBodyMapDirtyFile,
  ProductBodyMapOpenPullRequest,
  ProductBodyMapReport,
  ProductLimb,
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

const DISCONNECTED_LIMB_ARTIFACT_CAP = 80;
const BODY_SYSTEM_LIMB_EXAMPLE_CAP = 8;

function summarizeLimbForArtifact(limb: ProductLimb) {
  return {
    limbId: limb.limbId,
    kind: limb.kind,
    label: limb.label,
    status: limb.status,
    primaryBodySystem: limb.primaryBodySystem,
    secondaryBodySystems: limb.secondaryBodySystems,
    owner: limb.owner,
    sourceFiles: limb.sourceFiles.slice(0, 3),
    validators: limb.validators.slice(0, 3),
    scoreImpact: limb.scoreImpact,
    nextAction: limb.nextAction,
  };
}

export function compactProductBodyMapReportForArtifact(
  report: ProductBodyMapReport & {
    scoreBefore?: ReturnType<typeof scoreSnapshot>;
    scoreAfter?: ReturnType<typeof scoreSnapshot>;
    scoreDimensions?: ProductBodyMapReport["scoreDimensionImpact"];
  },
) {
  const disconnectedLimbs = report.disconnectedLimbs
    .filter((limb) => limb.status !== "connected")
    .slice(0, DISCONNECTED_LIMB_ARTIFACT_CAP)
    .map(summarizeLimbForArtifact);
  const bodySystemSummaries = Object.fromEntries(report.bodySystems.map((system) => {
    const limbsForSystem = report.limbs.filter((limb) =>
      limb.primaryBodySystem === system || limb.secondaryBodySystems.includes(system as BodySystemId),
    );
    return [system, {
      primaryCount: report.limbs.filter((limb) => limb.primaryBodySystem === system).length,
      secondaryCount: report.limbs.filter((limb) => limb.secondaryBodySystems.includes(system as BodySystemId)).length,
      statusCounts: Object.fromEntries(Object.entries(report.disconnectedByStatus).map(([status]) => [
        status,
        limbsForSystem.filter((limb) => limb.status === status).length,
      ])),
      scoreImpact: report.scoreDimensionImpact[system],
      exampleLimbIds: limbsForSystem.slice(0, BODY_SYSTEM_LIMB_EXAMPLE_CAP).map((limb) => limb.limbId),
      omittedExampleCount: Math.max(0, limbsForSystem.length - BODY_SYSTEM_LIMB_EXAMPLE_CAP),
    }];
  }));

  return {
    reportKey: report.reportKey,
    contractVersion: report.contractVersion,
    generatedAtUtc: report.generatedAtUtc,
    currentHead: report.currentHead,
    status: report.status,
    productionReadsPerformed: report.productionReadsPerformed,
    providerCallsPerformed: report.providerCallsPerformed,
    reportCompleteness: "capped_catalog",
    capReason:
      "Full product limb catalog is validated in memory; generated artifact stores summary counts, body-system rollups, and capped disconnected examples.",
    bodySystemsCovered: report.bodySystemsCovered,
    bodySystems: report.bodySystems,
    totalLimbs: report.totalLimbs,
    emittedDisconnectedLimbCount: disconnectedLimbs.length,
    omittedDisconnectedLimbCount: Math.max(0, report.disconnectedLimbs.length - disconnectedLimbs.length),
    fullLimbCatalogOmittedCount: report.limbs.length,
    majorFeaturesMapped: report.majorFeaturesMapped,
    majorSurfacesMapped: report.majorSurfacesMapped,
    telemetryEventsMapped: report.telemetryEventsMapped,
    metricsMapped: report.metricsMapped,
    routesMapped: report.routesMapped,
    materializersMapped: report.materializersMapped,
    disconnectedByStatus: report.disconnectedByStatus,
    disconnectedLimbs,
    dirtyFiles: report.dirtyFiles,
    openPullRequests: report.openPullRequests,
    debugLane: report.debugLane,
    scoreDimensionImpact: report.scoreDimensionImpact,
    bodySystemSummaries,
    remainingGaps: report.remainingGaps.slice(0, DISCONNECTED_LIMB_ARTIFACT_CAP),
    omittedRemainingGapCount: Math.max(0, report.remainingGaps.length - DISCONNECTED_LIMB_ARTIFACT_CAP),
    nextExactSteps: report.nextExactSteps.slice(0, DISCONNECTED_LIMB_ARTIFACT_CAP),
    validationFailures: report.validationFailures,
    scoreBefore: report.scoreBefore,
    scoreAfter: report.scoreAfter,
    scoreDimensions: report.scoreDimensions,
  };
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
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
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

  writeJson(REPORT_PATH, compactProductBodyMapReportForArtifact(reportWithScore));
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
