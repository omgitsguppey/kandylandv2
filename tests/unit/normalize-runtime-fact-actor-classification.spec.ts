import { describe, expect, it } from "vitest";

import { normalizeIdentifiedRuntimeFact } from "@/lib/runtime-facts/normalize-runtime-fact";

function identifiedFact(params: Record<string, unknown>) {
  const result = normalizeIdentifiedRuntimeFact({
    eventId: String(params.eventId ?? "evt_actor"),
    rawEventName: String(params.eventName ?? "creator_followed"),
    params,
    timestampMs: 1767225600000,
    callerUid: String(params.callerUid ?? "caller_user_1"),
  });

  expect(result.diagnostic).toBeNull();
  expect(result.fact).not.toBeNull();
  return result.fact!;
}

describe("runtime fact actor classification", () => {
  it("preserves guest actors from the identity envelope", () => {
    const fact = identifiedFact({
      eventId: "evt_guest",
      eventName: "creator_followed",
      actor_kind: "guest",
      session_id: "session_guest",
      anonymous_visitor_id: "guest_1",
      creator_id: "creator_target_guest",
    });

    expect(fact.actor.actorType).toBe("guest");
    expect(fact.actorLane).toBe("guest");
    expect(fact.actor.actorUserId).toBe("");
    expect(fact.actor.anonymousVisitorId).toBe("guest_1");
  });

  it("keeps linked signed-in users in the signed_in_user lane without losing guest lineage", () => {
    const fact = identifiedFact({
      eventId: "evt_linked_user",
      eventName: "creator_followed",
      session_id: "session_1",
      anonymous_visitor_id: "guest_1",
      identity_link_id: "identity_link_1",
      consent_mode: "full_behavioral",
      creator_id: "creator_target_1",
    });

    expect(fact.actor.actorType).toBe("user");
    expect(fact.actorLane).toBe("signed_in_user");
    expect(fact.actor.actorUserId).toBe("caller_user_1");
    expect(fact.actor.anonymousVisitorId).toBe("guest_1");
    expect(fact.target.targetCreatorId).toBe("creator_target_1");
  });

  it("classifies creator callers from role evidence instead of flattening them to user", () => {
    const fact = identifiedFact({
      eventId: "evt_creator_actor",
      eventName: "creator_followed",
      session_id: "session_creator",
      roles: ["creator"],
      actor_creator_id: "creator_actor_1",
      creator_id: "creator_target_2",
    });

    expect(fact.actor.actorType).toBe("creator");
    expect(fact.actorLane).toBe("creator_user");
    expect(fact.actor.actorUserId).toBe("caller_user_1");
    expect(fact.actor.actorCreatorId).toBe("creator_actor_1");
    expect(fact.target.targetCreatorId).toBe("creator_target_2");
    expect(fact.includeInUserBehavior).toBe(true);
    expect(fact.includeInGlobalEvents).toBe(true);
    expect(fact.metricEligible).toBe(true);
  });

  it("keeps creator public profile actions as normal signed-in user actions with creator as target", () => {
    const fact = identifiedFact({
      eventId: "evt_creator_profile_fan",
      eventName: "creator_followed",
      session_id: "session_fan",
      creator_id: "creator_public_target",
    });

    expect(fact.actor.actorType).toBe("user");
    expect(fact.actorLane).toBe("signed_in_user");
    expect(fact.actor.actorUserId).toBe("caller_user_1");
    expect(fact.actor.actorCreatorId).toBe("");
    expect(fact.target.targetCreatorId).toBe("creator_public_target");
    expect(fact.includeInUserBehavior).toBe(true);
  });

  it("keeps admin and owner admin callers out of user behavior", () => {
    const adminFact = identifiedFact({
      eventId: "evt_admin_actor",
      eventName: "admin_analytics_viewed",
      session_id: "session_admin",
      roles: ["admin"],
      actor_admin_id: "admin_1",
      page_path: "/admin/users",
    });
    const ownerFact = identifiedFact({
      eventId: "evt_owner_actor",
      eventName: "admin_analytics_viewed",
      session_id: "session_owner",
      roles: ["owner_admin"],
      actor_admin_id: "owner_1",
      page_path: "/admin/users",
    });

    expect(adminFact.actor.actorType).toBe("admin");
    expect(adminFact.actorLane).toBe("admin");
    expect(adminFact.actor.actorUserId).toBe("");
    expect(adminFact.actor.actorAdminId).toBe("admin_1");
    expect(adminFact.includeInUserBehavior).toBe(false);

    expect(ownerFact.actor.actorType).toBe("owner_admin");
    expect(ownerFact.actorLane).toBe("owner_admin");
    expect(ownerFact.actor.actorUserId).toBe("");
    expect(ownerFact.actor.actorAdminId).toBe("owner_1");
    expect(ownerFact.includeInUserBehavior).toBe(false);
  });

  it("keeps normal user actions in only the signed-in user lane", () => {
    const fact = identifiedFact({
      eventId: "evt_normal_user",
      eventName: "wallet_opened",
      session_id: "session_user",
    });

    expect(fact.actor.actorType).toBe("user");
    expect(fact.actorLane).toBe("signed_in_user");
    expect(fact.actor.actorUserId).toBe("caller_user_1");
    expect(fact.actor.actorCreatorId).toBe("");
    expect(fact.actor.actorAdminId).toBe("");
    expect(fact.includeInUserBehavior).toBe(true);
  });

  it("preserves admin view-as creator as admin_projection with creator only as the target", () => {
    const fact = identifiedFact({
      eventId: "evt_admin_projection",
      eventName: "admin_view_as_creator_started",
      session_id: "session_projection",
      actor_admin_id: "admin_1",
      target_creator_id: "creator_target_3",
      performed_as: "admin_view_as_creator",
      projection_mode: "read_only_creator_projection",
      source_truth: "local_projection",
    });

    expect(fact.actor.actorType).toBe("admin");
    expect(fact.actorLane).toBe("admin_projection");
    expect(fact.actor.actorUserId).toBe("");
    expect(fact.actor.actorAdminId).toBe("admin_1");
    expect(fact.target.targetCreatorId).toBe("creator_target_3");
    expect(fact.metricEligible).toBe(false);
    expect(fact.metricExclusionReason).toBe("admin_projection");
  });

  it("keeps system and legacy unknown events out of the signed-in user lane", () => {
    const systemFact = identifiedFact({
      eventId: "evt_system_actor",
      eventName: "system_job_ran",
      session_id: "session_system",
      actor_kind: "system",
      system_generated: true,
    });
    const legacyFact = identifiedFact({
      eventId: "evt_legacy_actor",
      eventName: "creator_followed",
      session_id: "session_legacy",
      actor_kind: "legacy_unknown",
      legacy_unknown: true,
    });

    expect(systemFact.actor.actorType).toBe("system");
    expect(systemFact.actorLane).toBe("system");
    expect(systemFact.actor.actorUserId).toBe("");
    expect(systemFact.includeInUserBehavior).toBe(false);

    expect(legacyFact.actor.actorType).toBe("unknown");
    expect(legacyFact.actorLane).toBe("legacy_unknown");
    expect(legacyFact.actor.actorUserId).toBe("");
    expect(legacyFact.includeInUserBehavior).toBe(false);
  });
});
