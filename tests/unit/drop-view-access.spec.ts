import { describe, expect, it } from "vitest";

import {
  isDropViewAccessLoading,
  resolveDropViewAccess,
  telemetryEventForDropViewAccess,
} from "@/lib/drop-view-access";
import type { Drop } from "@/types/db";

const drop = {
  id: "drop_1",
  creatorId: "creator_1",
  submittedByCreatorId: "creator_1",
  title: "Unlocked Drop",
  description: "A protected drop.",
  imageUrl: "https://cdn.kandydrops.com/drop.jpg",
  contentUrl: "",
  unlockCost: 10,
  validFrom: 1,
  status: "active",
  approvalStatus: "approved",
  totalUnlocks: 1,
} satisfies Drop;

describe("drop view access resolver", () => {
  it("allows unwrapped users from legacy unlockedContent evidence", () => {
    const state = resolveDropViewAccess({
      drop,
      requestedDropId: "drop_1",
      authLoading: false,
      userId: "fan_1",
      userProfile: {
        uid: "fan_1",
        role: "user",
        unlockedContent: ["drop_1"],
        unlockedContentTimestamps: {},
      },
    });

    expect(state.status).toBe("allowed_unwrapped");
    expect(state.allowed).toBe(true);
    expect(telemetryEventForDropViewAccess(state)).toBe("drop_view_access_allowed_unwrapped");
  });

  it("does not deny while entitlement profile is still loading", () => {
    const state = resolveDropViewAccess({
      drop,
      requestedDropId: "drop_1",
      authLoading: false,
      userId: "fan_1",
      userProfile: null,
    });

    expect(state.status).toBe("loading_entitlement");
    expect(state.allowed).toBe(false);
    expect(isDropViewAccessLoading(state)).toBe(true);
    expect(telemetryEventForDropViewAccess(state)).toBeNull();
  });

  it("denies not unwrapped only after auth, drop, and entitlement settle", () => {
    const state = resolveDropViewAccess({
      drop,
      requestedDropId: "drop_1",
      authLoading: false,
      userId: "fan_1",
      userProfile: {
        uid: "fan_1",
        role: "user",
        unlockedContent: [],
        unlockedContentTimestamps: {},
      },
    });

    expect(state.status).toBe("denied_not_unwrapped");
    expect(telemetryEventForDropViewAccess(state)).toBe("drop_view_access_denied_not_unwrapped");
  });

  it("keeps creator visibility loading from overriding unwrapped access", () => {
    const state = resolveDropViewAccess({
      drop: { ...drop, approvalStatus: "pending_review", reviewStatus: "pending_admin_approval" },
      requestedDropId: "drop_1",
      authLoading: false,
      userId: "fan_1",
      userProfile: {
        uid: "fan_1",
        role: "user",
        unlockedContent: [],
        unlockedContentTimestamps: { drop_1: 1_700_000_000_000 },
      },
      visibilityLoading: true,
    });

    expect(state.status).toBe("allowed_unwrapped");
    expect(state.allowed).toBe(true);
  });

  it("keeps pending creator submissions hidden from users without unwrap evidence", () => {
    const state = resolveDropViewAccess({
      drop: { ...drop, approvalStatus: "pending_review", reviewStatus: "pending_admin_approval" },
      requestedDropId: "drop_1",
      authLoading: false,
      userId: "fan_1",
      userProfile: {
        uid: "fan_1",
        role: "user",
        unlockedContent: [],
        unlockedContentTimestamps: {},
      },
    });

    expect(state.status).toBe("denied_drop_not_public");
  });

  it("handles route param mismatch as an access error", () => {
    const state = resolveDropViewAccess({
      drop,
      requestedDropId: "other_drop",
      authLoading: false,
      userId: "fan_1",
      userProfile: {
        uid: "fan_1",
        role: "user",
        unlockedContent: ["drop_1"],
        unlockedContentTimestamps: {},
      },
    });

    expect(state.status).toBe("error");
    expect(telemetryEventForDropViewAccess(state)).toBe("drop_view_access_error");
  });

  it("reports entitlement loading timeout separately from generic errors", () => {
    const state = resolveDropViewAccess({
      drop,
      requestedDropId: "drop_1",
      authLoading: false,
      userId: "fan_1",
      userProfile: null,
      entitlementTimedOut: true,
    });

    expect(state.status).toBe("error");
    expect(telemetryEventForDropViewAccess(state)).toBe("drop_view_access_loading_timeout");
  });
});
