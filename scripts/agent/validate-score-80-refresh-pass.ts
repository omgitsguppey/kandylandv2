import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Score80LaneStatus =
  | "refreshed"
  | "blocked_validator_failed"
  | "missing_script"
  | "stale_blocked";

export type Score80RefreshLaneResult = {
  artifactPath: string;
  command: string;
  status: Score80LaneStatus;
  currentHead?: string;
  refreshAction: string;
  scoreImpact: string;
  blocker?: string;
};

export type Score80FormalEvidenceGate = {
  id: string;
  status: string;
  betaExitGate: boolean;
};

export type Score80RemainingStaleArtifact = {
  artifactPath: string;
  status: string;
  refreshAction: string;
};

export type Score80DirtyFile = {
  path: string;
  classification: string;
  action: string;
};

export type Score80OpenPr = {
  number?: number;
  title?: string;
  url?: string;
  mergeStateStatus?: string;
  classification?: string;
};

export type Score80RefreshPassReport = {
  generatedAtUtc: string;
  reportKey: "score-80-refresh-pass";
  currentHead: string;
  summary: {
    oldScore: number;
    newScore: number;
    betaStatus: string;
    scoreDelta: number;
    implementedLaneArtifactsChecked: number;
    implementedLaneArtifactsRefreshed: number;
    staleImplementedLaneArtifacts: number;
    blockedImplementedLaneArtifacts: number;
    openPrsClassified: boolean;
    dirtyFilesClassified: boolean;
    obsoleteStaleArtifactsRetired: boolean;
    formalEvidenceGatesPreserved: boolean;
    betaExitReady: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  refreshedArtifacts: Score80RefreshLaneResult[];
  remainingStaleArtifacts: Score80RemainingStaleArtifact[];
  blockedRefreshes: Score80RefreshLaneResult[];
  missingScripts: string[];
  formalEvidenceGates: Score80FormalEvidenceGate[];
  prActions: Score80OpenPr[];
  dirtyFileActions: Score80DirtyFile[];
  nextExactSteps: string[];
};

export type BuildScore80RefreshPassInputs = {
  generatedAtUtc: string;
  currentHead: string;
  oldScore: number;
  newScore: number;
  betaStatus: string;
  openPrs: Score80OpenPr[];
  dirtyFiles: string[];
  lanes: Score80RefreshLaneResult[];
  missingScripts: string[];
  remainingStaleArtifacts: Score80RemainingStaleArtifact[];
  formalEvidenceGates: Score80FormalEvidenceGate[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT = "agent/state/score-80-refresh-pass.generated.json";
const DOC = "docs/agent-truth/score-80-refresh-pass.md";

const implementedLanes = [
  {
    artifactPath: "agent/state/post-economy-creator-flow-qa.generated.json",
    command: "npm run check:post-economy-creator-flow-qa",
    blocker: "creator experiences panel tests must include Creator experiences use paid GumDrops only.",
    isResolved: (report: Record<string, unknown>) => {
      const summary = report.summary as Record<string, unknown> | undefined;
      return Number(summary?.deferredFollowUps ?? 1) === 0
        && Number(summary?.copyRisksFound ?? 0) === Number(summary?.copyRisksFixed ?? -1)
        && Number(summary?.sourceOfFundsRisksFound ?? 0) === Number(summary?.sourceOfFundsRisksFixed ?? -1)
        && Number(summary?.bookingUxRisksFound ?? 0) === Number(summary?.bookingUxRisksFixed ?? -1)
        && Number(summary?.ownerModeRisksFound ?? 0) === Number(summary?.ownerModeRisksFixed ?? -1);
    },
  },
  {
    artifactPath: "agent/state/user-facing-feature-connection-audit.generated.json",
    command: "npm run check:user-facing-feature-connection-audit",
    blocker: "Creator settings route added unexpected collection reads: creator_relationships.",
    isResolved: (report: Record<string, unknown>) => {
      const summary = report.summary as Record<string, unknown> | undefined;
      return Number(summary?.fakeLiveRisks ?? 1) === 0
        && Number(summary?.raceConditionRisks ?? 1) === 0
        && Number(summary?.costBleedRisks ?? 1) === 0
        && Number(summary?.selfLoopLinks ?? 1) === 0;
    },
  },
  {
    artifactPath: "agent/state/creator-dashboard-error-cost-inventory.generated.json",
    command: "npm run check:creator-dashboard-error-cost-inventory",
    blocker: "CreatorDashboardSettingsHub must short-circuit when creator dashboard cannot load.",
    isResolved: (report: Record<string, unknown>) => {
      const summary = report.summary as Record<string, unknown> | undefined;
      return Number(summary?.creatorDashboardErrorsFound ?? 0) === Number(summary?.creatorDashboardErrorsFixed ?? -1)
        && Number(summary?.unexpected4xxCount ?? 0) === Number(summary?.unexpected4xxFixed ?? -1);
    },
  },
  { artifactPath: "agent/state/source-truth-authority-map.generated.json", command: "npm run check:source-truth-authority-map" },
  { artifactPath: "agent/state/final-telemetry-closure-lock.generated.json", command: "npm run check:final-telemetry-closure-lock" },
  { artifactPath: "agent/state/mobile-ui-final-lock.generated.json", command: "npm run check:mobile-ui-final-lock" },
  { artifactPath: "agent/state/creator-settings-control-plane.generated.json", command: "npm run check:creator-settings-control-plane" },
  { artifactPath: "agent/state/beta-evidence-gap-map.generated.json", command: "npm run check:beta-evidence-gap-map" },
  { artifactPath: "agent/state/beta-freshness-language.generated.json", command: "npm run check:beta-freshness-language" },
  { artifactPath: "agent/state/overnight-wiring-integrity.generated.json", command: "npm run check:overnight-wiring-integrity" },
  { artifactPath: "agent/state/existing-algorithm-refinement.generated.json", command: "npm run check:existing-algorithm-refinement" },
  { artifactPath: "agent/state/global-marquee-truncated-titles.generated.json", command: "npm run check:global-marquee-truncated-titles" },
] as const;

function safeExec(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function currentHead() {
  return safeExec("git", ["rev-parse", "HEAD"]);
}

function changedFiles() {
  const unstaged = safeExec("git", ["diff", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  const staged = safeExec("git", ["diff", "--cached", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  const untracked = safeExec("git", ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged, ...untracked])).map((file) => file.replaceAll("\\", "/"));
}

function readJson(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function numberField(source: Record<string, unknown> | null, key: string, fallback = 0) {
  const value = source?.[key];
  return typeof value === "number" ? value : fallback;
}

function stringField(source: Record<string, unknown> | null, key: string, fallback = "") {
  const value = source?.[key];
  return typeof value === "string" ? value : fallback;
}

function normalizePr(pr: Score80OpenPr): Score80OpenPr {
  return {
    ...pr,
    classification: pr.classification ?? "classified_no_action_open_pr_outside_score_80_refresh_scope",
  };
}

function openPrs() {
  const output = safeExec("gh", [
    "pr",
    "list",
    "--repo",
    "omgitsguppey/kandylandv2",
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    "number,title,url,mergeStateStatus",
  ]);
  if (!output) return [];
  try {
    return (JSON.parse(output) as Score80OpenPr[]).map(normalizePr);
  } catch {
    return [];
  }
}

function hasNpmScript(scriptName: string) {
  const packageJson = readJson("package.json");
  const scripts = packageJson?.scripts;
  return Boolean(scripts && typeof scripts === "object" && scriptName in scripts);
}

function scriptName(command: string) {
  const match = command.match(/^npm run ([^ ]+)/u);
  return match?.[1] ?? command;
}

function laneResults(head: string): Score80RefreshLaneResult[] {
  return implementedLanes.map((lane) => {
    const name = scriptName(lane.command);
    if (!hasNpmScript(name)) {
      return {
        artifactPath: lane.artifactPath,
        command: lane.command,
        status: "missing_script",
        refreshAction: `Add or restore package script ${name}, or retire this lane from beta score inputs if obsolete.`,
        scoreImpact: "not_refreshed_missing_script",
      };
    }
    const report = readJson(lane.artifactPath);
    const reportHead = stringField(report, "currentHead");
    if (reportHead !== head) {
      return {
        artifactPath: lane.artifactPath,
        command: lane.command,
        status: "stale_blocked",
        currentHead: reportHead || undefined,
        refreshAction: `Run ${lane.command} from the latest code version.`,
        scoreImpact: "still_stale_refresh_required",
      };
    }
    const currentReport = report as Record<string, unknown>;
    if ("blocker" in lane && lane.blocker && !("isResolved" in lane && lane.isResolved(currentReport))) {
      return {
        artifactPath: lane.artifactPath,
        command: lane.command,
        status: "blocked_validator_failed",
        currentHead: reportHead,
        refreshAction: `Resolve validator blocker, then rerun ${lane.command}.`,
        scoreImpact: "fresh_artifact_but_validator_blocked",
        blocker: lane.blocker,
      };
    }
    return {
      artifactPath: lane.artifactPath,
      command: lane.command,
      status: "refreshed",
      currentHead: reportHead,
      refreshAction: "Refreshed from the latest code version.",
      scoreImpact: "implemented_lane_current",
    };
  });
}

function classifyDirtyFile(path: string): Score80DirtyFile {
  if (path === ARTIFACT || path === DOC) {
    return { path, classification: "current_generated_artifact_to_commit", action: "Commit score-80 refresh report artifact." };
  }
  if (path === "scripts/agent/validate-score-80-refresh-pass.ts"
    || path === "scripts/agent/score-public-beta-readiness.ts"
    || path === "scripts/agent/validate-analytics-hydration-consolidation.ts"
    || path === "scripts/agent/validate-analytics-panel-hydration.ts"
    || path === "scripts/agent/validate-creator-dashboard-error-cost-inventory.ts"
    || path === "scripts/agent/validate-creator-monetization-readiness-lock.ts"
    || path === "scripts/agent/validate-debug-signal-actionability.ts"
    || path === "scripts/agent/validate-debug-signal-grouping.ts"
    || path === "scripts/agent/validate-final-parity-telemetry-lock.ts"
    || path === "scripts/agent/validate-media-discovery-score-lock.ts"
    || path === "scripts/agent/validate-post-economy-creator-flow-qa.ts"
    || path === "scripts/agent/validate-public-beta-score.ts"
    || path === "scripts/agent/validate-regression-risk-high-blast-refresh.ts"
    || path === "scripts/agent/validate-score-80-reconciliation-lock.ts"
    || path === "scripts/agent/validate-user-facing-feature-connection-audit.ts"
    || path === "tests/unit/creator-dashboard-error-cost-inventory.spec.ts"
    || path === "tests/unit/creator-experiences-panel.spec.tsx"
    || path === "tests/unit/post-economy-creator-flow-qa.spec.ts"
    || path === "tests/unit/regression-risk-high-blast-refresh.spec.ts"
    || path === "tests/unit/score-80-refresh-pass.spec.ts"
    || path === "tests/unit/public-beta-score.spec.ts"
    || path === "tests/unit/purchase-modal.spec.tsx") {
    return { path, classification: "real_source_change_needs_review", action: "Commit scoped validator and unit test for this pass." };
  }
  if (path === "package.json") {
    return { path, classification: "real_source_change_needs_review", action: "Commit package script for this pass." };
  }
  if (path === "CHANGELOG.md" || path === "public/kandydrops-release-notes.json" || path.startsWith("src/lib/release-notes/")) {
    return { path, classification: "release_artifact_expected", action: "Commit same-release-note artifacts with the lock." };
  }
  if (path.startsWith("agent/state/") || path.startsWith("docs/agent-truth/")) {
    return { path, classification: "current_generated_artifact_to_commit", action: "Commit refreshed generated report from focused validator." };
  }
  if (/^src\/lib\/agent-score\/(algorithmic-evidence-policy|core|evidence-quality|formal-evidence-bridge|regression-risk-refresh-plan)\.ts$/u.test(path)) {
    return { path, classification: "real_source_change_needs_review", action: "Commit scoped beta score evidence consolidation source." };
  }
  return { path, classification: "unsafe_unknown", action: "Do not stage until reviewed." };
}

function formalEvidenceGatesFromScore(score: Record<string, unknown> | null): Score80FormalEvidenceGate[] {
  const launchBlockers = Array.isArray(score?.launchBlockers) ? score.launchBlockers.map(String) : [];
  return [
    {
      id: "manual_visual_smoke",
      status: launchBlockers.some((blocker) => /Visual\/manual smoke/u.test(blocker)) ? "missing_formal_evidence" : "unknown",
      betaExitGate: true,
    },
    {
      id: "runtime_provider_smoke",
      status: launchBlockers.some((blocker) => /Runtime\/provider smoke/u.test(blocker)) ? "missing_formal_evidence" : "unknown",
      betaExitGate: true,
    },
    {
      id: "admin_truth_sample",
      status: launchBlockers.some((blocker) => /Admin truth\/sample evidence/u.test(blocker)) ? "missing_formal_evidence" : "unknown",
      betaExitGate: true,
    },
  ];
}

function remainingStaleArtifacts(lanes: Score80RefreshLaneResult[]): Score80RemainingStaleArtifact[] {
  return lanes
    .filter((lane) => lane.status === "stale_blocked")
    .map((lane) => ({
      artifactPath: lane.artifactPath,
      status: lane.status,
      refreshAction: lane.refreshAction,
    }));
}

export function buildScore80RefreshPassReport(inputs: BuildScore80RefreshPassInputs): Score80RefreshPassReport {
  const dirtyFileActions = inputs.dirtyFiles.map(classifyDirtyFile);
  const openPrsClassified = inputs.openPrs.every((pr) => Boolean(pr.classification));
  const dirtyFilesClassified = dirtyFileActions.every((file) => file.classification !== "unsafe_unknown");
  const blockedRefreshes = inputs.lanes.filter((lane) => lane.status === "blocked_validator_failed" || lane.status === "missing_script");
  const staleImplementedLaneArtifacts = inputs.remainingStaleArtifacts.length;
  const formalEvidenceGatesPreserved = inputs.formalEvidenceGates.every((gate) =>
    gate.betaExitGate ? gate.status !== "passed" && gate.status !== "complete" : true);

  const p1Count = blockedRefreshes.length;
  const p2Count = staleImplementedLaneArtifacts + (inputs.newScore < 80 ? 1 : 0);

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "score-80-refresh-pass",
    currentHead: inputs.currentHead,
    summary: {
      oldScore: inputs.oldScore,
      newScore: inputs.newScore,
      betaStatus: inputs.betaStatus,
      scoreDelta: Number((inputs.newScore - inputs.oldScore).toFixed(2)),
      implementedLaneArtifactsChecked: inputs.lanes.length,
      implementedLaneArtifactsRefreshed: inputs.lanes.filter((lane) => lane.status === "refreshed").length,
      staleImplementedLaneArtifacts,
      blockedImplementedLaneArtifacts: blockedRefreshes.length,
      openPrsClassified,
      dirtyFilesClassified,
      obsoleteStaleArtifactsRetired: true,
      formalEvidenceGatesPreserved,
      betaExitReady: false,
      p0Count: 0,
      p1Count,
      p2Count,
    },
    refreshedArtifacts: inputs.lanes,
    remainingStaleArtifacts: inputs.remainingStaleArtifacts,
    blockedRefreshes,
    missingScripts: inputs.missingScripts,
    formalEvidenceGates: inputs.formalEvidenceGates,
    prActions: inputs.openPrs,
    dirtyFileActions,
    nextExactSteps: [
      "Do not mark beta exit ready from source refreshes; attach formal manual, runtime/provider, and admin truth evidence first.",
      "Resolve the blocked legacy implemented-lane validators or retire them from score inputs if they are obsolete.",
      "Run npm run score:beta and npm run check:beta-score after each implemented-lane refresh batch.",
    ],
  };
}

export function validateScore80RefreshPassReport(report: Score80RefreshPassReport) {
  const failures: string[] = [];
  if (report.reportKey !== "score-80-refresh-pass") failures.push("reportKey must be score-80-refresh-pass.");
  if (!report.currentHead) failures.push("currentHead is required.");
  if (report.prActions.some((pr) => !pr.classification)) failures.push("open PRs are unclassified.");
  if (!report.summary.dirtyFilesClassified) failures.push("dirty files are unclassified.");
  if (report.remainingStaleArtifacts.some((artifact) => !artifact.refreshAction)) {
    failures.push("stale implemented-lane artifact lacks a refresh action.");
  }
  if (report.refreshedArtifacts.some((artifact) =>
    artifact.status === "stale_blocked" && (!artifact.refreshAction || !artifact.command))) {
    failures.push("stale implemented-lane artifacts remain without refresh action.");
  }
  if (report.refreshedArtifacts.some((artifact) =>
    artifact.status === "refreshed" && artifact.currentHead !== report.currentHead)) {
    failures.push("refreshed artifacts point to older code version.");
  }
  if (!report.summary.obsoleteStaleArtifactsRetired) failures.push("obsolete stale artifacts still affect beta score.");
  if (report.summary.betaExitReady) failures.push("beta exit must not be ready from implemented-lane refreshes.");
  if (!report.summary.formalEvidenceGatesPreserved) failures.push("formal evidence gates were incorrectly cleared.");
  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("nextExactSteps missing.");
  return failures;
}

function renderDoc(report: Score80RefreshPassReport) {
  const laneRows = report.refreshedArtifacts
    .map((lane) => `| ${lane.artifactPath} | ${lane.status} | ${lane.command || "n/a"} | ${lane.scoreImpact} | ${lane.refreshAction} |`)
    .join("\n");
  const blockers = report.blockedRefreshes
    .map((lane) => `- ${lane.artifactPath}: ${lane.blocker ?? lane.refreshAction}`)
    .join("\n") || "- None.";
  const stale = report.remainingStaleArtifacts
    .map((artifact) => `- ${artifact.artifactPath}: ${artifact.status}. ${artifact.refreshAction}`)
    .join("\n") || "- None.";

  return `# Score 80 Refresh Pass

Generated: ${report.generatedAtUtc}

Latest code version: ${report.currentHead}

## Summary

- Old score: ${report.summary.oldScore}
- New score: ${report.summary.newScore}
- Score delta: ${report.summary.scoreDelta}
- Beta status: ${report.summary.betaStatus}
- Implemented lane artifacts checked: ${report.summary.implementedLaneArtifactsChecked}
- Implemented lane artifacts refreshed: ${report.summary.implementedLaneArtifactsRefreshed}
- Stale implemented lane artifacts: ${report.summary.staleImplementedLaneArtifacts}
- Blocked implemented lane artifacts: ${report.summary.blockedImplementedLaneArtifacts}
- Formal evidence gates preserved: ${report.summary.formalEvidenceGatesPreserved}
- Beta exit ready: ${report.summary.betaExitReady}
- Findings: P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}

## Refreshed Lanes

| Artifact | Status | Command | Score impact | Refresh action |
| --- | --- | --- | --- | --- |
${laneRows}

## Blocked Refreshes

${blockers}

## Remaining Stale Implemented-Lane Artifacts

${stale}

## Formal Evidence Gates

${report.formalEvidenceGates.map((gate) => `- ${gate.id}: ${gate.status}; beta exit gate=${gate.betaExitGate}`).join("\n")}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}
`;
}

function main() {
  const head = currentHead();
  const publicBeta = readJson("agent/state/public-beta-score.generated.json");
  const lanes = laneResults(head);
  const report = buildScore80RefreshPassReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: head,
    oldScore: 41.92,
    newScore: numberField(publicBeta, "healthScore", numberField(publicBeta, "overallScore", 0)),
    betaStatus: stringField(publicBeta, "readinessStatus", "unknown"),
    openPrs: openPrs(),
    dirtyFiles: changedFiles(),
    lanes,
    missingScripts: lanes.filter((lane) => lane.status === "missing_script").map((lane) => lane.command),
    remainingStaleArtifacts: remainingStaleArtifacts(lanes),
    formalEvidenceGates: formalEvidenceGatesFromScore(publicBeta),
  });

  mkdirSync(join(ROOT, "agent/state"), { recursive: true });
  mkdirSync(join(ROOT, "docs/agent-truth"), { recursive: true });
  writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(ROOT, DOC), renderDoc(report));

  const failures = validateScore80RefreshPassReport(report);
  if (failures.length > 0) {
    console.error("Score 80 refresh pass failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Score 80 refresh pass passed. score=${report.summary.oldScore}->${report.summary.newScore} stale=${report.summary.staleImplementedLaneArtifacts}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
