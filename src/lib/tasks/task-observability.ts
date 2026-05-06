import {
  BUILT_IN_DAILY_TASKS,
  DAILY_TASK_COOLDOWN_DAYS,
  type DailyTaskAssignment,
  type DailyTaskDefinition,
} from "@/lib/tasks/task-catalog";
import {
  getTaskActionLabel,
  getTaskDestinationHref,
  getTaskInstruction,
  isTaskGuidanceActionType,
} from "@/lib/task-guidance";
import { getTelemetryEventOption } from "@/lib/telemetry-catalog";

export const CANONICAL_TASK_EVENT_NAMES = new Set([
  "daily_checkin_claimed",
  "unlock_drop_success",
  "gumdrops_purchase_completed",
  "task_notifications_enabled",
  "feedback_submitted",
]);

const GENERIC_TASK_LIFECYCLE_EVENT_NAMES = new Set([
  "daily_task_assigned",
  "daily_task_started",
  "task_completed",
  "daily_task_failed",
  "daily_task_deadline_reminder_sent",
]);

export type DailyTaskTrackingSource = "canonical" | "telemetry" | "unsupported";
export type TaskCatalogCoverageSourceType = "canonical" | "telemetry" | "legacy" | "unsupported";
export type TaskCatalogCoverageState =
  | "ready"
  | "partial"
  | "tracking_gap"
  | "assignment_gap"
  | "completion_gap"
  | "reward_risk"
  | "unsupported";

export interface DailyTaskInventoryEntry {
  taskId: string;
  title: string;
  subtitle: string;
  group: DailyTaskDefinition["group"];
  actionType: DailyTaskDefinition["actionType"];
  actionMode: "runtime" | "navigation";
  actionLabel: string;
  destinationHref: string;
  eventName: string;
  eventLabel: string;
  eventCategory: string;
  eventModules: string[];
  trackingSources: string[];
  trackingSource: DailyTaskTrackingSource;
  reward: number;
  maxProgress: number;
  oneTime: boolean;
  hasCriteria: boolean;
  hasUniqueKey: boolean;
  uniqueByParamKey: string | null;
  scope: DailyTaskDefinition["source"];
  instruction: string;
}

export interface TaskCatalogCoverageItem {
  taskId: string;
  title: string;
  triggerEvent: string;
  sourceType: TaskCatalogCoverageSourceType;
  group: string;
  actionPath: string;
  actionType: "route" | "runtime" | "background" | "external";
  rewardGd: number;
  maxRequired: number;
  mode: "one-time" | "daily" | "repeatable" | "filtered";
  keying?: "unique" | "count" | "any" | "filtered";
  criteria?: string[];
  assignable: boolean;
  trackable: boolean;
  completable: boolean;
  rewardSafe: boolean;
  dedupeSafe: boolean;
  actionReachable: boolean;
  coverageState: TaskCatalogCoverageState;
  missingEvidence: string[];
  requiredValidators: string[];
  sourceMixLabel: string;
  canonicalEventName: string;
  rawTriggerDetails: {
    eventLabel: string;
    trackingSources: string[];
    eventModules: string[];
    destinationHref: string;
    instruction: string;
  };
}

export interface TaskCatalogCoverageSummary {
  builtIn: number;
  ready: number;
  partial: number;
  unsupported: number;
  rewardRisk: number;
  assignmentGap: number;
  trackingGap: number;
  completionGap: number;
  sourceMix: {
    canonical: number;
    telemetry: number;
    legacy: number;
    unsupported: number;
  };
}

export interface DailyTaskInventorySummary {
  total: number;
  unsupportedTasks: number;
  runtimeActions: number;
  navigationActions: number;
  criteriaTasks: number;
  uniqueByParamTasks: number;
  oneTimeTasks: number;
  byGroup: Record<string, number>;
  byActionType: Record<string, number>;
  byTrackingSource: Record<DailyTaskTrackingSource, number>;
  byEventCategory: Record<string, number>;
  byModule: Record<string, number>;
}

export interface DailyTaskRuntimeUserState {
  uid: string;
  username: string;
  tasks: Array<Pick<DailyTaskAssignment, "id" | "title" | "progress" | "maxProgress" | "claimed" | "claimedAt" | "assignedAt">>;
  completedTaskHistory?: Record<string, number>;
  retiredTaskIds?: string[];
  hasInvalidRefreshMetadata?: boolean;
}

export interface DailyTaskRuntimeEventEntry {
  taskId: string;
  title: string;
  type: string;
  triggerEvent: string;
  userId: string;
  username: string;
  reward: number;
  timestamp: number;
}

export interface DailyTaskRuntimeReceiptEntry {
  eventName: string;
  uid: string;
  timestamp: number;
  source: string;
}

export interface DailyTaskRuntimeRewardClaimEntry {
  taskId: string;
  title: string;
  timestamp: number;
  reward: number;
}

export interface DailyTaskRuntimeEventStatEntry {
  eventName: string;
  totalCount: number;
  lastSeenAt: number;
}

export interface DailyTaskRuntimeRollupEntry {
  taskId: string;
  title: string;
  eventCount: number;
  rewardTotal: number;
  paidRewardTotalGd?: number;
  potentialRewardTotalGd?: number;
  forfeitedPotentialRewardGd?: number;
  outOfBoundsEventCount?: number;
  completed: number;
  started: number;
  failed: number;
  assigned?: number;
  reminders: number;
  lastEventAt: number;
}

export interface DailyTaskRuntimeAuditSummary {
  sampledUsers: number;
  usersWithAssignedTasks: number;
  totalAssignments: number;
  builtInAssignments: number;
  customAssignments: number;
  claimedAssignments: number;
  inProgressAssignments: number;
  usersWithRefreshIssues: number;
  unsupportedRuntimeRecords: number;
  missingDefinitionAssignments: number;
  cooldownConflictUsers: number;
  activeCustomDefinitions: number;
  inactiveCustomDefinitions: number;
  userScopedCustomDefinitions: number;
  globalCustomDefinitions: number;
  customDefinitionsWithAssignments: number;
  customDefinitionsWithDrift: number;
  builtInDefinitionsWithoutRuntimeSignals: number;
  customDefinitionsWithoutRuntimeSignals: number;
  sharedEventMappings: number;
  trackedTaskEvents: number;
  trackedReceiptEvents: number;
  trackedRewardClaims: number;
  telemetryAlignmentWarnings: number;
}

export interface DailyTaskRuntimeDistributionEntry extends DailyTaskInventoryEntry {
  definitionOrigin: "built_in" | "custom";
  active: boolean;
  customTaskId: string | null;
  targetUserId: string | null;
  cooldownDays: number;
  assignedUsers: number;
  activeAssignments: number;
  inProgressAssignments: number;
  claimedAssignments: number;
  retiredUsers: number;
  usersWithRefreshIssues: number;
  cooldownConflictUsers: number;
  recentAssignedCount: number;
  recentStartedCount: number;
  recentCompletedCount: number;
  recentFailedCount: number;
  recentReminderCount: number;
  recentReceiptCount: number;
  recentRewardClaimCount: number;
  recentRewardClaimTotal: number;
  eventStatTotalCount: number;
  eventLastSeenAt: number;
  rollupEventCount: number;
  rollupCompletedCount: number;
  rollupRewardTotal: number;
  lastRuntimeActivityAt: number;
  driftReasons: string[];
}

export interface DailyTaskTelemetryAlignmentEntry {
  eventName: string;
  eventLabel: string;
  eventCategory: string;
  eventModules: string[];
  trackingSources: string[];
  trackingSource: DailyTaskTrackingSource;
  mappedTaskCount: number;
  builtInTaskCount: number;
  customTaskCount: number;
  runtimeAssignedCount: number;
  recentTaskEventCount: number;
  recentCompletedCount: number;
  recentReceiptCount: number;
  eventStatTotalCount: number;
  lastSeenAt: number;
  driftReasons: string[];
}

export interface DailyTaskRuntimeDriftRecord {
  kind: "assignment" | "definition" | "event" | "receipt" | "reward_claim" | "rollup";
  taskId: string;
  title: string;
  eventName: string;
  userId: string;
  detail: string;
  timestamp?: number;
}

export interface DailyTaskAmbiguousEventMappingEntry {
  eventName: string;
  eventLabel: string;
  mappedTaskCount: number;
  taskIds: string[];
  taskTitles: string[];
  runtimeAssignedCount: number;
  recentReceiptCount: number;
  eventStatTotalCount: number;
}

export interface DailyTaskRuntimeAuditReport {
  summary: DailyTaskRuntimeAuditSummary;
  distribution: DailyTaskRuntimeDistributionEntry[];
  customDistribution: DailyTaskRuntimeDistributionEntry[];
  unsupportedRuntimeRecords: DailyTaskRuntimeDriftRecord[];
  telemetryAlignment: DailyTaskTelemetryAlignmentEntry[];
  ambiguousEventMappings: DailyTaskAmbiguousEventMappingEntry[];
}

type TaskCoverageRuntimeEvidence = Pick<
  DailyTaskRuntimeAuditReport,
  "distribution" | "telemetryAlignment" | "ambiguousEventMappings"
>;

const LEGACY_TASK_TRIGGER_EVENTS = new Set([
  "unlock_drop_success",
]);

const COUNT_KEYED_EVENT_NAMES = new Set([
  "drops_page_viewed",
  "experience_hub_viewed",
  "library_viewed",
]);

const FEEDBACK_SHARED_TRIGGER_EVENT = "feedback_submitted";
const PURCHASE_SHARED_TRIGGER_EVENT = "gumdrops_purchase_completed";

function describeCriteria(definition: DailyTaskDefinition): string[] {
  const criteria = definition.criteria;
  if (!criteria) {
    return [];
  }

  if (criteria.paramEquals) {
    return [`${criteria.paramEquals.key} = ${String(criteria.paramEquals.value)}`];
  }

  if (criteria.minNumberParam) {
    return [`${criteria.minNumberParam.key} >= ${criteria.minNumberParam.value}`];
  }

  if (criteria.includesAnyParam) {
    return [`${criteria.includesAnyParam.key} includes ${criteria.includesAnyParam.values.join(", ")}`];
  }

  return [];
}

function resolveCoverageSourceType(entry: DailyTaskInventoryEntry): TaskCatalogCoverageSourceType {
  if (entry.trackingSource === "unsupported") {
    return "unsupported";
  }

  if (LEGACY_TASK_TRIGGER_EVENTS.has(entry.eventName)) {
    return "legacy";
  }

  return entry.trackingSource;
}

function resolveCoverageMode(definition: DailyTaskDefinition): TaskCatalogCoverageItem["mode"] {
  if (definition.criteria) {
    return "filtered";
  }

  if (definition.oneTime) {
    return "one-time";
  }

  if (definition.maxProgress > 1) {
    return "repeatable";
  }

  return "daily";
}

function resolveCoverageKeying(definition: DailyTaskDefinition): TaskCatalogCoverageItem["keying"] {
  if (definition.criteria) {
    return definition.uniqueByParamKey ? "filtered" : "filtered";
  }

  if (definition.uniqueByParamKey) {
    return "unique";
  }

  if (definition.maxProgress > 1 && COUNT_KEYED_EVENT_NAMES.has(definition.eventName)) {
    return "count";
  }

  return "any";
}

function requiresCriteriaForSharedTrigger(definition: DailyTaskDefinition, sharedTriggerCount: number) {
  if (sharedTriggerCount <= 1) {
    return false;
  }

  if (definition.eventName === FEEDBACK_SHARED_TRIGGER_EVENT) {
    return true;
  }

  if (definition.eventName === PURCHASE_SHARED_TRIGGER_EVENT) {
    return true;
  }

  return false;
}

function buildTaskCatalogCoverageValidators(item: {
  rewardSafe: boolean;
  trackable: boolean;
  assignable: boolean;
}): string[] {
  const validators = ["check:task-catalog-coverage"];
  if (!item.assignable) {
    validators.push("check:daily-task-lifecycle");
  }
  if (!item.trackable) {
    validators.push("check:daily-task-telemetry-truth");
  }
  if (!item.rewardSafe) {
    validators.push("check:daily-task-reward-economy");
  }
  return validators;
}

export function buildTaskCatalogCoverage(
  definitions: DailyTaskDefinition[] = BUILT_IN_DAILY_TASKS,
  runtimeEvidence?: TaskCoverageRuntimeEvidence,
): TaskCatalogCoverageItem[] {
  const inventory = buildDailyTaskInventory(definitions);
  const inventoryById = new Map(inventory.map((entry) => [entry.taskId, entry]));
  const eventNameCounts = definitions.reduce((map, definition) => {
    map.set(definition.eventName, (map.get(definition.eventName) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const distributionByTaskId = new Map((runtimeEvidence?.distribution ?? []).map((entry) => [entry.taskId, entry]));
  const alignmentByEventName = new Map((runtimeEvidence?.telemetryAlignment ?? []).map((entry) => [entry.eventName, entry]));
  const ambiguousEvents = new Set((runtimeEvidence?.ambiguousEventMappings ?? []).map((entry) => entry.eventName));

  return definitions.map((definition) => {
    const inventoryEntry = inventoryById.get(definition.id);
    const distributionEntry = distributionByTaskId.get(definition.id);
    const telemetryAlignment = alignmentByEventName.get(definition.eventName);
    const sourceType = inventoryEntry ? resolveCoverageSourceType(inventoryEntry) : "unsupported";
    const mode = resolveCoverageMode(definition);
    const keying = resolveCoverageKeying(definition);
    const criteria = describeCriteria(definition);
    const rewardSafe = definition.reward >= 10 && definition.reward <= 1000;
    const assignable = definition.source === "built_in" || definition.active !== false;
    const actionReachable = Boolean(inventoryEntry?.destinationHref && inventoryEntry.destinationHref.startsWith("/"));
    const sharedTriggerCount = eventNameCounts.get(definition.eventName) ?? 1;
    const criteriaRequired = requiresCriteriaForSharedTrigger(definition, sharedTriggerCount);
    const hasLegacyAliasProof = LEGACY_TASK_TRIGGER_EVENTS.has(definition.eventName);
    const staticTrackable = sourceType !== "unsupported" && (sourceType !== "legacy" || hasLegacyAliasProof);
    const runtimeUnsupported = distributionEntry?.driftReasons.includes("unsupported_event_name")
      || telemetryAlignment?.driftReasons.includes("task_mapping_uses_unsupported_event");
    const runtimeSharedReceiptAmbiguity = ambiguousEvents.has(definition.eventName)
      && telemetryAlignment
      && telemetryAlignment.recentReceiptCount > 0
      && !definition.criteria
      && !definition.uniqueByParamKey;
    const trackable = staticTrackable && !runtimeUnsupported;
    const dedupeSafe = definition.maxProgress <= 1
      || Boolean(definition.uniqueByParamKey)
      || COUNT_KEYED_EVENT_NAMES.has(definition.eventName);
    const completable = trackable
      && (!criteriaRequired || criteria.length > 0)
      && !runtimeSharedReceiptAmbiguity;

    const missingEvidence: string[] = [];
    if (!assignable) {
      missingEvidence.push("Task is not assignable through the active daily assignment catalog.");
    }
    if (!trackable) {
      missingEvidence.push(sourceType === "unsupported"
        ? "Trigger event is not supported by the telemetry/canonical catalog."
        : "Trigger event is not proven trackable end to end.");
    }
    if (sourceType === "legacy") {
      missingEvidence.push("Legacy unlock trigger relies on canonical drop_unlocked alias proof.");
    }
    if (criteriaRequired && criteria.length === 0) {
      missingEvidence.push("Shared trigger requires criteria to avoid ambiguous completion.");
    }
    if (!dedupeSafe) {
      missingEvidence.push("Max > 1 task lacks distinct or count-safe keying.");
    }
    if (!actionReachable) {
      missingEvidence.push("Action path is missing or no longer reachable from the task CTA.");
    }
    if (!rewardSafe) {
      missingEvidence.push("Reward is outside the 10-1000 GD safety bounds.");
    }
    if (runtimeSharedReceiptAmbiguity) {
      missingEvidence.push("Shared receipt telemetry can complete this task ambiguously without criteria.");
    }

    let coverageState: TaskCatalogCoverageState = "ready";
    if (!rewardSafe) {
      coverageState = "reward_risk";
    } else if (!assignable) {
      coverageState = "assignment_gap";
    } else if (!trackable || sourceType === "legacy") {
      coverageState = "tracking_gap";
    } else if (!completable) {
      coverageState = "completion_gap";
    } else if (!dedupeSafe || !actionReachable) {
      coverageState = "partial";
    }
    if (sourceType === "unsupported") {
      coverageState = "unsupported";
    }

    const requiredValidators = buildTaskCatalogCoverageValidators({
      rewardSafe,
      trackable,
      assignable,
    });

    return {
      taskId: definition.id,
      title: definition.title,
      triggerEvent: definition.eventName,
      sourceType,
      group: definition.group,
      actionPath: `${inventoryEntry?.actionLabel ?? definition.ctaLabel} -> ${inventoryEntry?.destinationHref ?? ""}`,
      actionType: inventoryEntry?.actionMode === "runtime" ? "runtime" : "route",
      rewardGd: definition.reward,
      maxRequired: definition.maxProgress,
      mode,
      keying,
      criteria,
      assignable,
      trackable,
      completable,
      rewardSafe,
      dedupeSafe,
      actionReachable,
      coverageState,
      missingEvidence,
      requiredValidators,
      sourceMixLabel: sourceType,
      canonicalEventName: inventoryEntry?.eventName ?? definition.eventName,
      rawTriggerDetails: {
        eventLabel: inventoryEntry?.eventLabel ?? definition.eventName,
        trackingSources: inventoryEntry?.trackingSources ?? [],
        eventModules: inventoryEntry?.eventModules ?? [],
        destinationHref: inventoryEntry?.destinationHref ?? "",
        instruction: inventoryEntry?.instruction ?? "",
      },
    } satisfies TaskCatalogCoverageItem;
  }).sort((left, right) => {
    const stateRank: Record<TaskCatalogCoverageState, number> = {
      reward_risk: 0,
      assignment_gap: 1,
      tracking_gap: 2,
      completion_gap: 3,
      unsupported: 4,
      partial: 5,
      ready: 6,
    };
    return stateRank[left.coverageState] - stateRank[right.coverageState]
      || left.title.localeCompare(right.title);
  });
}

export function summarizeTaskCatalogCoverage(entries: TaskCatalogCoverageItem[]): TaskCatalogCoverageSummary {
  return entries.reduce<TaskCatalogCoverageSummary>((summary, entry) => {
    summary.builtIn += 1;
    summary.sourceMix[entry.sourceType] += 1;
    if (entry.coverageState === "ready") summary.ready += 1;
    if (entry.coverageState === "partial") summary.partial += 1;
    if (entry.coverageState === "unsupported") summary.unsupported += 1;
    if (entry.coverageState === "reward_risk") summary.rewardRisk += 1;
    if (entry.coverageState === "assignment_gap") summary.assignmentGap += 1;
    if (entry.coverageState === "tracking_gap") summary.trackingGap += 1;
    if (entry.coverageState === "completion_gap") summary.completionGap += 1;
    return summary;
  }, {
    builtIn: 0,
    ready: 0,
    partial: 0,
    unsupported: 0,
    rewardRisk: 0,
    assignmentGap: 0,
    trackingGap: 0,
    completionGap: 0,
    sourceMix: {
      canonical: 0,
      telemetry: 0,
      legacy: 0,
      unsupported: 0,
    },
  });
}

function toTaskAssignment(definition: DailyTaskDefinition): DailyTaskAssignment {
  return {
    ...definition,
    progress: 0,
    claimed: false,
    progressKeys: [],
    assignedAt: 0,
  };
}

export function getTaskTrackingSource(eventName: string): DailyTaskTrackingSource {
  if (CANONICAL_TASK_EVENT_NAMES.has(eventName)) {
    return "canonical";
  }

  const { option } = getTelemetryEventOption(eventName);
  return option ? "telemetry" : "unsupported";
}

export function buildDailyTaskInventory(
  definitions: DailyTaskDefinition[] = BUILT_IN_DAILY_TASKS,
): DailyTaskInventoryEntry[] {
  return definitions.map((definition) => {
    const task = toTaskAssignment(definition);
    const { canonicalEventName, option } = getTelemetryEventOption(definition.eventName);
    const actionMode = isTaskGuidanceActionType(definition.actionType) ? "runtime" : "navigation";

    return {
      taskId: definition.id,
      title: definition.title,
      subtitle: definition.subtitle,
      group: definition.group,
      actionType: definition.actionType,
      actionMode,
      actionLabel: getTaskActionLabel(task),
      destinationHref: getTaskDestinationHref(task),
      eventName: canonicalEventName,
      eventLabel: option?.label || canonicalEventName,
      eventCategory: option?.category || "system",
      eventModules: option?.modules ?? [],
      trackingSources: option?.sources ?? [],
      trackingSource: getTaskTrackingSource(canonicalEventName),
      reward: definition.reward,
      maxProgress: definition.maxProgress,
      oneTime: definition.oneTime === true,
      hasCriteria: Boolean(definition.criteria),
      hasUniqueKey: Boolean(definition.uniqueByParamKey),
      uniqueByParamKey: definition.uniqueByParamKey ?? null,
      scope: definition.source,
      instruction: getTaskInstruction(task),
    };
  });
}

export function summarizeDailyTaskInventory(entries: DailyTaskInventoryEntry[]): DailyTaskInventorySummary {
  return entries.reduce<DailyTaskInventorySummary>((summary, entry) => {
    summary.total += 1;
    summary.byGroup[entry.group] = (summary.byGroup[entry.group] ?? 0) + 1;
    summary.byActionType[entry.actionType] = (summary.byActionType[entry.actionType] ?? 0) + 1;
    summary.byTrackingSource[entry.trackingSource] += 1;
    summary.byEventCategory[entry.eventCategory] = (summary.byEventCategory[entry.eventCategory] ?? 0) + 1;

    entry.eventModules.forEach((moduleKey) => {
      summary.byModule[moduleKey] = (summary.byModule[moduleKey] ?? 0) + 1;
    });

    if (entry.trackingSource === "unsupported") {
      summary.unsupportedTasks += 1;
    }

    if (entry.actionMode === "runtime") {
      summary.runtimeActions += 1;
    } else {
      summary.navigationActions += 1;
    }

    if (entry.hasCriteria) {
      summary.criteriaTasks += 1;
    }

    if (entry.hasUniqueKey) {
      summary.uniqueByParamTasks += 1;
    }

    if (entry.oneTime) {
      summary.oneTimeTasks += 1;
    }

    return summary;
  }, {
    total: 0,
    unsupportedTasks: 0,
    runtimeActions: 0,
    navigationActions: 0,
    criteriaTasks: 0,
    uniqueByParamTasks: 0,
    oneTimeTasks: 0,
    byGroup: {},
    byActionType: {},
    byTrackingSource: {
      canonical: 0,
      telemetry: 0,
      unsupported: 0,
    },
    byEventCategory: {},
    byModule: {},
  });
}

interface DailyTaskRuntimeAuditInput {
  definitions: DailyTaskDefinition[];
  userStates: DailyTaskRuntimeUserState[];
  taskEvents: DailyTaskRuntimeEventEntry[];
  receipts?: DailyTaskRuntimeReceiptEntry[];
  rewardClaims?: DailyTaskRuntimeRewardClaimEntry[];
  eventStats?: DailyTaskRuntimeEventStatEntry[];
  taskRollups?: DailyTaskRuntimeRollupEntry[];
}

interface DailyTaskRuntimeMutableEntry extends DailyTaskRuntimeDistributionEntry {
  _assignedUsers: Set<string>;
  _retiredUsers: Set<string>;
  _refreshIssueUsers: Set<string>;
  _cooldownConflictUsers: Set<string>;
  _outOfScopeUsers: Set<string>;
}

function normalizePositiveNumber(value: number | undefined): number {
  const numericValue = typeof value === "number" ? value : 0;
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

function toRuntimeDistributionEntry(
  definition: DailyTaskDefinition,
  inventoryEntry: DailyTaskInventoryEntry,
): DailyTaskRuntimeMutableEntry {
  return {
    ...inventoryEntry,
    definitionOrigin: definition.source === "built_in" ? "built_in" : "custom",
    active: definition.active !== false,
    customTaskId: definition.customTaskId ?? (definition.source === "built_in" ? null : definition.id),
    targetUserId: definition.targetUserId ?? null,
    cooldownDays: definition.cooldownDays ?? DAILY_TASK_COOLDOWN_DAYS,
    assignedUsers: 0,
    activeAssignments: 0,
    inProgressAssignments: 0,
    claimedAssignments: 0,
    retiredUsers: 0,
    usersWithRefreshIssues: 0,
    cooldownConflictUsers: 0,
    recentAssignedCount: 0,
    recentStartedCount: 0,
    recentCompletedCount: 0,
    recentFailedCount: 0,
    recentReminderCount: 0,
    recentReceiptCount: 0,
    recentRewardClaimCount: 0,
    recentRewardClaimTotal: 0,
    eventStatTotalCount: 0,
    eventLastSeenAt: 0,
    rollupEventCount: 0,
    rollupCompletedCount: 0,
    rollupRewardTotal: 0,
    lastRuntimeActivityAt: 0,
    driftReasons: inventoryEntry.trackingSource === "unsupported" ? ["unsupported_event_name"] : [],
    _assignedUsers: new Set<string>(),
    _retiredUsers: new Set<string>(),
    _refreshIssueUsers: new Set<string>(),
    _cooldownConflictUsers: new Set<string>(),
    _outOfScopeUsers: new Set<string>(),
  };
}

function pushRuntimeDriftRecord(
  records: DailyTaskRuntimeDriftRecord[],
  record: DailyTaskRuntimeDriftRecord,
) {
  records.push(record);
}

function finalizeRuntimeDistributionEntry(entry: DailyTaskRuntimeMutableEntry): DailyTaskRuntimeDistributionEntry {
  const driftReasons = Array.from(new Set([
    ...entry.driftReasons,
    ...(entry._outOfScopeUsers.size > 0 ? ["assigned_outside_target_user"] : []),
    ...(entry._cooldownConflictUsers.size > 0 ? ["cooldown_reassignment_detected"] : []),
    ...(!entry.active && (
      entry.activeAssignments > 0
      || entry.recentAssignedCount > 0
      || entry.recentStartedCount > 0
      || entry.recentCompletedCount > 0
      || entry.recentRewardClaimCount > 0
    ) ? ["inactive_definition_has_runtime_activity"] : []),
  ]));

  return {
    ...entry,
    assignedUsers: entry._assignedUsers.size,
    retiredUsers: entry._retiredUsers.size,
    usersWithRefreshIssues: entry._refreshIssueUsers.size,
    cooldownConflictUsers: entry._cooldownConflictUsers.size,
    driftReasons,
  };
}

export function buildDailyTaskRuntimeAudit({
  definitions,
  userStates,
  taskEvents,
  receipts = [],
  rewardClaims = [],
  eventStats = [],
  taskRollups = [],
}: DailyTaskRuntimeAuditInput): DailyTaskRuntimeAuditReport {
  const inventory = buildDailyTaskInventory(definitions);
  const inventoryById = new Map(inventory.map((entry) => [entry.taskId, entry]));
  const eventNameToTaskIds = new Map<string, string[]>();
  const unsupportedRuntimeRecords: DailyTaskRuntimeDriftRecord[] = [];

  const distributionMap = new Map<string, DailyTaskRuntimeMutableEntry>();
  const cooldownConflictUsers = new Set<string>();
  definitions.forEach((definition) => {
    const inventoryEntry = inventoryById.get(definition.id);
    if (!inventoryEntry) {
      return;
    }

    distributionMap.set(definition.id, toRuntimeDistributionEntry(definition, inventoryEntry));
    const taskIds = eventNameToTaskIds.get(inventoryEntry.eventName) ?? [];
    taskIds.push(definition.id);
    eventNameToTaskIds.set(inventoryEntry.eventName, taskIds);
  });

  const summary: DailyTaskRuntimeAuditSummary = {
    sampledUsers: userStates.length,
    usersWithAssignedTasks: 0,
    totalAssignments: 0,
    builtInAssignments: 0,
    customAssignments: 0,
    claimedAssignments: 0,
    inProgressAssignments: 0,
    usersWithRefreshIssues: 0,
    unsupportedRuntimeRecords: 0,
    missingDefinitionAssignments: 0,
    cooldownConflictUsers: 0,
    activeCustomDefinitions: definitions.filter((definition) => definition.source !== "built_in" && definition.active !== false).length,
    inactiveCustomDefinitions: definitions.filter((definition) => definition.source !== "built_in" && definition.active === false).length,
    userScopedCustomDefinitions: definitions.filter((definition) => definition.source === "user").length,
    globalCustomDefinitions: definitions.filter((definition) => definition.source === "global").length,
    customDefinitionsWithAssignments: 0,
    customDefinitionsWithDrift: 0,
    builtInDefinitionsWithoutRuntimeSignals: 0,
    customDefinitionsWithoutRuntimeSignals: 0,
    sharedEventMappings: 0,
    trackedTaskEvents: taskEvents.length,
    trackedReceiptEvents: receipts.length,
    trackedRewardClaims: rewardClaims.length,
    telemetryAlignmentWarnings: 0,
  };

  const taskEventCountsByTrigger = new Map<string, { total: number; completed: number }>();
  taskEvents.forEach((event) => {
    if (event.triggerEvent) {
      const current = taskEventCountsByTrigger.get(event.triggerEvent) ?? { total: 0, completed: 0 };
      current.total += 1;
      if (event.type === "completed") {
        current.completed += 1;
      }
      taskEventCountsByTrigger.set(event.triggerEvent, current);
    }
  });

  const receiptCountsByEvent = new Map<string, number>();
  receipts.forEach((receipt) => {
    receiptCountsByEvent.set(receipt.eventName, (receiptCountsByEvent.get(receipt.eventName) ?? 0) + 1);
  });

  const eventStatByName = new Map<string, { totalCount: number; lastSeenAt: number }>();
  eventStats.forEach((entry) => {
    const current = eventStatByName.get(entry.eventName) ?? { totalCount: 0, lastSeenAt: 0 };
    current.totalCount += normalizePositiveNumber(entry.totalCount);
    current.lastSeenAt = Math.max(current.lastSeenAt, normalizePositiveNumber(entry.lastSeenAt));
    eventStatByName.set(entry.eventName, current);
  });

  userStates.forEach((userState) => {
    if (userState.tasks.length > 0) {
      summary.usersWithAssignedTasks += 1;
    }

    if (userState.hasInvalidRefreshMetadata) {
      summary.usersWithRefreshIssues += 1;
    }

    const completedHistory = userState.completedTaskHistory ?? {};
    const retiredTaskIds = new Set(userState.retiredTaskIds ?? []);

    userState.tasks.forEach((task) => {
      summary.totalAssignments += 1;

      const entry = distributionMap.get(task.id);
      if (!entry) {
        summary.missingDefinitionAssignments += 1;
        pushRuntimeDriftRecord(unsupportedRuntimeRecords, {
          kind: "assignment",
          taskId: task.id,
          title: task.title || task.id,
          eventName: "",
          userId: userState.uid,
          detail: "runtime assignment is missing a matching task definition",
          timestamp: normalizePositiveNumber(task.assignedAt) || normalizePositiveNumber(task.claimedAt),
        });
        return;
      }

      entry.activeAssignments += 1;
      entry._assignedUsers.add(userState.uid);
      entry.lastRuntimeActivityAt = Math.max(entry.lastRuntimeActivityAt, normalizePositiveNumber(task.assignedAt), normalizePositiveNumber(task.claimedAt));

      if (entry.definitionOrigin === "built_in") {
        summary.builtInAssignments += 1;
      } else {
        summary.customAssignments += 1;
      }

      if (task.claimed) {
        entry.claimedAssignments += 1;
        summary.claimedAssignments += 1;
      } else if ((task.progress ?? 0) > 0) {
        entry.inProgressAssignments += 1;
        summary.inProgressAssignments += 1;
      }

      if (retiredTaskIds.has(task.id)) {
        entry._retiredUsers.add(userState.uid);
      }

      if (userState.hasInvalidRefreshMetadata) {
        entry._refreshIssueUsers.add(userState.uid);
      }

      if (entry.targetUserId && entry.targetUserId !== userState.uid) {
        entry._outOfScopeUsers.add(userState.uid);
      }

      const completedAt = normalizePositiveNumber(completedHistory[task.id]);
      const assignedAt = normalizePositiveNumber(task.assignedAt);
      const cooldownMs = entry.cooldownDays * 24 * 60 * 60 * 1000;
      if (!task.claimed && completedAt > 0 && assignedAt >= completedAt && assignedAt - completedAt < cooldownMs) {
        entry._cooldownConflictUsers.add(userState.uid);
        cooldownConflictUsers.add(userState.uid);
      }
    });
  });

  taskEvents.forEach((event) => {
    const entry = distributionMap.get(event.taskId);
    if (!entry) {
      pushRuntimeDriftRecord(unsupportedRuntimeRecords, {
        kind: "event",
        taskId: event.taskId,
        title: event.title || event.taskId,
        eventName: event.triggerEvent,
        userId: event.userId,
        detail: "task lifecycle event does not map to a current task definition",
        timestamp: normalizePositiveNumber(event.timestamp),
      });
      return;
    }

    entry.lastRuntimeActivityAt = Math.max(entry.lastRuntimeActivityAt, normalizePositiveNumber(event.timestamp));
    switch (event.type) {
      case "assigned":
        entry.recentAssignedCount += 1;
        break;
      case "started":
        entry.recentStartedCount += 1;
        break;
      case "completed":
        entry.recentCompletedCount += 1;
        break;
      case "failed":
        entry.recentFailedCount += 1;
        break;
      case "reminder_sent":
        entry.recentReminderCount += 1;
        break;
      default:
        break;
    }
  });

  receipts.forEach((receipt) => {
    const mappedTaskIds = eventNameToTaskIds.get(receipt.eventName) ?? [];
    if (mappedTaskIds.length === 1) {
      const entry = distributionMap.get(mappedTaskIds[0]);
      if (entry) {
        entry.recentReceiptCount += 1;
        entry.lastRuntimeActivityAt = Math.max(entry.lastRuntimeActivityAt, normalizePositiveNumber(receipt.timestamp));
      }
      return;
    }

    if (mappedTaskIds.length === 0) {
      pushRuntimeDriftRecord(unsupportedRuntimeRecords, {
        kind: "receipt",
        taskId: "",
        title: "",
        eventName: receipt.eventName,
        userId: receipt.uid,
        detail: "task receipt event is not mapped to any known task definition",
        timestamp: normalizePositiveNumber(receipt.timestamp),
      });
    }
  });

  rewardClaims.forEach((claim) => {
    const entry = distributionMap.get(claim.taskId);
    if (!entry) {
      pushRuntimeDriftRecord(unsupportedRuntimeRecords, {
        kind: "reward_claim",
        taskId: claim.taskId,
        title: claim.title || claim.taskId,
        eventName: "",
        userId: "",
        detail: "reward claim could not be mapped to a known task definition",
        timestamp: normalizePositiveNumber(claim.timestamp),
      });
      return;
    }

    entry.recentRewardClaimCount += 1;
    entry.recentRewardClaimTotal += normalizePositiveNumber(claim.reward);
    entry.lastRuntimeActivityAt = Math.max(entry.lastRuntimeActivityAt, normalizePositiveNumber(claim.timestamp));
  });

  eventStats.forEach((stat) => {
    const mappedTaskIds = eventNameToTaskIds.get(stat.eventName) ?? [];
    if (mappedTaskIds.length === 1) {
      const entry = distributionMap.get(mappedTaskIds[0]);
      if (entry) {
        entry.eventStatTotalCount += normalizePositiveNumber(stat.totalCount);
        entry.eventLastSeenAt = Math.max(entry.eventLastSeenAt, normalizePositiveNumber(stat.lastSeenAt));
        entry.lastRuntimeActivityAt = Math.max(entry.lastRuntimeActivityAt, normalizePositiveNumber(stat.lastSeenAt));
      }
    }
  });

  taskRollups.forEach((rollup) => {
    const entry = distributionMap.get(rollup.taskId);
    if (!entry) {
      pushRuntimeDriftRecord(unsupportedRuntimeRecords, {
        kind: "rollup",
        taskId: rollup.taskId,
        title: rollup.title || rollup.taskId,
        eventName: "",
        userId: "",
        detail: "task rollup references a task definition that is no longer present",
        timestamp: normalizePositiveNumber(rollup.lastEventAt),
      });
      return;
    }

    entry.rollupEventCount += normalizePositiveNumber(rollup.eventCount);
    entry.rollupCompletedCount += normalizePositiveNumber(rollup.completed);
    entry.rollupRewardTotal += normalizePositiveNumber(rollup.paidRewardTotalGd ?? rollup.rewardTotal);
    entry.lastRuntimeActivityAt = Math.max(entry.lastRuntimeActivityAt, normalizePositiveNumber(rollup.lastEventAt));
  });

  const telemetryAlignment = Array.from(new Set([
    ...definitions.map((definition) => inventoryById.get(definition.id)?.eventName ?? definition.eventName),
    ...taskEvents.map((event) => event.triggerEvent),
    ...receipts.map((receipt) => receipt.eventName),
    ...eventStats.map((stat) => stat.eventName),
  ]))
    .filter((eventName) => eventName.length > 0)
    .map((eventName) => {
      const mappedTaskIds = eventNameToTaskIds.get(eventName) ?? [];
      const mappedEntries = mappedTaskIds
        .map((taskId) => distributionMap.get(taskId))
        .filter((entry): entry is DailyTaskRuntimeMutableEntry => Boolean(entry));
      const { option, canonicalEventName } = getTelemetryEventOption(eventName);
      const taskEventCounts = taskEventCountsByTrigger.get(eventName) ?? { total: 0, completed: 0 };
      const eventStatsSummary = eventStatByName.get(eventName) ?? { totalCount: 0, lastSeenAt: 0 };
      const recentReceiptCount = receiptCountsByEvent.get(eventName) ?? 0;
      const tracksGenericTaskLifecycle = GENERIC_TASK_LIFECYCLE_EVENT_NAMES.has(canonicalEventName);
      const driftReasons = Array.from(new Set([
        ...(mappedTaskIds.length === 0
          && !tracksGenericTaskLifecycle
          && (eventStatsSummary.totalCount > 0 || recentReceiptCount > 0 || taskEventCounts.total > 0)
          ? ["tracked_without_task_mapping"]
          : []),
        ...(mappedTaskIds.length > 1 && recentReceiptCount > 0 ? ["receipt_counts_shared_across_multiple_tasks"] : []),
        ...(getTaskTrackingSource(canonicalEventName) === "unsupported" && mappedTaskIds.length > 0 ? ["task_mapping_uses_unsupported_event"] : []),
      ]));

      return {
        eventName: canonicalEventName,
        eventLabel: option?.label || canonicalEventName,
        eventCategory: option?.category || "system",
        eventModules: option?.modules ?? [],
        trackingSources: option?.sources ?? [],
        trackingSource: getTaskTrackingSource(canonicalEventName),
        mappedTaskCount: mappedTaskIds.length,
        builtInTaskCount: mappedEntries.filter((entry) => entry.definitionOrigin === "built_in").length,
        customTaskCount: mappedEntries.filter((entry) => entry.definitionOrigin === "custom").length,
        runtimeAssignedCount: mappedEntries.reduce((sum, entry) => sum + entry.activeAssignments, 0),
        recentTaskEventCount: taskEventCounts.total,
        recentCompletedCount: taskEventCounts.completed,
        recentReceiptCount,
        eventStatTotalCount: eventStatsSummary.totalCount,
        lastSeenAt: eventStatsSummary.lastSeenAt,
        driftReasons,
      } satisfies DailyTaskTelemetryAlignmentEntry;
    })
    .sort((left, right) => {
      const leftActivity = left.eventStatTotalCount + left.recentTaskEventCount + left.recentReceiptCount;
      const rightActivity = right.eventStatTotalCount + right.recentTaskEventCount + right.recentReceiptCount;
      return rightActivity - leftActivity || right.mappedTaskCount - left.mappedTaskCount || left.eventName.localeCompare(right.eventName);
    });

  const ambiguousEventMappings = Array.from(eventNameToTaskIds.entries())
    .filter(([, taskIds]) => taskIds.length > 1)
    .map(([eventName, taskIds]) => {
      const { option, canonicalEventName } = getTelemetryEventOption(eventName);
      const mappedEntries = taskIds
        .map((taskId) => distributionMap.get(taskId))
        .filter((entry): entry is DailyTaskRuntimeMutableEntry => Boolean(entry));
      return {
        eventName: canonicalEventName,
        eventLabel: option?.label || canonicalEventName,
        mappedTaskCount: taskIds.length,
        taskIds,
        taskTitles: mappedEntries.map((entry) => entry.title),
        runtimeAssignedCount: mappedEntries.reduce((sum, entry) => sum + entry.activeAssignments, 0),
        recentReceiptCount: receiptCountsByEvent.get(eventName) ?? 0,
        eventStatTotalCount: (eventStatByName.get(eventName) ?? { totalCount: 0 }).totalCount,
      } satisfies DailyTaskAmbiguousEventMappingEntry;
    })
    .sort((left, right) => right.mappedTaskCount - left.mappedTaskCount || right.runtimeAssignedCount - left.runtimeAssignedCount);

  const distribution = Array.from(distributionMap.values())
    .map(finalizeRuntimeDistributionEntry)
    .sort((left, right) => {
      const leftSignal = left.activeAssignments + left.recentCompletedCount + left.recentRewardClaimCount + left.rollupCompletedCount;
      const rightSignal = right.activeAssignments + right.recentCompletedCount + right.recentRewardClaimCount + right.rollupCompletedCount;
      return rightSignal - leftSignal || right.assignedUsers - left.assignedUsers || left.title.localeCompare(right.title);
    });

  summary.cooldownConflictUsers = cooldownConflictUsers.size;
  summary.customDefinitionsWithAssignments = distribution.filter((entry) => entry.definitionOrigin === "custom" && entry.activeAssignments > 0).length;
  summary.customDefinitionsWithDrift = distribution.filter((entry) => entry.definitionOrigin === "custom" && entry.driftReasons.length > 0).length;
  summary.builtInDefinitionsWithoutRuntimeSignals = distribution.filter((entry) => (
    entry.definitionOrigin === "built_in"
    && entry.activeAssignments === 0
    && entry.recentCompletedCount === 0
    && entry.recentRewardClaimCount === 0
    && entry.rollupEventCount === 0
    && entry.eventStatTotalCount === 0
  )).length;
  summary.customDefinitionsWithoutRuntimeSignals = distribution.filter((entry) => (
    entry.definitionOrigin === "custom"
    && entry.activeAssignments === 0
    && entry.recentCompletedCount === 0
    && entry.recentRewardClaimCount === 0
    && entry.rollupEventCount === 0
    && entry.eventStatTotalCount === 0
  )).length;
  summary.sharedEventMappings = ambiguousEventMappings.length;
  summary.telemetryAlignmentWarnings = telemetryAlignment.filter((entry) => entry.driftReasons.length > 0).length;
  summary.unsupportedRuntimeRecords = unsupportedRuntimeRecords.length;

  return {
    summary,
    distribution,
    customDistribution: distribution.filter((entry) => entry.definitionOrigin === "custom"),
    unsupportedRuntimeRecords,
    telemetryAlignment,
    ambiguousEventMappings,
  };
}
