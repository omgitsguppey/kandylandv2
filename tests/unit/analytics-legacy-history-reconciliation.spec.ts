import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildLegacyHistoryPurgatoryQueueReport,
  buildLegacyHistoryReconciliationReport,
  reconcileLegacyHistoryCandidates,
  validateLegacyHistoryReconciliationReport,
  type LegacyHistoryCandidate,
} from "@/lib/analytics/legacy-history-reconciler";

const baseCandidate = {
  legacySource: "analytics_event_facts",
  legacyId: "legacy_evt_1",
  eventId: "evt_existing",
  sessionId: "sess_1",
  userId: "user_1",
  guestId: "guest_1",
  route: "/drops/drop_1",
  occurredAtMs: Date.parse("2024-01-15T12:00:00.000Z"),
  mappedEventName: "drop_clicked",
} satisfies LegacyHistoryCandidate;

describe("analytics legacy history reconciliation", () => {
  it("classifies same event, session, user, and guest as an exact link candidate", () => {
    const result = reconcileLegacyHistoryCandidates({
      candidates: [baseCandidate],
      currentTruth: {
        events: [{
          eventId: "evt_existing",
          sessionId: "sess_1",
          userId: "user_1",
          guestId: "guest_1",
          route: "/drops/drop_1",
          occurredAtMs: Date.parse("2024-01-15T12:00:01.000Z"),
        }],
        identityLinks: [],
      },
    });

    expect(result.candidateMappings[0]).toMatchObject({
      identityConfidence: "exact_match",
      purgatoryClassification: "exact_match",
      reasonCodes: expect.arrayContaining(["exact_current_event_match", "duplicate_risk", "current_totals_blocked"]),
      suggestedRecoveryAction: "link_as_evidence_only",
      duplicateRisk: "medium",
      recoveryAction: "link_candidate",
      overwriteCurrentTruth: false,
    });
  });

  it("classifies route, session window, and identity-link proximity as a probable match", () => {
    const result = reconcileLegacyHistoryCandidates({
      candidates: [{
        ...baseCandidate,
        eventId: "legacy_evt_probable",
        occurredAtMs: Date.parse("2024-01-15T12:00:20.000Z"),
      }],
      currentTruth: {
        events: [{
          eventId: "different_evt",
          sessionId: "sess_1",
          userId: "user_1",
          guestId: "guest_1",
          route: "/drops/drop_1",
          occurredAtMs: Date.parse("2024-01-15T12:00:00.000Z"),
        }],
        identityLinks: [{
          userId: "user_1",
          guestId: "guest_1",
          sessionId: "sess_1",
          linkedAtMs: Date.parse("2024-01-15T12:00:10.000Z"),
        }],
      },
    });

    expect(result.candidateMappings[0]).toMatchObject({
      identityConfidence: "probable_match",
      purgatoryClassification: "probable_match",
      reasonCodes: expect.arrayContaining(["probable_identity_window_match", "duplicate_risk", "current_totals_blocked"]),
      suggestedRecoveryAction: "manual_review_identity_bridge",
      duplicateRisk: "medium",
      recoveryAction: "link_candidate",
    });
  });

  it("keeps partial route and time evidence weak until an owner reviews it", () => {
    const result = reconcileLegacyHistoryCandidates({
      candidates: [{
        ...baseCandidate,
        eventId: "legacy_weak",
        userId: null,
        guestId: null,
        sessionId: null,
      }],
      currentTruth: {
        events: [{
          eventId: "other_evt",
          route: "/drops/drop_1",
          occurredAtMs: Date.parse("2024-01-15T12:00:30.000Z"),
        }],
        identityLinks: [],
      },
    });

    expect(result.candidateMappings[0]).toMatchObject({
      identityConfidence: "weak_match",
      purgatoryClassification: "weak_match",
      reasonCodes: expect.arrayContaining(["partial_identity_or_route_match", "debug_only_source", "current_totals_blocked"]),
      suggestedRecoveryAction: "archive_as_debug_evidence",
      recoveryAction: "archive_only",
      duplicateRisk: "low",
    });
  });

  it("archives unknown identity candidates without counting them as clean", () => {
    const result = reconcileLegacyHistoryCandidates({
      candidates: [{
        legacySource: "unknown",
        legacyId: "legacy_unknown",
        mappedEventName: "unknown",
      }],
      currentTruth: { events: [], identityLinks: [] },
    });

    expect(result.candidateMappings[0]).toMatchObject({
      targetTruthLayer: "debug_truth",
      identityConfidence: "unknown",
      purgatoryClassification: "unknown",
      reasonCodes: expect.arrayContaining(["unknown_identity", "debug_only_source", "current_totals_blocked"]),
      suggestedRecoveryAction: "archive_as_debug_evidence",
      recoveryAction: "archive_only",
      currentTotalsEligible: false,
    });
  });

  it("keeps external evidence and realtime summaries out of product truth", () => {
    const result = reconcileLegacyHistoryCandidates({
      candidates: [
        { ...baseCandidate, legacySource: "ga4_daily", legacyId: "ga4_evt", source: "ga4_daily" },
        { ...baseCandidate, legacySource: "analytics_aggregate_stats/realtime_summary", legacyId: "hot_summary" },
      ],
      currentTruth: { events: [], identityLinks: [] },
    });

    expect(result.candidateMappings[0]).toMatchObject({
      targetTruthLayer: "evidence_only",
      purgatoryClassification: "weak_match",
      reasonCodes: expect.arrayContaining(["external_evidence_only", "current_totals_blocked"]),
      suggestedRecoveryAction: "require_first_party_fact_or_ledger",
      recoveryAction: "archive_only",
      currentTotalsEligible: false,
    });
    expect(result.candidateMappings[1]).toMatchObject({
      targetTruthLayer: "debug_truth",
      recoveryAction: "archive_only",
      currentTotalsEligible: false,
    });
  });

  it("flags linked guest/user legacy batches as duplicate candidates instead of import candidates", () => {
    const result = reconcileLegacyHistoryCandidates({
      candidates: [{
        ...baseCandidate,
        legacySource: "analytics_guest_batches",
        legacyId: "legacy_guest_and_user",
      }],
      currentTruth: { events: [], identityLinks: [] },
    });

    expect(result.candidateMappings[0]).toMatchObject({
      duplicateRisk: "high",
      purgatoryClassification: "duplicate_candidate",
      reasonCodes: expect.arrayContaining(["duplicate_risk", "missing_first_party_corroboration", "current_totals_blocked"]),
      suggestedRecoveryAction: "require_first_party_fact_or_ledger",
      recoveryAction: "link_candidate",
      currentTotalsEligible: false,
    });
  });

  it("builds a compact purgatory queue with no product-truth eligibility", () => {
    const reconciliation = reconcileLegacyHistoryCandidates({
      candidates: [
        baseCandidate,
        {
          legacySource: "unknown",
          legacyId: "legacy_unknown",
          mappedEventName: "unknown",
        },
      ],
      currentTruth: { events: [], identityLinks: [] },
    });
    const queue = buildLegacyHistoryPurgatoryQueueReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T15:00:00.000Z",
      reconciliation,
    });

    expect(queue).toMatchObject({
      reportKey: "analytics-legacy-purgatory-queue",
      sourceReportKey: "analytics-legacy-history-reconciliation",
      summary: {
        weakMatch: 1,
        unknown: 1,
        productTruthEligible: 0,
        manualReviewRequired: 2,
      },
      productTruthPolicy: {
        legacyCannotOverwriteCurrentTruth: true,
        weakMatchesRemainEvidenceOnly: true,
        unknownLegacyIsNotZero: true,
      },
    });
    expect(queue.queue).toHaveLength(2);
    expect(queue.queue.every((entry) => entry.currentTotalsEligible === false)).toBe(true);
  });

  it("builds a report with cost lanes, source cleanup, and next actions", () => {
    const report = buildLegacyHistoryReconciliationReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T15:00:00.000Z",
      candidates: [baseCandidate],
      currentTruth: { events: [], identityLinks: [] },
    });

    expect(report.summary.unknownLegacyCount).toBe(0);
    expect(report.summary.purgatoryQueueCount).toBe(1);
    expect(report.sourceCleanupFindings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "analytics_aggregate_stats/realtime_summary", status: "debug_only_or_fallback" }),
        expect.objectContaining({ source: "GA4 / BigQuery / PostHog", status: "evidence_only" }),
      ]),
    );
    expect(report.costFindings.map((finding) => finding.lane)).toEqual(
      expect.arrayContaining(["cloud_run", "cloud_sql", "bigquery", "gemini_cloud_assist"]),
    );
    expect(validateLegacyHistoryReconciliationReport(report, {
      reconcilerSource: readFileSync("src/lib/analytics/legacy-history-reconciler.ts", "utf8"),
      currentHead: "head",
    })).toEqual([]);
  });
});
