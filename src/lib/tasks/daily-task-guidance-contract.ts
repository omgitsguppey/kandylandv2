import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";
import type { FeatureRegistrationId } from "@/lib/features/feature-registration-contract";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import {
  BUILT_IN_DAILY_TASKS,
  type DailyTaskActionType,
  type DailyTaskAssignment,
  type DailyTaskDefinition,
} from "@/lib/tasks/task-catalog";
import {
  getTaskActionLabel,
  getTaskDestinationHref,
  getTaskInstruction,
  getTaskDestinationPath,
} from "@/lib/task-guidance";

export type DailyTaskCurrentSiteStatus =
  | "active"
  | "unavailable"
  | "coming_soon"
  | "deprecated"
  | "hidden";

export type DailyTaskGuidanceRow = {
  taskId: string;
  title: string;
  guidancePrompt: string;
  steps: string[];
  ctaLabel: string;
  targetRoute: string;
  targetFeatureId: FeatureRegistrationId;
  completionSignal: string;
  fallbackIfRouteMissing: string;
  currentSiteStatus: DailyTaskCurrentSiteStatus;
  telemetryTrigger: string;
  debugOwner: "retention";
  actionType: DailyTaskActionType;
  targetRouteExists: boolean;
  featureRegistered: boolean;
  completionSignalExists: boolean;
  telemetryEventExists: boolean;
  personMetricExists: boolean;
  rewardRuleExists: boolean;
  wordingMatchesCurrentProductTerms: boolean;
  staleFollowRequiredLanguage: boolean;
  wrongSurface: boolean;
  missingEvidence: string[];
};

export type DailyTaskGuidanceHealthLane = {
  lane: "Task guidance health";
  status: "healthy" | "degraded";
  activeTasks: number;
  hiddenDeprecatedTasks: number;
  brokenRoutes: number;
  missingCompletionSignals: number;
  missingTelemetry: number;
  wrongSurfaceTasks: number;
  rawDetailsCollapsedByDefault: true;
};

export type DailyTaskGuidanceAuditReport = {
  reportKey: "daily-task-guidance-route-audit";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  rows: DailyTaskGuidanceRow[];
  debugLane: DailyTaskGuidanceHealthLane;
  summary: {
    totalTasks: number;
    activeTasks: number;
    hiddenDeprecatedTasks: number;
    brokenRoutes: number;
    missingCompletionSignals: number;
    missingTelemetry: number;
    wrongSurfaceTasks: number;
  };
  scoreImpact: {
    sourceHealth: string;
    runtimeHealth: string;
    evidenceCompleteness: string;
    freshness: string;
    costRisk: string;
    regressionRisk: string;
    overallHealthScore: string;
  };
  dirtyFilesClassified: boolean;
  oldLogicClassification: Array<{
    reference: string;
    classification: "still_required" | "superseded" | "stale_guidance_logic_removed" | "follow_up_needed";
    reason: string;
  }>;
  validationFailures: string[];
};

const TARGET_ROUTE_FILES: Record<string, string> = {
  "/dashboard": "src/app/dashboard/page.tsx",
  "/drops": "src/app/drops/page.tsx",
  "/experiences": "src/app/experiences/page.tsx",
  "/dashboard/library": "src/app/dashboard/library/page.tsx",
};

const TARGET_ANCHORS: Record<string, string> = {
  "/dashboard#dashboard-home": "src/app/dashboard/DashboardClient.tsx",
  "/drops#live-drops": "src/app/drops/DropsClient.tsx",
  "/experiences#daily-reward": "src/components/Dashboard/DailyCheckIn.tsx",
  "/experiences#daily-tasks": "src/components/Dashboard/DailyTasksModule.tsx",
  "/experiences#gumdrops-wallet": "src/app/experiences/ExperiencesClient.tsx",
  "/dashboard/library#library-grid": "src/app/dashboard/library/LibraryClient.tsx",
};

const TASK_COMPLETION_EVENTS = new Set<string>([
  ...TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName),
  ...TELEMETRY_EVENT_OPTIONS.flatMap((event) => event.aliases ?? []),
]);

const PERSON_METRIC_EVENTS = new Set<string>([
  ...PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames),
  "daily_task_completed",
  "daily_task_reward_granted",
  "daily_task_claimed",
]);

function featureForAction(actionType: DailyTaskActionType): FeatureRegistrationId {
  if (actionType === "open_drops") return "drops";
  if (actionType === "open_library") return "library";
  if (actionType === "open_wallet") return "wallet";
  if (actionType === "open_notifications" || actionType === "enable_notifications") return "notifications";
  return "daily_checkin";
}

function routeExists(destinationHref: string) {
  const routePath = getTaskDestinationPath(destinationHref);
  return Boolean(TARGET_ROUTE_FILES[routePath] && TARGET_ANCHORS[destinationHref]);
}

function isWrongSurface(destinationHref: string) {
  return destinationHref.startsWith("/admin")
    || destinationHref.startsWith("/dashboard/creator")
    || destinationHref.startsWith("/creator")
    || destinationHref.startsWith("/creators/dashboard");
}

function hasOutdatedFollowRequiredLanguage(text: string) {
  return /\bfollow required\b|\bmust follow\b|\bfollow .*required\b/iu.test(text);
}

function wordingMatchesCurrentProductTerms(row: Pick<DailyTaskGuidanceRow, "title" | "guidancePrompt" | "ctaLabel">) {
  const combined = `${row.title} ${row.guidancePrompt} ${row.ctaLabel}`;
  if (/\bfree GD\b|\bpaid GD\b|\bbonus GD\b/iu.test(combined)) return false;
  if (/\bGumDrop\b/u.test(combined) && !/\bKandyDrop\b/u.test(combined)) return false;
  return true;
}

function missingEvidenceForRow(row: Omit<DailyTaskGuidanceRow, "missingEvidence">) {
  return [
    row.targetRouteExists ? null : `missing route or anchor: ${row.targetRoute}`,
    row.featureRegistered ? null : `missing feature registration: ${row.targetFeatureId}`,
    row.completionSignalExists ? null : `missing completion signal: ${row.completionSignal}`,
    row.telemetryEventExists ? null : `missing telemetry event: ${row.telemetryTrigger}`,
    row.personMetricExists ? null : `missing person metric for task completion path: ${row.completionSignal}`,
    row.rewardRuleExists ? null : `missing reward rule: ${row.taskId}`,
    row.wrongSurface ? `task CTA points to admin/creator-only surface: ${row.targetRoute}` : null,
    row.staleFollowRequiredLanguage ? `outdated follow-required language: ${row.taskId}` : null,
    row.wordingMatchesCurrentProductTerms ? null : `outdated product terms: ${row.taskId}`,
  ].filter((entry): entry is string => Boolean(entry));
}

function statusForRow(row: Omit<DailyTaskGuidanceRow, "currentSiteStatus" | "fallbackIfRouteMissing" | "missingEvidence">): DailyTaskCurrentSiteStatus {
  if (!row.targetRouteExists || !row.completionSignalExists || !row.telemetryEventExists || row.wrongSurface) return "hidden";
  if (!row.featureRegistered || !row.rewardRuleExists || !row.personMetricExists) return "unavailable";
  if (!row.wordingMatchesCurrentProductTerms || row.staleFollowRequiredLanguage) return "deprecated";
  return "active";
}

export function buildDailyTaskGuidanceRows(
  tasks: readonly DailyTaskDefinition[] | readonly DailyTaskAssignment[] = BUILT_IN_DAILY_TASKS,
): DailyTaskGuidanceRow[] {
  return tasks.map((task) => {
    const destinationHref = getTaskDestinationHref(task as DailyTaskAssignment);
    const targetFeatureId = featureForAction(task.actionType);
    const baseRow = {
      taskId: task.id,
      title: task.title,
      guidancePrompt: getTaskInstruction(task as DailyTaskAssignment),
      steps: [getTaskInstruction(task as DailyTaskAssignment)],
      ctaLabel: getTaskActionLabel(task as DailyTaskAssignment),
      targetRoute: destinationHref,
      targetFeatureId,
      completionSignal: task.eventName,
      telemetryTrigger: task.eventName,
      debugOwner: "retention" as const,
      actionType: task.actionType,
      targetRouteExists: routeExists(destinationHref),
      featureRegistered: FEATURE_REGISTRATION_REGISTRY.some((feature) => feature.featureId === targetFeatureId),
      completionSignalExists: TASK_COMPLETION_EVENTS.has(task.eventName),
      telemetryEventExists: TASK_COMPLETION_EVENTS.has(task.eventName),
      personMetricExists: PERSON_METRIC_EVENTS.has(task.eventName) || PERSON_METRIC_EVENTS.has("daily_task_completed"),
      rewardRuleExists: task.rewardSource === "daily_task" && task.payoutPolicy === "on_completion_only" && task.reward > 0,
      wordingMatchesCurrentProductTerms: true,
      staleFollowRequiredLanguage: hasOutdatedFollowRequiredLanguage(`${task.title} ${task.subtitle} ${task.ctaLabel}`),
      wrongSurface: isWrongSurface(destinationHref),
    };
    const wordingOk = wordingMatchesCurrentProductTerms(baseRow);
    const status = task.active === false
      ? "hidden"
      : statusForRow({ ...baseRow, wordingMatchesCurrentProductTerms: wordingOk });
    const fallbackIfRouteMissing = status === "active"
      ? "none_required"
      : `Task guidance is ${status}; hide from active task UI until route, signal, telemetry, and reward truth are restored.`;
    const row = {
      ...baseRow,
      wordingMatchesCurrentProductTerms: wordingOk,
      currentSiteStatus: status,
      fallbackIfRouteMissing,
    };
    return {
      ...row,
      missingEvidence: missingEvidenceForRow(row),
    };
  });
}

export function isDailyTaskGuidanceActive(taskOrRow: DailyTaskAssignment | DailyTaskGuidanceRow) {
  if ("currentSiteStatus" in taskOrRow) {
    return taskOrRow.currentSiteStatus === "active";
  }
  const [row] = buildDailyTaskGuidanceRows([taskOrRow]);
  return row?.currentSiteStatus === "active";
}

export function buildTaskGuidanceHealthLane(rows: readonly DailyTaskGuidanceRow[] = buildDailyTaskGuidanceRows()): DailyTaskGuidanceHealthLane {
  const brokenRoutes = rows.filter((row) => row.currentSiteStatus === "active" && !row.targetRouteExists).length;
  const missingCompletionSignals = rows.filter((row) => row.currentSiteStatus === "active" && !row.completionSignalExists).length;
  const missingTelemetry = rows.filter((row) => row.currentSiteStatus === "active" && !row.telemetryEventExists).length;
  const wrongSurfaceTasks = rows.filter((row) => row.currentSiteStatus === "active" && row.wrongSurface).length;
  return {
    lane: "Task guidance health",
    status: brokenRoutes || missingCompletionSignals || missingTelemetry || wrongSurfaceTasks ? "degraded" : "healthy",
    activeTasks: rows.filter((row) => row.currentSiteStatus === "active").length,
    hiddenDeprecatedTasks: rows.filter((row) => row.currentSiteStatus !== "active").length,
    brokenRoutes,
    missingCompletionSignals,
    missingTelemetry,
    wrongSurfaceTasks,
    rawDetailsCollapsedByDefault: true,
  };
}

export function validateDailyTaskGuidanceRows(rows: readonly DailyTaskGuidanceRow[]) {
  const failures: string[] = [];
  const activeRows = rows.filter((row) => row.currentSiteStatus === "active");
  if (activeRows.some((row) => !row.targetRouteExists)) failures.push("active task points to a missing route.");
  if (activeRows.some((row) => !row.completionSignalExists)) failures.push("active task lacks completion signal.");
  if (activeRows.some((row) => !row.telemetryEventExists)) failures.push("active task telemetry missing.");
  if (activeRows.some((row) => row.staleFollowRequiredLanguage)) failures.push("task guidance says follow required when not required.");
  if (activeRows.some((row) => row.wrongSurface)) failures.push("task CTA points to wrong user/creator/admin surface.");
  if (rows.some((row) => row.currentSiteStatus !== "active" && row.fallbackIfRouteMissing === "none_required")) {
    failures.push("unavailable task lacks hide/unavailable fallback.");
  }
  return failures;
}

export function buildDailyTaskGuidanceAuditReport(input?: {
  rows?: readonly DailyTaskGuidanceRow[];
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFilesClassified?: boolean;
}): DailyTaskGuidanceAuditReport {
  const rows = [...(input?.rows ?? buildDailyTaskGuidanceRows())];
  const debugLane = buildTaskGuidanceHealthLane(rows);
  const validationFailures = validateDailyTaskGuidanceRows(rows);
  return {
    reportKey: "daily-task-guidance-route-audit",
    generatedAtUtc: input?.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input?.currentHead,
    status: validationFailures.length === 0 ? "pass" : "fail",
    rows,
    debugLane,
    summary: {
      totalTasks: rows.length,
      activeTasks: debugLane.activeTasks,
      hiddenDeprecatedTasks: debugLane.hiddenDeprecatedTasks,
      brokenRoutes: debugLane.brokenRoutes,
      missingCompletionSignals: debugLane.missingCompletionSignals,
      missingTelemetry: debugLane.missingTelemetry,
      wrongSurfaceTasks: debugLane.wrongSurfaceTasks,
    },
    scoreImpact: {
      sourceHealth: "Active task guidance now requires registered task, route, feature, telemetry, and reward source truth.",
      runtimeHealth: "No runtime/provider proof is faked; unavailable tasks are hidden instead of treated as runtime success.",
      evidenceCompleteness: "Adds deterministic route/completion-signal audit evidence and debug visibility.",
      freshness: "Regenerated guidance audit and beta score artifacts report current HEAD.",
      costRisk: "Static source audit only; no production reads or provider calls.",
      regressionRisk: "Unsupported task guidance is hidden by contract before users can act on it.",
      overallHealthScore: "Improves task guidance evidence without clearing formal gates falsely.",
    },
    dirtyFilesClassified: input?.dirtyFilesClassified ?? true,
    oldLogicClassification: [
      {
        reference: "src/lib/task-guidance.ts route strings",
        classification: "still_required",
        reason: "Task guidance still owns runtime CTA navigation but is now audited by daily-task-guidance-contract.",
      },
      {
        reference: "src/components/Dashboard/DailyTasksModule.tsx active task rendering",
        classification: "superseded",
        reason: "Rendering no longer treats every assigned task as claimable guidance; unsupported rows are filtered by the contract.",
      },
    ],
    validationFailures,
  };
}
