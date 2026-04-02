import { afterEach, describe, expect, it } from "vitest";
import {
  getConfiguredRollouts,
  resolveRolloutAssignments,
} from "@/lib/rollouts";

const ORIGINAL_ROLLOUT_OVERRIDES = process.env.NEXT_PUBLIC_ROLLOUT_OVERRIDES_JSON;

function setRolloutOverrides(overrides: unknown) {
  process.env.NEXT_PUBLIC_ROLLOUT_OVERRIDES_JSON = JSON.stringify(overrides);
}

function clearRolloutOverrides() {
  if (typeof ORIGINAL_ROLLOUT_OVERRIDES === "string") {
    process.env.NEXT_PUBLIC_ROLLOUT_OVERRIDES_JSON = ORIGINAL_ROLLOUT_OVERRIDES;
    return;
  }

  delete process.env.NEXT_PUBLIC_ROLLOUT_OVERRIDES_JSON;
}

describe("rollout assignment logic", () => {
  afterEach(() => {
    clearRolloutOverrides();
  });

  it("applies env overrides when configured rollouts are resolved", () => {
    setRolloutOverrides({
      dashboard_greeting_experiment: {
        rolloutPercent: 135,
        defaultVariant: "shop",
        variants: [
          { key: "shop", weight: 100, label: "Shop" },
          { key: "taste", weight: -5, label: "Taste" },
        ],
      },
    });

    const rollout = getConfiguredRollouts().find((definition) => definition.id === "dashboard_greeting_experiment");

    expect(rollout).toMatchObject({
      id: "dashboard_greeting_experiment",
      rolloutPercent: 100,
      defaultVariant: "shop",
      variants: [
        { key: "shop", weight: 100, label: "Shop" },
        { key: "taste", weight: -5, label: "Taste" },
      ],
    });
  });

  it("marks signed-out users as ineligible for signed-in rollouts", () => {
    const assignment = resolveRolloutAssignments({
      role: null,
      sessionId: "guest-session",
      subjectId: "guest-subject",
      path: "/",
    }).find((entry) => entry.id === "dashboard_greeting_experiment");

    expect(assignment).toMatchObject({
      id: "dashboard_greeting_experiment",
      active: false,
      eligible: false,
      reason: "ineligible",
      variant: "taste",
      bucketId: "subject:guest-subject",
    });
    expect(assignment?.segments).toContain("guest");
    expect(assignment?.segments).toContain("surface_public");
  });

  it("returns holdout for eligible identities when rolloutPercent is forced to zero", () => {
    setRolloutOverrides({
      dashboard_greeting_experiment: {
        rolloutPercent: 0,
      },
    });

    const assignment = resolveRolloutAssignments({
      uid: "member-user",
      role: "user",
      sessionId: "member-session",
      subjectId: "member-subject",
      path: "/dashboard",
    }).find((entry) => entry.id === "dashboard_greeting_experiment");

    expect(assignment).toMatchObject({
      id: "dashboard_greeting_experiment",
      active: false,
      eligible: true,
      reason: "holdout",
      variant: "taste",
      bucketId: "uid:member-user",
    });
    expect(assignment?.segments).toEqual(
      expect.arrayContaining(["authenticated", "member", "surface_dashboard"]),
    );
  });

  it("assigns an eligible user into the forced rollout variant deterministically", () => {
    setRolloutOverrides({
      dashboard_greeting_experiment: {
        rolloutPercent: 100,
        defaultVariant: "taste",
        variants: [
          { key: "shop", weight: 100, label: "Shop" },
          { key: "taste", weight: 0, label: "Taste" },
        ],
      },
    });

    const identity = {
      uid: "member-user",
      role: "user" as const,
      sessionId: "member-session",
      subjectId: "member-subject",
      path: "/dashboard/profile",
    };

    const firstAssignment = resolveRolloutAssignments(identity).find(
      (entry) => entry.id === "dashboard_greeting_experiment",
    );
    const secondAssignment = resolveRolloutAssignments(identity).find(
      (entry) => entry.id === "dashboard_greeting_experiment",
    );

    expect(firstAssignment).toMatchObject({
      id: "dashboard_greeting_experiment",
      active: true,
      eligible: true,
      reason: "assigned",
      variant: "shop",
      bucketId: "uid:member-user",
    });
    expect(firstAssignment?.segments).toEqual(
      expect.arrayContaining(["authenticated", "member", "surface_dashboard", "surface_profile"]),
    );
    expect(secondAssignment).toEqual(firstAssignment);
  });

  it("gates admin-only rollouts by both audience and admin surface segments", () => {
    const adminAssignment = resolveRolloutAssignments({
      uid: "admin-user",
      role: "admin",
      sessionId: "admin-session",
      subjectId: "admin-subject",
      path: "/admin/debug",
    }).find((entry) => entry.id === "admin_debug_mobile_density");

    const publicAssignment = resolveRolloutAssignments({
      uid: "admin-user",
      role: "admin",
      sessionId: "admin-session",
      subjectId: "admin-subject",
      path: "/dashboard",
    }).find((entry) => entry.id === "admin_debug_mobile_density");

    expect(adminAssignment).toMatchObject({
      id: "admin_debug_mobile_density",
      active: true,
      eligible: true,
      reason: "assigned",
      variant: "enabled",
    });
    expect(adminAssignment?.segments).toEqual(
      expect.arrayContaining(["authenticated", "admin", "surface_admin"]),
    );

    expect(publicAssignment).toMatchObject({
      id: "admin_debug_mobile_density",
      active: false,
      eligible: false,
      reason: "ineligible",
      variant: "control",
    });
    expect(publicAssignment?.segments).toEqual(
      expect.arrayContaining(["authenticated", "admin", "surface_dashboard"]),
    );
  });
});
