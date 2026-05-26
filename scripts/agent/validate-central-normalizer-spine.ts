import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildCentralNormalizerSpineReport,
  normalizeProductSignal,
  validateCentralNormalizerOutput,
} from "@/lib/product-integrity/central-normalizer";
import type {
  CentralNormalizerOpenPullRequest,
  CentralNormalizerSpineReport,
  ProductSignal,
} from "@/lib/product-integrity/central-normalizer-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/central-normalizer-spine.generated.json";
const DOC_PATH = "docs/agent-truth/central-normalizer-spine.md";

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

function listOpenPullRequests(): CentralNormalizerOpenPullRequest[] {
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
    const parsed = JSON.parse(raw) as Array<Omit<CentralNormalizerOpenPullRequest, "classification">>;
    return parsed.map((pr) => ({
      ...pr,
      classification: "external_review_required",
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

function sampleSignal(): ProductSignal {
  return {
    signalId: "central-normalizer-sample-drop-preview",
    signalKind: "UserActionSignal",
    eventName: "drop_preview_opened",
    featureId: "drops",
    surface: "drops_library",
    who: {
      userId: "sample_user",
      sessionId: "sample_session",
      actorKind: "signed_in_user",
    },
    what: {
      objectType: "drop",
      objectId: "sample_drop",
      dropId: "sample_drop",
    },
    when: {
      occurredAtUtc: "2026-05-26T12:00:00.000Z",
      timestampMs: 1779800000000,
    },
    where: {
      surface: "drops_library",
      route: "/drops/sample_drop",
      sourceComponent: "DropCard",
    },
    how: {
      action: "click",
      method: "tap",
      source: "client",
    },
    howLong: {
      durationMs: 1200,
      activeMs: 900,
    },
    identityState: "signed_in",
    confidence: "exact",
    sourceTruth: "client",
    dedupeKey: "central-normalizer-sample-drop-preview",
    privacyClass: "minimal_product",
    costClass: "hot_path_summary",
    debugVisibility: "debug_visible",
    scoreImpact: ["evidenceCompleteness", "runtimeHealth"],
  };
}

function renderDoc(report: CentralNormalizerSpineReport & { scoreBefore?: JsonRecord; scoreAfter?: JsonRecord }) {
  return [
    "# Central Normalizer Spine",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    `Status: ${report.status}`,
    "",
    "## Scope",
    "",
    "This source-only pass adds a central normalizer adapter spine for product signals. It routes signals into the existing event envelope, normalized event fact, person/global metrics, journey, debug, beta score, export, and cost paths. It does not mutate production data, call providers, alter payment runtime, change GumDrop math, or touch navigation.",
    "",
    "## Coverage",
    "",
    `- signal kinds: ${report.signalKindsCovered.length}`,
    `- output channels: ${report.outputChannelsCovered.join(", ")}`,
    `- sample status: ${report.sampleStatus}`,
    `- sample body system: ${report.sampleBodySystem}`,
    `- adapters connected: ${report.adaptersConnected.join(", ")}`,
    "",
    "## Debug Lane",
    "",
    `- default view: ${report.debugLane.defaultView}`,
    `- signals received: ${report.debugLane.signalsReceived}`,
    `- normalized: ${report.debugLane.normalizedSuccessfully}`,
    `- failed: ${report.debugLane.failedNormalization}`,
    `- missing body system: ${report.debugLane.missingBodySystem}`,
    `- missing identity: ${report.debugLane.missingIdentity}`,
    `- legacy aliases: ${report.debugLane.legacyAliasCount}`,
    `- unsafe unknown: ${report.debugLane.unsafeUnknownCount}`,
    "",
    "## Legacy Direct Pathways",
    "",
    ...report.legacyPathways.map((pathway) => `- ${pathway.pathwayId}: ${pathway.classification}; ${pathway.nextAction}`),
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

export function buildAndWriteCentralNormalizerSpineReport() {
  const scoreBefore = scoreSnapshot();
  const sample = normalizeProductSignal(sampleSignal());
  const report = buildCentralNormalizerSpineReport({
    sample,
    currentHead: currentHead(),
    dirtyFiles: changedFiles(),
    openPullRequests: listOpenPullRequests(),
    generatedAtUtc: new Date().toISOString(),
  });
  const scripts = packageScripts();
  const scriptFailure = scripts["check:central-normalizer-spine"] === "tsx scripts/agent/validate-central-normalizer-spine.ts"
    ? []
    : ["package.json missing check:central-normalizer-spine script."];
  const validationFailures = [
    ...report.validationFailures,
    ...validateCentralNormalizerOutput(sample),
    ...scriptFailure,
  ];
  const scoreAfter = scoreSnapshot();
  const reportWithScore = {
    ...report,
    status: validationFailures.length === 0 ? "pass" : "fail",
    validationFailures,
    scoreBefore,
    scoreAfter,
    scoreDimensions: sample.scoreSignal.dimensions,
  } satisfies CentralNormalizerSpineReport & {
    scoreBefore: ReturnType<typeof scoreSnapshot>;
    scoreAfter: ReturnType<typeof scoreSnapshot>;
    scoreDimensions: typeof sample.scoreSignal.dimensions;
  };

  writeJson(REPORT_PATH, reportWithScore);
  writeText(DOC_PATH, renderDoc(reportWithScore));
  return reportWithScore;
}

function main() {
  const report = buildAndWriteCentralNormalizerSpineReport();
  if (report.validationFailures.length > 0) {
    console.error(`Central normalizer spine validation failed:\n- ${report.validationFailures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Central normalizer spine validated: ${report.outputChannelsCovered.length} outputs for ${report.signalKindsCovered.length} signal kinds.`);
}

if (require.main === module) {
  main();
}
