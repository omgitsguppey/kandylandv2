import { describe, expect, it } from "vitest";

import {
  LEGACY_EVENT_RECOVERY_DOMAINS,
  type LegacyEventRecoveryDomain,
} from "@/lib/legacy/legacy-event-recovery-contract";
import * as recoveryModule from "@/lib/legacy/march-first-event-recovery";
import {
  buildLegacyEventRecoveryCandidate,
  buildMarchFirstEventRecoveryDryRun,
  dryRunOnly,
  recoveryStartDate,
} from "@/lib/legacy/march-first-event-recovery";

describe("March 1 event recovery", () => {
  it("declares the dry-run-only March 1 boundary and all requested domains", () => {
    const expectedDomains: LegacyEventRecoveryDomain[] = [
      "page_session",
      "wallet_payment_lifecycle",
      "drop_open_unwrap",
      "creator_profile_view",
      "fan_pass_subscription",
      "broadcasts",
      "notifications",
      "behavior_signals",
      "identity_links",
      "legacy_unknown",
    ];

    expect(recoveryStartDate).toBe("2026-03-01");
    expect(dryRunOnly).toBe(true);
    expect(LEGACY_EVENT_RECOVERY_DOMAINS).toEqual(expectedDomains);
    expect(Object.keys(recoveryModule).join(" ")).not.toMatch(/\b(backfill|mutate|write|commit|apply)\b/iu);
  });

  it("builds normalized envelope candidates without promoting unknown legacy to exact user truth", () => {
    const candidate = buildLegacyEventRecoveryCandidate({
      legacyEventId: "legacy-unknown-user",
      rawEventName: "unknown_legacy",
      occurredAt: "2026-03-05T12:00:00.000Z",
      source: "old_events",
      userId: "old-user-1",
      metadata: {
        email: "fan@example.com",
        route: "/drops",
      },
    });

    expect(candidate).toMatchObject({
      legacyEventId: "legacy-unknown-user",
      domain: "legacy_unknown",
      action: "archive_only",
      identityConfidence: "unknown",
      consentAssumption: "unknown_necessary_only",
      duplicateRisk: "high",
      dryRunOnly: true,
      canMutateProduction: false,
    });
    expect(candidate.normalizedEnvelopeCandidate).toMatchObject({
      actorKind: "legacy_unknown",
      identityState: "legacy_unknown",
      identityConfidence: "unknown",
      userRef: null,
      guestId: null,
      pipelineStatus: "quarantined",
    });
    expect(candidate.normalizedEnvelopeCandidate.identityConfidence).not.toBe("exact");
    expect(candidate.normalizedEnvelopeCandidate.metadata.email).toBeUndefined();
  });

  it("never treats missing consent as full behavioral tracking", () => {
    const candidate = buildLegacyEventRecoveryCandidate({
      legacyEventId: "legacy-page-session",
      rawEventName: "semantic_page_viewed",
      occurredAt: "2026-03-01T00:00:00.000Z",
      source: "analytics_sessions",
      guestId: "guest-1",
      sessionId: "session-1",
      metadata: { route: "/experiences" },
    });

    expect(candidate.domain).toBe("page_session");
    expect(candidate.consentAssumption).toBe("inferred_minimal");
    expect(candidate.normalizedEnvelopeCandidate.consentMode).toBe("minimal_analytics");
    expect(candidate.normalizedEnvelopeCandidate.consentMode).not.toBe("full_behavioral");
    expect(candidate.normalizedEnvelopeCandidate.identityState).toBe("guest_minimal_analytics");
    expect(candidate.duplicateRisk).toBe("low");
  });

  it("separates identity link candidates from behavior counts", () => {
    const candidate = buildLegacyEventRecoveryCandidate({
      legacyEventId: "legacy-link",
      rawEventName: "identity_linked",
      occurredAt: "2026-03-03T12:00:00.000Z",
      source: "analytics_identity_links",
      guestId: "guest-1",
      userId: "user-1",
      sessionId: "session-1",
      linkId: "link-1",
      consentMode: "full_behavioral",
      identityVerified: true,
    });

    expect(candidate.action).toBe("link_candidate");
    expect(candidate.domain).toBe("identity_links");
    expect(candidate.normalizedEnvelopeCandidate.linkId).toBe("link-1");
    expect(candidate.normalizedEnvelopeCandidate.includeInUserBehavior).toBe(false);
  });

  it("summarizes candidates by confidence and action without raw dumps", () => {
    const dryRun = buildMarchFirstEventRecoveryDryRun({
      records: [
        {
          legacyEventId: "before-start",
          rawEventName: "semantic_page_viewed",
          occurredAt: "2026-02-28T23:59:59.000Z",
          source: "analytics_sessions",
        },
        {
          legacyEventId: "drop-opened",
          rawEventName: "drop_opened",
          occurredAt: "2026-03-04T12:00:00.000Z",
          source: "analytics_event_facts",
          guestId: "guest-2",
          sessionId: "session-2",
          consentMode: "full_behavioral",
          metadata: { dropId: "drop-1" },
        },
        {
          legacyEventId: "payment-reference",
          rawEventName: "wallet_purchase_completed",
          occurredAt: "2026-03-05T12:00:00.000Z",
          source: "transactions",
          userId: "user-2",
          consentMode: "necessary_only",
          metadata: { transactionId: "txn-1", gumDropsAmount: 100 },
        },
      ],
    });

    expect(dryRun.mode).toBe("dry_run_only");
    expect(dryRun.recoveryStartDate).toBe("2026-03-01");
    expect(dryRun.readsProduction).toBe(false);
    expect(dryRun.liveBackfill).toBe(false);
    expect(dryRun.mutationsAllowed).toBe(false);
    expect(dryRun.rawRecordsIncluded).toBe(false);
    expect(dryRun.mutationPrevention.productionMutationBlocked).toBe(true);
    expect(dryRun.candidates).toHaveLength(3);
    expect(dryRun.candidates.every((candidate) => candidate.normalizedEnvelopeCandidate && candidate.duplicateRisk)).toBe(true);
    expect(dryRun.summary.actionCounts.ignore).toBe(1);
    expect(dryRun.summary.actionCounts.needs_manual_review).toBe(1);
    expect(dryRun.summary.domainCounts.wallet_payment_lifecycle).toBe(1);
  });
});
