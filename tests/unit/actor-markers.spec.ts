import { describe, expect, it } from "vitest";

import {
  UnknownActorMarkerError,
  actorMarkerToTelemetryPayload,
  assertKnownActor,
  buildActorMarker,
  buildAdminOnBehalfMarker,
  classifyActorFromUser,
  explainActorMarker,
} from "@/lib/identity/actor-markers";

describe("creator actor identity markers", () => {
  it("classifies user, creator, admin, owner_admin, system, guest, and unknown actors", () => {
    expect(classifyActorFromUser({ uid: "user_1", role: "user" }).actorType).toBe("user");
    expect(classifyActorFromUser({ uid: "creator_1", role: "creator" }).actorType).toBe("creator");
    expect(classifyActorFromUser({ uid: "admin_1", role: "admin" }).actorType).toBe("admin");
    expect(classifyActorFromUser({ uid: "owner_1", role: "owner_admin", isOwner: true }).actorType).toBe("owner_admin");
    expect(classifyActorFromUser({ uid: "system", role: "system", system: true }).actorType).toBe("system");
    expect(classifyActorFromUser({ role: "guest" }).actorType).toBe("guest");
    expect(classifyActorFromUser(null).actorType).toBe("unknown");
  });

  it("builds admin-on-behalf markers with target user identity", () => {
    const marker = buildAdminOnBehalfMarker(
      { uid: "admin_1", email: "admin@example.com", role: "admin" },
      "creator_1",
      {
        surface: "admin_roster",
        route: "/api/admin/roster",
        actionKey: "creator_id_requested",
        source: "unit_test",
      },
    );

    expect(marker.actorType).toBe("admin");
    expect(marker.targetUserId).toBe("creator_1");
    expect(marker.performedAs).toBe("admin_on_behalf");
    expect(actorMarkerToTelemetryPayload(marker)).toMatchObject({
      actorType: "admin",
      targetUserId: "creator_1",
      performedAs: "admin_on_behalf",
      surface: "admin_roster",
      actionKey: "creator_id_requested",
    });
  });

  it("marks creator signup as a user acting on their own creator intake", () => {
    const marker = assertKnownActor(buildActorMarker({
      actor: { uid: "creator_signup_1", email: "creator@example.com", role: "user" },
      targetUserId: "creator_signup_1",
      targetCreatorId: "creator_signup_1",
      performedAs: "own_account",
      surface: "creator_intake",
      route: "/api/user/register",
      actionKey: "creator_signup_submit",
      occurredAt: "2026-05-02T12:00:00.000Z",
      source: "unit_test",
    }));

    expect(marker.actorType).toBe("user");
    expect(marker.targetUserId).toBe(marker.actorUid);
    expect(marker.performedAs).toBe("own_account");
    expect(explainActorMarker(marker)).toContain("creator_signup_submit");
  });

  it("marks owner override actions with owner_admin and owner_override", () => {
    const marker = buildAdminOnBehalfMarker(
      { uid: "owner_1", email: "owner@example.com", role: "owner_admin", isOwner: true },
      "creator_1",
      {
        surface: "creator_account_admin",
        route: "/api/admin/users",
        actionKey: "owner_override_creator_onboarding_update",
        performedAs: "owner_override",
        source: "unit_test",
      },
    );

    expect(marker.actorType).toBe("owner_admin");
    expect(marker.performedAs).toBe("owner_override");
    expect(marker.targetUserId).toBe("creator_1");
  });

  it("blocks unknown actors instead of promoting them to user", () => {
    const marker = buildActorMarker({
      actor: null,
      performedAs: "own_account",
      surface: "creator_intake",
      route: "/api/user/register",
      actionKey: "creator_signup_submit",
      source: "unit_test",
    });

    expect(marker.actorType).toBe("unknown");
    expect(marker.unknownActorBlocked).toBe(true);
    expect(() => assertKnownActor(marker)).toThrow(UnknownActorMarkerError);
  });
});
