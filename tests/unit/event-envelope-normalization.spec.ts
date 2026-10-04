import { existsSync } from "node:fs";
import { join } from "node:path";
import { createSourceValidatorTaskFixture } from "./utils/source-validator-contract";
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


describe("bounded observed session metadata", () => {
  const checkpoint = { version: "session_measurement_v1", segmentId: "segment_envelope_fixture_" + "x".repeat(80), sequence: 1, startedAtMs: 1_779_456_000_000, endedAtMs: 1_779_456_030_000, activeMs: 0, idleMs: 30_000, hiddenMs: 0, status: "final" };
  it("preserves the complete validated compact checkpoint beyond generic string trimming", () => {
    const serialized = JSON.stringify(checkpoint);
    expect(serialized.length).toBeGreaterThan(250);
    expect(stripForbiddenMetadata({ session_measurement: serialized })).toEqual({ session_measurement: serialized });
  });
  it("drops invalid or unsupported checkpoints instead of preserving a misleading reserved string", () => {
    for (const value of ["not a checkpoint", JSON.stringify({ ...checkpoint, version: "old" }), JSON.stringify({ ...checkpoint, activeMs: 1 }), "x".repeat(1_025)]) {
      expect(stripForbiddenMetadata({ session_measurement: value })).not.toHaveProperty("session_measurement");
    }
  });
  it("keeps the reserved exception bounded to decoded fields rather than arbitrary nested personal data", () => {
    const result = stripForbiddenMetadata({ session_measurement: JSON.stringify({ ...checkpoint, email: "fan@example.com", provider_payload: { token: "private" } }), email: "fan@example.com", token: "private" });
    expect(result).toEqual({ session_measurement: JSON.stringify(checkpoint) });
  });
  it("retains ordinary metadata redaction and size limits", () => {
    const result = stripForbiddenMetadata({ safe_label: "x".repeat(300), user_email: "fan@example.com", other_json: JSON.stringify({ email: "fan@example.com" }), phone_label: "+1 (555) 123-4567" });
    expect(result.safe_label).toHaveLength(250);
    expect(result).not.toHaveProperty("user_email");
    expect(result).not.toHaveProperty("other_json");
    expect(result).not.toHaveProperty("phone_label");
  });
});


describe("event-envelope-normalization task-bound CLI", () => {
  const fixture = (allowedSourceFiles: string[] = []) => createSourceValidatorTaskFixture({ validator: "scripts/agent/validate-event-envelope-normalization.ts", report: "agent/state/event-envelope-normalization.generated.json", allowedSourceFiles });
  it("accepts declared source changes with inherited protected dirt, denies later protected changes and recovers without replacing prior proof", () => {
    const f = fixture();
    f.write("fixture.ts", "export const value = 2;\n");
    const accepted = f.run(); expect(accepted.output).not.toContain("Error:"); expect(accepted.status).toBe(0);
    const before = f.read(f.report);
    expect(JSON.parse(before).mutationScope).toMatchObject({ mode: "input_bound_task", changedFiles: ["fixture.ts"], sourceFingerprint: f.fingerprint() });
    f.write(f.protectedFile, "export const value = 3;\n");
    const denied = f.run(); expect(denied.status).not.toBe(0); expect(denied.output).toContain("Output scope violation: " + f.protectedFile);
    expect(f.read(f.report)).toBe(before);
    f.write(f.protectedFile, "export const value = 2;\n");
    expect(f.run().status).toBe(0);
  }, 60_000);
  it("retains the standalone protected-runtime safeguard", () => {
    const f = fixture(); const result = f.run([]);
    expect(result.status).not.toBe(0); expect(result.output).toContain("chatNavPaymentGumdropRuntimeUntouched failed.");
    expect(JSON.parse(f.read(f.report)).mutationScope).toEqual({ mode: "whole_git_worktree" });
  }, 60_000);
  it("rejects an undeclared untracked mutation before publishing a report", () => {
    const f = fixture(); f.write("unexpected.ts", "export const unexpected = true;\n");
    const result = f.run(); expect(result.status).not.toBe(0); expect(result.output).toContain("Output scope violation: unexpected.ts");
    expect(existsSync(join(f.root, f.report))).toBe(false);
  }, 60_000);
});
