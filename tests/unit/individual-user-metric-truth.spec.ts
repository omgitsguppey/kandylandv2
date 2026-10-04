import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { CanonicalEventEnvelope } from "@/lib/analytics/event-envelope-contract";
import { hydratePersonMetrics } from "@/lib/analytics/person-metrics-hydration";
import {
  buildIndividualUserMetricSourceTruth,
  buildIndividualUserMetricTruthReport,
  INDIVIDUAL_USER_METRIC_PROVEN_ZERO_FRESHNESS_TOLERANCE_MS,
  INDIVIDUAL_USER_METRIC_TRUTH,
  resolveIndividualUserMetricHydrationStatus,
} from "@/lib/identity-truth/individual-user-metric-truth";
import { USER_INDEX_MATERIALIZER_CONTRACT_VERSION } from "@/lib/user-indexes/user-tracking-index-contract";

const currentUserTrackingContext = {
  requestedUserId: "user_1",
  materializedUserId: "user_1",
  materializedSourceTruth: "materialized",
  currentConsentMode: "full_behavioral" as const,
};

const currentMaterializerProof = {
  materializedDataAvailabilityReason: "available",
  materializerMetadata: {
    materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
    sourceFingerprint: "source_current",
    publishedAtMs: 250,
  },
  currentSourceFingerprint: "source_current",
  evaluatedAtMs: 250,
};

describe("individual user metric truth", () => {
  it("keeps an absent hydrated last-seen timestamp distinct from a proven zero", () => {
    const adminUserPage = readFileSync(
      join(process.cwd(), "src/app/admin/user/[userId]/page.tsx"),
      "utf8",
    );

    expect(adminUserPage).toContain(
      'const lastSeenEmptyLabel = individualMetricProvenZero ? "Proven zero" : "No observed timestamp"',
    );
    expect(adminUserPage).toContain('data-individual-user-proven-zero={individualMetricProvenZero ? "true" : "false"}');
  });

  it("does not treat global-only hydration as user-level proof", () => {
    const globalOnly = hydratePersonMetrics({
      envelopes: [
        {
          eventName: "semantic_page_viewed",
          eventId: "evt_global_only",
          eventVersion: 1,
          timestamp: "2026-05-27T00:00:00.000Z",
          featureId: "test_feature",
          surface: "test_surface",
          sessionId: "sess_only",
          actorKind: "legacy_unknown",
          identityState: "legacy_unknown",
          identityConfidence: "unknown",
          consentMode: "necessary_only",
          source: "legacy",
          guestId: null,
          userRef: null,
          linkId: null,
          materializerLane: "person_metrics",
          debugVisibility: "admin_debug",
          scoreImpact: "evidence_completeness",
          privacyClass: "minimal_product",
          metadata: {},
          pipelineStatus: "normal",
          unavailableGuestReason: null,
          includeInUserBehavior: true,
        } satisfies CanonicalEventEnvelope,
      ],
      generatedAtUtc: "2026-05-27T00:00:00.000Z",
    });
    const report = buildIndividualUserMetricTruthReport(globalOnly);

    expect(globalOnly.metricStatus.page_views.state).toBe("hydrated");
    expect(report.metricStatus.page_views.userHydrationStatus).toBe("bridge_missing");
    expect(report.globalVsUserMismatchCount).toBeGreaterThan(0);
    expect(report.activeGlobalVsUserMismatchCount).toBe(0);
    expect(report.missingIdentityLinkCount).toBe(0);
    expect(report.status).toBe("classified");
    expect(report.metricStatus.page_views.displayRule).toContain("not zero");
    expect(INDIVIDUAL_USER_METRIC_TRUTH.find((metric) => metric.metricId === "payment_approvals")?.sourceEvents)
      .toContain("server_purchase_verified");
  });

  it("inherits explicit materializer and permission blocked states from person metric hydration", () => {
    const hydration = hydratePersonMetrics({
      materializerMissingMetricIds: ["runtime_watch_sessions"],
      permissionBlockedMetricIds: ["notification_interactions"],
    });
    const report = buildIndividualUserMetricTruthReport(hydration);

    expect(report.metricStatus.runtime_watch_sessions.userHydrationStatus).toBe("materializer_missing");
    expect(report.metricStatus.notification_interactions.userHydrationStatus).toBe("permission_blocked");
    expect(report.metricStatus.runtime_watch_sessions.displayRule).toContain("not zero");
    expect(report.metricStatus.notification_interactions.displayRule).toContain("not zero");
  });

  it("publishes the canonical user metric hydration state chain", () => {
    expect(resolveIndividualUserMetricHydrationStatus({
      globalCount: 1,
      userCount: 0,
      provenZero: false,
      missingProducer: null,
      missingBridge: null,
    })).toBe("bridge_missing");
    expect(resolveIndividualUserMetricHydrationStatus({
      globalCount: 0,
      userCount: 0,
      provenZero: false,
      missingProducer: "wallet_opened",
      missingBridge: "person_metrics.wallet_opens",
    })).toBe("materializer_missing");
    expect(resolveIndividualUserMetricHydrationStatus({
      globalCount: 0,
      userCount: 0,
      provenZero: false,
      missingProducer: "wallet_opened",
      missingBridge: null,
    })).toBe("source_missing");
    expect(resolveIndividualUserMetricHydrationStatus({
      globalCount: 1,
      userCount: 1,
      provenZero: false,
      missingProducer: null,
      missingBridge: null,
      explicitState: "permission_blocked",
    })).toBe("permission_blocked");
  });

  it("keeps missing Admin User evidence distinct from a proven zero", () => {
    const missing = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 0,
      displayedUserCount: 0,
      identityLinkCount: 0,
      materializerDocumentPresent: false,
    });
    const materializerMissing = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 0,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: false,
    });
    const provenZero = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 0,
      sourceWindowStartMs: 100,
      sourceWindowEndMs: 200,
      ...currentMaterializerProof,
    });

    expect(missing).toMatchObject({
      state: "source_missing",
      valuesDisplayable: false,
      identityBridgeState: "bridge_missing",
      materializerState: "materializer_missing",
    });
    expect(materializerMissing).toMatchObject({
      state: "materializer_missing",
      valuesDisplayable: false,
      identityBridgeState: "linked",
    });
    expect(provenZero).toMatchObject({
      state: "proven_zero",
      valuesDisplayable: false,
      provenZero: true,
      materializerProofState: "current",
      sourceWindowStartMs: 100,
      sourceWindowEndMs: 200,
    });
  });

  it("blocks zero display when materialized evidence has not reached the Admin User projection", () => {
    const bridgeMissing = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 0,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 4,
      sourceWindowStartMs: 100,
      sourceWindowEndMs: 200,
      ...currentMaterializerProof,
    });
    const observed = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 2,
      displayedUserCount: 4,
      identityLinkCount: 0,
      materializerDocumentPresent: false,
    });
    const invalidWindow = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 0,
      sourceWindowStartMs: 200,
      sourceWindowEndMs: 100,
      ...currentMaterializerProof,
    });

    expect(bridgeMissing).toMatchObject({
      state: "bridge_missing",
      valuesDisplayable: false,
      materializedUserCount: 4,
    });
    expect(bridgeMissing.explanation).toContain("not zero");
    expect(observed).toMatchObject({
      state: "hydrated",
      valuesDisplayable: true,
      displayedUserCount: 4,
    });
    expect(invalidWindow).toMatchObject({
      state: "collecting",
      valuesDisplayable: false,
      provenZero: false,
      sourceWindowStartMs: null,
      sourceWindowEndMs: null,
    });
  });

  it("does not use an old materializer timestamp as zero proof unless evaluation is inside the freshness window", () => {
    const oldEvidence = buildIndividualUserMetricSourceTruth({
      materializedDataAvailabilityReason: "available",
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 0,
      sourceWindowStartMs: 100,
      sourceWindowEndMs: 200,
      materializerMetadata: {
        materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
        sourceFingerprint: "source_current",
        publishedAtMs: 250,
      },
      currentSourceFingerprint: "source_current",
    });
    const evaluatedInsideWindow = buildIndividualUserMetricSourceTruth({
      materializedDataAvailabilityReason: "available",
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 0,
      sourceWindowStartMs: 100,
      sourceWindowEndMs: 200,
      materializerMetadata: {
        materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
        sourceFingerprint: "source_current",
        publishedAtMs: 250,
      },
      currentSourceFingerprint: "source_current",
      evaluatedAtMs: 300,
    });

    expect(oldEvidence).toMatchObject({
      state: "collecting",
      provenZero: false,
      valuesDisplayable: false,
      materializerState: "materializer_stale",
      materializerFreshnessState: "materializer_publication_stale",
    });
    expect(evaluatedInsideWindow).toMatchObject({
      state: "proven_zero",
      provenZero: true,
      materializerFreshnessState: "fresh",
    });
  });

  it("treats the freshness tolerance as inclusive and expires proof one millisecond later", () => {
    const buildAt = (evaluatedAtMs: number) => buildIndividualUserMetricSourceTruth({
      materializedDataAvailabilityReason: "available",
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 0,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 0,
      sourceWindowStartMs: 1_000,
      sourceWindowEndMs: 2_000,
      materializerMetadata: {
        materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
        sourceFingerprint: "source_current",
        publishedAtMs: 2_000,
      },
      currentSourceFingerprint: "source_current",
      evaluatedAtMs,
    });

    expect(buildAt(2_000 + INDIVIDUAL_USER_METRIC_PROVEN_ZERO_FRESHNESS_TOLERANCE_MS))
      .toMatchObject({ state: "proven_zero", materializerFreshnessState: "fresh" });
    expect(buildAt(2_001 + INDIVIDUAL_USER_METRIC_PROVEN_ZERO_FRESHNESS_TOLERANCE_MS))
      .toMatchObject({ state: "collecting", materializerFreshnessState: "materializer_publication_stale" });
  });

  it("keeps a stale source window unavailable even when a fresh publication contains materialized counts", () => {
    const evaluatedAtMs = 2_000 + INDIVIDUAL_USER_METRIC_PROVEN_ZERO_FRESHNESS_TOLERANCE_MS + 1;
    const result = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 4,
      sourceWindowStartMs: 1_000,
      sourceWindowEndMs: 2_000,
      materializerMetadata: {
        materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
        sourceFingerprint: "source_current",
        publishedAtMs: evaluatedAtMs,
      },
      currentSourceFingerprint: "source_current",
      evaluatedAtMs,
    });

    expect(result).toMatchObject({
      state: "collecting",
      valuesDisplayable: false,
      provenZero: false,
      materializedUserCount: 4,
      materializerState: "materializer_stale",
      materializerFreshnessState: "source_window_stale",
    });
  });

  it("classifies missing publication proof and blocks rejected lineage owners from proving zero", () => {
    const publicationMissing = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 0,
      sourceWindowStartMs: 100,
      sourceWindowEndMs: 200,
      materializerMetadata: {
        materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
        sourceFingerprint: "source_current",
      },
      currentSourceFingerprint: "source_current",
      evaluatedAtMs: 250,
    });
    const rejectedLineage = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 0,
      identityLineageRejectedCount: 1,
      identityLineageOwnerState: "legacy_owner_version",
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 0,
      sourceWindowStartMs: 100,
      sourceWindowEndMs: 200,
      ...currentMaterializerProof,
    });

    expect(publicationMissing).toMatchObject({
      state: "materializer_missing",
      materializerState: "materializer_missing",
      materializerFreshnessState: "materializer_publication_missing",
      provenZero: false,
    });
    expect(rejectedLineage).toMatchObject({
      state: "bridge_missing",
      identityBridgeState: "bridge_missing",
      identityLineageRejectedCount: 1,
      identityLineageOwnerState: "legacy_owner_version",
      provenZero: false,
      valuesDisplayable: false,
    });
    expect(rejectedLineage.explanation).toContain("excluded");
  });

  it.each([
    {
      label: "legacy timestamp-only index",
      input: {},
      proofState: "materializer_version_missing",
    },
    {
      label: "wrong materializer contract",
      input: {
        materializerMetadata: {
          materializerVersion: "2026.05.user-index-materializer.v1",
          sourceFingerprint: "source_current",
        },
        currentSourceFingerprint: "source_current",
      },
      proofState: "materializer_version_mismatch",
    },
    {
      label: "empty stored source fingerprint",
      input: {
        materializerMetadata: {
          materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
          sourceFingerprint: " ",
        },
        currentSourceFingerprint: "source_current",
      },
      proofState: "source_fingerprint_missing",
    },
    {
      label: "missing current source fingerprint",
      input: {
        materializerMetadata: {
          materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
          sourceFingerprint: "source_current",
        },
      },
      proofState: "current_source_fingerprint_missing",
    },
    {
      label: "stale source fingerprint",
      input: {
        materializerMetadata: {
          materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
          sourceFingerprint: "source_old",
        },
        currentSourceFingerprint: "source_current",
      },
      proofState: "source_fingerprint_mismatch",
    },
  ])("rejects bounded zero proof from a $label", ({ input, proofState }) => {
    const result = buildIndividualUserMetricSourceTruth({
      directUserSourceCount: 1,
      displayedUserCount: 0,
      identityLinkCount: 1,
      materializerDocumentPresent: true,
      ...currentUserTrackingContext,
      materializedUserCount: 0,
      sourceWindowStartMs: 100,
      sourceWindowEndMs: 200,
      ...input,
    });

    expect(result).toMatchObject({
      state: "materializer_missing",
      valuesDisplayable: false,
      provenZero: false,
      materializerState: "materializer_missing",
      materializerProofState: proofState,
      sourceWindowStartMs: null,
      sourceWindowEndMs: null,
    });
  });
});

describe("Audience person source availability boundary", () => {
  const zeroInput = (availability?: unknown) => ({
    ...currentUserTrackingContext, directUserSourceCount:0, displayedUserCount:0, identityLinkCount:1, materializerDocumentPresent:true, materializedUserCount:0,
    sourceWindowStartMs:100, sourceWindowEndMs:200, ...currentMaterializerProof,
    materializedDataAvailabilityReason:availability,
  });
  it.each(["source_disagreement", "insufficient_signal", "legacy_fallback", undefined])("does not promote %s materialized source to a proved zero", availability => {
    const result = buildIndividualUserMetricSourceTruth(zeroInput(availability));
    expect(result.provenZero).toBe(false);
    expect(result.valuesDisplayable).toBe(false);
  });
  it("keeps lawful privacy-limited zero counts unavailable without inventing activity", () => {
    const result = buildIndividualUserMetricSourceTruth(zeroInput("privacy_limited"));
    expect(result).toMatchObject({state:"permission_blocked", valuesDisplayable:false, provenZero:false});
  });
  it("retains a fresh explicitly complete bounded zero source window", () => {
    expect(buildIndividualUserMetricSourceTruth(zeroInput("available"))).toMatchObject({state:"proven_zero", provenZero:true});
  });
  it("preserves independent observed Admin evidence while index source is incomplete", () => {
    expect(buildIndividualUserMetricSourceTruth({...zeroInput("source_disagreement"),directUserSourceCount:1,displayedUserCount:3})).toMatchObject({state:"hydrated",provenZero:false,valuesDisplayable:true});
  });
});

describe("bounded admitted activity serving truth", () => {
  const activityInput = {
    ...currentUserTrackingContext,
    ...currentMaterializerProof,
    directUserSourceCount: 0,
    displayedUserCount: 0,
    identityLinkCount: 0,
    materializerDocumentPresent: true,
    materializedUserCount: 4,
    sourceWindowStartMs: 100,
    sourceWindowEndMs: 200,
  };

  it("serves a current admitted count and its exact bounded dates without hydrating detailed metric values", () => {
    const truth = buildIndividualUserMetricSourceTruth(activityInput);
    expect(truth).toMatchObject({
      state: "bridge_missing",
      valuesDisplayable: false,
      provenZero: false,
      admittedActivityUnavailableReason: null,
      admittedActivity: {
        userId: "user_1", recordCount: 4, sourceWindowStartMs: 100,
        sourceWindowEndMs: 200, publishedAtMs: 250,
        sourceTruth: "materialized", materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
        sourceFingerprint: "source_current",
      },
    });
    expect(truth.admittedActivity).not.toHaveProperty("personMetricCounts");
    expect(truth.admittedActivity).not.toHaveProperty("watchTimeMs");
    expect(truth.admittedActivity).not.toHaveProperty("purchaseCount");
    expect(truth.explanation).toContain("detailed");
  });

  it("limits an empty complete source proof to admitted records and keeps detailed metrics unavailable", () => {
    expect(buildIndividualUserMetricSourceTruth({ ...activityInput, materializedUserCount: 0 }))
      .toMatchObject({ state: "proven_zero", provenZero: true, valuesDisplayable: false, admittedActivity: { recordCount: 0 } });
  });

  it.each([
    { label: "missing requested UID", change: { requestedUserId: undefined }, reason: "identity_mismatch" },
    { label: "foreign saved UID", change: { materializedUserId: "another_user" }, reason: "identity_mismatch" },
    { label: "padded saved UID", change: { materializedUserId: " user_1 " }, reason: "identity_mismatch" },
    { label: "old contract", change: { materializerMetadata: { ...currentMaterializerProof.materializerMetadata, materializerVersion: "old" } }, reason: "materializer_proof_missing" },
    { label: "missing current fingerprint", change: { currentSourceFingerprint: undefined }, reason: "materializer_proof_missing" },
    { label: "foreign fingerprint", change: { currentSourceFingerprint: "other" }, reason: "materializer_proof_missing" },
    { label: "expired window", change: { evaluatedAtMs: 200 + INDIVIDUAL_USER_METRIC_PROVEN_ZERO_FRESHNESS_TOLERANCE_MS + 1, materializerMetadata: { ...currentMaterializerProof.materializerMetadata, publishedAtMs: 200 } }, reason: "materializer_stale" },
    { label: "future window", change: { sourceWindowEndMs: 300 }, reason: "materializer_stale" },
    { label: "reversed window", change: { sourceWindowStartMs: 201 }, reason: "materializer_stale" },
    { label: "missing publication", change: { materializerMetadata: { ...currentMaterializerProof.materializerMetadata, publishedAtMs: undefined } }, reason: "materializer_stale" },
    { label: "privacy-excluded coverage", change: { materializedDataAvailabilityReason: "privacy_limited" }, reason: "privacy_limited" },
    { label: "source-incomplete coverage", change: { materializedDataAvailabilityReason: "source_disagreement" }, reason: "source_incomplete" },
    { label: "missing coverage", change: { materializedDataAvailabilityReason: undefined }, reason: "source_incomplete" },
    { label: "legacy source", change: { materializedSourceTruth: "legacy_fallback" }, reason: "source_unverified" },
    { label: "missing source", change: { materializedSourceTruth: undefined }, reason: "source_unverified" },
  ])("does not display a bounded count with $label", ({ change, reason }) => {
    const truth = buildIndividualUserMetricSourceTruth({ ...activityInput, ...change });
    expect(truth.admittedActivity).toBeNull();
    expect(truth.admittedActivityUnavailableReason).toBe(reason);
    expect(truth.valuesDisplayable).toBe(false);
    expect(truth.provenZero).toBe(false);
  });

  it.each([undefined, null, "4", -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 201])(
    "does not turn malformed or over-cap count %s into activity or a zero proof", materializedUserCount => {
      const truth = buildIndividualUserMetricSourceTruth({ ...activityInput, materializedUserCount });
      expect(truth.admittedActivity).toBeNull();
      expect(truth.admittedActivityUnavailableReason).toBe("count_invalid");
      expect(truth.provenZero).toBe(false);
      expect(truth.valuesDisplayable).toBe(false);
    },
  );

  it.each(["necessary_only", "minimal_analytics", "full_analytics", "unknown"] as const)(
    "keeps the mixed person record aggregate unavailable under current %s consent", currentConsentMode => {
      expect(buildIndividualUserMetricSourceTruth({ ...activityInput, currentConsentMode }))
        .toMatchObject({ state: "permission_blocked", admittedActivity: null, admittedActivityUnavailableReason: "privacy_limited", valuesDisplayable: false });
    },
  );

  it("retains independently observed legacy values when the admitted index is unavailable", () => {
    expect(buildIndividualUserMetricSourceTruth({ ...activityInput, directUserSourceCount: 1, displayedUserCount: 3, materializedDataAvailabilityReason: "source_disagreement" }))
      .toMatchObject({ state: "hydrated", valuesDisplayable: true, provenZero: false, admittedActivity: null, admittedActivityUnavailableReason: "source_incomplete" });
  });
});
