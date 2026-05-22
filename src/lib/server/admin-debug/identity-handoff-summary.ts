import {
  buildEventIdentityEnvelope,
  buildIdentityLinkCandidate,
  classifyLegacyIdentity,
  preventGuestUserDoubleCount,
} from "@/lib/analytics/identity-handoff-engine";
import { canUseBehavioralSignals } from "@/lib/privacy/consent-tracking-policy";

export function buildIdentityHandoffDebugSummary() {
  const linkCandidate = buildIdentityLinkCandidate({
    guestId: "debug_guest",
    userId: "debug_user",
    sessionId: "debug_session",
    consentMode: "full_behavioral",
    reason: "signup",
  });
  const duplicateGuard = preventGuestUserDoubleCount({
    eventId: "debug_identity_handoff",
    actorKind: "signed_in_user",
    identityState: "logged_in_linked_guest",
    guestId: "debug_guest",
    userId: "debug_user",
    sessionId: "debug_session",
    linkId: linkCandidate.linkId,
  });
  const consentBlockedEnvelope = buildEventIdentityEnvelope({
    eventName: "semantic_target_clicked",
    guestId: null,
    sessionId: "debug_session",
    consentMode: "minimal_analytics",
  });
  const legacy = classifyLegacyIdentity({
    eventName: "legacy_event",
    userId: "legacy_user",
  });

  return {
    lane: "Identity handoff",
    surface: "admin-debug-identity-handoff",
    sourceTruth: "source_contract",
    sourceState: "source_ready",
    rawDumpsCollapsed: true,
    duplicateIdentityWidgetsConsolidated: true,
    currentIdentityContractStatus: {
      status: "current",
      actorKindRequired: true,
      identityStateRequired: true,
      identityConfidenceRequired: true,
      consentModeRequired: true,
      sessionIdRequired: true,
    },
    guestToUserLinkReadiness: {
      status: linkCandidate.canLink ? "ready" : "blocked",
      linkCandidateDeterministic: Boolean(linkCandidate.linkId),
      linkReason: linkCandidate.reason,
      blockedReason: linkCandidate.blockedReason,
      personLevelBehaviorAllowed: linkCandidate.personLevelBehaviorAllowed,
    },
    duplicateCountGuardStatus: {
      status: duplicateGuard.countAsUser && !duplicateGuard.countAsGuest ? "guarded" : "review",
      canonicalCountKey: duplicateGuard.canonicalCountKey,
      suppressedDuplicateKey: duplicateGuard.suppressedDuplicateKey,
      rule: "Linked guest history is attributed once to the resolved user and the guest duplicate key is suppressed.",
    },
    legacyUnknownCountSourceReadiness: {
      status: "dry_run_only",
      canPromoteToExactUser: legacy.canPromoteToExactUser,
      identityState: legacy.identityState,
      recoveryReason: legacy.recoveryReason,
    },
    consentBehaviorStatus: {
      status: "guarded",
      minimalAnalyticsBlocksBehavior: !canUseBehavioralSignals("minimal_analytics"),
      fullBehavioralAllowsBehavior: canUseBehavioralSignals("full_behavioral"),
      minimalEnvelopeIncludedInUserBehavior: consentBlockedEnvelope.includeInUserBehavior,
    },
  };
}
