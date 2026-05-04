import { describe, expect, it } from "vitest";

import {
  BEHAVIORAL_EVENT_DEDUPE_WINDOWS_MS,
  BEHAVIORAL_NORMALIZED_ACTIONS,
} from "@/lib/behavioral/event-fact-contract";
import {
  dedupeBehavioralEventFacts,
  normalizeBehavioralEventFactWithDiagnostics,
} from "@/lib/behavioral/normalize-event-fact";

describe("behavioral event facts", () => {
  it("exposes the canonical normalized actions", () => {
    expect(BEHAVIORAL_NORMALIZED_ACTIONS).toEqual([
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
    ]);
  });

  it("normalizes a purchase event into a canonical event fact", () => {
    const result = normalizeBehavioralEventFactWithDiagnostics({
      eventId: "txn-1",
      eventName: "gumdrops_purchase_completed",
      params: {
        source_component: "PurchaseModal",
        route: "/wallet",
        order_id: "order-1",
        delivered_gumdrops: 1500,
        gross_revenue_usd: 9.99,
      },
      timestamp: 1000,
      userId: "user-1",
      sessionId: "session-1",
      source: "server",
    });

    expect(result.diagnostic).toBeNull();
    expect(result.fact).toMatchObject({
      normalizedAction: "gumdrops_purchased",
      entityType: "wallet",
      entityId: "order-1",
      route: "/wallet",
      sourceComponent: "PurchaseModal",
      gumDropsAmount: 1500,
      valueUsd: 9.99,
      source: "server",
    });
  });

  it("dedupes repeat file views inside the configured window", () => {
    const first = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "viewer_asset_started",
      params: {
        source_component: "MediaViewer",
        route: "/dashboard/viewer",
        file_id: "file-1",
      },
      timestamp: 1000,
      userId: "user-1",
      sessionId: "session-1",
      source: "server",
    }).fact;
    const retryWithinWindow = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "viewer_asset_started",
      params: {
        source_component: "MediaViewer",
        route: "/dashboard/viewer",
        file_id: "file-1",
      },
      timestamp: 20_000,
      userId: "user-1",
      sessionId: "session-1",
      source: "server",
    }).fact;

    expect(BEHAVIORAL_EVENT_DEDUPE_WINDOWS_MS.file_viewed).toBe(30_000);
    expect(dedupeBehavioralEventFacts([first, retryWithinWindow])).toHaveLength(1);
  });

  it("routes unknown events to diagnostics instead of production facts", () => {
    const result = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "mystery_event_name",
      params: {
        source_component: "TestSurface",
        route: "/admin",
      },
      timestamp: 1000,
      sessionId: "session-1",
      source: "legacy",
    });

    expect(result.fact).toBeNull();
    expect(result.diagnostic).toMatchObject({
      eventName: "mystery_event_name",
      reason: "unknown_event_name",
      sourceComponent: "TestSurface",
    });
  });
});
