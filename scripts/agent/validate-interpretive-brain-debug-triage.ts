import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import { normalizeProductSignal } from "@/lib/product-integrity/central-normalizer";
import {
  buildAiRepairWorkbenchFindingFeed,
  buildInterpretiveBrainDebugTriageReport,
  buildOperatorSummary,
  collapseDuplicateFindings,
  interpretNormalizedSignal,
  validateInterpretiveBrainReport,
} from "@/lib/product-integrity/interpretive-brain";
import type {
  InterpretiveBrainDebugTriageReport,
  InterpretiveBrainFinding,
} from "@/lib/product-integrity/interpretive-brain-contract";
import type { ProductSignal } from "@/lib/product-integrity/central-normalizer-contract";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/interpretive-brain-debug-triage.generated.json";
const DOC_PATH = "docs/agent-truth/interpretive-brain-debug-triage.md";

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

function scoreDimensionInputs(snapshot: ReturnType<typeof scoreSnapshot>) {
  return [
    {
      dimension: "sourceHealth" as const,
      score: snapshot.sourceHealth,
      reason: "Source health beta dimension.",
      nextAction: "Repair exact source validator failures before interpreting this dimension as healthy.",
    },
    {
      dimension: "runtimeHealth" as const,
      score: snapshot.runtimeHealth,
      reason: "Runtime/provider smoke is formal-evidence gated.",
      nextAction: "Attach formal deployed runtime/provider smoke evidence before clearing runtime beta gates.",
    },
    {
      dimension: "evidenceCompleteness" as const,
      score: snapshot.evidenceCompleteness,
      reason: "Evidence completeness depends on source, formal, and admin truth artifacts.",
      nextAction: "Attach missing formal/admin evidence or keep the gate classified.",
    },
    {
      dimension: "freshness" as const,
      score: snapshot.freshness,
      reason: "Freshness depends on required generated report current-head state.",
      nextAction: "Refresh or retire stale required reports before beta-exit interpretation.",
    },
    {
      dimension: "costRisk" as const,
      score: snapshot.costRisk,
      reason: "Cost risk keeps external billing review separate from source guards.",
      nextAction: "Attach external billing review artifact if needed; keep source cost guards visible separately.",
    },
    {
      dimension: "regressionRisk" as const,
      score: snapshot.regressionRisk,
      reason: "Regression risk depends on high-blast validator coverage.",
      nextAction: "Run targeted high-blast validators before clearing regression risk.",
    },
  ];
}

function sampleSignal(): ProductSignal {
  return {
    signalId: "interpretive-brain-sample-drop-preview",
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
    dedupeKey: "interpretive-brain-sample-drop-preview",
    privacyClass: "minimal_product",
    costClass: "hot_path_summary",
    debugVisibility: "debug_visible",
    scoreImpact: ["evidenceCompleteness", "runtimeHealth"],
  };
}

function duplicateProbe(findings: InterpretiveBrainFinding[]): InterpretiveBrainFinding[] {
  const first = findings.find((finding) => finding.findingType === "product_health");
  if (!first) return findings;
  return [...findings, {
    ...first,
    findingId: `${first.findingId}-duplicate`,
    evidence: [...first.evidence, "duplicate probe"],
  }];
}

function renderDoc(report: InterpretiveBrainDebugTriageReport & {
  scoreBefore: ReturnType<typeof scoreSnapshot>;
  scoreAfter: ReturnType<typeof scoreSnapshot>;
}) {
  return [
    "# Interpretive Brain Debug Triage",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead ?? "unknown"}`,
    `Status: ${report.status}`,
    "",
    "## Scope",
    "",
    "This source-only pass adds the Product brain triage layer above normalized signals. It interprets product health, journey meaning, root cause, score impact, cost risk, formal gates, stale artifacts, and exact next actions. It does not mutate production data, call providers, clear formal gates, alter payment runtime, change GumDrop math, or touch navigation.",
    "",
    "## Product Brain Summary",
    "",
    `- default view: ${report.operatorSummary.defaultView}`,
    `- raw lanes default open: ${report.operatorSummary.rawLanesDefaultOpen}`,
    `- top actions: ${report.operatorSummary.topActions.length}`,
    `- findings: ${report.findings.length}`,
    `- duplicate findings collapsed: ${report.duplicateDebugFindingsCollapsed}`,
    `- critical findings hidden: ${report.operatorSummary.hiddenCriticalCount}`,
    `- formal gates: ${report.operatorSummary.formalGates.length}`,
    `- cost risks: ${report.operatorSummary.costRisks.length}`,
    `- stale artifacts: ${report.operatorSummary.staleArtifacts.length}`,
    "",
    "## Top Actions",
    "",
    ...(report.operatorSummary.topActions.length
      ? report.operatorSummary.topActions.map((action) => `- ${action.severity} ${action.bodySystem} ${action.rootCause}: ${action.nextAction}`)
      : ["- none"]),
    "",
    "## Open PR Classification",
    "",
    ...(report.openPullRequests.length
      ? report.openPullRequests.map((pr) => `- #${pr.number} ${pr.title}: ${pr.classification}`)
      : ["- none"]),
    "",
    "## Dirty Files",
    "",
    ...(report.dirtyFiles.length
      ? report.dirtyFiles.map((file) => `- ${file.path}: ${file.classification}`)
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

export function buildAndWriteInterpretiveBrainDebugTriageReport() {
  const scoreBefore = scoreSnapshot();
  const normalized = normalizeProductSignal(sampleSignal());
  const baseFindings = interpretNormalizedSignal({
    ...normalized,
    sourceEvidence: [{
      evidenceId: "central-normalizer-source-sample",
      status: "source_confidence_ready",
      confidence: "linked",
      detail: "Source-only normalized signal sample.",
    }],
    formalEvidence: [{
      gateId: "runtime-provider-smoke",
      status: "formal_artifact_missing",
      owner: "operator",
      nextAction: "Attach formal deployed runtime/provider smoke evidence before clearing the beta gate.",
    }, {
      gateId: "admin-truth-sample",
      status: "formal_artifact_missing",
      owner: "admin-debug",
      nextAction: "Attach a redacted first-party admin truth sample before clearing the formal admin truth gate.",
    }],
    runtimeSample: [{
      sampleId: "deployed-runtime-smoke",
      status: "runtime_unverified",
      nextAction: "Run and attach deployed runtime smoke evidence outside source-only validation.",
    }],
    adminTruthSample: [{
      sampleId: "admin-truth-production-sample",
      status: "formal_artifact_missing",
      nextAction: "Attach redacted production admin truth sample evidence before clearing this gate.",
    }],
    staleArtifact: [{
      artifactPath: "agent/state/public-beta-score.generated.json",
      status: "stale_artifact_refresh_needed",
      nextAction: "Run npm run score:beta and npm run check:beta-score when source changes settle.",
    }],
    scoreDimensions: scoreDimensionInputs(scoreBefore),
  });
  const findingsWithDuplicate = duplicateProbe(baseFindings);
  const collapsedFindings = collapseDuplicateFindings(findingsWithDuplicate);
  const report = buildInterpretiveBrainDebugTriageReport({
    findings: findingsWithDuplicate,
    currentHead: currentHead(),
    dirtyFiles: changedFiles(),
    openPullRequests: listOpenPullRequests(),
    scoreDimensions: ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "freshness", "costRisk", "regressionRisk"],
    generatedAtUtc: new Date().toISOString(),
  });

  const scripts = packageScripts();
  const summary = buildOperatorSummary({ findings: collapsedFindings });
  const trackingSummary = buildDebugPanelTrackingSummary({
    interpretiveBrainDebugTriage: { debugLane: summary.debugLane },
  });
  const aiFeed = buildAiRepairWorkbenchFindingFeed(summary);
  const extraFailures = [
    scripts["check:interpretive-brain-debug-triage"] === "tsx scripts/agent/validate-interpretive-brain-debug-triage.ts"
      ? ""
      : "package.json missing check:interpretive-brain-debug-triage script.",
    trackingSummary.lanes[0]?.id === "product_brain" ? "" : "Product brain lane is not first in debug tracking summary.",
    trackingSummary.lanes[0]?.rawDetailsDefaultOpen === false ? "" : "Product brain raw details are default-open.",
    aiFeed.paidAiRuntimeAllowed === false ? "" : "AI repair feed allows paid runtime calls.",
    report.duplicateDebugFindingsCollapsed > 0 ? "" : "Duplicate debug findings were not collapsed.",
    report.operatorSummary.topActions.length <= 10 ? "" : "Product brain shows more than 10 top actions.",
  ].filter(Boolean);

  const validationFailures = [
    ...validateInterpretiveBrainReport(report),
    ...extraFailures,
  ];
  const scoreAfter = scoreSnapshot();
  const reportWithScore = {
    ...report,
    status: validationFailures.length === 0 ? "pass" : "fail",
    validationFailures,
    scoreBefore,
    scoreAfter,
  } satisfies InterpretiveBrainDebugTriageReport & {
    scoreBefore: ReturnType<typeof scoreSnapshot>;
    scoreAfter: ReturnType<typeof scoreSnapshot>;
  };

  writeJson(REPORT_PATH, reportWithScore);
  writeText(DOC_PATH, renderDoc(reportWithScore));
  return reportWithScore;
}

function main() {
  const report = buildAndWriteInterpretiveBrainDebugTriageReport();
  if (report.validationFailures.length > 0) {
    console.error(`Interpretive brain debug triage validation failed:\n- ${report.validationFailures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Interpretive brain debug triage validated: ${report.findings.length} findings, ${report.operatorSummary.topActions.length} top actions.`);
}

if (require.main === module) {
  main();
}
