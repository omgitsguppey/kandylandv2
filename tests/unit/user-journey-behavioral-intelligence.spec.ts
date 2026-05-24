import { describe, expect, it } from "vitest";

import { getPersonMetricDefinition } from "@/lib/analytics/person-metrics-contract";
import {
  buildUserJourneyDebugLane,
  USER_JOURNEY_CORE_FUNNELS,
  USER_JOURNEY_COST_GUARD,
} from "@/lib/behavioral/user-journey-contract";
import {
  appendJourneyEvent,
  buildBehavioralIntelligenceInput,
  buildJourneyEvent,
  classifyJourneyStep,
  detectJourneyBreak,
  summarizePersonJourney,
  summarizeSessionJourney,
} from "@/lib/behavioral/user-journey-builder";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";

describe("user journey behavioral intelligence", () => {
  it("builds a normalized journey event with who, what, when, where, how, and how-long fields", () => {
    const fact = normalizeBehavioralEventFact({
      eventId: "drop_watch_completed:journey",
      eventName: "drop_watch_completed",
      timestamp: 1_000,
      userId: "user-1",
      sessionId: "session-1",
      anonymousVisitorId: "guest-1",
      params: {
        source_component: "viewer",
        route: "/dashboard/viewer",
        drop_id: "drop-1",
        media_id: "media-1",
        watch_session_id: "watch-1",
        linked_person_id: "person-1",
        identity_state: "logged_in_linked_guest",
        identity_confidence: "linked",
        active_ms: 12_000,
        duration_ms: 15_000,
      },
      source: "client",
    });

    const journey = buildJourneyEvent({
      fact: fact!,
      previousJourneyEventId: "journey:previous",
    });

    expect(journey).toMatchObject({
      journeyEventId: expect.any(String),
      eventId: "drop_watch_completed:journey",
      sessionId: "session-1",
      linkedPersonId: "person-1",
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      timestamp: "1970-01-01T00:00:01.000Z",
      route: "/dashboard/viewer",
      surface: "viewer",
      featureId: "viewer",
      action: "watch_session_completed",
      objectType: "drop",
      objectId: "drop-1",
      durationMs: 15_000,
      activeMs: 12_000,
      sourceEventName: "drop_watch_completed",
      previousJourneyEventId: "journey:previous",
      confidence: expect.any(Number),
      privacyClass: "safe_summary",
    });
    expect(journey.nextExpectedActions).toEqual(expect.arrayContaining(["drop_unlocked", "wallet_opened"]));
    expect(journey.conversionTag).toBe("drop_watch_completed");
    expect(journey.failureTag).toBeNull();
  });

  it("blocks raw sensitive payment, provider, chat, and private content payloads from journey storage", () => {
    const journey = buildJourneyEvent({
      event: {
        eventId: "chat_message_sent:private",
        eventName: "chat_message_sent",
        sessionId: "session-2",
        linkedPersonId: "person-2",
        actorKind: "signed_in_user",
        identityState: "logged_in_unlinked",
        identityConfidence: "exact",
        timestamp: "2026-05-24T12:00:00.000Z",
        route: "/chat",
        surface: "chat",
        featureId: "chat",
        action: "chat_message_sent",
        objectType: "chat",
        objectId: "thread-1",
        durationMs: 1_000,
        activeMs: 1_000,
        sourceEventName: "chat_message_sent",
        rawPayload: {
          chatMessage: "private message body",
          providerToken: "provider-secret",
          paymentProviderResponse: { captureId: "capture-secret" },
          privateContent: "locked content body",
        },
      },
    });

    expect(JSON.stringify(journey)).not.toContain("private message body");
    expect(JSON.stringify(journey)).not.toContain("provider-secret");
    expect(JSON.stringify(journey)).not.toContain("capture-secret");
    expect(JSON.stringify(journey)).not.toContain("locked content body");
    expect(journey.privacyClass).toBe("private_content_redacted");
  });

  it("links journey events, summarizes sessions and people, and detects broken journey segments", () => {
    const first = buildJourneyEvent({
      event: {
        eventId: "home:1",
        eventName: "home_page_viewed",
        sessionId: "session-3",
        linkedPersonId: "person-3",
        actorKind: "guest",
        identityState: "guest_minimal_analytics",
        identityConfidence: "weak",
        timestamp: "2026-05-24T12:00:00.000Z",
        route: "/",
        surface: "home",
        featureId: "general_engagement",
        action: "home_viewed",
        objectType: "page",
        objectId: "/",
        durationMs: 0,
        activeMs: 0,
        sourceEventName: "home_page_viewed",
      },
    });
    const second = appendJourneyEvent([first], buildJourneyEvent({
      event: {
        ...first,
        eventId: "signup:1",
        eventName: "auth_email_signup_completed",
        action: "signup_completed",
        objectType: "auth",
        objectId: "signup",
        durationMs: 8_000,
        activeMs: 8_000,
        sourceEventName: "auth_email_signup_completed",
        timestamp: "2026-05-24T12:00:08.000Z",
      },
    }))[1];
    const sessionSummary = summarizeSessionJourney([first, second]);
    const personSummary = summarizePersonJourney([first, second]);
    const breakResult = detectJourneyBreak({
      previous: first,
      next: second,
    });

    expect(second.previousJourneyEventId).toBe(first.journeyEventId);
    expect(sessionSummary.sessionId).toBe("session-3");
    expect(sessionSummary.totalJourneyEvents).toBe(2);
    expect(sessionSummary.totalActiveMs).toBe(8_000);
    expect(personSummary.linkedPersonId).toBe("person-3");
    expect(personSummary.topFunnels).toEqual(expect.arrayContaining(["landing_to_signup"]));
    expect(breakResult.status).toBe("connected");
  });

  it("builds compact behavioral intelligence input instead of raw firehose storage", () => {
    const events = Array.from({ length: 8 }, (_, index) => buildJourneyEvent({
      event: {
        eventId: `hover:${index}`,
        eventName: "hover_event",
        sessionId: "session-4",
        linkedPersonId: "person-4",
        actorKind: "guest",
        identityState: "guest_minimal_analytics",
        identityConfidence: "weak",
        timestamp: new Date(1_000 + index).toISOString(),
        route: "/drops",
        surface: "drops",
        featureId: "drops",
        action: index === 0 ? "drop_preview_opened" : "hover",
        objectType: "drop",
        objectId: "drop-4",
        durationMs: 0,
        activeMs: 0,
        sourceEventName: index === 0 ? "drop_preview_opened" : "hover_event",
      },
    }));

    const input = buildBehavioralIntelligenceInput({
      journeyEvents: events,
      maxJourneyEvents: 3,
    });

    expect(input.storageMode).toBe("compact_summary");
    expect(input.rawFirehoseStored).toBe(false);
    expect(input.costGuard).toBe(USER_JOURNEY_COST_GUARD);
    expect(input.journeyEvents.length).toBeLessThanOrEqual(3);
    expect(input.droppedLowImportanceCount).toBeGreaterThan(0);
  });

  it("maps core funnels to metrics and exposes the user journey debug lane", () => {
    expect(USER_JOURNEY_CORE_FUNNELS).toEqual(expect.arrayContaining([
      "landing_to_signup",
      "signup_to_first_unwrap",
      "wallet_to_checkout_to_payment",
      "drop_view_to_unlock_to_watch",
      "creator_profile_to_fan_pass_chat_follow",
      "notification_prompt_to_permission",
      "daily_task_to_reward",
      "chat_open_to_message_outcome",
    ]));
    expect(classifyJourneyStep("wallet_opened").funnelIds).toContain("wallet_to_checkout_to_payment");
    expect(getPersonMetricDefinition("sessions")).toBeTruthy();
    expect(getPersonMetricDefinition("unwraps")).toBeTruthy();
    expect(getPersonMetricDefinition("chat_actions")).toBeTruthy();

    const debugLane = buildUserJourneyDebugLane({
      journeyBuilderConnected: true,
      brokenJourneySegments: 0,
      missingNextActions: 0,
      topFunnelsSourceReady: USER_JOURNEY_CORE_FUNNELS.length,
      costGuardStatus: "batched_rollup",
    });
    const debugSummary = buildDebugPanelTrackingSummary({
      userJourneyBehavioralIntelligence: { debugLane },
    });

    expect(debugLane.label).toBe("User journey");
    expect(debugLane.rawDetailsDefaultOpen).toBe(false);
    expect(debugSummary.lanes.some((lane) => lane.id === "user_journey")).toBe(true);
  });
});
