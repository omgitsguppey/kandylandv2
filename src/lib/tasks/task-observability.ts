import {
  BUILT_IN_DAILY_TASKS,
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
  "daily_check_in_claim",
  "unlock_drop_success",
  "gumdrops_purchase_completed",
  "task_notifications_enabled",
  "feedback_submitted",
]);

export type DailyTaskTrackingSource = "canonical" | "telemetry" | "unsupported";

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
