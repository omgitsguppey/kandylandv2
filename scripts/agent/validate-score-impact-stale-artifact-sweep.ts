import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonRecord = Record<string, unknown>;

export type SweepCommandResult = {
  command: string;
  exitCode: number;
};

export type SweepDirtyFile = {
  path: string;
  status: string;
  classification: string;
  action: string;
};

export type SweepOpenPr = {
  number?: number;
  title?: string;
  url?: string;
  classification: string;
  action: string;
};

export type SweepArtifactAction = {
  artifactPath: string;
  reportKey?: string;
  status:
    | "refreshed_current"
    | "refreshed_older_code_version"
    | "blocked_failed_refresh"
    | "remaining_stale_with_refresh_command"
    | "remaining_stale_missing_refresh_command"
    | "not_requested";
  command?: string;
  exitCode?: number;
  refreshCommand?: string | null;
  sourceVersion?: string;
  scoreImpacting: boolean;
  reason: string;
  nextAction: string;
};

export type ScoreImpactStaleArtifactSweepReport = {
  generatedAtUtc: string;
  reportKey: "score-impact-stale-artifact-sweep";
  currentHead: string;
  oldScore: number;
  newScore: number;
  scoreDelta: number;
  scoreDropExplanation: string | null;
  formalEvidenceGatesUnchanged: boolean;
  staleArtifactActions: SweepArtifactAction[];
  refreshedArtifacts: string[];
  blockedRefreshes: SweepArtifactAction[];
  remainingScoreImpactingStaleArtifacts: SweepArtifactAction[];
  dirtyFiles: SweepDirtyFile[];
  openPrs: SweepOpenPr[];
  checksRun: SweepCommandResult[];
  summary: {
    requestedLaneCount: number;
    refreshedCurrentCount: number;
    blockedRefreshCount: number;
    remainingStaleCount: number;
    dirtyFilesClassified: boolean;
    openPrsClassified: boolean;
    betaExitReadyMarked: boolean;
  };
  nextExactSteps: string[];
};

type BuildInputs = {
  generatedAtUtc: string;
  currentHead: string;
  oldScore: number;
  betaScore: JsonRecord;
  refreshResults: SweepCommandResult[];
  artifactHeads: Record<string, string | null>;
  dirtyFiles: SweepDirtyFile[];
  openPrs: SweepOpenPr[];
  scoreDropExplanation?: string | null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const STATE_PATH = "agent/state/score-impact-stale-artifact-sweep.generated.json";
const DOC_PATH = "docs/agent-truth/score-impact-stale-artifact-sweep.md";
const TMP_REFRESH_RESULTS = "agent/state/score-impact-stale-artifact-sweep.refresh-results.tmp.json";
const TMP_POST_REFRESH_RESULTS = "agent/state/score-impact-stale-artifact-sweep.post-refresh-results.tmp.json";
const TMP_EXTRA_RESULTS = "agent/state/score-impact-stale-artifact-sweep.extra-results.tmp.json";

const requestedLanes: Array<{ command: string; artifactPath: string; reportKey: string }> = [
  { command: "npm run check:current-beta-exit-status", artifactPath: "agent/state/current-beta-exit-status.generated.json", reportKey: "current-beta-exit-status" },
  { command: "npm run check:overnight-final-integration-lock", artifactPath: "agent/state/overnight-final-integration-lock.generated.json", reportKey: "overnight-final-integration-lock" },
  { command: "npm run check:evidence-capture-status", artifactPath: "agent/state/evidence-capture-status.generated.json", reportKey: "evidence-capture-status" },
  { command: "npm run check:beta-evidence-gap-map", artifactPath: "agent/state/beta-evidence-gap-map.generated.json", reportKey: "beta-evidence-gap-map" },
  { command: "npm run check:beta-evidence-lane-prep", artifactPath: "agent/state/beta-evidence-lane-prep.generated.json", reportKey: "beta-evidence-lane-prep" },
  { command: "npm run check:beta-freshness-language", artifactPath: "agent/state/beta-freshness-language.generated.json", reportKey: "beta-freshness-language" },
  { command: "npm run check:final-pr-stale-cleanup", artifactPath: "agent/state/final-pr-stale-cleanup.generated.json", reportKey: "final-pr-stale-cleanup" },
  { command: "npm run check:source-truth-authority-map", artifactPath: "agent/state/source-truth-authority-map.generated.json", reportKey: "source-truth-authority-map" },
  { command: "npm run check:final-telemetry-closure-lock", artifactPath: "agent/state/final-telemetry-closure-lock.generated.json", reportKey: "final-telemetry-closure-lock" },
  { command: "npm run check:mobile-ui-final-lock", artifactPath: "agent/state/mobile-ui-final-lock.generated.json", reportKey: "mobile-ui-final-lock" },
  { command: "npm run check:creator-settings-control-plane", artifactPath: "agent/state/creator-settings-control-plane.generated.json", reportKey: "creator-settings-control-plane" },
  { command: "npm run check:creator-drop-status-metrics", artifactPath: "agent/state/creator-drop-status-metrics.generated.json", reportKey: "creator-drop-status-metrics" },
  { command: "npm run check:operator-revenue-smoke", artifactPath: "agent/state/operator-revenue-smoke.generated.json", reportKey: "operator-revenue-smoke" },
  { command: "npm run check:overnight-wiring-integrity", artifactPath: "agent/state/overnight-wiring-integrity.generated.json", reportKey: "overnight-wiring-integrity" },
  { command: "npm run check:existing-algorithm-refinement", artifactPath: "agent/state/existing-algorithm-refinement.generated.json", reportKey: "existing-algorithm-refinement" },
  { command: "npm run check:user-loading-wallet-mobile-refinement", artifactPath: "agent/state/user-loading-wallet-mobile-refinement.generated.json", reportKey: "user-loading-wallet-mobile-refinement" },
  { command: "npm run check:global-marquee-truncated-titles", artifactPath: "agent/state/global-marquee-truncated-titles.generated.json", reportKey: "global-marquee-truncated-titles" },
];

function safeExec(command: string, args: string[], fallback = "") {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return fallback;
  }
}

function currentHead() {
  return safeExec("git", ["rev-parse", "HEAD"], "unknown");
}

function readJson(relativePath: string): JsonRecord | null {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8").replace(/^\uFEFF/u, "")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is JsonRecord => entry && typeof entry === "object" && !Array.isArray(entry))
    : [];
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function artifactSourceVersion(relativePath: string): string | null {
  const artifact = readJson(relativePath);
  if (!artifact) return null;
  return stringValue(artifact.currentHead)
    || stringValue(artifact.sourceCommit)
    || stringValue(artifact.latestCodeVersion)
    || null;
}

function commandResultsFrom(relativePath: string): SweepCommandResult[] {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(fullPath, "utf8").replace(/^\uFEFF/u, "")) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((entry) => {
          const item = record(entry);
          return {
            command: stringValue(item.command),
            exitCode: numberValue(item.exitCode, 1),
          };
        }).filter((entry) => entry.command)
      : [];
  } catch {
    return [];
  }
}

function classifyDirtyPath(path: string, status: string): SweepDirtyFile {
  if (path === STATE_PATH || path === DOC_PATH) {
    return { path, status, classification: "current_generated_artifact_to_commit", action: "Commit scoped stale artifact sweep report." };
  }
  if (
    path === "scripts/agent/validate-score-impact-stale-artifact-sweep.ts"
    || path === "tests/unit/score-impact-stale-artifact-sweep.spec.ts"
    || path === "scripts/agent/validate-public-beta-score.ts"
  ) {
    return { path, status, classification: "real_source_change_needs_review", action: "Commit scoped stale artifact sweep validator/test." };
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
    return { path, status, classification: "current_generated_artifact_to_commit", action: "Commit refreshed score-impact artifact generated by focused validators." };
  }
  return { path, status, classification: "unsafe_unknown", action: "Stop and classify before staging." };
}

function collectDirtyFiles(): SweepDirtyFile[] {
  const status = safeExec("git", ["status", "--short"]);
  if (!status) return [];
  return status.split(/\r?\n/u).filter(Boolean).map((line) => {
    const match = /^(.{2})\s+(.+)$/u.exec(line);
    const code = (match?.[1] ?? line.slice(0, 2)).trim() || (match?.[1] ?? line.slice(0, 2));
    const path = (match?.[2] ?? line.slice(2)).trim();
    return classifyDirtyPath(path, code);
  });
}

function collectOpenPrs(): SweepOpenPr[] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") {
    return [{
      number: 0,
      title: "GitHub open PR evidence not queried",
      url: "",
      classification: "external_evidence_required",
      action: "Set ALLOW_GH_PR_LIST=1 only for an operator-approved external PR query; missing GitHub evidence cannot clear source, runtime, provider, or release gates.",
    }];
  }
  const output = safeExec("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url"], "[]");
  try {
    const parsed = JSON.parse(output) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((entry) => {
          const pr = record(entry);
          return {
            number: typeof pr.number === "number" ? pr.number : undefined,
            title: stringValue(pr.title),
            url: stringValue(pr.url),
            classification: "preserved_unrelated_or_manual_review",
            action: "No merge during stale-artifact sweep.",
          };
        })
      : [];
  } catch {
    return [{ classification: "external_evidence_required", action: "Unable to parse GitHub PR evidence; keep release/PR gates external-evidence-required." }];
  }
}

function staleArtifactsFrom(betaScore: JsonRecord) {
  return records(betaScore.staleArtifacts).map((entry) => ({
    artifactPath: stringValue(entry.artifactPath) || stringValue(entry.path) || stringValue(entry.artifact),
    reportKey: stringValue(entry.reportKey),
    status: stringValue(entry.status),
    refreshCommand: stringValue(entry.refreshCommand) || null,
    nextAction: stringValue(entry.nextAction) || "Refresh or retire this stale score-impact artifact.",
  })).filter((entry) => entry.artifactPath);
}

function formalEvidenceGatesUnchanged(betaScore: JsonRecord) {
  const caps = [
    ...records(betaScore.evidenceCapsApplied).map(String),
    ...records(betaScore.evidenceCapDetails).map(String),
    ...((Array.isArray(betaScore.evidenceCapsApplied) ? betaScore.evidenceCapsApplied : []) as unknown[]).map(String),
    ...((Array.isArray(betaScore.evidenceCapDetails) ? betaScore.evidenceCapDetails : []) as unknown[]).map(String),
  ].join("\n");
  return /Visual QA required|Visual\/manual smoke/iu.test(caps)
    && /Runtime unverified|Runtime\/provider smoke/iu.test(caps)
    && /Unknown evidence|Admin truth\/sample evidence/iu.test(caps)
    && stringValue(betaScore.launchGateStatus) !== "launch_ready";
}

export function buildScoreImpactStaleArtifactSweepReport(inputs: BuildInputs): ScoreImpactStaleArtifactSweepReport {
  const resultByCommand = new Map(inputs.refreshResults.map((result) => [result.command, result]));
  const activeStale = staleArtifactsFrom(inputs.betaScore);
  const activeStaleByPath = new Map(activeStale.map((entry) => [entry.artifactPath, entry]));
  const actions: SweepArtifactAction[] = [];

  for (const lane of requestedLanes) {
    const result = resultByCommand.get(lane.command);
    const sourceVersion = inputs.artifactHeads[lane.artifactPath] ?? null;
    if (!result) {
      actions.push({
        artifactPath: lane.artifactPath,
        reportKey: lane.reportKey,
        status: "not_requested",
        command: lane.command,
        sourceVersion: sourceVersion ?? undefined,
        scoreImpacting: activeStaleByPath.has(lane.artifactPath),
        reason: "Refresh command was not run during this sweep.",
        nextAction: `Run ${lane.command}.`,
      });
      continue;
    }
    if (result.exitCode !== 0) {
      actions.push({
        artifactPath: lane.artifactPath,
        reportKey: lane.reportKey,
        status: "blocked_failed_refresh",
        command: lane.command,
        exitCode: result.exitCode,
        sourceVersion: sourceVersion ?? undefined,
        scoreImpacting: activeStaleByPath.has(lane.artifactPath),
        reason: "Focused refresh validator failed; stale status is recorded instead of passed.",
        nextAction: `Fix the validator blocker and rerun ${lane.command}.`,
      });
      continue;
    }
    actions.push({
      artifactPath: lane.artifactPath,
      reportKey: lane.reportKey,
      status: sourceVersion && sourceVersion !== inputs.currentHead ? "refreshed_older_code_version" : "refreshed_current",
      command: lane.command,
      exitCode: result.exitCode,
      sourceVersion: sourceVersion ?? undefined,
      scoreImpacting: activeStaleByPath.has(lane.artifactPath),
      reason: sourceVersion && sourceVersion !== inputs.currentHead
        ? "Refresh command passed, but artifact source version does not match the latest code version."
        : "Refresh command passed from the latest score sweep.",
      nextAction: sourceVersion && sourceVersion !== inputs.currentHead
        ? `Rerun ${lane.command} after fixing source version metadata.`
        : "No action needed for this sweep.",
    });
  }

  for (const stale of activeStale) {
    if (actions.some((action) => action.artifactPath === stale.artifactPath)) continue;
    actions.push({
      artifactPath: stale.artifactPath,
      reportKey: stale.reportKey,
      status: stale.refreshCommand ? "remaining_stale_with_refresh_command" : "remaining_stale_missing_refresh_command",
      refreshCommand: stale.refreshCommand,
      sourceVersion: inputs.artifactHeads[stale.artifactPath] ?? undefined,
      scoreImpacting: true,
      reason: stale.status || "stale_source_version",
      nextAction: stale.nextAction,
    });
  }

  const newScore = numberValue(inputs.betaScore.healthScore, numberValue(inputs.betaScore.overallScore));
  const scoreDelta = round(newScore - inputs.oldScore);
  const scoreDropExplanation = scoreDelta < 0
    ? inputs.scoreDropExplanation ?? "Score decreased because refreshed score inputs reported stricter or still-stale evidence."
    : null;
  const remainingScoreImpactingStaleArtifacts = actions.filter((entry) => entry.scoreImpacting && entry.status.startsWith("remaining_stale"));
  const blockedRefreshes = actions.filter((entry) => entry.status === "blocked_failed_refresh");
  const refreshedArtifacts = actions.filter((entry) => entry.status === "refreshed_current").map((entry) => entry.artifactPath);
  const dirtyFilesClassified = inputs.dirtyFiles.every((entry) => entry.classification && entry.classification !== "unsafe_unknown" && entry.action);
  const openPrsClassified = inputs.openPrs.every((entry) => entry.classification && entry.classification !== "unsafe_unknown" && entry.action);

  const nextExactSteps = remainingScoreImpactingStaleArtifacts.length > 0
    ? [
        "Run npm run check:current-beta-exit-status after regenerating its owner report from the latest code version.",
        "Run npm run check:evidence-capture-status to refresh formal evidence capture status without clearing missing gates.",
        "Run npm run check:creator-drop-status-metrics and npm run check:operator-revenue-smoke to clear the remaining stale score-impact reports.",
      ]
    : [
        "Fix the overnight-final-integration-lock creator drop metrics status blocker before treating that lock as passed.",
        "Attach formal visual/manual, deployed runtime/provider, and admin truth sample evidence before beta exit review.",
        "Keep npm run check:refresh-safeguards and npm run score:beta together when score-impact reports change.",
      ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "score-impact-stale-artifact-sweep",
    currentHead: inputs.currentHead,
    oldScore: inputs.oldScore,
    newScore,
    scoreDelta,
    scoreDropExplanation,
    formalEvidenceGatesUnchanged: formalEvidenceGatesUnchanged(inputs.betaScore),
    staleArtifactActions: actions,
    refreshedArtifacts,
    blockedRefreshes,
    remainingScoreImpactingStaleArtifacts,
    dirtyFiles: inputs.dirtyFiles,
    openPrs: inputs.openPrs,
    checksRun: inputs.refreshResults,
    summary: {
      requestedLaneCount: requestedLanes.length,
      refreshedCurrentCount: refreshedArtifacts.length,
      blockedRefreshCount: blockedRefreshes.length,
      remainingStaleCount: remainingScoreImpactingStaleArtifacts.length,
      dirtyFilesClassified,
      openPrsClassified,
      betaExitReadyMarked: stringValue(inputs.betaScore.launchGateStatus) === "launch_ready",
    },
    nextExactSteps,
  };
}

export function validateScoreImpactStaleArtifactSweepReport(report: ScoreImpactStaleArtifactSweepReport) {
  const failures: string[] = [];
  if (report.reportKey !== "score-impact-stale-artifact-sweep") failures.push("reportKey must be score-impact-stale-artifact-sweep.");
  if (!report.currentHead || report.currentHead === "unknown") failures.push("currentHead is required.");
  if (!Number.isFinite(report.oldScore) || !Number.isFinite(report.newScore)) failures.push("oldScore and newScore are required.");
  if (report.newScore < report.oldScore && !report.scoreDropExplanation) failures.push("score drops without explanation.");
  if (!report.formalEvidenceGatesUnchanged) failures.push("formal beta evidence gates changed or were cleared.");
  if (report.summary.betaExitReadyMarked) failures.push("beta exit was marked ready.");
  if (report.staleArtifactActions.some((entry) => entry.scoreImpacting && entry.status === "remaining_stale_missing_refresh_command")) {
    failures.push("score-impacting stale artifacts remain without refresh command.");
  }
  if (report.staleArtifactActions.some((entry) => entry.status === "refreshed_older_code_version")) {
    failures.push("refreshed artifact was generated from an older code version.");
  }
  if (!report.summary.dirtyFilesClassified || report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown" || !entry.action)) {
    failures.push("dirty files are unclassified.");
  }
  if (!report.summary.openPrsClassified || report.openPrs.some((entry) => entry.classification === "unsafe_unknown" || !entry.action)) {
    failures.push("open PRs are unclassified.");
  }
  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("nextExactSteps missing.");
  return failures;
}

function renderDoc(report: ScoreImpactStaleArtifactSweepReport) {
  const lines = [
    "# Score Impact Stale Artifact Sweep",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Score: ${report.oldScore} -> ${report.newScore} (${report.scoreDelta >= 0 ? "+" : ""}${report.scoreDelta})`,
    `Formal evidence gates unchanged: ${report.formalEvidenceGatesUnchanged ? "yes" : "no"}`,
    "",
    "## Summary",
    "",
    `- Requested lanes: ${report.summary.requestedLaneCount}`,
    `- Refreshed current: ${report.summary.refreshedCurrentCount}`,
    `- Blocked refreshes: ${report.summary.blockedRefreshCount}`,
    `- Remaining score-impact stale artifacts: ${report.summary.remainingStaleCount}`,
    `- Dirty files classified: ${report.summary.dirtyFilesClassified ? "yes" : "no"}`,
    `- Open PRs classified: ${report.summary.openPrsClassified ? "yes" : "no"}`,
    "",
    "## Artifact Actions",
    "",
    "| Artifact | Status | Command | Next action |",
    "| --- | --- | --- | --- |",
    ...report.staleArtifactActions.map((entry) => `| ${entry.artifactPath} | ${entry.status} | ${entry.command ?? entry.refreshCommand ?? ""} | ${entry.nextAction} |`),
    "",
    "## Remaining Formal Evidence Gates",
    "",
    "- Visual/manual smoke remains formal evidence, not source refresh.",
    "- Runtime/provider smoke remains formal deployed/provider evidence, not source refresh.",
    "- Admin truth/sample evidence remains formal evidence unless a formal sample is attached.",
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function writeReport(report: ScoreImpactStaleArtifactSweepReport) {
  mkdirSync(dirname(join(ROOT, STATE_PATH)), { recursive: true });
  mkdirSync(dirname(join(ROOT, DOC_PATH)), { recursive: true });
  writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(join(ROOT, DOC_PATH), renderDoc(report), "utf8");
}

function cleanupTmpFiles() {
  for (const relativePath of [TMP_REFRESH_RESULTS, TMP_POST_REFRESH_RESULTS, TMP_EXTRA_RESULTS]) {
    const fullPath = join(ROOT, relativePath);
    if (existsSync(fullPath)) unlinkSync(fullPath);
  }
}

function main() {
  const head = currentHead();
  const betaScore = readJson("agent/state/public-beta-score.generated.json") ?? {};
  const priorScoreLock = readJson("agent/state/score-80-path-lock.generated.json") ?? {};
  const previousSweep = readJson(STATE_PATH) ?? {};
  let refreshResults = [
    ...commandResultsFrom(TMP_REFRESH_RESULTS),
    ...commandResultsFrom(TMP_POST_REFRESH_RESULTS),
    ...commandResultsFrom(TMP_EXTRA_RESULTS),
  ];
  if (refreshResults.length === 0) {
    refreshResults = records(previousSweep.checksRun).map((entry) => ({
      command: stringValue(entry.command),
      exitCode: numberValue(entry.exitCode, 1),
    })).filter((entry) => entry.command);
  }
  const artifactHeads: Record<string, string | null> = {};
  for (const lane of requestedLanes) artifactHeads[lane.artifactPath] = artifactSourceVersion(lane.artifactPath);
  for (const stale of staleArtifactsFrom(betaScore)) artifactHeads[stale.artifactPath] = artifactSourceVersion(stale.artifactPath);
  const report = buildScoreImpactStaleArtifactSweepReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    oldScore: numberValue(priorScoreLock.newScore, numberValue(betaScore.healthScore, numberValue(betaScore.overallScore))),
    betaScore,
    refreshResults,
    artifactHeads,
    dirtyFiles: collectDirtyFiles(),
    openPrs: collectOpenPrs(),
  });
  writeReport(report);
  cleanupTmpFiles();
  const freshReport = {
    ...report,
    dirtyFiles: collectDirtyFiles(),
    summary: {
      ...report.summary,
      dirtyFilesClassified: collectDirtyFiles().every((entry) => entry.classification && entry.classification !== "unsafe_unknown" && entry.action),
    },
  };
  writeReport(freshReport);
  const failures = validateScoreImpactStaleArtifactSweepReport(freshReport);
  if (failures.length > 0) {
    console.error("Score impact stale artifact sweep failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(
    `[score-impact-stale-artifact-sweep] ok: score=${freshReport.newScore} ` +
      `refreshed=${freshReport.summary.refreshedCurrentCount} remainingStale=${freshReport.summary.remainingStaleCount}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
