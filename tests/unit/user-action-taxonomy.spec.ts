import { describe, expect, it } from "vitest";

import {
  dedupeNormalizedUserActions,
  describeUserActionName,
  normalizeUserAction,
  USER_ACTION_NAMES,
} from "@/lib/analytics-action-taxonomy";

describe("analytics action taxonomy", () => {
  it("contains the canonical user action names", () => {
    expect(USER_ACTION_NAMES).toEqual([
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

  it("normalizes raw event names into user-facing actions with required context", () => {
    expect(normalizeUserAction({
      eventId: "evt_123",
      eventName: "unlock_drop_success",
      params: {
        source_component: "DropPreviewPage",
        page_path: "/drops/drop-1/preview",
        drop_id: "drop-1",
        session_id: "session-1",
      },
      timestamp: 1000,
      userId: "user-1",
    })).toMatchObject({
      actionName: "drop_unwrapped",
      actionId: "drop_unwrapped:evt_123",
      userId: "user-1",
      sessionId: "session-1",
      sourceComponent: "DropPreviewPage",
      route: "/drops/drop-1/preview",
      entityId: "drop-1",
      entityType: "drop",
      rawEventName: "unlock_drop_success",
    });
  });

  it("dedupes retries by explicit event id", () => {
    const first = normalizeUserAction({
      eventId: "evt_retry",
      eventName: "gumdrops_purchase_completed",
      params: { source_component: "PurchaseModal", order_id: "order-1" },
      timestamp: 1000,
      userId: "user-1",
      sessionId: "session-1",
    });
    const retry = normalizeUserAction({
      eventId: "evt_retry",
      eventName: "gumdrops_purchase_completed",
      params: { source_component: "PurchaseModal", order_id: "order-1" },
      timestamp: 1200,
      userId: "user-1",
      sessionId: "session-1",
    });

    expect(dedupeNormalizedUserActions([first, retry])).toHaveLength(1);
    expect(dedupeNormalizedUserActions([first, retry])[0]?.timestamp).toBe(1200);
  });

  it("uses clean labels instead of raw event names", () => {
    expect(describeUserActionName("watch_session_completed")).toBe("Watch session completed");
  });
});
