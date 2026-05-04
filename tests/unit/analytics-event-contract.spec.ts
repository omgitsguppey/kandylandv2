import { describe, expect, it } from "vitest";

import {
  ANALYTICS_ACTOR_TYPES,
  buildAnalyticsDedupeKey,
  buildAnalyticsEventDebugMetadata,
  classifyAnalyticsActor,
  createCanonicalAnalyticsEvent,
  createIdentityLinkedEvent,
  explainEventInclusion,
  shouldExcludeFromUserAnalytics,
  shouldIncludeInGlobalEvents,
} from "@/lib/analytics/analytics-event-contract";

describe("analytics event contract", () => {
  it("defines the required actor lanes without promoting unknown actors", () => {
    expect(ANALYTICS_ACTOR_TYPES).toEqual(["guest", "user", "creator", "admin", "owner_admin", "system", "unknown"]);

    const unknown = classifyAnalyticsActor({ eventName: "drop_clicked" });

    expect(unknown.actorType).toBe("unknown");
    expect(unknown.isAuthenticatedUser).toBe(false);
    expect(unknown.reasons.join(" ")).toContain("No trusted actor");
  });

  it("keeps owner admin events in the admin lane", () => {
    const explanation = explainEventInclusion({
      eventName: "owner_override_applied",
      actorType: "owner_admin",
      userId: "target_creator_1",
      adminId: "owner_admin_1",
      roles: ["owner_admin"],
      route: "/admin/user/target_creator_1",
      source: "server",
    });

    expect(explanation.actorClassification.actorType).toBe("owner_admin");
    expect(explanation.actorClassification.actorLane).toBe("owner_admin");
    expect(explanation.actorClassification.isAdmin).toBe(true);
    expect(explanation.includeInUserBehavior).toBe(false);
  });

  it("keeps admin events out of the user behavior lane even when a user id is present", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "evt_admin",
      eventName: "admin_analytics_viewed",
      actorType: "user",
      userId: "user_123",
      adminId: "admin_123",
      route: "/admin/analytics",
      source: "client",
    });

    const explanation = explainEventInclusion(event);

    expect(event.actorType).toBe("admin");
    expect(shouldExcludeFromUserAnalytics(event)).toBe(true);
    expect(explanation.includeInUserBehavior).toBe(false);
    expect(explanation.exclusionReason).toContain("Admin events are excluded");
  });

  it("classifies admin routes as admin lane even when the event name is generic", () => {
    const explanation = explainEventInclusion({
      eventName: "navigation_click",
      userId: "admin_user_1",
      route: "/admin/debug",
      source: "identified_ingest",
    });

    expect(explanation.actorClassification.actorType).toBe("admin");
    expect(explanation.includeInUserBehavior).toBe(false);
    expect(explanation.includeInAdminAnalytics).toBe(true);
  });

  it("keeps creator targets in target fields without promoting fan actions into creator behavior", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "evt_follow_target",
      eventName: "creator_followed",
      actorType: "user",
      userId: "fan_123",
      targetCreatorId: "creator_456",
      creatorId: "creator_456",
      source: "client",
      route: "/creators/kandy",
    });

    const explanation = explainEventInclusion(event);

    expect(event.actorType).toBe("user");
    expect(event.actorUserId).toBe("fan_123");
    expect(event.actorCreatorId).toBeNull();
    expect(event.targetCreatorId).toBe("creator_456");
    expect(explanation.includeInUserBehavior).toBe(true);
    expect(explanation.actorClassification.isCreator).toBe(false);
  });

  it("preserves global events for every classified actor while retaining classification", () => {
    const systemEvent = createCanonicalAnalyticsEvent({
      eventId: "evt_system",
      eventName: "system_job_ran",
      actorType: "system",
      source: "system_job",
      objectType: "system",
      objectId: "analytics-refresh",
    });

    const metadata = buildAnalyticsEventDebugMetadata(systemEvent);

    expect(shouldIncludeInGlobalEvents(systemEvent)).toBe(true);
    expect(shouldExcludeFromUserAnalytics(systemEvent)).toBe(true);
    expect(metadata.guestUserAdminSeparation.system).toBe(true);
    expect(metadata.exclusionReason).toContain("System events are excluded");
  });

  it("creates a canonical identity_linked event without erasing guest lineage", () => {
    const event = createIdentityLinkedEvent({
      eventId: "evt_link",
      anonymousVisitorId: "subject_abc",
      sessionId: "sess_abc",
      userId: "user_abc",
      linkedAt: "2026-04-30T12:00:00.000Z",
      method: "signup",
      source: "client",
    });

    expect(event.eventName).toBe("identity_linked");
    expect(event.actorType).toBe("user");
    expect(event.anonymousVisitorId).toBe("subject_abc");
    expect(event.sessionId).toBe("sess_abc");
    expect(event.userId).toBe("user_abc");
    expect(event.payload.eligiblePastSessionIds).toEqual(["sess_abc"]);
    expect(buildAnalyticsEventDebugMetadata(event).identityLinkageState).toBe("identity_link_event");
  });

  it("generates deterministic dedupe keys from actor, object, source, and time bucket", () => {
    const key = buildAnalyticsDedupeKey({
      eventName: "unlock_drop_success",
      actorType: "user",
      userId: "user_1",
      objectType: "drop",
      objectId: "drop_1",
      source: "client",
      occurredAt: "2026-04-30T12:34:56.000Z",
    });

    expect(key).toBe(
      buildAnalyticsDedupeKey({
        eventName: "unlock_drop_success",
        actorType: "user",
        userId: "user_1",
        objectType: "drop",
        objectId: "drop_1",
        source: "client",
        occurredAt: "2026-04-30T12:34:01.000Z",
      }),
    );
    expect(key).toContain("unlock_drop_success:user:user_1:drop:drop_1:client:2026-04-30t12:34");
  });
});
