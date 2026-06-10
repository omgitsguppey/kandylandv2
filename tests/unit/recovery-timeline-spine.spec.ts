import { describe, expect, it } from "vitest";

import { createCanonicalAnalyticsEvent } from "@/lib/analytics/analytics-event-contract";
import {
  RECOVERY_TIMELINE_SOURCE_PRECEDENCE,
  buildGumdropRecoveryQueue,
  buildRecoveryTimelineEntryFromGa4Event,
  buildRecoveryTimelineEntryFromCanonicalEvent,
  getGa4RecoveryEventMapping,
  inferRecoveryProductDomain,
  reconcileAnalyticsEventFactsWithRecoveryTimeline,
  reconcileTreasuryEventsWithRecoveryTimeline,
  validateGumdropRecoveryQueue,
  validateRecoveryTimelineEntries,
} from "@/lib/analytics/recovery-timeline-spine";

describe("recovery timeline spine", () => {
  it("keeps first-party and ledger sources ahead of legacy and GA4 evidence", () => {
    expect(RECOVERY_TIMELINE_SOURCE_PRECEDENCE.slice(0, 3)).toEqual([
      "first_party_event_fact",
      "transaction_ledger",
      "gumdrop_ledger",
    ]);
    expect(RECOVERY_TIMELINE_SOURCE_PRECEDENCE.indexOf("ga4_evidence")).toBeGreaterThan(
      RECOVERY_TIMELINE_SOURCE_PRECEDENCE.indexOf("behavioral_timeline_fact"),
    );
  });

  it("classifies viewer sessions as telemetry behavior before identity-session text", () => {
    expect(inferRecoveryProductDomain("watch_duration_legacy", "viewer_session")).toBe("telemetry_behavior");
  });

  it("requires treasury ledger corroboration for payment recovery eligibility", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "ga4:purchase",
      eventName: "gumdrops_purchase_completed",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T12:00:00.000Z",
      actorType: "unknown",
      source: "ga4_daily",
      consentState: "unknown",
      objectType: "purchase",
      objectId: "txn_1",
      legacySource: "ga4_daily",
      legacyId: "row_1",
      legacyConfidence: "medium",
      mappingWarnings: [],
    });

    const entry = buildRecoveryTimelineEntryFromCanonicalEvent(event, {
      source: "ga4_evidence",
      sourceRecordId: "row_1",
    });

    expect(entry.productDomain).toBe("wallet_payment");
    expect(entry.classification).toBe("corroborating_evidence");
    expect(entry.recoveryEligibility).toBe("ledger_corroboration_required");
    expect(entry.evidenceLabels).toContain("ga4_evidence_only");
  });

  it("maps GA4 page events into evidence-only timeline entries", () => {
    const entry = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "page_view",
      ga4EventId: "ga4_page_1",
      occurredAt: "2026-06-07T00:00:00.000Z",
      userPseudoId: "pseudo_1",
      sessionId: "session_1",
      pagePath: "/drops",
    });

    expect(getGa4RecoveryEventMapping("page_view").canonicalEventName).toBe("page_viewed");
    expect(entry.source).toBe("ga4_evidence");
    expect(entry.productDomain).toBe("telemetry_behavior");
    expect(entry.recoveryEligibility).toBe("evidence_only");
    expect(entry.evidenceLabels).toContain("ga4_evidence_only");
  });

  it("rejects GA4 commerce evidence as product truth without ledger corroboration", () => {
    const entry = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "purchase",
      ga4EventId: "ga4_purchase_1",
      occurredAt: "2026-06-07T00:00:00.000Z",
      transactionId: "txn_from_ga4",
    });

    expect(entry.productDomain).toBe("wallet_payment");
    expect(entry.classification).toBe("rejected");
    expect(entry.recoveryEligibility).toBe("rejected");
    expect(validateRecoveryTimelineEntries([entry]).ok).toBe(true);
  });

  it("allows ledger-backed payment entries to be product-truth eligible", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "transaction:purchase",
      eventName: "gumdrops_purchase_completed",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      source: "server",
      consentState: "not_required",
      objectType: "purchase",
      objectId: "txn_1",
    });

    const entry = buildRecoveryTimelineEntryFromCanonicalEvent(event, {
      source: "transaction_ledger",
      sourceRecordId: "txn_1",
      corroboration: {
        transactionId: "txn_1",
        gumdropLedgerId: "ledger_1",
        sourceCount: 2,
        treasuryLedgerCorroborated: true,
      },
    });

    expect(entry.recoveryEligibility).toBe("product_truth_eligible");
    expect(validateRecoveryTimelineEntries([entry]).ok).toBe(true);
  });

  it("blocks legacy evidence from directly overwriting product truth", () => {
    const event = createCanonicalAnalyticsEvent({
      eventId: "legacy:support",
      eventName: "support_ticket_created",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:00.000Z",
      actorType: "guest",
      anonymousVisitorId: "anon_1",
      source: "legacy_firestore",
      consentState: "unknown",
      objectType: "system",
      objectId: "support_1",
      legacySource: "legacy_support",
      legacyId: "support_1",
      legacyConfidence: "low",
      mappingWarnings: ["legacy support row only"],
    });

    const entry = buildRecoveryTimelineEntryFromCanonicalEvent(event, {
      source: "legacy_analytics",
      sourceRecordId: "support_1",
    });

    expect(entry.classification).toBe("weak_match");
    expect(entry.recoveryEligibility).toBe("manual_review_required");
    expect(entry.evidenceLabels).toContain("legacy_directional_only");
    expect(validateRecoveryTimelineEntries([entry]).ok).toBe(true);
  });

  it("reconciles recovery timeline entries against first-party event facts as primary truth", () => {
    const firstPartyTimeline = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:drop-clicked",
      eventName: "drop_clicked",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "drop",
      objectId: "drop_1",
    }));
    const ga4Only = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "page_view",
      ga4EventId: "ga4_page_only",
      occurredAt: "2026-06-07T00:05:00.000Z",
      userPseudoId: "anon_1",
      sessionId: "session_ga4",
      pagePath: "/drops",
    });
    const unknownLegacy = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "legacy:unknown-actor",
      eventName: "notification_read",
      occurredAt: "2026-06-07T00:07:00.000Z",
      receivedAt: "2026-06-07T00:07:00.000Z",
      actorType: "unknown",
      source: "legacy_firestore",
      consentState: "unknown",
      objectType: "notification",
      objectId: "notification_1",
      legacySource: "notifications",
      legacyId: "notification_1",
      legacyConfidence: "unknown",
      mappingWarnings: ["Actor lane could not be recovered."],
    }), {
      source: "unknown_legacy",
      sourceRecordId: "notification_1",
    });

    const report = reconcileAnalyticsEventFactsWithRecoveryTimeline({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      firstPartyEventFacts: [{
        eventId: "event_fact:drop-clicked",
        eventName: "drop_clicked",
        timestamp: Date.parse("2026-06-07T00:00:00.000Z"),
        userId: "user_1",
        sessionId: "session_1",
        dropId: "drop_1",
      }],
      timelineEntries: [firstPartyTimeline, ga4Only, unknownLegacy],
    });

    expect(report.reportKey).toBe("analytics-event-facts-recovery-reconciliation");
    expect(report.summary).toMatchObject({
      firstPartyFactCount: 1,
      timelineEntryCount: 3,
      firstPartyPresent: 1,
      ga4Only: 1,
      identityMissing: 1,
      productTruthEligible: 1,
    });
    expect(report.productTruthPolicy).toMatchObject({
      firstPartyEventFactsPrimary: true,
      legacyCanOnlyCorroborate: true,
      ga4CanOnlyCorroborate: true,
      duplicateEventsNotImported: true,
      missingWindowNotZero: true,
    });
  });

  it("classifies duplicate actor/session/action windows and timestamp conflicts without importing duplicates", () => {
    const duplicateTimeline = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:duplicate-a",
      eventName: "drop_clicked",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "drop",
      objectId: "drop_1",
    }), {
      classification: "duplicate_candidate",
    });
    const conflictedTimeline = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "legacy:conflicted",
      eventName: "drop_clicked",
      occurredAt: "2026-06-07T00:03:00.000Z",
      receivedAt: "2026-06-07T00:03:00.000Z",
      actorType: "user",
      userId: "user_2",
      sessionId: "session_2",
      source: "legacy_firestore",
      consentState: "unknown",
      objectType: "drop",
      objectId: "drop_2",
      legacySource: "legacy_clicks",
      legacyId: "legacy_conflict",
      legacyConfidence: "medium",
      mappingWarnings: [],
    }), {
      source: "legacy_analytics",
      sourceRecordId: "legacy_conflict",
    });

    const report = reconcileAnalyticsEventFactsWithRecoveryTimeline({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      firstPartyEventFacts: [
        {
          eventId: "event_fact:duplicate-a",
          eventName: "drop_clicked",
          timestamp: Date.parse("2026-06-07T00:00:00.000Z"),
          userId: "user_1",
          sessionId: "session_1",
          dropId: "drop_1",
        },
        {
          eventId: "event_fact:duplicate-b",
          eventName: "drop_clicked",
          timestamp: Date.parse("2026-06-07T00:00:20.000Z"),
          userId: "user_1",
          sessionId: "session_1",
          dropId: "drop_1",
        },
        {
          eventId: "event_fact:conflict-source",
          eventName: "drop_clicked",
          timestamp: Date.parse("2026-06-07T00:00:00.000Z"),
          userId: "user_2",
          sessionId: "session_2",
          dropId: "drop_2",
        },
      ],
      timelineEntries: [duplicateTimeline, conflictedTimeline],
    });

    expect(report.summary.duplicateCandidate).toBe(2);
    expect(report.summary.timestampConflict).toBe(1);
    expect(report.matches.find((entry) => entry.timelineId === duplicateTimeline.timelineId)).toMatchObject({
      gapClassification: "duplicate_candidate",
      duplicateCandidate: true,
      productTruthEligible: false,
    });
    expect(report.matches.find((entry) => entry.timelineId === conflictedTimeline.timelineId)).toMatchObject({
      gapClassification: "timestamp_conflict",
      productTruthEligible: false,
    });
  });

  it("reconciles GumDrop treasury ledger events with analytics evidence without creating money truth", () => {
    const purchaseEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:purchase",
      eventName: "gumdrops_purchase_completed",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "purchase",
      objectId: "txn_1",
    }), {
      source: "first_party_event_fact",
      corroboration: {
        transactionId: "txn_1",
        eventFactId: "event_fact:purchase",
        sourceCount: 1,
        treasuryLedgerCorroborated: false,
      },
    });
    const ga4PurchaseOnly = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "purchase",
      ga4EventId: "ga4_purchase_only",
      occurredAt: "2026-06-07T00:02:00.000Z",
      userPseudoId: "anon_1",
      sessionId: "session_ga4",
      transactionId: "txn_missing",
    });

    const report = reconcileTreasuryEventsWithRecoveryTimeline({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      ledgerEvents: [
        {
          ledgerId: "ledger_purchase_1",
          transactionId: "txn_1",
          eventType: "purchase",
          eventName: "gumdrops_purchase_completed",
          occurredAt: "2026-06-07T00:00:00.000Z",
          actor: { userId: "user_1", sessionId: "session_1" },
          amountGd: 550,
          sourceBucket: "paid_gd",
          direction: "credit",
          sourceTruth: "server_transaction",
        },
        {
          ledgerId: "ledger_reward_1",
          eventType: "reward",
          eventName: "daily_reward_claimed",
          occurredAt: "2026-06-07T00:01:00.000Z",
          actor: { userId: "user_1", sessionId: "session_1" },
          amountGd: 25,
          sourceBucket: "task_reward_gd",
          direction: "credit",
          sourceTruth: "reward_ledger",
        },
      ],
      timelineEvidence: [
        { entry: purchaseEvidence, expectedSourceBucket: "paid_gd" },
        { entry: ga4PurchaseOnly, expectedSourceBucket: "paid_gd" },
      ],
    });

    expect(report.productTruthPolicy).toMatchObject({
      treasuryLedgersPrimary: true,
      analyticsCanOnlyCorroborate: true,
      ga4CanCreditOrDebitGumdrops: false,
      legacyCanCreditOrDebitGumdrops: false,
    });
    expect(report.summary.ledger_confirmed).toBe(2);
    expect(report.summary.analytics_correlated).toBe(1);
    expect(report.summary.analytics_missing).toBe(1);
    expect(report.summary.ledger_missing_protected).toBe(1);
    expect(report.findings.find((finding) => finding.status === "ledger_missing_protected")).toMatchObject({
      timelineId: ga4PurchaseOnly.timelineId,
      productTruthAllowed: false,
    });
  });

  it("flags source bucket mismatches and duplicate treasury evidence without changing ledger truth", () => {
    const unlockEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:unlock",
      eventName: "drop_unwrapped",
      occurredAt: "2026-06-07T00:00:00.000Z",
      receivedAt: "2026-06-07T00:00:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "unlock",
      objectId: "unlock_1",
    }), {
      source: "first_party_event_fact",
      corroboration: {
        unlockId: "unlock_1",
        eventFactId: "event_fact:unlock",
        sourceCount: 1,
        treasuryLedgerCorroborated: false,
      },
    });

    const report = reconcileTreasuryEventsWithRecoveryTimeline({
      ledgerEvents: [{
        ledgerId: "ledger_unlock_1",
        transactionId: "unlock_1",
        eventType: "unlock_spend",
        eventName: "drop_unwrapped",
        occurredAt: "2026-06-07T00:00:00.000Z",
        actor: { userId: "user_1", sessionId: "session_1" },
        amountGd: 100,
        sourceBucket: "paid_gd",
        direction: "debit",
        sourceTruth: "unlock_record",
      }],
      timelineEvidence: [
        { entry: unlockEvidence, expectedSourceBucket: "reward_gd" },
        { entry: unlockEvidence, expectedSourceBucket: "reward_gd" },
      ],
    });

    expect(report.status).toBe("review");
    expect(report.summary.duplicate_risk).toBe(1);
    expect(report.summary.source_bucket_mismatch).toBe(1);
    expect(report.findings.find((finding) => finding.status === "source_bucket_mismatch")).toMatchObject({
      sourceBucket: "paid_gd",
      evidenceSourceBucket: "reward_gd",
      productTruthAllowed: false,
    });
  });

  it("builds a manual GumDrop recovery queue that rejects analytics-only balance recovery", () => {
    const ga4PurchaseOnly = buildRecoveryTimelineEntryFromGa4Event({
      ga4EventName: "purchase",
      ga4EventId: "ga4_purchase_only",
      occurredAt: "2026-06-07T00:02:00.000Z",
      userPseudoId: "anon_1",
      sessionId: "session_ga4",
      transactionId: "txn_missing",
    });
    const rewardEvidence = buildRecoveryTimelineEntryFromCanonicalEvent(createCanonicalAnalyticsEvent({
      eventId: "event_fact:reward",
      eventName: "daily_reward_claimed",
      occurredAt: "2026-06-07T00:01:00.000Z",
      receivedAt: "2026-06-07T00:01:01.000Z",
      actorType: "user",
      userId: "user_1",
      sessionId: "session_1",
      source: "server",
      consentState: "not_required",
      objectType: "system",
      objectId: "reward_1",
    }), {
      source: "first_party_event_fact",
      corroboration: {
        rewardEventId: "reward_1",
        eventFactId: "event_fact:reward",
        sourceCount: 1,
        treasuryLedgerCorroborated: false,
      },
    });
    const ledgerEvents = [{
      ledgerId: "ledger_reward_1",
      transactionId: "reward_1",
      eventType: "reward" as const,
      eventName: "daily_reward_claimed",
      occurredAt: "2026-06-07T00:01:00.000Z",
      actor: { userId: "user_1", sessionId: "session_1" },
      amountGd: 25,
      sourceBucket: "task_reward_gd" as const,
      direction: "credit" as const,
      sourceTruth: "reward_ledger" as const,
    }];
    const timelineEvidence = [
      { entry: rewardEvidence, expectedSourceBucket: "task_reward_gd" as const },
      { entry: ga4PurchaseOnly, expectedSourceBucket: "paid_gd" as const },
    ];
    const reconciliation = reconcileTreasuryEventsWithRecoveryTimeline({
      ledgerEvents,
      timelineEvidence,
    });

    const queue = buildGumdropRecoveryQueue({
      generatedAtUtc: "2026-06-07T12:00:00.000Z",
      reconciliation,
      ledgerEvents,
      timelineEvidence,
    });

    expect(queue.schema).toMatchObject({
      moneyTruthRule: "ledger_or_server_proof_required_before_balance_recovery",
      analyticsOnlyRecoveryAllowed: false,
    });
    expect(queue.productTruthPolicy).toMatchObject({
      dryRunOnly: true,
      creditsOrDebitsUsers: false,
      backfillsTransactions: false,
      analyticsOnlyCanChangeBalance: false,
      requiresLedgerOrServerProofBeforeMoneyAction: true,
    });
    expect(queue.summary.analyticsOnlyRejectedCount).toBe(1);
    expect(queue.summary.moneyAffectingRecoveryAllowedCount).toBe(0);
    expect(queue.items.find((item) => item.ledgerCorroboration.status === "ledger_missing")).toMatchObject({
      suspectedAction: "purchase",
      allowedRecoveryAction: "reject_analytics_only_balance_recovery",
    });
    expect(validateGumdropRecoveryQueue(queue)).toEqual([]);
  });
});
