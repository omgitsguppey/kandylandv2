import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type JsonRecord = Record<string, unknown>;

type DirtyFile = {
  path: string;
  status: string;
  classification: string;
  action: string;
};

type OpenPr = {
  number?: number;
  title?: string;
  url?: string;
  mergeStateStatus?: string;
  classification: string;
  action: string;
};

type StaleArtifact = {
  artifactPath: string;
  status?: string;
  refreshCommand?: string;
  nextAction?: string;
  scoreImpact?: string;
};

type EvidenceStatus = {
  lane: string;
  status: string;
  formalArtifactAttached: boolean;
};

type ScoreDrag = {
  dimension: string;
  score: number;
  weight: number;
  rawGap: number;
  weightedPointImpact: number;
  reason: string;
};

type ArtifactBlocker = {
  id: string;
  status: string;
  pointImpact: number;
  refreshCommand: string;
  nextAction: string;
};

export type Score80PathLockReport = {
  generatedAtUtc: string;
  reportKey: "score-80-path-lock";
  currentHead: string;
  oldScore: number;
  newScore: number;
  sourceHealthScore: number;
  runtimeHealthScore: number;
  evidenceCompletenessScore: number;
  freshnessScore: number;
  costRiskScore: number;
  regressionRiskScore: number;
  launchGateStatus: string;
  canStartBetaExitReview: boolean;
  exactScoreDeltaDrivers: string[];
  remainingScoreDrag: ScoreDrag[];
  artifactsBlocking80: ArtifactBlocker[];
  cleanBuildStatus: {
    status: "clean" | "classified_dirty" | "unclassified_dirty";
    dirtyCount: number;
    untrackedCount: number;
    openPrCount: number;
    staleScoreArtifactCount: number;
  };
  dirtyFiles: DirtyFile[];
  openPrs: OpenPr[];
  evidenceStatus: EvidenceStatus[];
  nextThreeActions: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT_PATH = "agent/state/score-80-path-lock.generated.json";
const DOC_PATH = "docs/agent-truth/score-80-path-lock.md";
const WEIGHTS: Array<[keyof Pick<Score80PathLockReport,
  "sourceHealthScore"
  | "runtimeHealthScore"
  | "evidenceCompletenessScore"
  | "freshnessScore"
  | "costRiskScore"
  | "regressionRiskScore">, number, string]> = [
    ["sourceHealthScore", 22, "Source health is affected by failed or stale implemented source validators."],
    ["runtimeHealthScore", 25, "Source-backed runtime confidence helps, but deployed route evidence remains separately tracked."],
    ["evidenceCompletenessScore", 22, "UI source coverage, provider-backed site activity, deployed route evidence, and admin source activity evidence are still tracked separately."],
    ["freshnessScore", 12, "Stale or missing generated evidence reports still decay freshness."],
    ["costRiskScore", 9, "Source cost readiness is partial while external billing owner review remains separate."],
    ["regressionRiskScore", 10, "Recent high-blast source changes keep regression risk from reaching zero."],
  ];

function safeExec(command: string, args: string[], fallback = "") {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function currentHead() {
  return safeExec("git", ["rev-parse", "HEAD"]);
}

function readJson(relativePath: string): JsonRecord | null {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function arrayOfRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is JsonRecord => entry && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function classifyDirtyPath(path: string, status: string): DirtyFile {
  if (/^(eslint-errors|test-failures|tsc-errors)\.log$/u.test(path)) {
    return { path, status, classification: "current_generated_artifact_to_commit", action: "Delete stale terminal log artifact." };
  }
  if (path === ARTIFACT_PATH || path === DOC_PATH) {
    return { path, status, classification: "current_generated_artifact_to_commit", action: "Commit score-80 path lock artifact." };
  }
  if (/^scripts\/agent\/validate-(analytics-semantics-final-lock|beta-score-cleanup|blocked-refresh-queue-resolver|creator-surface-routing|debug-backlog-engine|evidence-readiness-checklists|final-beta-exit-gate-readiness|final-cost-audit-lock|final-morning-beta-lock|overnight-beta-readiness-lock|overnight-final-integration-lock|score-80-path-lock|score-80-refresh-pass|score-80-refresh-queue-execution|user-creator-visual-confirmation)\.ts$/u.test(path)) {
    return { path, status, classification: "real_source_change_needs_review", action: "Commit scoped score-80 path lock validator/test." };
  }
  if (/^tests\/unit\/(beta-score-cleanup|blocked-refresh-queue-resolver|debug-backlog-engine|evidence-artifact-schemas|evidence-readiness-checklists|final-morning-beta-lock|overnight-beta-readiness-lock|score-80-path-lock|score-80-refresh-pass)\.spec\.ts$/u.test(path)) {
    return { path, status, classification: "real_source_change_needs_review", action: "Commit targeted source-coverage test update." };
  }
  if (path === "src/app/admin/debug/components/DebugOperatorCockpit.tsx" || path === "src/lib/debug/debug-backlog-builder.ts") {
    return { path, status, classification: "real_source_change_needs_review", action: "Commit admin/debug source coverage wording update." };
  }
  if (path === "src/lib/agent-score/score-80-reconciliation-lock.ts") {
    return { path, status, classification: "real_source_change_needs_review", action: "Commit scoped score-80 reconciliation wording update." };
  }
  if (path === "package.json" || path === "package-lock.json") {
    return { path, status, classification: "real_source_change_needs_review", action: "Commit scoped package script update." };
  }
  if (
    path === "CHANGELOG.md"
    || path === "public/kandydrops-release-notes.json"
    || path === "src/lib/release-notes/public-release-notes.ts"
    || path === "src/lib/release-notes/release-version-contract.ts"
  ) {
    return { path, status, classification: "release_artifact_expected", action: "Commit same-release beta note update." };
  }
  if (/^agent\/state\/.+\.generated\.json$/u.test(path) || /^docs\/agent-truth\/.+\.md$/u.test(path)) {
    return { path, status, classification: "current_generated_artifact_to_commit", action: "Commit refreshed score/evidence artifact generated by focused validators." };
  }
  return { path, status, classification: "unsafe_unknown", action: "Stop and classify before staging." };
}

function collectDirtyFiles(): DirtyFile[] {
  const status = safeExec("git", ["status", "--short"]);
  if (!status) return [];
  return status
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      const match = /^(.{2})\s+(.+)$/u.exec(line);
      const statusCode = (match?.[1] ?? line.slice(0, 2)).trim() || (match?.[1] ?? line.slice(0, 2));
      const path = (match?.[2] ?? line.slice(2)).trim();
      return classifyDirtyPath(path, statusCode);
    });
}

function collectOpenPrs(): OpenPr[] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const output = safeExec("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,mergeStateStatus,url"], "[]");
  try {
    const parsed = JSON.parse(output) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((entry) => {
          const pr = record(entry);
          return {
            number: typeof pr.number === "number" ? pr.number : undefined,
            title: stringValue(pr.title),
            url: stringValue(pr.url),
            mergeStateStatus: stringValue(pr.mergeStateStatus),
            classification: "preserved_requires_manual_review",
            action: "Open PR was classified but not merged by score lock pass.",
          };
        })
      : [];
  } catch {
    return [{
      classification: "unsafe_unknown",
      action: "Unable to parse open PR list.",
    }];
  }
}

function buildRemainingScoreDrag(scores: Pick<Score80PathLockReport,
  "sourceHealthScore"
  | "runtimeHealthScore"
  | "evidenceCompletenessScore"
  | "freshnessScore"
  | "costRiskScore"
  | "regressionRiskScore">): ScoreDrag[] {
  return WEIGHTS.map(([dimension, weight, reason]) => {
    const score = numberValue(scores[dimension]);
    const rawGap = round(100 - score);
    return {
      dimension,
      score,
      weight,
      rawGap,
      weightedPointImpact: round(rawGap * (weight / 100)),
      reason,
    };
  }).sort((a, b) => b.weightedPointImpact - a.weightedPointImpact);
}

function refreshCommandForEvidenceGate(id: string) {
  if (id.includes("ui_source") || id.includes("visual")) return "Run npm run check:ui-visual-smoke-minimal and fix source-reported UI surface gaps; browser or screenshot reproduction is optional only after source reports a concrete issue.";
  if (id.includes("manual")) return "Resolve this legacy manual-evidence alias into a typed source evidence lane, then run npm run check:evidence-capture-status";
  if (id.includes("provider")) return "Produce provider-backed site activity evidence, then run npm run check:evidence-capture-status";
  if (id.includes("runtime") || id.includes("deployed_route")) return "Produce deployed route evidence, then run npm run check:evidence-capture-status";
  if (id.includes("admin")) return "Produce admin source activity sample evidence, then run npm run check:evidence-capture-status";
  return "Run npm run check:evidence-capture-status";
}

function normalizeEvidenceCap(cap: string) {
  if (/visual\/manual smoke|visual qa|ui source coverage|ui surface coverage/iu.test(cap)) {
    return {
      id: "ui_source_coverage",
      status: "UI source coverage: source evidence required",
      lane: "ui_source_coverage",
      nextAction: "Run deterministic UI source coverage before optional browser reproduction.",
    };
  }
  if (/provider-backed site activity/iu.test(cap)) {
    return {
      id: "provider_backed_site_activity_evidence",
      status: "Provider-backed site activity evidence: source evidence required",
      lane: "provider_activity",
      nextAction: "Produce provider-backed site activity evidence before clearing this beta gate.",
    };
  }
  if (/deployed route evidence|deployed runtime route evidence/iu.test(cap)) {
    return {
      id: "deployed_route_evidence",
      status: "Deployed route evidence: source evidence required",
      lane: "deployed_route",
      nextAction: "Produce deployed route evidence before clearing this beta gate.",
    };
  }
  if (/runtime\/provider smoke|runtime unverified|provider smoke/iu.test(cap)) {
    return {
      id: "provider_backed_site_activity_deployed_route_evidence",
      status: "Provider-backed site activity + deployed route evidence: source evidence required",
      lane: "provider_runtime",
      nextAction: "Produce provider-backed site activity and deployed route evidence before clearing this beta gate.",
    };
  }
  if (/admin truth\/sample evidence|admin truth|admin source activity/iu.test(cap)) {
    return {
      id: "admin_source_activity_sample",
      status: "Admin source activity sample: source evidence required",
      lane: "admin_source_activity",
      nextAction: "Produce admin source activity sample evidence before clearing this beta gate.",
    };
  }
  const id = cap.replace(/^[^:]+:\s*/u, "").replace(/[^a-z0-9]+/giu, "_").replace(/^_|_$/gu, "").toLowerCase();
  return {
    id,
    status: `${cap}: source evidence required`,
    lane: id,
    nextAction: "Produce the matching source evidence before clearing this beta gate.",
  };
}

function buildArtifactBlockers(input: {
  staleArtifacts: StaleArtifact[];
  evidenceStatus: EvidenceStatus[];
  betaScore: JsonRecord;
  remainingScoreDrag: ScoreDrag[];
}): ArtifactBlocker[] {
  const stale = input.staleArtifacts.map((artifact, index) => ({
    id: artifact.artifactPath,
    status: stringValue(artifact.status, "stale"),
    pointImpact: index < 5 ? round(Math.max(0.25, 2 - (index * 0.2))) : 0.25,
    refreshCommand: stringValue(artifact.refreshCommand),
    nextAction: stringValue(artifact.nextAction, stringValue(artifact.refreshCommand, "Refresh this artifact from the latest code version.")),
  }));
  const caps = Array.isArray(input.betaScore.evidenceCapsApplied) ? input.betaScore.evidenceCapsApplied as unknown[] : [];
  const formalEvidence = caps
    .map((cap) => String(cap))
    .filter((cap) => /visual|manual|runtime|provider|admin|source activity|source evidence|deployed route/iu.test(cap))
    .map((cap) => {
      const normalized = normalizeEvidenceCap(cap);
      const impact = /runtime|provider|deployed_route|provider_activity/iu.test(normalized.id)
        ? input.remainingScoreDrag.find((entry) => entry.dimension === "runtimeHealthScore")?.weightedPointImpact ?? 0
        : /ui_source|admin/iu.test(normalized.id)
          ? input.remainingScoreDrag.find((entry) => entry.dimension === "evidenceCompletenessScore")?.weightedPointImpact ?? 0
          : 0;
      return {
        id: normalized.id,
        status: normalized.status,
        pointImpact: round(impact),
        refreshCommand: refreshCommandForEvidenceGate(normalized.id),
        nextAction: normalized.nextAction,
      };
    });
  return [...formalEvidence, ...stale]
    .sort((a, b) => b.pointImpact - a.pointImpact);
}

function evidenceStatusFromCapture(report: JsonRecord | null): EvidenceStatus[] {
  const summary = record(report?.summary);
  const operatorRevenue = record(summary.operatorRevenueSmoke);
  const runtimeSmokeStatus = stringValue(summary.runtimeSmokeEvidence, "missing");
  const uiSurfaceCoverageStatus = stringValue(summary.uiSurfaceCoverageEvidence, "missing");
  const adminTruthSampleStatus = stringValue(summary.adminTruthSampleEvidence, "missing");
  return [
    {
      lane: "ui_source_coverage",
      status: uiSurfaceCoverageStatus === "complete" ? "ui_source_coverage_present" : uiSurfaceCoverageStatus,
      formalArtifactAttached: false,
    },
    { lane: "provider_smoke", status: stringValue(summary.providerSmokeEvidence, "missing"), formalArtifactAttached: booleanValue(operatorRevenue.providerArtifactAttached) },
    { lane: "runtime_smoke", status: runtimeSmokeStatus === "complete" ? "runtime_capture_present_formal_freshness_checked_separately" : runtimeSmokeStatus, formalArtifactAttached: false },
    {
      lane: "admin_truth_sample",
      status: adminTruthSampleStatus === "complete" ? "admin_source_activity_sample_present" : adminTruthSampleStatus,
      formalArtifactAttached: false,
    },
    { lane: "operator_revenue_smoke", status: stringValue(operatorRevenue.revenueSmokeStatus, "unknown"), formalArtifactAttached: booleanValue(operatorRevenue.formalProviderSmokePassed) },
  ];
}

export function buildScore80PathLockReport(input: {
  generatedAtUtc: string;
  currentHead: string;
  oldScore: number;
  betaScore: JsonRecord;
  refreshPlan: StaleArtifact[];
  staleArtifacts: StaleArtifact[];
  dirtyFiles: DirtyFile[];
  openPrs: OpenPr[];
  evidenceStatus: EvidenceStatus[];
}): Score80PathLockReport {
  const sourceHealthScore = numberValue(input.betaScore.sourceHealthScore);
  const runtimeHealthScore = numberValue(input.betaScore.runtimeHealthScore);
  const evidenceCompletenessScore = numberValue(input.betaScore.evidenceCompletenessScore);
  const freshnessScore = numberValue(input.betaScore.freshnessScore);
  const costRiskScore = numberValue(input.betaScore.costRiskScore);
  const regressionRiskScore = numberValue(input.betaScore.regressionRiskScore);
  const remainingScoreDrag = buildRemainingScoreDrag({
    sourceHealthScore,
    runtimeHealthScore,
    evidenceCompletenessScore,
    freshnessScore,
    costRiskScore,
    regressionRiskScore,
  });
  const staleArtifacts = input.staleArtifacts.length > 0
    ? input.staleArtifacts
    : input.refreshPlan.filter((entry) => entry.status && entry.status !== "current");
  const artifactsBlocking80 = buildArtifactBlockers({
    staleArtifacts,
    evidenceStatus: input.evidenceStatus,
    betaScore: input.betaScore,
    remainingScoreDrag,
  });
  const providerActivityBlocking = artifactsBlocking80.some((entry) => entry.id.includes("provider_backed_site_activity"));
  const deployedRouteBlocking = artifactsBlocking80.some((entry) => entry.id === "deployed_route_evidence");
  const firstEvidenceAction = providerActivityBlocking && deployedRouteBlocking
    ? "Produce provider-backed site activity and deployed route evidence; source-backed confidence does not clear those gates."
    : providerActivityBlocking
      ? "Produce provider-backed site activity evidence; deployed route evidence stays separately tracked."
      : deployedRouteBlocking
        ? "Produce deployed route evidence; provider-backed site activity stays separately tracked."
        : "Keep typed source-evidence lanes current without treating source confidence as provider or deployed-route proof.";
  const unsafeDirty = input.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown");
  const unsafePr = input.openPrs.some((entry) => entry.classification === "unsafe_unknown" || !entry.classification);
  const dirtyCount = input.dirtyFiles.length;

  return {
    generatedAtUtc: input.generatedAtUtc,
    reportKey: "score-80-path-lock",
    currentHead: input.currentHead,
    oldScore: input.oldScore,
    newScore: numberValue(input.betaScore.healthScore, numberValue(input.betaScore.overallScore)),
    sourceHealthScore,
    runtimeHealthScore,
    evidenceCompletenessScore,
    freshnessScore,
    costRiskScore,
    regressionRiskScore,
    launchGateStatus: stringValue(input.betaScore.launchGateStatus, "unknown"),
    canStartBetaExitReview: booleanValue(input.betaScore.canStartBetaExitReview),
    exactScoreDeltaDrivers: [
      `oldScore=${input.oldScore}`,
      `newScore=${numberValue(input.betaScore.healthScore, numberValue(input.betaScore.overallScore))}`,
      `scoreDelta=${round(numberValue(input.betaScore.healthScore, numberValue(input.betaScore.overallScore)) - input.oldScore)}`,
      ...((Array.isArray(input.betaScore.scoreDeltaDrivers) ? input.betaScore.scoreDeltaDrivers : []) as unknown[]).map((entry) => String(entry)),
      ...remainingScoreDrag.map((entry) => `${entry.dimension} drag=${entry.weightedPointImpact}`),
    ],
    remainingScoreDrag,
    artifactsBlocking80,
    cleanBuildStatus: {
      status: dirtyCount === 0 ? "clean" : unsafeDirty || unsafePr ? "unclassified_dirty" : "classified_dirty",
      dirtyCount,
      untrackedCount: input.dirtyFiles.filter((entry) => entry.status === "??").length,
      openPrCount: input.openPrs.length,
      staleScoreArtifactCount: staleArtifacts.length,
    },
    dirtyFiles: input.dirtyFiles,
    openPrs: input.openPrs,
    evidenceStatus: input.evidenceStatus,
    nextThreeActions: [
      firstEvidenceAction,
      "Run UI source coverage and produce admin source activity sample evidence so evidence completeness can move without fake proof.",
      "Refresh or retire every stale score-impacting artifact using its listed command before re-running npm run score:beta.",
    ],
  };
}

export function validateScore80PathLockReport(report: Score80PathLockReport): string[] {
  const failures: string[] = [];
  if (report.reportKey !== "score-80-path-lock") failures.push("reportKey must be score-80-path-lock.");
  if (!report.currentHead) failures.push("currentHead missing.");
  if (report.newScore < report.oldScore && !report.exactScoreDeltaDrivers.some((driver) => /below|drop|decrease|scoreDelta=-/iu.test(driver))) {
    failures.push("score is below prior score without explanation.");
  }
  if (report.artifactsBlocking80.some((entry) => /stale/iu.test(entry.status) && !entry.refreshCommand)) {
    failures.push("stale artifacts remain score-impacting without refresh command.");
  }
  if (report.dirtyFiles.some((entry) => !entry.classification || entry.classification === "unsafe_unknown")) {
    failures.push("dirty files unclassified.");
  }
  if (report.openPrs.some((entry) => !entry.classification || entry.classification === "unsafe_unknown")) {
    failures.push("open PRs unclassified.");
  }
  if (report.remainingScoreDrag.length < 6) {
    failures.push("remaining score drag is not ranked by point impact.");
  }
  for (let index = 1; index < report.remainingScoreDrag.length; index += 1) {
    if (report.remainingScoreDrag[index - 1].weightedPointImpact < report.remainingScoreDrag[index].weightedPointImpact) {
      failures.push("remaining score drag is not ranked by point impact.");
      break;
    }
  }
  const falseEvidenceClear = report.launchGateStatus === "launch_ready"
    || report.canStartBetaExitReview === true
    || report.evidenceStatus.some((entry) =>
      /passed|complete|ready/iu.test(entry.status)
      && entry.formalArtifactAttached === false
      && !["operator_revenue_smoke", "ui_source_coverage"].includes(entry.lane)
    );
  if (falseEvidenceClear) failures.push("evidence gates are falsely cleared.");
  if (report.artifactsBlocking80.length === 0) failures.push("artifactsBlocking80 missing.");
  if (report.nextThreeActions.length !== 3 || report.nextThreeActions.some((entry) => entry.trim().length === 0)) {
    failures.push("nextThreeActions missing.");
  }
  return Array.from(new Set(failures));
}

function renderDoc(report: Score80PathLockReport) {
  const dragRows = report.remainingScoreDrag
    .map((entry) => `| ${entry.dimension} | ${entry.score} | ${entry.weight} | ${entry.weightedPointImpact} | ${entry.reason} |`)
    .join("\n");
  const blockerRows = report.artifactsBlocking80
    .map((entry) => `| ${entry.id} | ${entry.status} | ${entry.pointImpact} | ${entry.refreshCommand} |`)
    .join("\n");
  const dirtyRows = report.dirtyFiles.length > 0
    ? report.dirtyFiles.map((entry) => `| ${entry.path} | ${entry.status} | ${entry.classification} | ${entry.action} |`).join("\n")
    : "| none | clean | clean | No dirty files at generation time. |";
  const prRows = report.openPrs.length > 0
    ? report.openPrs.map((entry) => `| #${entry.number ?? ""} ${entry.title ?? ""} | ${entry.mergeStateStatus ?? ""} | ${entry.classification} | ${entry.action} |`).join("\n")
    : "| none | none | classified | No open PRs. |";
  return `# Score 80 Path Lock

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Score

- Old score: ${report.oldScore}
- New score: ${report.newScore}
- Source health: ${report.sourceHealthScore}
- Runtime health: ${report.runtimeHealthScore}
- Evidence completeness: ${report.evidenceCompletenessScore}
- Freshness: ${report.freshnessScore}
- Cost risk: ${report.costRiskScore}
- Regression risk: ${report.regressionRiskScore}
- Launch gate: ${report.launchGateStatus}
- Can start beta exit review: ${report.canStartBetaExitReview}

## Remaining Score Drag

| Dimension | Score | Weight | Weighted point impact | Reason |
| --- | ---: | ---: | ---: | --- |
${dragRows}

## Artifacts Blocking 80

| Artifact or gate | Status | Point impact | Refresh action |
| --- | --- | ---: | --- |
${blockerRows}

## Clean Build Status

- Status: ${report.cleanBuildStatus.status}
- Dirty files: ${report.cleanBuildStatus.dirtyCount}
- Open PRs: ${report.cleanBuildStatus.openPrCount}
- Stale score artifacts: ${report.cleanBuildStatus.staleScoreArtifactCount}

## Dirty Files

| Path | Status | Classification | Action |
| --- | --- | --- | --- |
${dirtyRows}

## Open PRs

| PR | Merge state | Classification | Action |
| --- | --- | --- | --- |
${prRows}

## Next Three Actions

${report.nextThreeActions.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Boundary

This lock refreshes source-backed score evidence and dirty-build prevention only. It does not mark beta exit ready and does not clear provider-backed, deployed route, or admin source activity lanes without matching source evidence.
`;
}

function main() {
  const head = currentHead();
  const betaScore = readJson("agent/state/public-beta-score.generated.json") ?? {};
  const refreshSafeguards = readJson("agent/state/refresh-safeguards.generated.json") ?? {};
  const evidenceCapture = readJson("agent/state/evidence-capture-status.generated.json") ?? {};
  const refreshPass = readJson("agent/state/score-80-refresh-pass.generated.json") ?? {};
  const refreshSummary = record(refreshPass.summary);
  const oldScore = numberValue(refreshSummary.oldScore, numberValue(refreshSummary.newScore, numberValue(betaScore.healthScore, numberValue(betaScore.overallScore))));
  const refreshPlan = arrayOfRecords(refreshSafeguards.refreshPlan).map((entry) => ({
    artifactPath: stringValue(entry.artifactPath),
    status: stringValue(entry.status),
    refreshCommand: stringValue(entry.refreshCommand),
    nextAction: stringValue(entry.nextAction),
  })).filter((entry) => entry.artifactPath);
  const staleArtifacts = arrayOfRecords(refreshSafeguards.staleArtifacts).map((entry) => ({
    artifactPath: stringValue(entry.artifactPath),
    status: stringValue(entry.status),
    refreshCommand: stringValue(entry.refreshCommand),
    nextAction: stringValue(entry.nextAction),
  })).filter((entry) => entry.artifactPath);
  const report = buildScore80PathLockReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    oldScore,
    betaScore,
    refreshPlan,
    staleArtifacts,
    dirtyFiles: collectDirtyFiles(),
    openPrs: collectOpenPrs(),
    evidenceStatus: evidenceStatusFromCapture(evidenceCapture),
  });
  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, ARTIFACT_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report));

  const failures = validateScore80PathLockReport(report);
  if (failures.length > 0) {
    console.error("Score 80 path lock validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Score 80 path lock passed. old=${report.oldScore} new=${report.newScore} dirty=${report.cleanBuildStatus.status}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
