import { describe, expect, it } from "vitest";

import {
  getCreatorDashboardDropCountScope,
  isDropOwnedOrAssignedToCreator,
  shouldCountDropForCreatorDashboard,
  shouldShowDropInPublicDiscovery,
} from "@/lib/server/creator-drop-scope";

describe("creator drop scope", () => {
  it("counts creator-owned expired drops for the creator dashboard", () => {
    const drop = {
      id: "drop_1",
      creatorId: "creator_1",
      status: "expired",
      approvalStatus: "approved",
    };

    expect(isDropOwnedOrAssignedToCreator(drop, "creator_1")).toBe(true);
    expect(shouldCountDropForCreatorDashboard(drop, "creator_1")).toBe(true);
  });

  it("does not count another creator's drop", () => {
    const drop = {
      id: "drop_2",
      creatorId: "creator_2",
      submittedByCreatorId: "creator_2",
      status: "active",
      approvalStatus: "approved",
    };

    expect(shouldCountDropForCreatorDashboard(drop, "creator_1")).toBe(false);
  });

  it("does not blindly count all-creator drops without explicit assignment", () => {
    const globalDrop = {
      id: "drop_global",
      allCreators: true,
      status: "active",
      approvalStatus: "approved",
    };
    const assignedDrop = {
      ...globalDrop,
      id: "drop_assigned",
      assignedCreatorIds: ["creator_1"],
    };

    expect(shouldCountDropForCreatorDashboard(globalDrop, "creator_1")).toBe(false);
    expect(shouldCountDropForCreatorDashboard(assignedDrop, "creator_1")).toBe(true);
  });

  it("keeps public discovery visibility stricter than creator dashboard counting", () => {
    const expiredOwnedDrop = {
      id: "drop_3",
      creatorId: "creator_1",
      status: "expired",
      approvalStatus: "approved",
    };

    expect(shouldCountDropForCreatorDashboard(expiredOwnedDrop, "creator_1")).toBe(true);
    expect(shouldShowDropInPublicDiscovery(expiredOwnedDrop, { now: Date.now() })).toBe(false);
  });

  it("exposes the dashboard content-count scope", () => {
    expect(getCreatorDashboardDropCountScope()).toBe("creator_owned_or_assigned");
  });
});
