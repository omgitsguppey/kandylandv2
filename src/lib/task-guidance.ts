import { type DailyTaskActionType, type DailyTaskAssignment } from "@/lib/tasks/task-catalog";

export const TASK_GUIDANCE_STORAGE_KEY = "kandydrops:active-task-guidance";
export const TASK_GUIDANCE_ACTION_STORAGE_KEY = "kandydrops:active-task-guidance-action";
export const TASK_GUIDANCE_ACTION_EVENT = "kandydrops:task-guidance-action";

export const TASK_GUIDANCE_ACTION_TYPES = [
  "open_notifications",
  "open_wallet",
  "enable_notifications",
  "give_feedback",
] as const satisfies DailyTaskActionType[];

export type TaskGuidanceActionType = (typeof TASK_GUIDANCE_ACTION_TYPES)[number];

const TASK_GUIDANCE_ACTION_TYPE_SET = new Set<string>(TASK_GUIDANCE_ACTION_TYPES);

export interface TaskGuidanceState {
  taskId: string;
  title: string;
  reward: number;
  instruction: string;
  ctaLabel: string;
  destinationHref: string;
  eventName: string;
  actionType: DailyTaskAssignment["actionType"];
  assignedAt: number;
  activatedAt: number;
  completedAt?: number;
  dismissedAt?: number;
}

export interface TaskGuidancePendingAction {
  taskId: string;
  actionType: TaskGuidanceActionType;
  destinationHref: string;
  assignedAt: number;
  createdAt: number;
}

function reportTaskGuidanceStorageIssue(scope: string, error: unknown, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  void import("@/lib/client-error-reporting")
    .then(({ reportStorageIssue }) => {
      reportStorageIssue(scope, error, detail);
    })
    .catch(() => undefined);
}

function getTaskGuidanceSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function clearLegacyTaskGuidanceLocalStorage(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    reportTaskGuidanceStorageIssue("task guidance legacy cleanup", error, {
      storageKey,
    });
  }
}

function isTaskGuidanceStorageRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSessionStorageValue(storageKey: string): unknown {
  const storage = getTaskGuidanceSessionStorage();
  if (!storage) {
    return null;
  }

  clearLegacyTaskGuidanceLocalStorage(storageKey);

  try {
    const raw = storage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    reportTaskGuidanceStorageIssue("task guidance read", error, {
      storageKey,
    });
    return null;
  }
}

function writeSessionStorageValue(storageKey: string, value: unknown) {
  const storage = getTaskGuidanceSessionStorage();
  if (!storage) {
    return;
  }

  clearLegacyTaskGuidanceLocalStorage(storageKey);

  if (value === null) {
    try {
      storage.removeItem(storageKey);
    } catch (error) {
      reportTaskGuidanceStorageIssue("task guidance clear", error, {
        storageKey,
      });
    }
    return;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    reportTaskGuidanceStorageIssue("task guidance write", error, {
      storageKey,
    });
  }
}

export function isTaskGuidanceActionType(
  actionType: DailyTaskAssignment["actionType"] | string,
): actionType is TaskGuidanceActionType {
  return TASK_GUIDANCE_ACTION_TYPE_SET.has(actionType);
}

export function getTaskDestinationPath(destinationHref: string) {
  const [path] = destinationHref.split("#");
  return path || "/";
}

export function focusTaskDestinationAnchor(destinationHref: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const [, anchorId = ""] = destinationHref.split("#");
  if (!anchorId) {
    return false;
  }

  const target = window.document.getElementById(anchorId);
  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${anchorId}`);
  return true;
}

export function isSamePageTaskViewEvent(eventName: string) {
  return eventName === "experience_hub_viewed"
    || eventName === "dashboard_viewed"
    || eventName === "library_viewed"
    || eventName === "drops_page_viewed";
}

export function readTaskGuidancePendingAction() {
  const rawValue = readSessionStorageValue(TASK_GUIDANCE_ACTION_STORAGE_KEY);
  if (!isTaskGuidanceStorageRecord(rawValue)) {
    return null;
  }

  const actionType = typeof rawValue.actionType === "string" ? rawValue.actionType : null;
  if (
    typeof rawValue.taskId !== "string"
    || !actionType
    || !isTaskGuidanceActionType(actionType)
    || typeof rawValue.destinationHref !== "string"
    || typeof rawValue.createdAt !== "number"
  ) {
    return null;
  }

  return {
    taskId: rawValue.taskId,
    actionType,
    destinationHref: rawValue.destinationHref,
    assignedAt: typeof rawValue.assignedAt === "number" ? rawValue.assignedAt : 0,
    createdAt: rawValue.createdAt,
  } satisfies TaskGuidancePendingAction;
}

export function writeTaskGuidancePendingAction(action: TaskGuidancePendingAction | null) {
  writeSessionStorageValue(TASK_GUIDANCE_ACTION_STORAGE_KEY, action);
}

export function clearTaskGuidanceStorage() {
  writeSessionStorageValue(TASK_GUIDANCE_STORAGE_KEY, null);
  writeSessionStorageValue(TASK_GUIDANCE_ACTION_STORAGE_KEY, null);
}

function formatTaskCountLabel(task: Pick<DailyTaskAssignment, "maxProgress">, singular: string, plural: string) {
  return task.maxProgress > 1 ? plural : singular;
}

export function createTaskGuidancePendingAction(task: Pick<TaskGuidanceState, "taskId" | "actionType" | "destinationHref" | "assignedAt">): TaskGuidancePendingAction {
  if (!isTaskGuidanceActionType(task.actionType)) {
    throw new Error("Task guidance pending actions only support runtime action types.");
  }

  return {
    taskId: task.taskId,
    actionType: task.actionType,
    destinationHref: task.destinationHref,
    assignedAt: task.assignedAt,
    createdAt: Date.now(),
  };
}

export function findCurrentTaskGuidanceTask(
  tasks: DailyTaskAssignment[] | null | undefined,
  reference: Pick<TaskGuidanceState, "taskId" | "assignedAt"> | Pick<TaskGuidancePendingAction, "taskId" | "assignedAt">,
) {
  if (!Array.isArray(tasks)) {
    return null;
  }

  return tasks.find((task) => (
    task.id === reference.taskId
    && (reference.assignedAt <= 0 || task.assignedAt === reference.assignedAt)
  )) ?? null;
}

export function getTaskInstruction(task: DailyTaskAssignment) {
  if (task.eventName === "daily_checkin_claimed") {
    return "Open Daily Rewards, tap Claim daily reward, and your streak will update immediately.";
  }

  if (task.eventName === "notifications_dropdown_opened") {
    return "Open the notification bell and keep the drawer open for a moment so the visit counts.";
  }

  if (task.eventName === "notification_read") {
    return "Open the notification bell, tap Read on one alert, and the task will finish as soon as it syncs.";
  }

  if (task.eventName === "notification_opened") {
    return "Open the notification bell, tap Open on one alert, and let the destination page finish loading to count it.";
  }

  if (task.eventName === "task_notifications_enabled") {
    return "Turn on browser notifications, accept the device prompt, and return here once alerts are enabled.";
  }

  if (task.eventName === "feedback_submitted") {
    return "Choose a category, write one quick note, and submit it to complete this feedback task.";
  }

  if (task.eventName === "begin_checkout") {
    return "Pick a Gum Drops bundle and continue into checkout so the task can log the start.";
  }

  if (task.eventName === "gumdrops_purchase_completed") {
    return "Purchase the required Gum Drops bundle and wait for the balance update to finish this task.";
  }

  if (task.eventName === "wallet_opened") {
    return "Open the Gum Drops wallet and let the bundle list finish loading so the visit counts.";
  }

  if (task.eventName === "unlock_drop_success") {
    return `${task.title} by unwrapping the matching live drop, then wait for the reward to sync.`;
  }

  if (task.eventName === "viewer_opened" || task.eventName === "viewer_session_completed") {
    return "Open one of your unlocked drops from the library and stay with it until the viewer logs the action.";
  }

  if (task.eventName === "viewer_asset_consumed" || task.eventName === "viewer_watch_checkpoint") {
    return "Open an unlocked drop, play the required file, and keep watching until the viewing milestone is reached.";
  }

  if (task.eventName === "viewer_asset_changed") {
    return "Open an unlocked drop and switch through different files in the viewer until the count is complete.";
  }

  if (task.eventName === "viewer_asset_completed") {
    return `Open an unlocked drop and finish ${formatTaskCountLabel(task, "the required file", "enough files")} all the way through until playback completes.`;
  }

  if (task.eventName === "viewer_source_downloaded") {
    return "Open one of your eligible unlocked drops in the library and tap Download on a file to count this task.";
  }

  if (task.eventName === "viewer_related_drop_clicked") {
    return "Open an unlocked drop, scroll to the related picks, and tap one recommendation to complete this task.";
  }

  if (task.eventName === "drop_preview_opened" || task.eventName === "view_drop_details") {
    return "Browse live drops and open the required previews or detail views until the progress bar fills.";
  }

  if (task.eventName === "drop_share_copied") {
    return "Open a live drop preview, copy its share link, and the task will complete as soon as the copy succeeds.";
  }

  if (task.actionType === "open_dashboard") {
    return "Open your dashboard and stay on the page for a moment so the visit can register.";
  }

  if (task.eventName === "dashboard_viewed") {
    return "Open your dashboard home and keep it on screen for a moment so the visit counts.";
  }

  if (task.eventName === "experience_hub_viewed") {
    return "Open Experiences and let the page settle so the visit can register toward this task.";
  }

  if (task.eventName === "library_viewed") {
    return "Open your library and keep the gallery in view for a moment so the visit counts.";
  }

  if (task.eventName === "drops_page_viewed") {
    return "Open live drops and keep the grid in view for a moment so the visit counts.";
  }

  if (task.actionType === "open_experiences") {
    return "Open Experiences and complete the highlighted action there to finish this task.";
  }

  if (task.actionType === "open_library") {
    return "Open your library and follow the prompt on that page to complete the required viewing action.";
  }

  if (task.actionType === "open_wallet") {
    return "Open the Gum Drops wallet and complete the purchase step required for this task.";
  }

  return "Follow the guided steps on the destination screen and this task will complete as soon as it syncs.";
}

export function getTaskActionLabel(task: DailyTaskAssignment) {
  if (task.eventName === "daily_checkin_claimed") {
    return "Claim reward";
  }

  if (task.eventName === "notifications_dropdown_opened") {
    return "Open bell";
  }

  if (task.eventName === "notification_read") {
    return "Mark one read";
  }

  if (task.eventName === "notification_opened") {
    return "Open an alert";
  }

  if (task.eventName === "task_notifications_enabled") {
    return "Enable alerts";
  }

  if (task.eventName === "feedback_submitted") {
    return "Share feedback";
  }

  if (task.eventName === "wallet_opened") {
    return "Open wallet";
  }

  if (task.eventName === "begin_checkout") {
    return "Start checkout";
  }

  if (task.eventName === "gumdrops_purchase_completed") {
    return "Buy Gum Drops";
  }

  if (task.eventName === "unlock_drop_success") {
    return "Unwrap live drops";
  }

  if (task.eventName === "viewer_opened") {
    return "Open unlocked drop";
  }

  if (task.eventName === "viewer_session_completed") {
    return "Finish a session";
  }

  if (task.eventName === "viewer_asset_consumed") {
    return "Watch unlocked files";
  }

  if (task.eventName === "viewer_asset_completed") {
    return "Finish a file";
  }

  if (task.eventName === "viewer_watch_checkpoint") {
    return "Keep watching";
  }

  if (task.eventName === "viewer_asset_changed") {
    return "Switch files";
  }

  if (task.eventName === "viewer_source_downloaded") {
    return "Download file";
  }

  if (task.eventName === "viewer_related_drop_clicked") {
    return "Open related drop";
  }

  if (task.eventName === "drop_preview_opened") {
    return "Preview drops";
  }

  if (task.eventName === "view_drop_details") {
    return "Open details";
  }

  if (task.eventName === "drop_share_copied") {
    return "Copy share link";
  }

  if (task.eventName === "dashboard_viewed") {
    return "Visit dashboard";
  }

  if (task.eventName === "experience_hub_viewed") {
    return "Visit Experiences";
  }

  if (task.eventName === "library_viewed") {
    return "Visit library";
  }

  if (task.eventName === "drops_page_viewed") {
    return "Visit drops";
  }

  return task.ctaLabel;
}

export function getTaskDestinationHref(task: DailyTaskAssignment) {
  switch (task.actionType) {
    case "open_dashboard":
      return "/dashboard#dashboard-home";
    case "open_drops":
      return "/drops#live-drops";
    case "open_experiences":
      return task.eventName === "daily_checkin_claimed" ? "/experiences#daily-reward" : "/experiences#daily-tasks";
    case "open_library":
      return "/dashboard/library#library-grid";
    case "open_notifications":
      return "/experiences#daily-tasks";
    case "open_wallet":
      return "/experiences#gumdrops-wallet";
    case "enable_notifications":
      return "/experiences#daily-tasks";
    case "give_feedback":
      return "/experiences#daily-tasks";
    default:
      return "/experiences#daily-tasks";
  }
}

export function createTaskGuidanceState(task: DailyTaskAssignment): TaskGuidanceState {
  return {
    taskId: task.id,
    title: task.title,
    reward: task.reward,
    instruction: getTaskInstruction(task),
    ctaLabel: getTaskActionLabel(task),
    destinationHref: getTaskDestinationHref(task),
    eventName: task.eventName,
    actionType: task.actionType,
    assignedAt: task.assignedAt,
    activatedAt: Date.now(),
  };
}
