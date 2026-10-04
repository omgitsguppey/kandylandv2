import { describe, expect, it } from "vitest";

import { normalizeAnonymousRuntimeFact, normalizeIdentifiedRuntimeFact } from "@/lib/runtime-facts/normalize-runtime-fact";
import { buildEventEnvelope, normalizeLegacyEventEnvelope, validateEventEnvelope } from "@/lib/analytics/event-envelope-builder";
import { mapRuntimeFactToBehavioralTimelineFact } from "@/lib/server/behavioral-timeline-mapper";
import { createRuntimeFactFirestoreDocument } from "@/lib/server/write-runtime-fact";
import * as runtimeFactContract from "@/lib/runtime-facts/runtime-fact-contract";

function identifiedFact(params: Record<string, unknown>, callerRole: "user" | "creator" | "admin" = "user") {
  const result = normalizeIdentifiedRuntimeFact({
    eventId: String(params.eventId ?? "evt_actor"),
    rawEventName: String(params.eventName ?? "creator_followed"),
    params: { consent_mode: "full_behavioral", ...params },
    timestampMs: 1767225600000,
    callerUid: String(params.callerUid ?? "caller_user_1"),
    callerRole,
  });

  expect(result.diagnostic).toBeNull();
  expect(result.fact).not.toBeNull();
  return result.fact!;
}

describe("guest runtime source provenance", () => {
  const input = { eventId: "batch_current-guest_123456:0", timestampMs: 1_791_000_000_000, sessionId: "sess_current-guest", anonymousVisitorId: "subject_current-guest", path: "/drops", type: "page_view" };

  it("preserves current accepted guest client provenance through the actual timeline mapper", () => {
    const envelope = buildEventEnvelope({ eventId: input.eventId, eventName: "semantic_page_viewed", timestamp: input.timestampMs, sessionId: input.sessionId, guestId: input.anonymousVisitorId, consentMode: "minimal_analytics", source: "guest_client" });
    expect(validateEventEnvelope(envelope)).toMatchObject({ ok: true });
    expect(envelope.pipelineStatus).toBe("normal");
    const result = normalizeAnonymousRuntimeFact({ ...input, eventId: envelope.eventId, sourceOrigin: "accepted_current_guest_ingest" });
    expect(result.fact).toMatchObject({ sourceTruth: "client", actorLane: "guest", confidence: 0.55, includeInUserBehavior: false, includeInGlobalEvents: true, includeInAdminAnalytics: true, metricEligible: true });
    const timeline = mapRuntimeFactToBehavioralTimelineFact({ runtimeFact: result.fact!, consentState: "granted" });
    expect(timeline).toMatchObject({ factId: envelope.eventId, sourceTruth: "client", actorType: "guest", includeInPersonMetrics: false, includeInGlobalEvents: true });
    expect(timeline?.sourceTruth).not.toBe("canonical");
  });

  it.each([undefined, "legacy_import" as const])("keeps old, imported and unspecified inputs legacy (%s)", (sourceOrigin) => {
    const result = normalizeAnonymousRuntimeFact({ ...input, timestampMs: 1_500_000_000_000, sourceOrigin });
    expect(result.fact).toMatchObject({ sourceTruth: "legacy", confidence: 0.55, includeInUserBehavior: false });
    const legacyEnvelope = normalizeLegacyEventEnvelope({ eventId: input.eventId, eventName: "semantic_page_viewed", timestamp: input.timestampMs, sessionId: input.sessionId, guestId: input.anonymousVisitorId, source: "legacy" });
    expect(legacyEnvelope).toMatchObject({ source: "legacy", pipelineStatus: "quarantined", identityConfidence: "unknown" });
  });

  it("does not promote unknown or diagnostic-only events into metric eligibility", () => {
    const unknown = normalizeAnonymousRuntimeFact({ ...input, type: "arbitrary_unknown_event", sourceOrigin: "accepted_current_guest_ingest" });
    expect(unknown.fact).toBeNull();
    const hover = normalizeAnonymousRuntimeFact({ ...input, type: "hover", sourceOrigin: "accepted_current_guest_ingest" });
    expect(hover.fact?.metricEligible ?? false).toBe(false);
  });

  it.each(["semantic_page_engaged", "semantic_page_passive", "semantic_page_bounced", "semantic_page_exited"])("retains the accepted closeout meaning without counting it as a page view (%s)", (acceptedEventName) => {
    const result = normalizeAnonymousRuntimeFact({ ...input, type: "page_leave", acceptedEventName, sourceOrigin: "accepted_current_guest_ingest", interactionState: "passive", exitIntent: "bounce" });
    expect(result.fact).toMatchObject({ canonicalEventName: acceptedEventName, sourceTruth: "client", metricEligible: false, includeInUserBehavior: false });
    expect(result.fact?.normalizedAction).toBe(acceptedEventName.replace("semantic_", ""));
  });
});

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
    }, "creator");

    expect(fact.actor.actorType).toBe("creator");
    expect(fact.actorLane).toBe("creator_user");
    expect(fact.actor.actorUserId).toBe("caller_user_1");
    expect(fact.actor.actorCreatorId).toBe("caller_user_1");
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

  it("keeps current Admin callers out of user behavior without body Owner promotion", () => {
    const adminFact = identifiedFact({
      eventId: "evt_admin_actor",
      eventName: "admin_analytics_viewed",
      session_id: "session_admin",
      roles: ["admin"],
      actor_admin_id: "admin_1",
      page_path: "/admin/users",
    }, "admin");
    const ownerFact = identifiedFact({
      eventId: "evt_owner_actor",
      eventName: "admin_analytics_viewed",
      session_id: "session_owner",
      roles: ["owner_admin"],
      actor_admin_id: "owner_1",
      page_path: "/admin/users",
    }, "admin");

    expect(adminFact.actor.actorType).toBe("admin");
    expect(adminFact.actorLane).toBe("admin");
    expect(adminFact.actor.actorUserId).toBe("");
    expect(adminFact.actor.actorAdminId).toBe("caller_user_1");
    expect(adminFact.includeInUserBehavior).toBe(false);

    expect(ownerFact.actor.actorType).toBe("admin");
    expect(ownerFact.actorLane).toBe("admin");
    expect(ownerFact.actor.actorUserId).toBe("");
    expect(ownerFact.actor.actorAdminId).toBe("caller_user_1");
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
    }, "admin");

    expect(fact.actor.actorType).toBe("admin");
    expect(fact.actorLane).toBe("admin_projection");
    expect(fact.actor.actorUserId).toBe("");
    expect(fact.actor.actorAdminId).toBe("caller_user_1");
    expect(fact.target.targetCreatorId).toBe("creator_target_3");
    expect(fact.metricEligible).toBe(false);
    expect(fact.metricExclusionReason).toBe("admin_projection");
  });

  it("rejects browser System authority while retaining legacy-unknown quarantine", () => {
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

    expect(systemFact.actor.actorType).toBe("user");
    expect(systemFact.actorLane).toBe("signed_in_user");
    expect(systemFact.actor.actorUserId).toBe("caller_user_1");
    expect(systemFact.includeInUserBehavior).toBe(true);

    expect(legacyFact.actor.actorType).toBe("unknown");
    expect(legacyFact.actorLane).toBe("legacy_unknown");
    expect(legacyFact.actor.actorUserId).toBe("");
    expect(legacyFact.includeInUserBehavior).toBe(false);
  });
});

describe("server request consent admission provenance", () => {
  const guestInput = { eventId: "batch_admitted-guest_123456:0", timestampMs: 1_791_000_000_000, sessionId: "sess_admitted-guest", anonymousVisitorId: "subject_admitted-guest", path: "/drops", type: "page_view", acceptedEventName: "semantic_page_viewed" };
  const marker = { version: "runtime_fact_request_consent_v1", consentMode: "minimal_analytics" };

  it("binds a newly request-admitted identified observation to source and timeline without elevating client truth", () => {
    const result = normalizeIdentifiedRuntimeFact({ eventId: "evt_admitted_page", rawEventName: "semantic_page_viewed", timestampMs: guestInput.timestampMs, callerUid: "caller_user_1", callerRole: "user", requestConsentMode: "minimal_analytics", params: { session_id: "session_1", source_truth: "client", consent_mode: "full_behavioral", consent_state: "granted", requestConsentAdmission: { version: marker.version, consentMode: "full_behavioral" } } });
    expect(result.fact?.requestConsentAdmission).toEqual(marker);
    const timeline = mapRuntimeFactToBehavioralTimelineFact({ runtimeFact: result.fact!, consentState: "partial" });
    const document = createRuntimeFactFirestoreDocument({ runtimeFact: result.fact!, params: {}, telemetryEventCategory: "analytics", telemetryEventModules: [], trackingOrigin: "identified_api_ingest" });
    expect(timeline.requestConsentAdmission).toEqual(marker);
    expect(document.requestConsentAdmission).toEqual(marker);
    expect(timeline).toMatchObject({ sourceTruth: "client", consentState: "partial", confidenceInputs: { hasServerTruth: false } });
  });

  it("does not mint provenance from client parameters or an omitted internal admission", () => {
    const fact = identifiedFact({ eventName: "semantic_page_viewed", consent_mode: "full_behavioral", consent_state: "granted", requestConsentAdmission: { version: marker.version, consentMode: "full_behavioral" }, request_consent_admission: { version: marker.version, consentMode: "full_behavioral" } });
    expect(fact).not.toHaveProperty("requestConsentAdmission");
    expect(mapRuntimeFactToBehavioralTimelineFact({ runtimeFact: fact, consentState: "granted" })).not.toHaveProperty("requestConsentAdmission");
    expect(createRuntimeFactFirestoreDocument({ runtimeFact: fact, params: {}, telemetryEventCategory: "analytics", telemetryEventModules: [], trackingOrigin: "identified_api_ingest" })).not.toHaveProperty("requestConsentAdmission");
  });

  it.each([
    { actor_user_id: "foreign_actor", actorUserId: "foreign_actor_camel", user_id: "foreign_user", userId: "foreign_user_camel", recipient_id: "target_user" },
    { recipient_id: "target_user", recipientId: "target_user_camel" },
  ])("binds the signed-in actor to the verified caller and preserves the distinct target (%j)", foreignParams => {
    const result = normalizeIdentifiedRuntimeFact({ eventId: "evt_actor_binding", rawEventName: "semantic_page_viewed", timestampMs: guestInput.timestampMs, callerUid: "caller_user_1", callerRole: "user", requestConsentMode: "full_behavioral", params: { session_id: "session_1", source_truth: "client", consent_mode: "full_behavioral", ...foreignParams } });
    expect(result.fact?.actor).toMatchObject({ actorType: "user", actorUserId: "caller_user_1" });
    expect(result.fact?.target.targetUserId).toBe("target_user");
    expect(mapRuntimeFactToBehavioralTimelineFact({ runtimeFact: result.fact!, consentState: "granted" })).toMatchObject({ actorUserId: "caller_user_1", target: { userId: "target_user" }, includeInPersonMetrics: true });
  });

  it("keeps a disallowed internal mode from attesting an optional behavioral event", () => {
    const result = normalizeIdentifiedRuntimeFact({ eventId: "evt_not_admitted", rawEventName: "semantic_target_clicked", timestampMs: guestInput.timestampMs, callerUid: "caller_user_1", callerRole: "user", requestConsentMode: "necessary_only", params: { session_id: "session_1", consent_mode: "full_behavioral", consent_state: "granted" } });
    expect(result.fact).not.toHaveProperty("requestConsentAdmission");
  });

  it("records the restrictive request mode on required account evidence without granting analytics consent", () => {
    const result = normalizeIdentifiedRuntimeFact({ eventId: "evt_required_account", rawEventName: "auth_sign_in_success", timestampMs: guestInput.timestampMs, callerUid: "caller_user_1", callerRole: "user", requestConsentMode: "necessary_only", params: { session_id: "session_1" } });
    expect(result.fact?.requestConsentAdmission).toEqual({ version: marker.version, consentMode: "necessary_only" });
    expect(mapRuntimeFactToBehavioralTimelineFact({ runtimeFact: result.fact!, consentState: "denied" })).toMatchObject({ requestConsentAdmission: { version: marker.version, consentMode: "necessary_only" }, consentState: "denied" });
  });

  it("carries only current admitted guest provenance through the actual mapper", () => {
    const result = normalizeAnonymousRuntimeFact({ ...guestInput, sourceOrigin: "accepted_current_guest_ingest", requestConsentMode: "minimal_analytics" });
    expect(result.fact).toMatchObject({ requestConsentAdmission: marker, sourceTruth: "client", includeInUserBehavior: false, metricEligible: true });
    expect(mapRuntimeFactToBehavioralTimelineFact({ runtimeFact: result.fact!, consentState: "partial" })).toMatchObject({ requestConsentAdmission: marker, sourceTruth: "client", includeInPersonMetrics: false });
  });

  it.each([undefined, "legacy_import" as const])("does not reclassify old or imported guest input merely because a mode was supplied (%s)", sourceOrigin => {
    const result = normalizeAnonymousRuntimeFact({ ...guestInput, sourceOrigin, requestConsentMode: "full_behavioral" });
    expect(result.fact?.sourceTruth).toBe("legacy");
    expect(result.fact).not.toHaveProperty("requestConsentAdmission");
  });

  it("keeps current guest input without request admission unverified", () => {
    const result = normalizeAnonymousRuntimeFact({ ...guestInput, sourceOrigin: "accepted_current_guest_ingest" });
    expect(result.fact).not.toHaveProperty("requestConsentAdmission");
  });

  it.each([null, [], { version: "old_import", consentMode: "full_behavioral" }, { version: marker.version, consentMode: "granted" }, { version: marker.version, consentMode: null }, { consentMode: "full_behavioral" }])("rejects malformed or unrecognized saved admission %j", value => {
    expect(runtimeFactContract.readRuntimeFactRequestConsentAdmission(value)).toBeNull();
  });

  it.each(["unknown", "necessary_only", "minimal_analytics", "full_analytics", "full_behavioral"])("preserves the recognized saved mode without widening it (%s)", consentMode => {
    expect(runtimeFactContract.readRuntimeFactRequestConsentAdmission({ version: marker.version, consentMode })).toEqual({ version: marker.version, consentMode });
  });

  it("drops invalid provenance at mapper and source-writer boundaries instead of repairing it from current consent", () => {
    const fact = identifiedFact({ eventName: "semantic_page_viewed", session_id: "session_1" });
    const malformed = { ...fact, requestConsentAdmission: { version: "old_import", consentMode: "full_behavioral" } } as unknown as typeof fact;
    expect(mapRuntimeFactToBehavioralTimelineFact({ runtimeFact: malformed, consentState: "granted" })).not.toHaveProperty("requestConsentAdmission");
    expect(createRuntimeFactFirestoreDocument({ runtimeFact: malformed, params: {}, telemetryEventCategory: "analytics", telemetryEventModules: [], trackingOrigin: "identified_api_ingest" })).not.toHaveProperty("requestConsentAdmission");
  });
});


describe("identified internal authority normalization", () => {
  const input = { eventId: "evt_internal_authority", rawEventName: "notification_read", timestampMs: 1_791_000_000_000, callerUid: "verified_user", requestConsentMode: "full_behavioral" as const, params: { page_path: "/drops", session_id: "session_authority", notification_id: "notification_authority" } };
  it.each([undefined, null, "system", "owner_admin"])("leaves missing or invalid internal authority unadmitted %s", callerRole => {
    const result = normalizeIdentifiedRuntimeFact({ ...input, callerRole: callerRole as "user", params: { ...input.params, roles: ["admin"], callerRole: "user" } });
    expect(result.fact).toBeNull(); expect(result.diagnostic?.issueCode).toBe("unverified_actor_authority");
  });
  it.each([undefined, "canonical", "server", "materialized", "legacy", "local_projection", "client"])("keeps identified provenance client at the earliest owner %s", source_truth => {
    const result = normalizeIdentifiedRuntimeFact({ ...input, callerRole: "user", params: { ...input.params, source_truth, sourceTruth: source_truth } });
    expect(result.fact?.sourceTruth).toBe("client"); expect(result.params?.source_truth).toBe("client"); expect(result.params).not.toHaveProperty("sourceTruth");
    expect(mapRuntimeFactToBehavioralTimelineFact({ runtimeFact: result.fact!, consentState: "granted" })).toMatchObject({ sourceTruth: "client", confidenceInputs: { hasServerTruth: false } });
  });
  it("carries one caller-bound envelope and strips raw authority while preserving targets", () => {
    const result = normalizeIdentifiedRuntimeFact({ ...input, callerRole: "creator", params: { ...input.params, actor_creator_id: "foreign_creator", user_id: "foreign_user", creator_id: "target_creator", recipient_id: "target_user", roles: ["admin"], claims: { owner: true }, identity_state: "admin_authenticated" } });
    expect(result.fact).toMatchObject({ actor: { actorType: "creator", actorUserId: "verified_user", actorCreatorId: "verified_user", actorAdminId: "" }, target: { targetUserId: "target_user", targetCreatorId: "target_creator" } });
    expect(result.identityEnvelope).toMatchObject({ actorKind: "creator_user", userId: "verified_user", identityState: "creator_logged_in" });
    expect(result.params).toMatchObject({ user_id: "verified_user", actor_creator_id: "verified_user", creator_id: "target_creator", recipient_id: "target_user" }); expect(result.params).not.toHaveProperty("claims");
  });
});


describe("identified downstream consent agreement", () => {
  it("carries the admitted minimal mode into downstream params instead of raw full declarations", () => {
    const result = normalizeIdentifiedRuntimeFact({ eventId: "evt_authority_minimal_params", rawEventName: "semantic_page_viewed", timestampMs: 1_791_000_000_000, callerUid: "verified_user", callerRole: "user", requestConsentMode: "minimal_analytics", params: { route: "/drops", session_id: "session_authority", consent_mode: "full_behavioral", consentMode: "full_behavioral", consent_state: "granted", consentState: "granted" } });
    expect(result.params).toMatchObject({ consent_mode: "minimal_analytics", consent_state: "partial", include_in_user_behavior: false });
    expect(result.params).not.toHaveProperty("consentMode"); expect(result.params).not.toHaveProperty("consentState"); expect(result.identityEnvelope?.includeInUserBehavior).toBe(false);
  });
});
