import type { ActorKind, IdentityConfidence, IdentityState } from "@/lib/analytics/identity-handoff-contract";
import type { BehavioralEventEntityType, BehavioralNormalizedAction } from "@/lib/behavioral/event-fact-contract";

export const USER_JOURNEY_CONTRACT_VERSION = "2026.05.user-journey.1";

export const USER_JOURNEY_CORE_FUNNELS = [
  "landing_to_signup",
  "signup_to_first_unwrap",
  "wallet_to_checkout_to_payment",
  "drop_view_to_unlock_to_watch",
  "creator_profile_to_fan_pass_chat_follow",
  "notification_prompt_to_permission",
  "daily_task_to_reward",
  "chat_open_to_message_outcome",
] as const;

export type UserJourneyCoreFunnel = (typeof USER_JOURNEY_CORE_FUNNELS)[number];

export const USER_JOURNEY_COST_GUARD = "batched_rollup";

export type UserJourneyPrivacyClass =
  | "safe_summary"
  | "private_content_redacted"
  | "payment_provider_redacted"
  | "sensitive_payload_blocked";

export type UserJourneyObjectType =
  | BehavioralEventEntityType
  | "auth"
  | "session"
  | "payment"
  | "fan_pass"
  | "unknown";

export type UserJourneyConversionTag =
  | "landing_viewed"
  | "signup_completed"
  | "first_unwrap"
  | "checkout_started"
  | "payment_completed"
  | "drop_watch_completed"
  | "fan_pass_started"
  | "chat_message_sent"
  | "daily_task_rewarded"
  | "notification_enabled";

export type UserJourneyFailureTag =
  | "auth_failed"
  | "payment_failed"
  | "drop_unwrap_failed"
  | "fan_pass_failed"
  | "chat_message_failed"
  | "chat_message_blocked"
  | "daily_task_failed"
  | "daily_task_abandoned"
  | "notification_denied"
  | "unknown_failed";

export interface UserJourneyEvent {
  journeyEventId: string;
  eventId: string;
  sessionId: string;
  linkedPersonId: string;
  actorKind: ActorKind;
  identityState: IdentityState | string;
  identityConfidence: IdentityConfidence;
  timestamp: string;
  route: string;
  surface: string;
  featureId: string;
  action: BehavioralNormalizedAction | string;
  objectType: UserJourneyObjectType;
  objectId: string;
  durationMs: number;
  activeMs: number;
  sourceEventName: string;
  previousJourneyEventId: string | null;
  nextExpectedActions: string[];
  conversionTag: UserJourneyConversionTag | null;
  failureTag: UserJourneyFailureTag | null;
  confidence: number;
  privacyClass: UserJourneyPrivacyClass;
}

export interface UserJourneyStepClassification {
  action: string;
  objectType: UserJourneyObjectType;
  funnelIds: UserJourneyCoreFunnel[];
  nextExpectedActions: string[];
  conversionTag: UserJourneyConversionTag | null;
  failureTag: UserJourneyFailureTag | null;
  importance: "high" | "normal" | "low";
}

export interface UserJourneySessionSummary {
  sessionId: string;
  linkedPersonId: string;
  startedAt: string | null;
  endedAt: string | null;
  totalJourneyEvents: number;
  totalDurationMs: number;
  totalActiveMs: number;
  surfaces: string[];
  featureIds: string[];
  conversions: UserJourneyConversionTag[];
  failures: UserJourneyFailureTag[];
  confidence: IdentityConfidence;
  privacyClass: UserJourneyPrivacyClass;
}

export interface UserJourneyPersonSummary {
  linkedPersonId: string;
  sessionCount: number;
  totalJourneyEvents: number;
  totalActiveMs: number;
  topFunnels: UserJourneyCoreFunnel[];
  conversionTags: UserJourneyConversionTag[];
  failureTags: UserJourneyFailureTag[];
  identityConfidence: IdentityConfidence;
  privacyClass: UserJourneyPrivacyClass;
}

export interface UserJourneyBreakResult {
  status: "connected" | "missing_next_action" | "identity_confidence_gap" | "session_gap" | "duration_gap";
  reason: string;
  nextAction: string;
}

export interface BehavioralIntelligenceJourneyInput {
  storageMode: "compact_summary";
  rawFirehoseStored: false;
  costGuard: typeof USER_JOURNEY_COST_GUARD;
  journeyEvents: UserJourneyEvent[];
  sessionSummaries: UserJourneySessionSummary[];
  personSummaries: UserJourneyPersonSummary[];
  droppedLowImportanceCount: number;
  containsRawSensitivePayload: false;
}

export interface UserJourneyDebugLane {
  label: "User journey";
  journeyBuilderConnected: boolean;
  brokenJourneySegments: number;
  missingNextActions: number;
  topFunnelsSourceReady: number;
  costGuardStatus: typeof USER_JOURNEY_COST_GUARD | "missing";
  rawDetailsDefaultOpen: false;
  sourceOfTruth: "src/lib/behavioral/user-journey-builder.ts";
}

export function buildUserJourneyDebugLane(input: Partial<Omit<UserJourneyDebugLane, "label" | "rawDetailsDefaultOpen" | "sourceOfTruth">> = {}): UserJourneyDebugLane {
  return {
    label: "User journey",
    journeyBuilderConnected: input.journeyBuilderConnected ?? true,
    brokenJourneySegments: Math.max(0, Math.trunc(Number(input.brokenJourneySegments ?? 0))),
    missingNextActions: Math.max(0, Math.trunc(Number(input.missingNextActions ?? 0))),
    topFunnelsSourceReady: Math.max(0, Math.trunc(Number(input.topFunnelsSourceReady ?? USER_JOURNEY_CORE_FUNNELS.length))),
    costGuardStatus: input.costGuardStatus ?? USER_JOURNEY_COST_GUARD,
    rawDetailsDefaultOpen: false,
    sourceOfTruth: "src/lib/behavioral/user-journey-builder.ts",
  };
}
