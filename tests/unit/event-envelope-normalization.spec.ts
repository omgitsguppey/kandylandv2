import { describe, expect, it } from "vitest";

import {
  EVENT_ENVELOPE_REQUIRED_FIELDS,
  type CanonicalEventEnvelope,
} from "@/lib/analytics/event-envelope-contract";
import {
  buildEventEnvelope,
  classifyEventPrivacy,
  getEnvelopeDedupeKey,
  normalizeLegacyEventEnvelope,
  stripForbiddenMetadata,
  validateEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";

describe("event envelope normalization", () => {
  it("publishes the canonical required event envelope fields", () => {
    expect(EVENT_ENVELOPE_REQUIRED_FIELDS).toEqual([
      "eventId",
      "eventName",
      "eventVersion",
      "timestamp",
      "featureId",
      "surface",
      "actorKind",
      "identityState",
      "identityConfidence",
      "consentMode",
      "sessionId",
      "source",
      "materializerLane",
      "debugVisibility",
      "scoreImpact",
      "privacyClass",
      "metadata",
    ]);
  });

  it("builds a registered identity-aware envelope for guest events", () => {
    const envelope = buildEventEnvelope({
      eventId: "evt_1",
      eventName: "semantic_page_viewed",
      timestamp: "2026-05-22T12:00:00.000Z",
      guestId: "subject_guest_1",
      sessionId: "sess_guest_1",
      consentMode: "full_behavioral",
      source: "guest_client",
      metadata: {
        path: "/drops",
        targetText: "Open this drop",
        email: "fan@example.com",
      },
    });

    expect(envelope).toMatchObject({
      eventId: "evt_1",
      eventName: "semantic_page_viewed",
      eventVersion: 1,
      actorKind: "guest",
      identityState: "guest_full_behavioral",
      identityConfidence: "weak",
      consentMode: "full_behavioral",
      sessionId: "sess_guest_1",
      guestId: "subject_guest_1",
      source: "guest_client",
      pipelineStatus: "normal",
    });
    expect(envelope.featureId).not.toBe("unregistered");
    expect(envelope.surface).not.toBe("unknown");
    expect(envelope.metadata.email).toBeUndefined();
    expect(validateEventEnvelope(envelope)).toMatchObject({ ok: true, findings: [] });
  });

  it("adds safe user identity and link id for signed-in linked events", () => {
    const envelope = buildEventEnvelope({
      eventId: "evt_2",
      eventName: "identity_linked",
      timestamp: 1_779_456_000_000,
      userId: "user_1",
      guestId: "subject_guest_1",
      linkId: "identity_link_1",
      sessionId: "sess_guest_1",
      consentMode: "full_behavioral",
      source: "identified_api_ingest",
      metadata: { source_component: "AuthContext" },
    });

    expect(envelope.userRef).toEqual({ kind: "user", id: "user_1" });
    expect(envelope.linkId).toBe("identity_link_1");
    expect(envelope.identityState).toBe("logged_in_linked_guest");
    expect(envelope.identityConfidence).toBe("linked");
  });

  it("quarantines unregistered events instead of accepting them into normal analytics", () => {
    const envelope = buildEventEnvelope({
      eventId: "evt_unknown",
      eventName: "totally_unknown_event",
      timestamp: "2026-05-22T12:00:00.000Z",
      sessionId: "sess_unknown",
      consentMode: "minimal_analytics",
      source: "client",
    });

    expect(envelope.pipelineStatus).toBe("quarantined");
    expect(envelope.quarantineReason).toBe("unregistered_event");
    expect(envelope.featureId).toBe("unregistered");
    expect(validateEventEnvelope(envelope)).toMatchObject({
      ok: false,
      findings: expect.arrayContaining(["unregistered_event_cannot_enter_normal_pipeline"]),
    });
  });

  it("rejects identity ids that lack identity state or consent mode", () => {
    const envelope: CanonicalEventEnvelope = {
      ...buildEventEnvelope({
        eventId: "evt_invalid",
        eventName: "semantic_target_clicked",
        timestamp: "2026-05-22T12:00:00.000Z",
        guestId: "subject_guest_2",
        sessionId: "sess_guest_2",
        consentMode: "full_behavioral",
        source: "guest_client",
      }),
      identityState: "" as CanonicalEventEnvelope["identityState"],
      consentMode: "" as CanonicalEventEnvelope["consentMode"],
    };

    expect(validateEventEnvelope(envelope).findings).toEqual(expect.arrayContaining([
      "missing_identityState",
      "missing_consentMode",
      "identity_id_without_identity_state",
    ]));
  });

  it("strips forbidden metadata before persistence", () => {
    expect(stripForbiddenMetadata({
      raw_prompt: "make a private thing",
      messageText: "secret message",
      mediaUrl: "https://storage.example/private.mp4?token=abc",
      email: "person@example.com",
      phone: "+1 555 123 1234",
      safe: "kept",
      nested: { a: 1 },
    })).toEqual({
      safe: "kept",
    });
  });

  it("normalizes legacy events with non-exact confidence", () => {
    const envelope = normalizeLegacyEventEnvelope({
      eventId: "legacy_1",
      eventName: "legacy_page_duration",
      timestamp: "2026-05-22T12:00:00.000Z",
      userId: "old_user",
      metadata: { durationMs: 4000 },
    });

    expect(envelope.actorKind).toBe("legacy_unknown");
    expect(envelope.identityState).toBe("legacy_unknown");
    expect(envelope.identityConfidence).not.toBe("exact");
    expect(envelope.pipelineStatus).toBe("quarantined");
  });

  it("classifies privacy and dedupe policy deterministically", () => {
    const walletEnvelope = buildEventEnvelope({
      eventId: "evt_wallet",
      eventName: "wallet_opened",
      timestamp: "2026-05-22T12:00:00.000Z",
      userId: "user_1",
      sessionId: "sess_user_1",
      consentMode: "necessary_only",
      source: "client",
    });
    const behaviorEnvelope = buildEventEnvelope({
      eventId: "evt_behavior",
      eventName: "semantic_target_clicked",
      timestamp: "2026-05-22T12:00:00.000Z",
      guestId: "subject_guest_1",
      sessionId: "sess_guest_1",
      consentMode: "full_behavioral",
      source: "guest_client",
    });

    expect(classifyEventPrivacy("wallet_opened")).toBe("required_integrity");
    expect(walletEnvelope.privacyClass).toBe("required_integrity");
    expect(behaviorEnvelope.privacyClass).toBe("behavioral");
    expect(getEnvelopeDedupeKey(walletEnvelope)).toBe(getEnvelopeDedupeKey({
      ...walletEnvelope,
      metadata: { anything: "ignored" },
    }));
  });
});
