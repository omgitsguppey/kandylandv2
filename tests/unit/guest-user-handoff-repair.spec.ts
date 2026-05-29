import { describe, expect, it } from "vitest";

import {
  linkGuestToUser,
  preserveJourneyContinuity,
  suppressDuplicateHandoffAction,
} from "@/lib/identity-truth/guest-user-handoff-repair";

describe("guest user handoff repair", () => {
  it("preserves same-session guest journey without promoting weak links to exact", () => {
    const linked = linkGuestToUser({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      authTransitionAtMs: 1_000,
      guestLastEventAtMs: 500,
      linkId: "link_1",
      consentMode: "minimal_analytics",
    });
    const weak = linkGuestToUser({
      guestId: "guest_2",
      userId: "user_2",
      sessionId: "sess_2",
      authTransitionAtMs: 1_000,
      guestLastEventAtMs: 500,
      consentMode: "minimal_analytics",
    });

    expect(linked.preserveGuestHistory).toBe(true);
    expect(linked.identityConfidence).toBe("linked");
    expect(linked.telemetryEvents).toEqual(expect.arrayContaining(["identity_handoff_attempted", "identity_handoff_completed"]));
    expect(weak.identityConfidence).toBe("inferred");
    expect(weak.canPromoteToExact).toBe(false);
    expect(weak.preserveGuestHistory).toBe(true);
  });

  it("suppresses duplicate same-action handoff events in the auth window", () => {
    expect(preserveJourneyContinuity({
      guestEventAtMs: 1_000,
      authTransitionAtMs: 60_000,
      sameSession: true,
    }).continuous).toBe(true);
    expect(suppressDuplicateHandoffAction({
      guestEvent: { action: "drop_preview_opened", objectId: "drop_1", occurredAtMs: 1_000 },
      signedInEvent: { action: "drop_preview_opened", objectId: "drop_1", occurredAtMs: 2_000 },
    })).toMatchObject({
      suppress: true,
      reason: "same_action_after_auth",
    });
  });
});
