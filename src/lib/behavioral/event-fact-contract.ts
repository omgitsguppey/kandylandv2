export const BEHAVIORAL_EVENT_FACT_VERSION = "2026.05.event-facts.1";

export const BEHAVIORAL_NORMALIZED_ACTIONS = [
  "onboarding_completed",
  "daily_checkin_claimed",
  "drop_viewed",
  "drop_preview_opened",
  "drop_unwrapped",
  "file_viewed",
  "watch_session_completed",
  "gumdrops_purchased",
  "creator_followed",
  "notification_opened",
  "support_ticket_created",
  "chat_message_sent",
] as const;

export type BehavioralNormalizedAction = typeof BEHAVIORAL_NORMALIZED_ACTIONS[number];

export type BehavioralEventEntityType =
  | "drop"
  | "file"
  | "creator"
  | "wallet"
  | "notification"
  | "support"
  | "chat";

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
  sourceComponent: string;
  entityType?: BehavioralEventEntityType;
  entityId?: string;
  valueUsd?: number;
  gumDropsAmount?: number;
  source: BehavioralEventSource;
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
  onboarding_completed: 24 * 60 * 60 * 1000,
  daily_checkin_claimed: 20 * 60 * 60 * 1000,
  drop_viewed: 10 * 1000,
  drop_preview_opened: 10 * 1000,
  drop_unwrapped: "permanent",
  file_viewed: 30 * 1000,
  watch_session_completed: "event_id",
  gumdrops_purchased: "event_id",
  creator_followed: "permanent",
  notification_opened: 5 * 1000,
  support_ticket_created: "event_id",
  chat_message_sent: "event_id",
};

export const BEHAVIORAL_EVENT_LABELS: Record<BehavioralNormalizedAction, string> = {
  onboarding_completed: "Onboarding completed",
  daily_checkin_claimed: "Daily check-in claimed",
  drop_viewed: "Drop viewed",
  drop_preview_opened: "Drop preview opened",
  drop_unwrapped: "Drop unwrapped",
  file_viewed: "File viewed",
  watch_session_completed: "Watch session completed",
  gumdrops_purchased: "GumDrops refilled",
  creator_followed: "Creator followed",
  notification_opened: "Notification opened",
  support_ticket_created: "Support ticket created",
  chat_message_sent: "Chat message sent",
};
