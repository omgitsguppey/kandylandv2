import type { ActorKind, IdentityConfidence } from "@/lib/analytics/identity-handoff-contract";
import type { BehavioralEventFact } from "@/lib/behavioral/event-fact-contract";
import {
  USER_JOURNEY_CORE_FUNNELS,
  USER_JOURNEY_COST_GUARD,
  type BehavioralIntelligenceJourneyInput,
  type UserJourneyBreakResult,
  type UserJourneyConversionTag,
  type UserJourneyCoreFunnel,
  type UserJourneyEvent,
  type UserJourneyFailureTag,
  type UserJourneyObjectType,
  type UserJourneyPersonSummary,
  type UserJourneyPrivacyClass,
  type UserJourneySessionSummary,
  type UserJourneyStepClassification,
} from "@/lib/behavioral/user-journey-contract";
import { calculateJourneyStepDuration } from "@/lib/math/session-journey-math";

type RawJourneyEventInput = Omit<UserJourneyEvent, "journeyEventId" | "previousJourneyEventId" | "nextExpectedActions" | "conversionTag" | "failureTag" | "confidence" | "privacyClass"> & {
  journeyEventId?: string;
  previousJourneyEventId?: string | null;
  nextExpectedActions?: string[];
  conversionTag?: UserJourneyConversionTag | null;
  failureTag?: UserJourneyFailureTag | null;
  confidence?: number;
  privacyClass?: UserJourneyPrivacyClass;
  rawPayload?: unknown;
  eventName?: string;
};

export interface BuildJourneyEventInput {
  fact?: BehavioralEventFact;
  event?: RawJourneyEventInput;
  previousJourneyEventId?: string | null;
}

const LOW_IMPORTANCE_ACTIONS = new Set(["hover", "scroll", "mousemove", "pointer_move", "visibility_ping"]);

const ACTION_STEP_OVERRIDES: Record<string, Partial<UserJourneyStepClassification>> = {
  home_viewed: {
    objectType: "page",
    funnelIds: ["landing_to_signup"],
    nextExpectedActions: ["signup_started", "drop_preview_opened", "wallet_opened"],
    conversionTag: "landing_viewed",
  },
  signup_started: {
    objectType: "auth",
    funnelIds: ["landing_to_signup"],
    nextExpectedActions: ["signup_completed", "auth_failed"],
  },
  signup_completed: {
    objectType: "auth",
    funnelIds: ["landing_to_signup", "signup_to_first_unwrap"],
    nextExpectedActions: ["drop_preview_opened", "drop_unwrap_attempted"],
    conversionTag: "signup_completed",
  },
  drop_preview_opened: {
    objectType: "drop",
    funnelIds: ["drop_view_to_unlock_to_watch"],
    nextExpectedActions: ["drop_unwrap_attempted", "wallet_opened"],
  },
  drop_unwrap_attempted: {
    objectType: "drop",
    funnelIds: ["drop_view_to_unlock_to_watch"],
    nextExpectedActions: ["drop_unlocked", "drop_unwrap_failed", "wallet_opened"],
  },
  drop_unlocked: {
    objectType: "drop",
    funnelIds: ["signup_to_first_unwrap", "drop_view_to_unlock_to_watch"],
    nextExpectedActions: ["watch_session_started", "file_viewed"],
    conversionTag: "first_unwrap",
  },
  drop_unwrap_failed: {
    objectType: "drop",
    funnelIds: ["drop_view_to_unlock_to_watch"],
    nextExpectedActions: ["wallet_opened", "support_ticket_created"],
    failureTag: "drop_unwrap_failed",
  },
  watch_session_completed: {
    objectType: "drop",
    funnelIds: ["drop_view_to_unlock_to_watch"],
    nextExpectedActions: ["drop_unlocked", "wallet_opened"],
    conversionTag: "drop_watch_completed",
  },
  wallet_opened: {
    objectType: "wallet",
    funnelIds: ["wallet_to_checkout_to_payment"],
    nextExpectedActions: ["wallet_package_selected", "checkout_started"],
  },
  checkout_started: {
    objectType: "wallet",
    funnelIds: ["wallet_to_checkout_to_payment"],
    nextExpectedActions: ["gumdrops_purchased", "purchase_failed"],
    conversionTag: "checkout_started",
  },
  gumdrops_purchased: {
    objectType: "wallet",
    funnelIds: ["wallet_to_checkout_to_payment"],
    nextExpectedActions: ["drop_unwrap_attempted", "drop_unlocked"],
    conversionTag: "payment_completed",
  },
  purchase_failed: {
    objectType: "wallet",
    funnelIds: ["wallet_to_checkout_to_payment"],
    nextExpectedActions: ["checkout_started", "support_ticket_created"],
    failureTag: "payment_failed",
  },
  creator_spotlight_viewed: {
    objectType: "creator",
    funnelIds: ["creator_profile_to_fan_pass_chat_follow"],
    nextExpectedActions: ["creator_followed", "fan_pass_started", "chat_thread_opened"],
  },
  creator_followed: {
    objectType: "creator",
    funnelIds: ["creator_profile_to_fan_pass_chat_follow"],
    nextExpectedActions: ["fan_pass_started", "chat_thread_opened"],
  },
  fan_pass_started: {
    objectType: "fan_pass",
    funnelIds: ["creator_profile_to_fan_pass_chat_follow"],
    nextExpectedActions: ["chat_thread_opened", "drop_preview_opened"],
    conversionTag: "fan_pass_started",
  },
  fan_pass_failed: {
    objectType: "fan_pass",
    funnelIds: ["creator_profile_to_fan_pass_chat_follow"],
    nextExpectedActions: ["wallet_opened", "support_ticket_created"],
    failureTag: "fan_pass_failed",
  },
  chat_thread_opened: {
    objectType: "chat",
    funnelIds: ["chat_open_to_message_outcome", "creator_profile_to_fan_pass_chat_follow"],
    nextExpectedActions: ["chat_message_sent", "chat_message_failed"],
  },
  chat_message_sent: {
    objectType: "chat",
    funnelIds: ["chat_open_to_message_outcome"],
    nextExpectedActions: ["chat_thread_opened"],
    conversionTag: "chat_message_sent",
  },
  chat_message_failed: {
    objectType: "chat",
    funnelIds: ["chat_open_to_message_outcome"],
    nextExpectedActions: ["wallet_opened", "support_ticket_created"],
    failureTag: "chat_message_failed",
  },
  task_ready: {
    objectType: "task",
    funnelIds: ["daily_task_to_reward"],
    nextExpectedActions: ["daily_task_started"],
  },
  daily_task_started: {
    objectType: "task",
    funnelIds: ["daily_task_to_reward"],
    nextExpectedActions: ["daily_task_action_attempted", "daily_task_abandoned"],
  },
  task_completed: {
    objectType: "task",
    funnelIds: ["daily_task_to_reward"],
    nextExpectedActions: ["daily_task_reward_granted"],
  },
  daily_task_reward_granted: {
    objectType: "task",
    funnelIds: ["daily_task_to_reward"],
    nextExpectedActions: ["daily_task_started", "drop_preview_opened"],
    conversionTag: "daily_task_rewarded",
  },
  daily_task_failed: {
    objectType: "task",
    funnelIds: ["daily_task_to_reward"],
    nextExpectedActions: ["daily_task_started"],
    failureTag: "daily_task_failed",
  },
  daily_task_abandoned: {
    objectType: "task",
    funnelIds: ["daily_task_to_reward"],
    nextExpectedActions: ["daily_task_started"],
    failureTag: "daily_task_abandoned",
  },
  notification_opened: {
    objectType: "notification",
    funnelIds: ["notification_prompt_to_permission"],
    nextExpectedActions: ["notification_action_clicked", "notification_read"],
  },
  notification_action_clicked: {
    objectType: "notification",
    funnelIds: ["notification_prompt_to_permission"],
    nextExpectedActions: ["drop_preview_opened", "daily_task_started"],
  },
  notification_permission_granted: {
    objectType: "notification",
    funnelIds: ["notification_prompt_to_permission"],
    nextExpectedActions: ["notification_opened"],
    conversionTag: "notification_enabled",
  },
  notification_permission_denied: {
    objectType: "notification",
    funnelIds: ["notification_prompt_to_permission"],
    nextExpectedActions: ["notification_prompt_snoozed"],
    failureTag: "notification_denied",
  },
};

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clampMs(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : 0;
}

function clampConfidence(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0.5;
}

function isoTimestamp(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  const numeric = clampMs(value);
  return new Date(numeric || Date.now()).toISOString();
}

function idPart(value: unknown) {
  return cleanString(value, "unknown").replace(/[^A-Za-z0-9:_-]+/gu, "_").slice(0, 80);
}

function objectIdForFact(fact: BehavioralEventFact) {
  return cleanString(
    fact.dropId
    ?? fact.entityId
    ?? fact.fileId
    ?? fact.creatorId
    ?? fact.threadId
    ?? fact.notificationId
    ?? fact.taskId
    ?? fact.transactionId
    ?? fact.route,
    "unknown",
  );
}

function actorKindForFact(fact: BehavioralEventFact): ActorKind {
  if (fact.actorAdminId) return "admin";
  if (fact.actorCreatorId) return "creator_user";
  if (fact.userId || fact.actorUserId) return "signed_in_user";
  if (fact.source === "legacy") return "legacy_unknown";
  return "guest";
}

function featureIdForFact(fact: BehavioralEventFact, step: UserJourneyStepClassification) {
  if (fact.normalizedAction.includes("watch")) return "viewer";
  if (step.objectType === "wallet" || step.objectType === "payment") return "wallet";
  if (step.objectType === "task") return "daily_checkin";
  if (step.objectType === "notification") return "notifications";
  if (step.objectType === "chat") return "chat";
  if (step.objectType === "creator" || step.objectType === "fan_pass") return "creator_profile";
  if (step.objectType === "drop" || step.objectType === "file") return "drops";
  if (fact.normalizedAction.includes("signup") || fact.eventName.includes("auth")) return "auth";
  return "general_engagement";
}

function privacyClassFor(input: { rawPayload?: unknown; sourceEventName: string; privacyClass?: UserJourneyPrivacyClass }) {
  const payloadText = JSON.stringify(input.rawPayload ?? {}).toLowerCase();
  if (/chatmessage|messagebody|privatecontent|lockedcontent|transcript/u.test(payloadText)) return "private_content_redacted";
  if (/providertoken|firebasetoken|paymentproviderresponse|paypal|capture|secret/u.test(payloadText)) return "payment_provider_redacted";
  if (/provider|payment|chat/u.test(input.sourceEventName) && payloadText && payloadText !== "{}") return "sensitive_payload_blocked";
  if (input.privacyClass) return input.privacyClass;
  return "safe_summary";
}

function combinePrivacy(events: readonly UserJourneyEvent[]): UserJourneyPrivacyClass {
  if (events.some((event) => event.privacyClass === "sensitive_payload_blocked")) return "sensitive_payload_blocked";
  if (events.some((event) => event.privacyClass === "payment_provider_redacted")) return "payment_provider_redacted";
  if (events.some((event) => event.privacyClass === "private_content_redacted")) return "private_content_redacted";
  return "safe_summary";
}

function weakestConfidence(events: readonly UserJourneyEvent[]): IdentityConfidence {
  const rank: Record<IdentityConfidence, number> = { unknown: 0, weak: 1, inferred: 2, linked: 3, exact: 4 };
  return events.reduce<IdentityConfidence>((lowest, event) =>
    rank[event.identityConfidence] < rank[lowest] ? event.identityConfidence : lowest, events[0]?.identityConfidence ?? "unknown");
}

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

export function classifyJourneyStep(input: string | Pick<UserJourneyEvent, "action" | "sourceEventName" | "objectType">): UserJourneyStepClassification {
  const action = typeof input === "string" ? input : input.action;
  const sourceEventName = typeof input === "string" ? input : input.sourceEventName;
  const override = ACTION_STEP_OVERRIDES[action] ?? ACTION_STEP_OVERRIDES[sourceEventName] ?? {};
  const failureTag = override.failureTag
    ?? (/failed|blocked/u.test(action) ? action.includes("chat") ? "chat_message_failed" : "unknown_failed" : null);
  const importance = LOW_IMPORTANCE_ACTIONS.has(action) || LOW_IMPORTANCE_ACTIONS.has(sourceEventName)
    ? "low"
    : override.conversionTag || failureTag
      ? "high"
      : "normal";

  return {
    action,
    objectType: override.objectType ?? (typeof input === "string" ? "unknown" : input.objectType),
    funnelIds: override.funnelIds ?? [],
    nextExpectedActions: override.nextExpectedActions ?? [],
    conversionTag: override.conversionTag ?? null,
    failureTag,
    importance,
  };
}

export function buildJourneyEvent(input: BuildJourneyEventInput): UserJourneyEvent {
  if (!input.fact && !input.event) {
    throw new Error("buildJourneyEvent requires fact or event input.");
  }
  if (input.fact) {
    const step = classifyJourneyStep({
      action: input.fact.normalizedAction,
      sourceEventName: input.fact.eventName,
      objectType: input.fact.entityType ?? "unknown",
    });
    const linkedPersonId = cleanString(
      input.fact.globalUserParity?.identityConfidence === "linked"
        ? input.fact.dedupeDecision?.input.linkedPersonId
        : input.fact.dedupeDecision?.input.linkedPersonId,
      cleanString(input.fact.userId ?? input.fact.anonymousVisitorId ?? input.fact.sessionId, "unknown"),
    );
    const journeyDuration = calculateJourneyStepDuration({
      startedAtMs: input.fact.timestampMs,
      endedAtMs: input.fact.durationMs ? input.fact.timestampMs + input.fact.durationMs : null,
      activeMs: input.fact.activeMs,
    });
    const event: UserJourneyEvent = {
      journeyEventId: `journey:${idPart(input.fact.sessionId)}:${idPart(input.fact.eventId)}`,
      eventId: input.fact.eventId,
      sessionId: cleanString(input.fact.sessionId, "unknown"),
      linkedPersonId,
      actorKind: actorKindForFact(input.fact),
      identityState: cleanString(input.fact.dedupeDecision?.input.identityState, input.fact.authState ?? "legacy_unknown"),
      identityConfidence: input.fact.identityConfidence,
      timestamp: isoTimestamp(input.fact.timestampMs),
      route: input.fact.route,
      surface: input.fact.normalizedAction.includes("watch") ? "viewer" : cleanString(input.fact.entityType, input.fact.route),
      featureId: featureIdForFact(input.fact, step),
      action: input.fact.normalizedAction,
      objectType: step.objectType,
      objectId: objectIdForFact(input.fact),
      durationMs: journeyDuration.durationMs ?? clampMs(input.fact.durationMs),
      activeMs: journeyDuration.activeMs ?? clampMs(input.fact.activeMs),
      sourceEventName: input.fact.eventName,
      previousJourneyEventId: input.previousJourneyEventId ?? null,
      nextExpectedActions: step.nextExpectedActions,
      conversionTag: step.conversionTag,
      failureTag: step.failureTag,
      confidence: clampConfidence(input.fact.confidence),
      privacyClass: "safe_summary",
    };
    return event;
  }

  const raw = input.event!;
  const step = classifyJourneyStep({
    action: raw.action,
    sourceEventName: raw.sourceEventName,
    objectType: raw.objectType,
  });
  const journeyDuration = calculateJourneyStepDuration({
    startedAtMs: Date.parse(raw.timestamp),
    endedAtMs: raw.durationMs ? Date.parse(raw.timestamp) + raw.durationMs : null,
    activeMs: raw.activeMs,
  });

  return {
    journeyEventId: raw.journeyEventId ?? `journey:${idPart(raw.sessionId)}:${idPart(raw.eventId)}`,
    eventId: raw.eventId,
    sessionId: raw.sessionId,
    linkedPersonId: raw.linkedPersonId,
    actorKind: raw.actorKind,
    identityState: raw.identityState,
    identityConfidence: raw.identityConfidence,
    timestamp: raw.timestamp,
    route: raw.route,
    surface: raw.surface,
    featureId: raw.featureId,
    action: raw.action,
    objectType: step.objectType ?? raw.objectType,
    objectId: raw.objectId,
    durationMs: journeyDuration.durationMs ?? clampMs(raw.durationMs),
    activeMs: journeyDuration.activeMs ?? clampMs(raw.activeMs),
    sourceEventName: raw.sourceEventName,
    previousJourneyEventId: input.previousJourneyEventId ?? raw.previousJourneyEventId ?? null,
    nextExpectedActions: raw.nextExpectedActions ?? step.nextExpectedActions,
    conversionTag: raw.conversionTag ?? step.conversionTag,
    failureTag: raw.failureTag ?? step.failureTag,
    confidence: clampConfidence(raw.confidence ?? 0.8),
    privacyClass: privacyClassFor({
      rawPayload: raw.rawPayload,
      sourceEventName: raw.sourceEventName,
      privacyClass: raw.privacyClass,
    }),
  };
}

export function appendJourneyEvent(events: readonly UserJourneyEvent[], event: UserJourneyEvent) {
  const previous = events.at(-1) ?? null;
  return [...events, {
    ...event,
    previousJourneyEventId: event.previousJourneyEventId ?? previous?.journeyEventId ?? null,
  }];
}

export function summarizeSessionJourney(events: readonly UserJourneyEvent[]): UserJourneySessionSummary {
  const sorted = [...events].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
  return {
    sessionId: sorted[0]?.sessionId ?? "unknown",
    linkedPersonId: sorted.find((event) => event.linkedPersonId !== "unknown")?.linkedPersonId ?? sorted[0]?.linkedPersonId ?? "unknown",
    startedAt: sorted[0]?.timestamp ?? null,
    endedAt: sorted.at(-1)?.timestamp ?? null,
    totalJourneyEvents: sorted.length,
    totalDurationMs: sorted.reduce((sum, event) => sum + event.durationMs, 0),
    totalActiveMs: sorted.reduce((sum, event) => sum + event.activeMs, 0),
    surfaces: unique(sorted.map((event) => event.surface).filter(Boolean)),
    featureIds: unique(sorted.map((event) => event.featureId).filter(Boolean)),
    conversions: unique(sorted.map((event) => event.conversionTag).filter((tag): tag is UserJourneyConversionTag => Boolean(tag))),
    failures: unique(sorted.map((event) => event.failureTag).filter((tag): tag is UserJourneyFailureTag => Boolean(tag))),
    confidence: weakestConfidence(sorted),
    privacyClass: combinePrivacy(sorted),
  };
}

export function summarizePersonJourney(events: readonly UserJourneyEvent[]): UserJourneyPersonSummary {
  const sessions = unique(events.map((event) => event.sessionId));
  const funnelIds = unique(events.flatMap((event) => classifyJourneyStep(event).funnelIds));
  const observedFunnelIds = USER_JOURNEY_CORE_FUNNELS.filter((funnel) => funnelIds.includes(funnel));
  return {
    linkedPersonId: events.find((event) => event.linkedPersonId !== "unknown")?.linkedPersonId ?? events[0]?.linkedPersonId ?? "unknown",
    sessionCount: sessions.length,
    totalJourneyEvents: events.length,
    totalActiveMs: events.reduce((sum, event) => sum + event.activeMs, 0),
    topFunnels: observedFunnelIds,
    conversionTags: unique(events.map((event) => event.conversionTag).filter((tag): tag is UserJourneyConversionTag => Boolean(tag))),
    failureTags: unique(events.map((event) => event.failureTag).filter((tag): tag is UserJourneyFailureTag => Boolean(tag))),
    identityConfidence: weakestConfidence(events),
    privacyClass: combinePrivacy(events),
  };
}

export function detectJourneyBreak(input: { previous?: UserJourneyEvent | null; next?: UserJourneyEvent | null }): UserJourneyBreakResult {
  if (!input.previous || !input.next) {
    return {
      status: "session_gap",
      reason: "Journey segment is missing a previous or next event.",
      nextAction: "Keep the segment explicit as missing instead of inventing a journey transition.",
    };
  }
  if (input.previous.sessionId !== input.next.sessionId) {
    return {
      status: "session_gap",
      reason: "Journey segment crosses sessions without a session summary link.",
      nextAction: "Summarize both sessions and use linkedPersonId for cross-session continuity.",
    };
  }
  if (!input.previous.nextExpectedActions.length) {
    return {
      status: "missing_next_action",
      reason: "Previous journey step lacks next expected actions.",
      nextAction: "Classify the source event in user-journey-builder before using it for behavioral intelligence.",
    };
  }
  if (input.previous.identityConfidence === "unknown" || input.next.identityConfidence === "unknown") {
    return {
      status: "identity_confidence_gap",
      reason: "Journey segment lacks usable identity confidence.",
      nextAction: "Keep the journey as weak evidence until identity handoff improves.",
    };
  }
  if (input.next.durationMs === 0 && input.next.activeMs === 0 && input.next.conversionTag === null && input.next.failureTag === null) {
    return {
      status: "duration_gap",
      reason: "Journey segment has no duration, active time, conversion, or failure context.",
      nextAction: "Attach session/watch/task duration evidence or keep the step as context only.",
    };
  }
  return {
    status: "connected",
    reason: "Journey segment keeps session, identity, and action continuity.",
    nextAction: "No action needed.",
  };
}

export function buildBehavioralIntelligenceInput(input: {
  journeyEvents: readonly UserJourneyEvent[];
  maxJourneyEvents?: number;
}): BehavioralIntelligenceJourneyInput {
  const maxJourneyEvents = Math.max(1, Math.trunc(input.maxJourneyEvents ?? 50));
  const important = input.journeyEvents.filter((event) => classifyJourneyStep(event).importance !== "low");
  const selected = important.slice(0, maxJourneyEvents);
  const bySession = new Map<string, UserJourneyEvent[]>();
  const byPerson = new Map<string, UserJourneyEvent[]>();
  for (const event of selected) {
    // Bolt Optimization: Amortized O(1) push instead of O(N^2) array spread
    const sessionGroup = bySession.get(event.sessionId);
    if (sessionGroup) {
      sessionGroup.push(event);
    } else {
      bySession.set(event.sessionId, [event]);
    }

    const personGroup = byPerson.get(event.linkedPersonId);
    if (personGroup) {
      personGroup.push(event);
    } else {
      byPerson.set(event.linkedPersonId, [event]);
    }
  }
  return {
    storageMode: "compact_summary",
    rawFirehoseStored: false,
    costGuard: USER_JOURNEY_COST_GUARD,
    journeyEvents: selected,
    sessionSummaries: [...bySession.values()].map(summarizeSessionJourney),
    personSummaries: [...byPerson.values()].map(summarizePersonJourney),
    droppedLowImportanceCount: input.journeyEvents.length - selected.length,
    containsRawSensitivePayload: false,
  };
}
