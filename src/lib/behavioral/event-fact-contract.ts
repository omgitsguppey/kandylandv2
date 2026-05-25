import type { IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import type {
  GlobalUserDedupeDecision,
  GlobalUserDedupeScope,
  GlobalUserParityFields,
} from "@/lib/analytics/global-user-dedupe-contract";

export const BEHAVIORAL_EVENT_FACT_VERSION = "2026.05.event-facts.6";

export const BEHAVIORAL_NORMALIZED_ACTIONS = [
  "home_viewed",
  "session_started",
  "session_activity_tick",
  "session_meaningful_interaction",
  "session_closed",
  "session_bounced",
  "session_engaged",
  "hero_cta_clicked",
  "signup_started",
  "signup_completed",
  "onboarding_started",
  "onboarding_completed",
  "daily_checkin_claimed",
  "task_ready",
  "task_guidance_viewed",
  "task_guidance_tapped",
  "task_guidance_dismissed",
  "task_guidance_completed",
  "task_card_expanded",
  "task_help_opened",
  "daily_task_started",
  "daily_task_action_attempted",
  "task_completed",
  "daily_task_reward_granted",
  "daily_task_failed",
  "daily_task_abandoned",
  "daily_task_reset_locked",
  "creator_discovery_surface_viewed",
  "creator_spotlight_viewed",
  "creator_card_viewed",
  "creator_card_clicked",
  "creator_profile_opened",
  "drop_viewed",
  "drop_card_viewed",
  "search_query_submitted",
  "filter_selected",
  "sort_changed",
  "category_clicked",
  "creator_search_selected",
  "drop_preview_opened",
  "drop_preview_cta_clicked",
  "content_satisfaction_positive",
  "content_satisfaction_negative",
  "content_satisfaction_skipped",
  "recommendation_reason_helpful",
  "recommendation_reason_not_helpful",
  "drop_not_interested",
  "category_not_interested",
  "recommendation_dismissed",
  "drop_unwrap_attempted",
  "drop_unlocked",
  "drop_unwrap_failed",
  "file_viewed",
  "watch_session_started",
  "watch_session_tick",
  "watch_session_completed",
  "wallet_opened",
  "wallet_package_selected",
  "checkout_started",
  "gumdrops_purchased",
  "purchase_failed",
  "creator_follow_attempted",
  "creator_followed",
  "creator_follow_failed",
  "creator_unfollow_attempted",
  "creator_unfollowed",
  "creator_recommendation_viewed",
  "creator_recommendation_clicked",
  "creator_relationship_list_loaded",
  "creator_relationship_list_failed",
  "creator_not_interested",
  "creator_muted",
  "fan_pass_started",
  "fan_pass_failed",
  "custom_request_started",
  "custom_request_submitted",
  "booking_started",
  "booking_failed",
  "booking_completed",
  "chat_thread_opened",
  "notification_opened",
  "notification_read",
  "notification_action_clicked",
  "support_ticket_created",
  "support_reply_viewed",
  "support_reply_sent",
  "bug_report_submitted",
  "chat_message_sent",
  "chat_message_failed",
  "moderation_signal_recorded",
  "entitlement_violation_recorded",
  "admin_user_opened",
  "admin_user_action_taken",
] as const;

export type BehavioralNormalizedAction = typeof BEHAVIORAL_NORMALIZED_ACTIONS[number];

export type BehavioralEventEntityType =
  | "page"
  | "search"
  | "drop"
  | "category"
  | "file"
  | "creator"
  | "wallet"
  | "notification"
  | "support"
  | "chat"
  | "task"
  | "booking"
  | "recommendation"
  | "admin"
  | "moderation";

export type BehavioralEventSource = "client" | "server" | "materialized" | "legacy";
export type BehavioralMetricExclusionReason =
  | "admin_event"
  | "admin_projection"
  | "creator_admin_event"
  | "notification_diagnostic_only"
  | "privacy_limited"
  | "unsupported_event"
  | "missing_required_context"
  | "non_behavioral_identity_link";

export type BehavioralEventFact = {
  eventId: string;
  userId?: string;
  actorUserId?: string;
  actorAdminId?: string;
  actorCreatorId?: string;
  targetUserId?: string;
  targetCreatorId?: string;
  targetDropId?: string;
  targetFileId?: string;
  sessionId?: string;
  anonymousVisitorId?: string;
  eventName: string;
  rawEventName: string;
  normalizedAction: BehavioralNormalizedAction;
  timestampMs: number;
  route: string;
  pagePath: string;
  sourceComponent: string;
  authState?: string;
  entityType?: BehavioralEventEntityType;
  entityId?: string;
  dropId?: string;
  fileId?: string;
  mediaIndex?: number;
  creatorId?: string;
  transactionId?: string;
  threadId?: string;
  notificationId?: string;
  taskId?: string;
  dayKey?: string;
  valueUsd?: number;
  gumDropsAmount?: number;
  durationMs?: number;
  activeMs?: number;
  reasonCode?: string;
  source: BehavioralEventSource;
  sourceTruth: BehavioralEventSource | "canonical";
  sourceReliability?: number;
  metricEligible?: boolean;
  metricExclusionReason?: BehavioralMetricExclusionReason | "";
  confidence: number;
  dedupeKey: string;
  dedupeScope: GlobalUserDedupeScope;
  dedupeDecision: GlobalUserDedupeDecision;
  globalUserParity: GlobalUserParityFields;
  identityConfidence: IdentityConfidence;
};

export type BehavioralEventFactDiagnostic = {
  eventName: string;
  rawEventName: string;
  route: string;
  sourceComponent: string;
  source: BehavioralEventSource;
  reason: "unknown_event_name" | "missing_required_context";
};

export const BEHAVIORAL_EVENT_DEDUPE_WINDOWS_MS: Record<BehavioralNormalizedAction, number | "permanent" | "event_id"> = {
  home_viewed: 30 * 1000,
  session_started: "event_id",
  session_activity_tick: 15 * 1000,
  session_meaningful_interaction: 5 * 1000,
  session_closed: "event_id",
  session_bounced: "event_id",
  session_engaged: "event_id",
  hero_cta_clicked: 5 * 1000,
  signup_started: 60 * 60 * 1000,
  signup_completed: 24 * 60 * 60 * 1000,
  onboarding_started: 60 * 60 * 1000,
  onboarding_completed: 24 * 60 * 60 * 1000,
  daily_checkin_claimed: 20 * 60 * 60 * 1000,
  task_ready: 10 * 60 * 1000,
  task_guidance_viewed: 5 * 60 * 1000,
  task_guidance_tapped: 5 * 60 * 1000,
  task_guidance_dismissed: 5 * 60 * 1000,
  task_guidance_completed: 20 * 60 * 60 * 1000,
  task_card_expanded: 2 * 60 * 1000,
  task_help_opened: 2 * 60 * 1000,
  daily_task_started: "event_id",
  daily_task_action_attempted: "event_id",
  task_completed: 20 * 60 * 60 * 1000,
  daily_task_reward_granted: "event_id",
  daily_task_failed: "event_id",
  daily_task_abandoned: "event_id",
  daily_task_reset_locked: 5 * 60 * 1000,
  creator_discovery_surface_viewed: 60 * 1000,
  creator_spotlight_viewed: 60 * 1000,
  creator_card_viewed: 60 * 1000,
  creator_card_clicked: 10 * 1000,
  creator_profile_opened: 10 * 1000,
  drop_viewed: 10 * 1000,
  drop_card_viewed: 10 * 1000,
  search_query_submitted: 10 * 1000,
  filter_selected: 5 * 1000,
  sort_changed: 5 * 1000,
  category_clicked: 5 * 1000,
  creator_search_selected: 10 * 1000,
  drop_preview_opened: 10 * 1000,
  drop_preview_cta_clicked: 10 * 1000,
  content_satisfaction_positive: "event_id",
  content_satisfaction_negative: "event_id",
  content_satisfaction_skipped: "event_id",
  recommendation_reason_helpful: "event_id",
  recommendation_reason_not_helpful: "event_id",
  drop_not_interested: "permanent",
  category_not_interested: "permanent",
  recommendation_dismissed: 60 * 1000,
  drop_unwrap_attempted: 60 * 1000,
  drop_unlocked: "permanent",
  drop_unwrap_failed: "event_id",
  file_viewed: 30 * 1000,
  watch_session_started: "event_id",
  watch_session_tick: 5 * 1000,
  watch_session_completed: "event_id",
  wallet_opened: 60 * 1000,
  wallet_package_selected: 60 * 1000,
  checkout_started: "event_id",
  gumdrops_purchased: "event_id",
  purchase_failed: "event_id",
  creator_follow_attempted: "event_id",
  creator_followed: "permanent",
  creator_follow_failed: "event_id",
  creator_unfollow_attempted: "event_id",
  creator_unfollowed: "permanent",
  creator_recommendation_viewed: 60 * 1000,
  creator_recommendation_clicked: 10 * 1000,
  creator_relationship_list_loaded: 60 * 1000,
  creator_relationship_list_failed: "event_id",
  creator_not_interested: "permanent",
  creator_muted: "permanent",
  fan_pass_started: "event_id",
  fan_pass_failed: "event_id",
  custom_request_started: 60 * 1000,
  custom_request_submitted: "event_id",
  booking_started: 60 * 1000,
  booking_failed: "event_id",
  booking_completed: "event_id",
  chat_thread_opened: 30 * 1000,
  chat_message_failed: "event_id",
  notification_opened: 5 * 1000,
  notification_read: "event_id",
  notification_action_clicked: 5 * 1000,
  support_ticket_created: "event_id",
  support_reply_viewed: "event_id",
  support_reply_sent: "event_id",
  bug_report_submitted: "event_id",
  chat_message_sent: "event_id",
  moderation_signal_recorded: "event_id",
  entitlement_violation_recorded: "event_id",
  admin_user_opened: 30 * 1000,
  admin_user_action_taken: "event_id",
};

export const BEHAVIORAL_EVENT_LABELS: Record<BehavioralNormalizedAction, string> = {
  home_viewed: "Home viewed",
  session_started: "Session started",
  session_activity_tick: "Session activity tick",
  session_meaningful_interaction: "Session meaningful interaction",
  session_closed: "Session closed",
  session_bounced: "Session bounced",
  session_engaged: "Session engaged",
  hero_cta_clicked: "Hero CTA clicked",
  signup_started: "Signup started",
  signup_completed: "Signup completed",
  onboarding_started: "Onboarding started",
  onboarding_completed: "Onboarding completed",
  daily_checkin_claimed: "Daily check-in claimed",
  task_ready: "Task ready",
  task_guidance_viewed: "Task guidance viewed",
  task_guidance_tapped: "Task guidance tapped",
  task_guidance_dismissed: "Task guidance dismissed",
  task_guidance_completed: "Task guidance completed",
  task_card_expanded: "Task card expanded",
  task_help_opened: "Task help opened",
  daily_task_started: "Daily task started",
  daily_task_action_attempted: "Daily task action attempted",
  task_completed: "Task completed",
  daily_task_reward_granted: "Daily task reward granted",
  daily_task_failed: "Daily task failed",
  daily_task_abandoned: "Daily task abandoned",
  daily_task_reset_locked: "Daily task reset locked",
  creator_discovery_surface_viewed: "Creator discovery surface viewed",
  creator_spotlight_viewed: "Creator spotlight viewed",
  creator_card_viewed: "Creator card viewed",
  creator_card_clicked: "Creator card clicked",
  creator_profile_opened: "Creator profile opened",
  drop_viewed: "Drop viewed",
  drop_card_viewed: "Drop card viewed",
  search_query_submitted: "Search query submitted",
  filter_selected: "Filter selected",
  sort_changed: "Sort changed",
  category_clicked: "Category clicked",
  creator_search_selected: "Creator search selected",
  drop_preview_opened: "Drop preview opened",
  drop_preview_cta_clicked: "Drop preview CTA clicked",
  content_satisfaction_positive: "Content satisfaction positive",
  content_satisfaction_negative: "Content satisfaction negative",
  content_satisfaction_skipped: "Content satisfaction skipped",
  recommendation_reason_helpful: "Recommendation reason helpful",
  recommendation_reason_not_helpful: "Recommendation reason not helpful",
  drop_not_interested: "Drop marked not interested",
  category_not_interested: "Category marked not interested",
  recommendation_dismissed: "Recommendation dismissed",
  drop_unwrap_attempted: "Drop unwrap attempted",
  drop_unlocked: "Drop unlocked",
  drop_unwrap_failed: "Drop unwrap failed",
  file_viewed: "File viewed",
  watch_session_started: "Watch session started",
  watch_session_tick: "Watch session tick",
  watch_session_completed: "Watch session completed",
  wallet_opened: "Wallet opened",
  wallet_package_selected: "Wallet package selected",
  checkout_started: "Checkout started",
  gumdrops_purchased: "GumDrops refilled",
  purchase_failed: "Purchase failed",
  creator_follow_attempted: "Creator follow attempted",
  creator_followed: "Creator followed",
  creator_follow_failed: "Creator follow failed",
  creator_unfollow_attempted: "Creator unfollow attempted",
  creator_unfollowed: "Creator unfollowed",
  creator_recommendation_viewed: "Creator recommendation viewed",
  creator_recommendation_clicked: "Creator recommendation clicked",
  creator_relationship_list_loaded: "Creator relationship list loaded",
  creator_relationship_list_failed: "Creator relationship list failed",
  creator_not_interested: "Creator marked not interested",
  creator_muted: "Creator muted",
  fan_pass_started: "Fan Pass started",
  fan_pass_failed: "Fan Pass failed",
  custom_request_started: "Custom request started",
  custom_request_submitted: "Custom request submitted",
  booking_started: "Booking started",
  booking_failed: "Booking failed",
  booking_completed: "Booking completed",
  chat_thread_opened: "Chat thread opened",
  notification_opened: "Notification opened",
  notification_read: "Notification read",
  notification_action_clicked: "Notification action clicked",
  support_ticket_created: "Support ticket created",
  support_reply_viewed: "Support reply viewed",
  support_reply_sent: "Support reply sent",
  bug_report_submitted: "Bug report submitted",
  chat_message_sent: "Chat message sent",
  chat_message_failed: "Chat message failed",
  moderation_signal_recorded: "Moderation signal recorded",
  entitlement_violation_recorded: "Entitlement violation recorded",
  admin_user_opened: "Admin user opened",
  admin_user_action_taken: "Admin user action taken",
};
