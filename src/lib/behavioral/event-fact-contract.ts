export const BEHAVIORAL_EVENT_FACT_VERSION = "2026.05.event-facts.2";

export const BEHAVIORAL_NORMALIZED_ACTIONS = [
  "home_viewed",
  "hero_cta_clicked",
  "signup_started",
  "signup_completed",
  "onboarding_started",
  "onboarding_completed",
  "daily_checkin_claimed",
  "task_ready",
  "task_completed",
  "creator_spotlight_viewed",
  "drop_viewed",
  "drop_card_viewed",
  "drop_preview_opened",
  "drop_preview_cta_clicked",
  "drop_unwrap_attempted",
  "drop_unwrapped",
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
  "creator_followed",
  "creator_unfollowed",
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
  | "drop"
  | "file"
  | "creator"
  | "wallet"
  | "notification"
  | "support"
  | "chat"
  | "task"
  | "booking"
  | "admin"
  | "moderation";

export type BehavioralEventSource = "client" | "server" | "materialized" | "legacy";

export type BehavioralEventFact = {
  eventId: string;
  userId?: string;
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
  reasonCode?: string;
  source: BehavioralEventSource;
  sourceTruth: BehavioralEventSource;
  confidence: number;
  dedupeKey: string;
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
  hero_cta_clicked: 5 * 1000,
  signup_started: 60 * 60 * 1000,
  signup_completed: 24 * 60 * 60 * 1000,
  onboarding_started: 60 * 60 * 1000,
  onboarding_completed: 24 * 60 * 60 * 1000,
  daily_checkin_claimed: 20 * 60 * 60 * 1000,
  task_ready: 10 * 60 * 1000,
  task_completed: 20 * 60 * 60 * 1000,
  creator_spotlight_viewed: 60 * 1000,
  drop_viewed: 10 * 1000,
  drop_card_viewed: 10 * 1000,
  drop_preview_opened: 10 * 1000,
  drop_preview_cta_clicked: 10 * 1000,
  drop_unwrap_attempted: 60 * 1000,
  drop_unwrapped: "permanent",
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
  creator_followed: "permanent",
  creator_unfollowed: "permanent",
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
  hero_cta_clicked: "Hero CTA clicked",
  signup_started: "Signup started",
  signup_completed: "Signup completed",
  onboarding_started: "Onboarding started",
  onboarding_completed: "Onboarding completed",
  daily_checkin_claimed: "Daily check-in claimed",
  task_ready: "Task ready",
  task_completed: "Task completed",
  creator_spotlight_viewed: "Creator spotlight viewed",
  drop_viewed: "Drop viewed",
  drop_card_viewed: "Drop card viewed",
  drop_preview_opened: "Drop preview opened",
  drop_preview_cta_clicked: "Drop preview CTA clicked",
  drop_unwrap_attempted: "Drop unwrap attempted",
  drop_unwrapped: "Drop unwrapped",
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
  creator_followed: "Creator followed",
  creator_unfollowed: "Creator unfollowed",
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
