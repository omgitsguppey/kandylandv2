import { TELEMETRY_EVENT_NAMES } from "@/lib/telemetry-catalog";

export const DAILY_TASK_LIMIT = 3;
export const DAILY_TASK_COOLDOWN_DAYS = 7;
export const DAILY_TASK_MIN_REWARD = 50;
export const DAILY_TASK_MAX_REWARD = 1000;

export type DailyTaskScope = "built_in" | "global" | "user";
export type DailyTaskGroup =
  | "visit"
  | "notifications"
  | "unwrap"
  | "watch"
  | "wallet"
  | "purchase"
  | "feedback"
  | "share";
export type DailyTaskActionType =
  | "open_dashboard"
  | "open_drops"
  | "open_experiences"
  | "open_library"
  | "open_notifications"
  | "open_wallet"
  | "enable_notifications"
  | "give_feedback";
export type DailyTaskIconName =
  | "bell"
  | "sparkles"
  | "wallet"
  | "gift"
  | "candy"
  | "play"
  | "share"
  | "message"
  | "eye"
  | "layers";

export interface DailyTaskCriteria {
  paramEquals?: {
    key: string;
    value: string | number | boolean;
  };
  minNumberParam?: {
    key: string;
    value: number;
  };
  includesAnyParam?: {
    key: string;
    values: string[];
  };
}

export interface DailyTaskDefinition {
  id: string;
  source: DailyTaskScope;
  title: string;
  subtitle: string;
  reward: number;
  maxProgress: number;
  eventName: string;
  actionType: DailyTaskActionType;
  ctaLabel: string;
  icon: DailyTaskIconName;
  group: DailyTaskGroup;
  cooldownDays?: number;
  criteria?: DailyTaskCriteria;
  uniqueByParamKey?: string;
  targetUserId?: string | null;
  customTaskId?: string;
  active?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface DailyTaskAssignment extends DailyTaskDefinition {
  progress: number;
  claimed: boolean;
  progressKeys?: string[];
  assignedAt: number;
  startedAt?: number;
  claimedAt?: number;
}

export interface DailyTasksState {
  lastResetMs: number;
  nextRefreshMs: number;
  tasks: DailyTaskAssignment[];
  completedTaskHistory?: Record<string, number>;
  lastProgressAt?: number;
  lastDeadlineReminderAt?: number;
}

export interface DailyTaskEventStat {
  eventName: string;
  totalCount: number;
  lastSeenAt: number;
  lastParams?: Record<string, string | number | boolean>;
}

export interface DailyTaskLifecycleEvent {
  id: string;
  type: "assigned" | "started" | "completed" | "failed" | "reminder_sent";
  taskId: string;
  title: string;
  triggerEvent: string;
  userId: string;
  username?: string | null;
  reward: number;
  progress: number;
  maxProgress: number;
  timestamp: number;
  reason?: string;
  assignedAt?: number;
  startedAt?: number;
  durationMs?: number;
}

export const DAILY_TASK_ACTION_OPTIONS: Array<{ value: DailyTaskActionType; label: string }> = [
  { value: "open_dashboard", label: "Open dashboard" },
  { value: "open_drops", label: "Open drops" },
  { value: "open_experiences", label: "Open experiences" },
  { value: "open_library", label: "Open library" },
  { value: "open_notifications", label: "Open notifications" },
  { value: "open_wallet", label: "Get Gum Drops" },
  { value: "enable_notifications", label: "Enable notifications" },
  { value: "give_feedback", label: "Share feedback" },
];

export const DAILY_TASK_ICON_OPTIONS: Array<{ value: DailyTaskIconName; label: string }> = [
  { value: "bell", label: "Bell" },
  { value: "sparkles", label: "Sparkles" },
  { value: "wallet", label: "Wallet" },
  { value: "gift", label: "Gift" },
  { value: "candy", label: "Candy" },
  { value: "play", label: "Play" },
  { value: "share", label: "Share" },
  { value: "message", label: "Message" },
  { value: "eye", label: "Eye" },
  { value: "layers", label: "Layers" },
];

function createTask(definition: Omit<DailyTaskDefinition, "source">): DailyTaskDefinition {
  return {
    source: "built_in",
    cooldownDays: DAILY_TASK_COOLDOWN_DAYS,
    ...definition,
  };
}

export const BUILT_IN_DAILY_TASKS: DailyTaskDefinition[] = [
  createTask({
    id: "enable_notifications",
    title: "Turn on drop alerts",
    subtitle: "Enable push alerts so live KandyDrops never slip by.",
    reward: 180,
    maxProgress: 1,
    eventName: "task_notifications_enabled",
    actionType: "enable_notifications",
    ctaLabel: "Enable notifications",
    icon: "bell",
    group: "notifications",
  }),
  createTask({
    id: "open_notifications",
    title: "Check your notifications",
    subtitle: "Open your alerts and see what is waiting for you.",
    reward: 60,
    maxProgress: 1,
    eventName: "notifications_dropdown_opened",
    actionType: "open_notifications",
    ctaLabel: "Open notifications",
    icon: "bell",
    group: "notifications",
  }),
  createTask({
    id: "read_notification",
    title: "Clear one alert",
    subtitle: "Mark one notification as read to keep your queue fresh.",
    reward: 70,
    maxProgress: 1,
    eventName: "notification_marked_read",
    actionType: "open_notifications",
    ctaLabel: "Review notifications",
    icon: "bell",
    group: "notifications",
  }),
  createTask({
    id: "visit_experiences",
    title: "Start today's ritual",
    subtitle: "Open Experiences and keep your daily momentum moving.",
    reward: 70,
    maxProgress: 1,
    eventName: "experience_hub_viewed",
    actionType: "open_experiences",
    ctaLabel: "Open Experiences",
    icon: "sparkles",
    group: "visit",
  }),
  createTask({
    id: "check_in_today",
    title: "Claim today's reward",
    subtitle: "Stack today's Gum Drops before the timer resets.",
    reward: 140,
    maxProgress: 1,
    eventName: "daily_check_in_claim",
    actionType: "open_experiences",
    ctaLabel: "Claim daily rewards",
    icon: "gift",
    group: "visit",
  }),
  createTask({
    id: "open_dashboard",
    title: "Open your dashboard",
    subtitle: "Drop into your main hub and see what is waiting.",
    reward: 80,
    maxProgress: 1,
    eventName: "dashboard_viewed",
    actionType: "open_dashboard",
    ctaLabel: "Open dashboard",
    icon: "layers",
    group: "visit",
  }),
  createTask({
    id: "open_library",
    title: "Visit your library",
    subtitle: "Check the KandyDrops you already unwrapped.",
    reward: 90,
    maxProgress: 1,
    eventName: "library_viewed",
    actionType: "open_library",
    ctaLabel: "Open library",
    icon: "layers",
    group: "visit",
  }),
  createTask({
    id: "preview_two_drops",
    title: "Preview 2 live drops",
    subtitle: "Look around before you decide what to unwrap next.",
    reward: 110,
    maxProgress: 2,
    eventName: "drop_preview_opened",
    actionType: "open_drops",
    ctaLabel: "Unwrap now",
    icon: "eye",
    group: "visit",
    uniqueByParamKey: "drop_id",
  }),
  createTask({
    id: "preview_three_drops",
    title: "Preview 3 live drops",
    subtitle: "Scan more drops and build up your next unwrap list.",
    reward: 160,
    maxProgress: 3,
    eventName: "drop_preview_opened",
    actionType: "open_drops",
    ctaLabel: "Unwrap now",
    icon: "eye",
    group: "visit",
    uniqueByParamKey: "drop_id",
  }),
  createTask({
    id: "view_three_drop_details",
    title: "Open 3 drop detail views",
    subtitle: "Dig deeper into what is live right now.",
    reward: 140,
    maxProgress: 3,
    eventName: "view_drop_details",
    actionType: "open_drops",
    ctaLabel: "Unwrap now",
    icon: "eye",
    group: "visit",
    uniqueByParamKey: "drop_id",
  }),
  createTask({
    id: "open_wallet",
    title: "Peek at your stash",
    subtitle: "Open Wallet and line up your next unwrap.",
    reward: 90,
    maxProgress: 1,
    eventName: "wallet_opened",
    actionType: "open_wallet",
    ctaLabel: "Get Gum Drops",
    icon: "wallet",
    group: "wallet",
  }),
  createTask({
    id: "start_checkout",
    title: "Start a Gum Drop checkout",
    subtitle: "Get to checkout so you are ready to unwrap fast.",
    reward: 160,
    maxProgress: 1,
    eventName: "begin_checkout",
    actionType: "open_wallet",
    ctaLabel: "Get Gum Drops",
    icon: "wallet",
    group: "wallet",
  }),
  createTask({
    id: "buy_small_pack",
    title: "Top up your Gum Drops",
    subtitle: "Buy any Gum Drop pack to stay ready for live drops.",
    reward: 650,
    maxProgress: 1,
    eventName: "gumdrops_purchase_completed",
    actionType: "open_wallet",
    ctaLabel: "Get Gum Drops",
    icon: "wallet",
    group: "purchase",
    criteria: {
      minNumberParam: {
        key: "package_drops",
        value: 100,
      },
    },
  }),
  createTask({
    id: "buy_big_pack",
    title: "Load up for the next rush",
    subtitle: "Grab 2,500+ Gum Drops for your biggest unwrap sessions.",
    reward: 1000,
    maxProgress: 1,
    eventName: "gumdrops_purchase_completed",
    actionType: "open_wallet",
    ctaLabel: "Get Gum Drops",
    icon: "wallet",
    group: "purchase",
    criteria: {
      minNumberParam: {
        key: "package_drops",
        value: 2500,
      },
    },
  }),
  createTask({
    id: "unwrap_one_drop",
    title: "Unwrap 1 KandyDrop",
    subtitle: "Open one live drop before it disappears.",
    reward: 260,
    maxProgress: 1,
    eventName: "unlock_drop_success",
    actionType: "open_drops",
    ctaLabel: "Unwrap now",
    icon: "candy",
    group: "unwrap",
    uniqueByParamKey: "drop_id",
  }),
  createTask({
    id: "unwrap_two_drops",
    title: "Unwrap 2 KandyDrops",
    subtitle: "Double up and grow your collection today.",
    reward: 520,
    maxProgress: 2,
    eventName: "unlock_drop_success",
    actionType: "open_drops",
    ctaLabel: "Unwrap now",
    icon: "candy",
    group: "unwrap",
    uniqueByParamKey: "drop_id",
  }),
  createTask({
    id: "unwrap_spicy",
    title: "Unwrap a Spicy drop",
    subtitle: "Go for the boldest drop in the room.",
    reward: 400,
    maxProgress: 1,
    eventName: "unlock_drop_success",
    actionType: "open_drops",
    ctaLabel: "Unwrap now",
    icon: "candy",
    group: "unwrap",
    uniqueByParamKey: "drop_id",
    criteria: {
      includesAnyParam: {
        key: "drop_tags",
        values: ["Spicy"],
      },
    },
  }),
  createTask({
    id: "open_viewer_once",
    title: "Open one unlocked drop",
    subtitle: "Return to your library and keep the content flowing.",
    reward: 180,
    maxProgress: 1,
    eventName: "viewer_opened",
    actionType: "open_library",
    ctaLabel: "Open library",
    icon: "play",
    group: "watch",
    uniqueByParamKey: "drop_id",
  }),
  createTask({
    id: "watch_one_asset",
    title: "Watch 1 unlocked file",
    subtitle: "Spend a little time with what you already unwrapped.",
    reward: 220,
    maxProgress: 1,
    eventName: "viewer_asset_consumed",
    actionType: "open_library",
    ctaLabel: "Open library",
    icon: "play",
    group: "watch",
    uniqueByParamKey: "asset_key",
  }),
  createTask({
    id: "watch_two_assets",
    title: "Watch 2 unlocked files",
    subtitle: "Stick with your content long enough to catch the good part.",
    reward: 420,
    maxProgress: 2,
    eventName: "viewer_asset_consumed",
    actionType: "open_library",
    ctaLabel: "Open library",
    icon: "play",
    group: "watch",
    uniqueByParamKey: "asset_key",
  }),
  createTask({
    id: "watch_ninety_seconds",
    title: "Stay for the full moment",
    subtitle: "Watch a drop for 90 seconds to earn a bigger bonus.",
    reward: 600,
    maxProgress: 1,
    eventName: "viewer_watch_checkpoint",
    actionType: "open_library",
    ctaLabel: "Open library",
    icon: "play",
    group: "watch",
    criteria: {
      minNumberParam: {
        key: "watch_seconds",
        value: 90,
      },
    },
  }),
  createTask({
    id: "switch_three_assets",
    title: "Flip through 3 files",
    subtitle: "Use the thumbnail rail and explore the whole unlock.",
    reward: 150,
    maxProgress: 3,
    eventName: "viewer_asset_changed",
    actionType: "open_library",
    ctaLabel: "Open library",
    icon: "layers",
    group: "watch",
    uniqueByParamKey: "asset_key",
  }),
  createTask({
    id: "share_one_drop",
    title: "Share one KandyDrop",
    subtitle: "Copy a drop link and spread the hype.",
    reward: 160,
    maxProgress: 1,
    eventName: "drop_share_copied",
    actionType: "open_library",
    ctaLabel: "Open library",
    icon: "share",
    group: "share",
    uniqueByParamKey: "drop_id",
  }),
  createTask({
    id: "submit_feedback",
    title: "Tell us what you want next",
    subtitle: "Drop a quick note so we can shape what ships next.",
    reward: 300,
    maxProgress: 1,
    eventName: "feedback_submitted",
    actionType: "give_feedback",
    ctaLabel: "Share feedback",
    icon: "message",
    group: "feedback",
  }),
  createTask({
    id: "feature_request_feedback",
    title: "Pitch a feature idea",
    subtitle: "Tell us the one thing you want added next.",
    reward: 350,
    maxProgress: 1,
    eventName: "feedback_submitted",
    actionType: "give_feedback",
    ctaLabel: "Share feedback",
    icon: "message",
    group: "feedback",
    criteria: {
      paramEquals: {
        key: "category",
        value: "feature_request",
      },
    },
  }),
  createTask({
    id: "bug_report_feedback",
    title: "Report a bug",
    subtitle: "Help us tighten the experience with one bug report.",
    reward: 350,
    maxProgress: 1,
    eventName: "feedback_submitted",
    actionType: "give_feedback",
    ctaLabel: "Share feedback",
    icon: "message",
    group: "feedback",
    criteria: {
      paramEquals: {
        key: "category",
        value: "bug_report",
      },
    },
  }),
  createTask({
    id: "high_rating_feedback",
    title: "Rate today's experience",
    subtitle: "Leave a 4 or 5 star rating with your feedback.",
    reward: 260,
    maxProgress: 1,
    eventName: "feedback_submitted",
    actionType: "give_feedback",
    ctaLabel: "Share feedback",
    icon: "message",
    group: "feedback",
    criteria: {
      minNumberParam: {
        key: "rating",
        value: 4,
      },
    },
  }),
];

export function isTrackedTelemetryEvent(eventName: string): boolean {
  return TELEMETRY_EVENT_NAMES.includes(eventName);
}

export const BUILT_IN_DAILY_TASK_MAP = Object.fromEntries(
  BUILT_IN_DAILY_TASKS.map((task) => [task.id, task]),
) as Record<string, DailyTaskDefinition>;
