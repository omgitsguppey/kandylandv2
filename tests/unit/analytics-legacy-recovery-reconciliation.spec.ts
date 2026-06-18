import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildLegacyRecoveryReconciliationReport,
  reconcileLegacyAnalyticsHistory,
  validateLegacyRecoveryReconciliationReport,
  type LegacyRecoveryCandidateInput,
} from "@/lib/analytics/legacy-recovery-reconciler";

const baseCandidate = {
  legacySource: "analytics_event_facts",
  legacyId: "legacy_evt_1",
  legacyTimestamp: "2024-01-15T12:00:00.000Z",
  mappedEventName: "drop_clicked",
  mappingConfidence: "high",
  actorConfidence: "high",
  objectConfidence: "high",
  serverConfirmed: false,
  canonicalEvent: {
    eventId: "evt_existing",
    eventName: "drop_clicked",
    userId: "user_1",
    sessionId: "sess_1",
    anonymousVisitorId: null,
    source: "legacy_firestore",
    dedupeKey: "dedupe_existing",
    objectId: "drop_1",
  },
} satisfies LegacyRecoveryCandidateInput;

describe("analytics legacy recovery reconciliation", () => {
  it("turns an exact eventId match into an exact link candidate", () => {
    const report = reconcileLegacyAnalyticsHistory({
      recoveredEvents: [baseCandidate],
      currentTruth: {
        eventIds: ["evt_existing"],
        dedupeKeys: [],
        identityLinks: [],
      },
    });

    expect(report.candidateMappings[0]).toMatchObject({
      legacySource: "analytics_event_facts",
      targetTruthLayer: "product_truth",
      identityConfidence: "exact_match",
      recoveryAction: "link_candidate",
      recoveryMode: "dry_run_manual_review",
      productionMutationAllowed: false,
      overwriteCurrentTruth: false,
    });
  });

  it("keeps missing identity unknown and archive-only unless a later owner marks it safe", () => {
    const report = reconcileLegacyAnalyticsHistory({
      recoveredEvents: [{
        ...baseCandidate,
        legacyId: "legacy_no_identity",
        canonicalEvent: {
          ...baseCandidate.canonicalEvent,
          eventId: "evt_no_identity",
          userId: null,
          sessionId: null,
          anonymousVisitorId: null,
        },
      }],
      currentTruth: {
        eventIds: [],
        dedupeKeys: [],
        identityLinks: [],
      },
    });

    expect(report.candidateMappings[0]).toMatchObject({
      identityConfidence: "unknown",
      recoveryAction: "archive_only",
      targetTruthLayer: "debug_truth",
    });
  });

  it("flags duplicate guest and user history as high duplicate risk", () => {
    const report = reconcileLegacyAnalyticsHistory({
      recoveredEvents: [{
        ...baseCandidate,
        legacySource: "analytics_guest_batches",
        legacyId: "guest_duplicate",
        canonicalEvent: {
          ...baseCandidate.canonicalEvent,
          eventId: "evt_guest_duplicate",
          userId: "user_1",
          anonymousVisitorId: "guest_1",
          sessionId: "sess_1",
        },
      }],
      currentTruth: {
        eventIds: [],
        dedupeKeys: ["dedupe_existing"],
        identityLinks: [{ guestId: "guest_1", userId: "user_1", sessionId: "sess_1" }],
      },
    });

    expect(report.candidateMappings[0].duplicateRisk).toBe("high");
    expect(report.candidateMappings[0].reason).toContain("linked guest and user lineage");
  });

  it("keeps GA4 and BigQuery legacy evidence evidence-only", () => {
    const report = reconcileLegacyAnalyticsHistory({
      recoveredEvents: [{
        ...baseCandidate,
        legacySource: "ga4_intraday",
        legacyId: "ga4_evt",
        mappingConfidence: "directional",
        actorConfidence: "unknown",
        canonicalEvent: {
          ...baseCandidate.canonicalEvent,
          eventId: "ga4_evt",
          userId: null,
          sessionId: null,
          anonymousVisitorId: "ga_user_pseudo",
          source: "ga4_intraday",
        },
      }],
      currentTruth: { eventIds: [], dedupeKeys: [], identityLinks: [] },
    });

    expect(report.candidateMappings[0]).toMatchObject({
      targetTruthLayer: "evidence_only",
      recoveryAction: "archive_only",
      identityConfidence: "weak_match",
    });
  });

  it("builds a report that preserves current product truth and validates cost lanes", () => {
    const report = buildLegacyRecoveryReconciliationReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-18T12:00:00.000Z",
      sourceInventory: {
        sources: [{ sourceName: "analytics_event_facts", recoverability: "backfillable" }],
      },
      mappingReport: {
        recoveredEvents: [baseCandidate],
        unmappedRecords: [],
      },
      currentTruth: { eventIds: ["evt_existing"], dedupeKeys: [], identityLinks: [] },
    });

    expect(report.summary.overwritesCurrentTruth).toBe(false);
    expect(report.productTruthPolicy).toMatchObject({
      dryRunOnly: true,
      productionMutationAllowed: false,
      recoveredEventsCanOverwriteCurrentTruth: false,
      externalEvidenceCanPromoteProductTruth: false,
      importCandidatesRequireSeparateApproval: true,
    });
    expect(report.candidateMappings.every((mapping) => mapping.productionMutationAllowed === false)).toBe(true);
    expect(report.candidateMappings.every((mapping) => mapping.recoveryMode === "dry_run_manual_review")).toBe(true);
    expect(report.summary.productTruthSources).toBeGreaterThan(0);
    expect(report.costFindings.map((finding) => finding.lane)).toEqual(
      expect.arrayContaining(["cloud_run", "cloud_sql", "gemini_cloud_assist", "route_4xx"]),
    );
    expect(validateLegacyRecoveryReconciliationReport(report, {
      reconcilerSource: "no adminDb no collection( no writeBatch no fetch(",
      currentHead: "head",
    })).toEqual([]);
  });

  it("has no production read or write function in the reconciler", () => {
    const source = readFileSync("src/lib/analytics/legacy-recovery-reconciler.ts", "utf8");

    expect(source).not.toMatch(/adminDb|collection\(|writeBatch|firebase-admin|fetch\(/);
  });
});
