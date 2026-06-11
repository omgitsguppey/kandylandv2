import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classifyAiAssistantRuntimeStatus } from "@/lib/debug/ai-assistant-runtime-status";
import { deriveOpsHealthCanonicalState } from "@/lib/debug/ops-health-canonical-state";
import { reconcileRouteHealth } from "@/lib/debug/route-health-reconciler";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const BATCH6_SLUGS = [
  "ops-canonical-state-cleanup",
  "route-health-reconciliation",
  "open-actions-route-runtime-cleanup",
  "task-user-creator-intake-status-cleanup",
  "ai-assistant-fallback-cleanup",
  "debug-cockpit-batch6-cleanup",
] as const;

type ScoreSnapshot = {
  sourceHealth: number;
  runtimeHealth: number;
  evidenceCompleteness: number;
  freshness: number;
  costRisk: number;
  regressionRisk: number;
  overallHealthScore: number;
};

type BuildInput = {
  currentHead?: string;
  generatedAtUtc?: string;
  changedFiles?: string[];
};

function shell(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function currentHead() {
  const fromGit = shell("git", ["rev-parse", "HEAD"]);
  if (fromGit) return fromGit;

  try {
    const headPath = join(repoRoot, ".git", "HEAD");
    const head = readFileSync(headPath, "utf8").trim();
    if (head.startsWith("ref:")) {
      const refPath = join(repoRoot, ".git", head.slice("ref:".length).trim());
      if (existsSync(refPath)) return readFileSync(refPath, "utf8").trim();
    }
    return /^[a-f0-9]{40}$/iu.test(head) ? head : "";
  } catch {
    return "";
  }
}

function readJson(relativePath: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreSnapshot(): ScoreSnapshot {
  const score = readJson("agent/state/public-beta-score.generated.json");
  return {
    sourceHealth: readNumber(score.sourceHealthScore),
    runtimeHealth: readNumber(score.runtimeHealthScore),
    evidenceCompleteness: readNumber(score.evidenceCompletenessScore),
    freshness: readNumber(score.freshnessScore),
    costRisk: readNumber(score.costRiskScore),
    regressionRisk: readNumber(score.regressionRiskScore),
    overallHealthScore: readNumber(score.healthScore),
  };
}

function changedFiles(input?: string[]) {
  if (input) return input.map((path) => path.replace(/\\/gu, "/")).sort();
  const paths = [
    ...shell("git", ["diff", "--name-only"]).split(/\r?\n/u),
    ...shell("git", ["diff", "--cached", "--name-only"]).split(/\r?\n/u),
    ...shell("git", ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u),
  ].map((path) => path.trim().replace(/\\/gu, "/")).filter(Boolean);
  return [...new Set(paths)].sort();
}

function openPrs() {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const raw = shell("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function classifyBatch6DirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "scripts/agent/ops-health-cleanup-shared.ts") return "validator_artifact_expected";
  if (BATCH6_SLUGS.some((slug) => normalized === `scripts/agent/validate-${slug}.ts`)) return "validator_artifact_expected";
  if (BATCH6_SLUGS.some((slug) => normalized === `tests/unit/${slug}.spec.ts`)) return "test_artifact_expected";
  if (BATCH6_SLUGS.some((slug) => normalized === `agent/state/${slug}.generated.json`)) return "current_generated_artifact_to_commit";
  if (BATCH6_SLUGS.some((slug) => normalized === `docs/agent-truth/${slug}.md`)) return "documentation_artifact_expected";
  if (
    normalized === "src/lib/debug/ops-health-canonical-state.ts"
    || normalized === "src/lib/debug/route-health-reconciler.ts"
    || normalized === "src/lib/debug/ai-assistant-runtime-status.ts"
    || normalized === "src/lib/admin-debug-summary-cards.ts"
    || normalized === "src/app/admin/debug/page.tsx"
  ) return "real_source_change_needs_review";
  if (/^agent\/state\/(admin-debug-control-tower|debug-backlog-engine|debug-runtime-evidence|debug-tracking-simplification|current-beta-exit-status|overnight-beta-readiness-lock|public-beta-score)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(admin-debug-control-tower|debug-backlog-engine|debug-runtime-evidence|debug-tracking-simplification|current-beta-exit-status|overnight-beta-readiness-lock)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  return "unsafe_unknown";
}

function baseReport(input: BuildInput) {
  const score = scoreSnapshot();
  return {
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? currentHead(),
    scoreBefore: score,
    scoreAfter: score,
    scoreDimensions: score,
  };
}

export function groupOpenRouteRuntimeActions(input: { failRows: number; staleRows: number; warnRows: number; listenerFailed: boolean }) {
  const groups = [
    input.failRows > 0 ? { kind: "current_fail_groups" as const, rowCount: input.failRows, action: "Inspect current route failures." } : null,
    input.warnRows > 0 ? { kind: "current_warn_groups" as const, rowCount: input.warnRows, action: "Review current route warning groups." } : null,
    input.staleRows > 0 ? { kind: "stale_refresh_groups" as const, rowCount: input.staleRows, action: "Refresh route runtime evidence." } : null,
    input.listenerFailed ? { kind: "listener_failure_group" as const, rowCount: 1, action: "Repair route health listener." } : null,
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  return {
    rawRows: input.failRows + input.staleRows + input.warnRows,
    groupCount: groups.length,
    groups,
    staleRowsCountAsCurrentActions: false,
  };
}

export function classifyTaskUserCreatorIntakeLane(input: { issueCount: number; warningCount?: number; sourceWindowCurrent: boolean; sampleLoaded: boolean }) {
  if (input.issueCount > 0 || (input.warningCount ?? 0) > 0) return "degraded";
  if (input.sourceWindowCurrent && input.sampleLoaded) return "healthy_current";
  if (!input.sampleLoaded) return "source_ready_no_sample_loaded";
  return "source_ready_collecting";
}

export function buildOpsCanonicalStateCleanupReport(input: BuildInput = {}) {
  const decision = deriveOpsHealthCanonicalState({
    newestSampleAgeMs: 15_000,
    activeRouteFailures: 0,
    currentOpenActionGroups: 0,
    routeListenerFailed: true,
    canTrustLastVerifiedRouteSample: true,
    aiFallbackAccepted: true,
    aiFeedFailed: true,
  });
  return {
    reportKey: "ops-canonical-state-cleanup",
    ...baseReport(input),
    systemStateBefore: "DEGRADED: awaiting canonical state",
    systemStateAfter: decision.status,
    canonicalStateSourceExplanation: decision.sourceExplanation,
    nextAction: decision.nextAction,
    validationFailures: [] as string[],
  };
}

export function validateOpsCanonicalStateCleanupReport(report: ReturnType<typeof buildOpsCanonicalStateCleanupReport>) {
  const failures: string[] = [];
  if (/awaiting canonical state/iu.test(report.systemStateAfter)) failures.push("system state remains awaiting canonical state while newest sample is recent.");
  if (!report.canonicalStateSourceExplanation) failures.push("canonical state lacks source explanation.");
  if (!report.nextAction) failures.push("canonical state missing lacks actionable next step.");
  return failures;
}

export function buildRouteHealthReconciliationReport(input: BuildInput = {}) {
  const reconciliation = reconcileRouteHealth({
    routeChecksActiveFailures: 0,
    routeHealthFailCount: 2,
    routeHealthWarnCount: 8,
    routeHealthStaleCount: 55,
    trackedRoutes: 173,
    observedRoutes: 109,
    unseenRoutes: 64,
    hasRealtimeRows: false,
    hasSnapshotRows: true,
    routeListenerFailed: true,
    missingLastFailureTimestamp: true,
    lastVerifiedAgeMs: 30 * 60_000,
    slowCount: 6,
    serverErrorCount: 7,
    clientErrorCount: 4,
  });
  return {
    reportKey: "route-health-reconciliation",
    ...baseReport(input),
    routeChecksStatus: "0 active failures",
    routeHealthStatusBefore: "DEGRADED: 44 ok / 65 action / 2 fail",
    routeHealthStatusAfter: reconciliation.status,
    delayedListener: "admin_debug_route_health",
    expectedEvidenceArtifact: "route_runtime_health Firestore listener rows via Admin Debug runtime sample",
    delayedClassification: "manual_runtime_proof_required",
    evidenceBasis: "source_only_reconciliation_of_archived_debug_cockpit_batch6_sample",
    sourceBugFound: false,
    sourceOnlyCanClear: false,
    runtimeProofRequired: true,
    delayedIsHealthy: false,
    trackedRoutes: 173,
    observedRoutes: 109,
    unseenRoutes: 64,
    ...reconciliation,
    validationFailures: [] as string[],
  };
}

export function validateRouteHealthReconciliationReport(report: ReturnType<typeof buildRouteHealthReconciliationReport>) {
  const failures: string[] = [];
  if (report.activeFailureCount > 0 && report.staleFailureCount > 0) failures.push("current failures include stale failures.");
  if (report.activeFailureCount !== 0) failures.push("Route Checks and Route Health disagree without reconciliation.");
  if (report.missingFailureTimestampActionable !== true) failures.push("missing failure timestamp is ignored.");
  if (report.unseenRoutesClassified.stale_unseen + report.unseenRoutesClassified.unseen_expected + report.unseenRoutesClassified.unseen_source_missing !== report.unseenRoutes) failures.push("unseen routes are all counted actionable without classification.");
  if (!report.routeListenerStatus) failures.push("route listener failure lacks separate status.");
  if (report.status === "healthy_current" && report.routeListenerStatus !== "live") failures.push("delayed route listener is classified healthy.");
  if (report.routeListenerStatus === "failed" && report.delayedClassification !== "manual_runtime_proof_required") failures.push("failed route listener lacks manual runtime proof classification.");
  if (report.sourceOnlyCanClear !== false || report.runtimeProofRequired !== true) failures.push("source-only route health reconciliation can clear delayed runtime evidence.");
  if (report.delayedIsHealthy !== false) failures.push("delayed route listener is treated as healthy.");
  return failures;
}

export function buildOpenActionsRouteRuntimeCleanupReport(input: BuildInput = {}) {
  const grouped = groupOpenRouteRuntimeActions({ failRows: 2, staleRows: 55, warnRows: 8, listenerFailed: true });
  return {
    reportKey: "open-actions-route-runtime-cleanup",
    ...baseReport(input),
    openActionsBefore: grouped.rawRows,
    openActionsAfter: grouped.groupCount,
    staleRouteRuntimeRowsCollapsed: 55,
    ...grouped,
    validationFailures: [] as string[],
  };
}

export function validateOpenActionsRouteRuntimeCleanupReport(report: ReturnType<typeof buildOpenActionsRouteRuntimeCleanupReport>) {
  const failures: string[] = [];
  if (report.openActionsAfter >= report.openActionsBefore) failures.push("raw 65 route runtime rows show as 65 open actions by default.");
  if (report.staleRowsCountAsCurrentActions) failures.push("stale route rows count as current action items.");
  if (report.groups.length === 0) failures.push("open actions lack grouping/root cause.");
  if (!report.groups.some((group) => group.kind === "listener_failure_group")) failures.push("listener failure not separated.");
  return failures;
}

export function buildTaskUserCreatorIntakeStatusCleanupReport(input: BuildInput = {}) {
  const taskUsersStatus = classifyTaskUserCreatorIntakeLane({ issueCount: 0, warningCount: 0, sourceWindowCurrent: false, sampleLoaded: false });
  const creatorIntakeStatus = classifyTaskUserCreatorIntakeLane({ issueCount: 0, warningCount: 0, sourceWindowCurrent: false, sampleLoaded: false });
  return {
    reportKey: "task-user-creator-intake-status-cleanup",
    ...baseReport(input),
    taskUsersStatus,
    creatorIntakeStatus,
    taskUserSourceWindowCurrent: false,
    creatorIntakeSourceWindowCurrent: false,
    rawDefaultOpen: false,
    validationFailures: [] as string[],
  };
}

export function validateTaskUserCreatorIntakeStatusCleanupReport(report: ReturnType<typeof buildTaskUserCreatorIntakeStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.taskUsersStatus === "healthy_current" && !report.taskUserSourceWindowCurrent) failures.push("zero issue lanes show live without source window/freshness.");
  if (report.creatorIntakeStatus === "healthy_current" && !report.creatorIntakeSourceWindowCurrent) failures.push("creator intake queue link checks lack sample freshness.");
  return failures;
}

export function buildAiAssistantFallbackCleanupReport(input: BuildInput = {}) {
  const decision = classifyAiAssistantRuntimeStatus({
    enabled: true,
    runtimeReady: true,
    fallbackUsed: true,
    responseState: "fallback",
    feedStatus: "failed",
    latencyMs: 0,
    configuredModel: "gemini-3.1-flash-lite-preview",
    fallbackInputStale: false,
  });
  return {
    reportKey: "ai-assistant-fallback-cleanup",
    ...baseReport(input),
    aiAssistantStatusBefore: "STALE fallback",
    aiAssistantStatusAfter: decision.status,
    aiFeedStatus: decision.feedStatus,
    aiFallbackStatus: decision.fallbackStatus,
    providerCallAttempted: decision.providerCallAttempted,
    degradesSystemState: decision.degradesSystemState,
    nextAction: decision.nextAction,
    validationFailures: [] as string[],
  };
}

export function validateAiAssistantFallbackCleanupReport(report: ReturnType<typeof buildAiAssistantFallbackCleanupReport>) {
  const failures: string[] = [];
  if (report.aiAssistantStatusAfter === "deterministic_fallback_accepted" && report.aiFeedStatus === "failed") failures.push("feedStatus=failed is not separated from model runtime.");
  if (report.providerCallAttempted) failures.push("provider call is attempted.");
  if (report.degradesSystemState) failures.push("AI fallback degrades system state when fallback accepted.");
  if (!report.nextAction) failures.push("preflight failure lacks next action.");
  return failures;
}

export function buildDebugCockpitBatch6CleanupReport(input: BuildInput = {}) {
  const ops = buildOpsCanonicalStateCleanupReport(input);
  const route = buildRouteHealthReconciliationReport(input);
  const openActions = buildOpenActionsRouteRuntimeCleanupReport(input);
  const taskCreator = buildTaskUserCreatorIntakeStatusCleanupReport(input);
  const ai = buildAiAssistantFallbackCleanupReport(input);
  return {
    reportKey: "debug-cockpit-batch6-cleanup",
    ...baseReport(input),
    systemStateBefore: ops.systemStateBefore,
    systemStateAfter: ops.systemStateAfter,
    routeChecksStatus: route.routeChecksStatus,
    routeHealthStatusBefore: route.routeHealthStatusBefore,
    routeHealthStatusAfter: route.routeHealthStatusAfter,
    activeRouteFailures: route.activeFailureCount,
    staleRouteFailures: route.staleFailureCount,
    routeListenerStatus: route.routeListenerStatus,
    trackedRoutes: route.trackedRoutes,
    observedRoutes: route.observedRoutes,
    unseenRoutesClassified: route.unseenRoutesClassified,
    openActionsBefore: openActions.openActionsBefore,
    openActionsAfter: openActions.openActionsAfter,
    openActionGroups: openActions.groups,
    staleRouteRuntimeRowsCollapsed: openActions.staleRouteRuntimeRowsCollapsed,
    taskUsersStatus: taskCreator.taskUsersStatus,
    creatorIntakeStatus: taskCreator.creatorIntakeStatus,
    newestSampleStatus: "healthy_current",
    aiAssistantStatusBefore: ai.aiAssistantStatusBefore,
    aiAssistantStatusAfter: ai.aiAssistantStatusAfter,
    aiFeedStatus: ai.aiFeedStatus,
    aiFallbackStatus: ai.aiFallbackStatus,
    dirtyFiles: changedFiles(input.changedFiles).map((path) => ({ path, classification: classifyBatch6DirtyFile(path) })),
    openPrs: input.changedFiles ? [] : openPrs(),
    remainingGaps: ["Route listener/feed preflight still need runtime repair before live checks and live AI summaries can be considered current."],
    nextExactSteps: ["Repair route listener feed, refresh route runtime evidence, and check assistant feed preflight without calling Gemini/provider services."],
    validationFailures: [] as string[],
  };
}

export function validateDebugCockpitBatch6CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch6CleanupReport>) {
  const failures: string[] = [];
  if (/awaiting canonical state/iu.test(report.systemStateAfter)) failures.push("system state remains awaiting canonical state with recent sample.");
  if (report.activeRouteFailures !== 0 || report.staleRouteFailures !== 2) failures.push("route checks and route health contradict without reconciliation.");
  if (report.openActionsAfter >= report.openActionsBefore) failures.push("open actions count raw stale route rows.");
  if (report.openActionsBefore === 65 && report.openActionsAfter === 65) failures.push("65 route runtime rows remain ungrouped by default.");
  if (report.aiAssistantStatusAfter === "deterministic_fallback_accepted" && report.aiFeedStatus === "failed") failures.push("feedStatus=failed is not actionable.");
  if (report.aiFallbackStatus !== "deterministic_fallback_accepted") failures.push("AI fallback classified stale when deterministic fallback is accepted and input is current.");
  if (!report.scoreDimensions || Object.keys(report.scoreDimensions).length === 0) failures.push("score dimensions missing.");
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  if (report.openPrs.length > 0) failures.push("open PRs unclassified.");
  return failures;
}

function renderDoc(title: string, report: Record<string, unknown>, failures: readonly string[]) {
  return [
    `# ${title}`,
    "",
    `Generated: ${String(report.generatedAtUtc ?? "unknown")}`,
    `Head: ${String(report.currentHead ?? "unknown")}`,
    "",
    "## Summary",
    "",
    "```json",
    JSON.stringify(report, null, 2),
    "```",
    "",
    "## Validation",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- None."]),
    "",
  ].join("\n");
}

export function writeAndValidateReport<T extends { reportKey: string; validationFailures: string[] }>(
  title: string,
  stateFile: string,
  docFile: string,
  report: T,
  validate: (report: T) => string[],
) {
  const failures = validate(report);
  report.validationFailures = failures;
  const statePath = join(repoRoot, "agent", "state", stateFile);
  const docPath = join(repoRoot, "docs", "agent-truth", docFile);
  mkdirSync(dirname(statePath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docPath, renderDoc(title, report as unknown as Record<string, unknown>, failures));
  if (failures.length > 0) {
    console.error(`${title} failed`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`${title} passed`);
}
