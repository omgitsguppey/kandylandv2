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
    expect(BEHAVIORAL_NORMALIZED_ACTIONS).toEqual(
      expect.arrayContaining([
        "home_viewed",
        "hero_cta_clicked",
        "onboarding_completed",
        "daily_checkin_claimed",
        "creator_spotlight_viewed",
        "drop_card_viewed",
        "drop_preview_opened",
        "drop_unlocked",
        "file_viewed",
        "watch_session_started",
        "watch_session_completed",
        "wallet_opened",
        "gumdrops_purchased",
        "notification_read",
        "notification_action_clicked",
        "support_ticket_created",
        "support_reply_viewed",
        "support_reply_sent",
        "admin_user_opened",
      ]),
    );
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

  it("normalizes canonical and legacy server purchase aliases into gumdrops_purchased", () => {
    for (const eventName of ["server_purchase_verified", "purchase_verified", "paypal_capture_completed", "purchase_completed"]) {
      const result = normalizeBehavioralEventFactWithDiagnostics({
        eventId: `${eventName}-1`,
        eventName,
        params: {
          source_component: "paypal_capture_route",
          route: "/api/paypal/capture",
          transaction_id: "txn-1",
          paid_gumdrops: 500,
          bonus_gumdrops: 50,
          value_usd: 4.99,
        },
        timestamp: 1000,
        userId: "user-1",
        sessionId: "session-1",
        source: "server",
      });

      expect(result.diagnostic).toBeNull();
      expect(result.fact?.normalizedAction).toBe("gumdrops_purchased");
      expect(result.fact?.entityId).toBe("txn-1");
    }
  });

  it("normalizes entitlement aliases without treating payload reveal as unlock", () => {
    for (const eventName of ["unlock_drop_success", "drop_unlocked", "entitlement_granted"]) {
      const result = normalizeBehavioralEventFactWithDiagnostics({
        eventId: `${eventName}-1`,
        eventName,
        params: {
          source_component: "drops_unlock_route",
          route: "/api/drops/unlock",
          drop_id: "drop-1",
          transaction_id: "unlock-txn-1",
          entitlement_id: "drop-entitlement:user-1:drop-1",
        },
        timestamp: 1000,
        userId: "user-1",
        sessionId: "session-1",
        source: "server",
      });

      expect(result.diagnostic).toBeNull();
      expect(result.fact?.normalizedAction).toBe("drop_unlocked");
      expect(result.fact?.entityId).toBe("drop-1");
    }

    const unwrapped = normalizeBehavioralEventFactWithDiagnostics({
      eventId: "drop_unwrapped-1",
      eventName: "drop_unwrapped",
      params: {
        source_component: "media_viewer",
        route: "/dashboard/viewer",
        drop_id: "drop-1",
        entitlement_id: "drop-entitlement:user-1:drop-1",
      },
      timestamp: 1000,
      userId: "user-1",
      sessionId: "session-1",
      source: "server",
    });

    expect(unwrapped.diagnostic).toBeNull();
    expect(unwrapped.fact?.normalizedAction).toBe("drop_unwrapped");
    expect(unwrapped.fact?.entityId).toBe("drop-1");
  });

  it("dedupes repeat file views inside the configured window", () => {
    const first = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "file_viewed",
      params: {
        source_component: "MediaViewer",
        route: "/dashboard/viewer",
        file_id: "file-1",
        asset_key: "drop-1:0",
        media_index: 1,
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
        asset_key: "drop-1:0",
        media_index: 1,
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

  it("normalizes notification reads to the canonical scoring action", () => {
    const result = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "notification_read",
      params: {
        source_component: "notification_bell",
        route: "/dashboard",
        notification_id: "note-1",
      },
      timestamp: 1000,
      userId: "user-1",
      sessionId: "session-1",
      source: "client",
    });

    expect(result.fact).toMatchObject({
      normalizedAction: "notification_read",
      entityType: "notification",
      entityId: "note-1",
    });
  });

  it("dedupes task completion facts by user, task, and CST day key", () => {
    const first = normalizeBehavioralEventFactWithDiagnostics({
      eventId: "task-complete-1",
      eventName: "task_completed",
      params: {
        source_component: "daily_tasks_module",
        route: "/dashboard",
        task_id: "feedback_task",
        reward_gd: 100,
        day_key: "2026-05-04",
      },
      timestamp: 1000,
      userId: "user-1",
      sessionId: "session-1",
      source: "server",
    }).fact;
    const duplicateSameDay = normalizeBehavioralEventFactWithDiagnostics({
      eventId: "task-complete-2",
      eventName: "daily_task_completed",
      params: {
        source_component: "daily_tasks_module",
        route: "/dashboard",
        task_id: "feedback_task",
        reward_gd: 100,
        day_key: "2026-05-04",
      },
      timestamp: 2000,
      userId: "user-1",
      sessionId: "session-1",
      source: "server",
    }).fact;

    expect(dedupeBehavioralEventFacts([first, duplicateSameDay])).toHaveLength(1);
  });

  it("normalizes support reply events into dedicated support behavioral facts", () => {
    const viewed = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "support_reply_viewed",
      params: {
        source_component: "support_inbox",
        route: "/dashboard/support",
        thread_id: "thread-1",
        ticket_id: "thread-1",
      },
      timestamp: 1000,
      userId: "user-1",
      sessionId: "session-1",
      source: "client",
    }).fact;
    const sent = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "support_reply_sent",
      params: {
        source_component: "support_thread_route",
        route: "/dashboard/support",
        thread_id: "thread-1",
        ticket_id: "thread-1",
      },
      timestamp: 2000,
      userId: "user-1",
      sessionId: "session-1",
      source: "server",
    }).fact;

    expect(viewed).toMatchObject({
      normalizedAction: "support_reply_viewed",
      entityType: "support",
      entityId: "thread-1",
    });
    expect(sent).toMatchObject({
      normalizedAction: "support_reply_sent",
      entityType: "support",
      entityId: "thread-1",
    });
  });

  it("normalizes discovery impressions and featured slide aliases without render-only names", () => {
    const creatorImpression = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "creator_rail_impression",
      params: {
        source_component: "creator_discovery_rail",
        route: "/drops",
        creator_id: "creator-1",
        position: 2,
      },
      timestamp: 1000,
      sessionId: "session-1",
      source: "client",
    }).fact;
    const featuredClick = normalizeBehavioralEventFactWithDiagnostics({
      eventName: "featured_drop_clicked",
      params: {
        source_component: "compact_featured_carousel",
        route: "/drops",
        drop_id: "drop-1",
        position: 1,
      },
      timestamp: 2000,
      sessionId: "session-1",
      source: "client",
    }).fact;

    expect(creatorImpression).toMatchObject({
      eventName: "creator_rail_impression",
      normalizedAction: "creator_spotlight_viewed",
      entityType: "creator",
      entityId: "creator-1",
    });
    expect(featuredClick).toMatchObject({
      eventName: "featured_slide_clicked",
      normalizedAction: "drop_card_viewed",
      entityType: "drop",
      entityId: "drop-1",
    });
  });
});
