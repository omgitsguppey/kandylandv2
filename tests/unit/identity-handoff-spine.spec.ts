import { describe, expect, it } from "vitest";

import {
  ACTOR_KINDS,
  IDENTITY_CONFIDENCE_VALUES,
  IDENTITY_STATES,
  LINK_REASON_VALUES,
  type IdentityState,
  type IdentityLinkCandidate,
} from "@/lib/analytics/identity-handoff-contract";
import {
  buildEventIdentityEnvelope,
  buildGuestIdentityContext,
  buildIdentityLinkCandidate,
  buildSignedInIdentityContext,
  classifyLegacyIdentity,
  preventGuestUserDoubleCount,
  resolveCurrentIdentityState,
  shouldLinkGuestToUser,
} from "@/lib/analytics/identity-handoff-engine";

describe("identity handoff spine", () => {
  it("publishes the canonical identity vocabulary", () => {
    expect(ACTOR_KINDS).toEqual([
      "guest",
      "signed_in_user",
      "creator_user",
      "admin",
      "admin_projection",
      "system",
      "legacy_unknown",
    ]);
    expect(IDENTITY_STATES).toContain("guest_full_behavioral");
    expect(IDENTITY_STATES).toContain("logged_in_linked_guest");
    expect(IDENTITY_CONFIDENCE_VALUES).toEqual(["exact", "linked", "inferred", "weak", "unknown"]);
    expect(LINK_REASON_VALUES).toEqual(["signup", "login", "consent_upgrade", "session_restore", "legacy_recovery"]);
  });

  it("resolves exactly one current identity state from consent and role inputs", () => {
    const cases: Array<[IdentityState, Parameters<typeof resolveCurrentIdentityState>[0]]> = [
      ["guest_unknown_consent", { consentMode: "unknown", sessionId: "sess_1" }],
      ["guest_necessary_only", { consentMode: "necessary_only", sessionId: "sess_1" }],
      ["guest_minimal_analytics", { consentMode: "minimal_analytics", sessionId: "sess_1" }],
      ["guest_full_behavioral", { consentMode: "full_behavioral", sessionId: "sess_1" }],
      ["signup_started", { consentMode: "full_behavioral", sessionId: "sess_1", authTransition: "signup_started" }],
      ["signup_completed_unlinked", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "user_1", authTransition: "signup_completed" }],
      ["logged_in_unlinked", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "user_1" }],
      ["logged_in_linked_guest", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "user_1", guestId: "guest_1", linkId: "identity_link_1" }],
      ["creator_logged_in", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "creator_1", roles: ["creator"] }],
      ["admin_authenticated", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "admin_1", roles: ["admin"] }],
      ["legacy_unknown", { consentMode: "unknown", sessionId: null, legacyUnknown: true }],
    ];

    for (const [expected, input] of cases) {
      expect(resolveCurrentIdentityState(input)).toBe(expected);
    }
  });

  it("builds deterministic guest and signed-in identity contexts", () => {
    expect(buildGuestIdentityContext({
      guestId: "guest_1",
      sessionId: "sess_1",
      consentMode: "minimal_analytics",
    })).toMatchObject({
      actorKind: "guest",
      identityState: "guest_minimal_analytics",
      identityConfidence: "weak",
      guestId: "guest_1",
      sessionId: "sess_1",
      consentMode: "minimal_analytics",
    });

    expect(buildSignedInIdentityContext({
      userId: "user_1",
      guestId: "guest_1",
      sessionId: "sess_1",
      linkId: "identity_link_1",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      userId: "user_1",
      guestId: "guest_1",
      linkId: "identity_link_1",
    });
  });

  it("creates deterministic link candidates only when consent allows linkage", () => {
    const candidate = buildIdentityLinkCandidate({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
      reason: "signup",
    });
    const repeat = buildIdentityLinkCandidate({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
      reason: "login",
    });

    expect(candidate).toMatchObject({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
      reason: "signup",
      canLink: true,
      linkId: repeat.linkId,
    });
    expect(shouldLinkGuestToUser(candidate)).toBe(true);
    const blockedCandidate: IdentityLinkCandidate = {
      ...candidate,
      consentMode: "minimal_analytics",
      canLink: false,
      blockedReason: "consent_blocks_identity_link",
    };
    expect(shouldLinkGuestToUser(blockedCandidate)).toBe(false);
  });

  it("builds event envelopes with identity, consent, session, and unavailable guest reasons", () => {
    expect(buildEventIdentityEnvelope({
      eventName: "semantic_page_viewed",
      guestId: "guest_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "guest",
      identityState: "guest_full_behavioral",
      identityConfidence: "weak",
      consentMode: "full_behavioral",
      sessionId: "sess_1",
      guestId: "guest_1",
      unavailableGuestReason: null,
      includeInUserBehavior: true,
    });

    expect(buildEventIdentityEnvelope({
      eventName: "semantic_page_viewed",
      sessionId: "sess_1",
      consentMode: "necessary_only",
    })).toMatchObject({
      actorKind: "guest",
      identityState: "guest_necessary_only",
      identityConfidence: "unknown",
      unavailableGuestReason: "guest_id_unavailable_due_to_consent",
      includeInUserBehavior: false,
    });

    expect(buildEventIdentityEnvelope({
      eventName: "semantic_target_clicked",
      userId: "user_1",
      guestId: "guest_1",
      linkId: "identity_link_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      linkId: "identity_link_1",
      includeInUserBehavior: true,
    });
  });

  it("prevents guest and user double counting and excludes admin projection", () => {
    expect(preventGuestUserDoubleCount({
      eventId: "evt_1",
      guestId: "guest_1",
      userId: "user_1",
      linkId: "identity_link_1",
      sessionId: "sess_1",
      identityState: "logged_in_linked_guest",
      actorKind: "signed_in_user",
    })).toMatchObject({
      canonicalCountKey: "user:user_1",
      countAsGuest: false,
      countAsUser: true,
      suppressedDuplicateKey: "guest:guest_1",
    });

    expect(preventGuestUserDoubleCount({
      eventId: "evt_2",
      userId: "admin_1",
      sessionId: "sess_1",
      identityState: "admin_authenticated",
      actorKind: "admin_projection",
    })).toMatchObject({
      canonicalCountKey: "excluded:admin_projection",
      countAsGuest: false,
      countAsUser: false,
      includeInUserBehavior: false,
    });
  });

  it("keeps legacy unknown from becoming an exact user", () => {
    expect(classifyLegacyIdentity({
      eventName: "legacy_event",
      userId: "legacy_user",
      sessionId: "",
    })).toMatchObject({
      actorKind: "legacy_unknown",
      identityState: "legacy_unknown",
      identityConfidence: "unknown",
      userId: null,
      canPromoteToExactUser: false,
    });
  });
});
