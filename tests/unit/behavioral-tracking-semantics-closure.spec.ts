import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ANALYTICS_INGEST_EVENT_TYPES,
} from "@/lib/analytics/ingest-contract";
import {
  buildClientTrackingDecision,
  classifyClientTrackingEvent,
  resolveClientTrackingState,
} from "@/lib/analytics/client-tracking-policy";
import {
  TRACKING_SURFACE_MAP,
  validateBehavioralTrackingSurfaceMap,
} from "@/lib/behavioral/tracking-surface-map";

describe("behavioral tracking semantics closure", () => {
  it("suppresses behavior events when tracking is disabled", () => {
    const decision = buildClientTrackingDecision({
      eventName: "semantic_target_clicked",
      eventType: "click",
      privacySettings: {
        anonymousAnalyticsEnabled: false,
        identifiedAnalyticsEnabled: false,
        allowRecommendations: false,
        showInAnonymousStats: false,
        honorGlobalPrivacyControl: true,
        consentUpdatedAt: 0,
      },
    });

    expect(resolveClientTrackingState(decision.privacySettings)).toBe("disabled");
    expect(classifyClientTrackingEvent({ eventName: "semantic_target_clicked", eventType: "click" })).toBe("behavior_signal");
    expect(decision.mayQueue).toBe(false);
    expect(decision.mayPersist).toBe(false);
    expect(decision.maySendExternal).toBe(false);
  });

  it("allows bounded behavior events when tracking is enabled", () => {
    const decision = buildClientTrackingDecision({
      eventName: "semantic_page_viewed",
      eventType: "page_view",
      privacySettings: {
        anonymousAnalyticsEnabled: true,
        identifiedAnalyticsEnabled: true,
        allowRecommendations: true,
        showInAnonymousStats: true,
        honorGlobalPrivacyControl: false,
        consentUpdatedAt: 1,
      },
    });

    expect(decision.trackingState).toBe("enabled");
    expect(decision.mayQueue).toBe(true);
    expect(decision.mayPersist).toBe(true);
    expect(decision.diagnosticsCanBeSampled).toBe(true);
  });

  it("keeps required account and security telemetry separate from behavior analytics", () => {
    expect(buildClientTrackingDecision({
      eventName: "auth_sign_in_success",
      privacySettings: {
        anonymousAnalyticsEnabled: false,
        identifiedAnalyticsEnabled: false,
        allowRecommendations: false,
        showInAnonymousStats: false,
        honorGlobalPrivacyControl: true,
        consentUpdatedAt: 0,
      },
    })).toMatchObject({
      eventKind: "required_account",
      mayQueue: true,
      mayPersist: true,
      maySendExternal: false,
    });

    expect(buildClientTrackingDecision({
      eventName: "security_rule_denied",
      privacySettings: {
        anonymousAnalyticsEnabled: false,
        identifiedAnalyticsEnabled: false,
        allowRecommendations: false,
        showInAnonymousStats: false,
        honorGlobalPrivacyControl: true,
        consentUpdatedAt: 0,
      },
    })).toMatchObject({
      eventKind: "required_security",
      mayPersist: true,
    });
  });

  it("maps required behavioral surfaces to persistence and consumers", () => {
    const requiredSurfaceIds = [
      "page_behavior",
      "drop_behavior",
      "creator_interactions",
      "creator_monetization",
      "creator_requests_bookings",
      "chat_behavior",
      "runtime_watch_time",
    ];

    expect(requiredSurfaceIds.every((id) => TRACKING_SURFACE_MAP.some((surface) => surface.id === id))).toBe(true);

    for (const surface of TRACKING_SURFACE_MAP) {
      expect(surface.priority).toMatch(/^(critical|high|standard|low)$/u);
      expect(surface.requiredIdentityFields.length).toBeGreaterThan(0);
      expect(surface.persistenceLane).not.toBe("");
      expect(surface.aggregationLane).not.toBe("");
      expect(surface.adminConsumer).not.toBe("");
      expect(surface.uiConsumer).not.toBe("");
      expect(typeof surface.allowedWhenTrackingDisabled).toBe("boolean");
    }
  });

  it("keeps DeepTracker anonymous event types aligned with the ingest contract", () => {
    const deepTracker = readFileSync("src/components/Analytics/DeepTracker.tsx", "utf8");

    for (const eventType of ANALYTICS_INGEST_EVENT_TYPES) {
      expect(deepTracker).toContain(`"${eventType}"`);
    }
  });

  it("keeps watch time as runtime media proof, not passive page activity", () => {
    const watchSurface = TRACKING_SURFACE_MAP.find((surface) => surface.id === "runtime_watch_time");

    expect(watchSurface?.events).toEqual(expect.arrayContaining([
      "watch_start",
      "watch_heartbeat",
      "watch_pause",
      "watch_resume",
      "watch_complete",
      "watch_abandon",
    ]));
    expect(watchSurface?.events).not.toContain("page_view");
    expect(watchSurface?.events).not.toContain("visibility");
    expect(watchSurface?.disabledBehavior).toContain("not page time");
  });

  it("validates no client/ingest or hardcoded behavior gaps remain", () => {
    const result = validateBehavioralTrackingSurfaceMap({
      acceptedAnonymousEventTypes: [...ANALYTICS_INGEST_EVENT_TYPES],
    });

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });
});
