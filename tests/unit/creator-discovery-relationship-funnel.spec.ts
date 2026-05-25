import { describe, expect, it } from "vitest";

import {
  CREATOR_RELATIONSHIP_EVENTS,
  CREATOR_RELATIONSHIP_STATES,
  buildCreatorRelationshipDebugLane,
  buildCreatorRelationshipTelemetryPayload,
  classifyCreatorRelationshipState,
  validateCreatorRelationshipFunnelReport,
} from "@/lib/discovery/creator-relationship-contract";
import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

describe("creator discovery relationship funnel", () => {
  it("defines the canonical relationship funnel events and states", () => {
    expect(CREATOR_RELATIONSHIP_EVENTS).toEqual([
      "creator_discovery_surface_viewed",
      "creator_card_viewed",
      "creator_card_clicked",
      "creator_profile_opened",
      "creator_follow_attempted",
      "creator_follow_succeeded",
      "creator_follow_failed",
      "creator_unfollow_attempted",
      "creator_unfollow_succeeded",
      "creator_recommendation_viewed",
      "creator_recommendation_clicked",
      "creator_relationship_list_loaded",
      "creator_relationship_list_failed",
    ]);

    expect(CREATOR_RELATIONSHIP_STATES).toEqual([
      "not_following",
      "following",
      "blocked",
      "unavailable",
      "self",
      "creator_hidden",
      "unknown",
    ]);
  });

  it("classifies relationship states without ambiguous fallbacks", () => {
    expect(classifyCreatorRelationshipState({ viewerUserId: "fan_1", creatorId: "fan_1" })).toBe("self");
    expect(classifyCreatorRelationshipState({ following: true })).toBe("following");
    expect(classifyCreatorRelationshipState({ blocked: true })).toBe("blocked");
    expect(classifyCreatorRelationshipState({ creatorHidden: true })).toBe("creator_hidden");
    expect(classifyCreatorRelationshipState({ available: false })).toBe("unavailable");
    expect(classifyCreatorRelationshipState({ following: false })).toBe("not_following");
    expect(classifyCreatorRelationshipState({})).toBe("unknown");
  });

  it("builds redacted identity-aware telemetry payloads", () => {
    const payload = buildCreatorRelationshipTelemetryPayload({
      eventName: "creator_follow_failed",
      viewerUserId: "fan_1",
      creatorId: "creator_1",
      surface: "creator_profile",
      sourceComponent: "creator_profile_page",
      relationshipState: "not_following",
      recommendationSource: "relationship_route",
      failureReason: "creator_hidden",
    });

    expect(payload).toMatchObject({
      event_name: "creator_follow_failed",
      user_id: "fan_1",
      actor_user_id: "fan_1",
      creator_id: "creator_1",
      target_creator_id: "creator_1",
      surface: "creator_profile",
      source_component: "creator_profile_page",
      relationship_state: "not_following",
      recommendation_source: "relationship_route",
      failure_reason: "creator_hidden",
      debug_lane: "Creator discovery/relationships",
    });
    expect(JSON.stringify(payload)).not.toContain("displayName");
  });

  it("registers funnel events in telemetry and person metrics", () => {
    const catalogEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
    const personMetricEvents = new Set(PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames));

    for (const eventName of CREATOR_RELATIONSHIP_EVENTS) {
      expect(catalogEvents.has(eventName), `${eventName} missing from telemetry catalog`).toBe(true);
      expect(personMetricEvents.has(eventName), `${eventName} missing from person metrics`).toBe(true);
    }
  });

  it("builds debug evidence for broken relationship and recommendation lanes", () => {
    const lane = buildCreatorRelationshipDebugLane([
      { eventName: "creator_follow_failed", state: "blocked", failureReason: "moderation_blocked" },
      { eventName: "creator_relationship_list_failed", state: "unknown", failureReason: "route_failed" },
      { eventName: "creator_recommendation_viewed", state: "not_following", recommendationSource: "empty" },
      { eventName: "creator_profile_opened", state: "creator_hidden", failureReason: "profile_route_missing" },
    ]);

    expect(lane.label).toBe("Creator discovery/relationships");
    expect(lane.followFailures).toBe(1);
    expect(lane.relationshipListFailures).toBe(1);
    expect(lane.emptyRecommendationState).toBe(1);
    expect(lane.profileRouteMissing).toBe(1);
    expect(lane.recommendationSourceHealth).toBe("review");

    expect(validateCreatorRelationshipFunnelReport({
      events: CREATOR_RELATIONSHIP_EVENTS,
      states: CREATOR_RELATIONSHIP_STATES,
      debugLane: lane,
      scoreDimensions: {
        before: { sourceHealth: 84, evidenceCompleteness: 84, regressionRisk: 84 },
        after: { sourceHealth: 87, evidenceCompleteness: 88, regressionRisk: 87 },
      },
    })).toEqual([]);
  });
});
